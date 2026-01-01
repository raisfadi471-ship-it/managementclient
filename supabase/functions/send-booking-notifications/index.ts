// Supabase Edge Function: send WhatsApp confirmation to client + admin notifications.
// Provider: Meta WhatsApp Cloud API.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Json = Record<string, unknown>;

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return String(e);
}

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function mustGetEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function sendWhatsAppText(params: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
}) {
  const url = `https://graph.facebook.com/v20.0/${params.phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { body: params.text }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${errText}`);
  }
}

async function sendEmail(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  to: string;
  subject: string;
  body: string;
}) {
  const url = `${params.supabaseUrl}/functions/v1/send-email`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      html: params.body
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`Email API error: ${res.status} ${errText}`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

    const supabaseUrl = mustGetEnv("SUPABASE_URL");
    const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");

    const waAccessToken = mustGetEnv("WHATSAPP_ACCESS_TOKEN");
    const waPhoneNumberId = mustGetEnv("WHATSAPP_PHONE_NUMBER_ID");

    const adminWhatsAppNumber = Deno.env.get("ADMIN_WHATSAPP_NUMBER") || "";
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "";

    const body: unknown = await req.json();
    const appointment_id = String((body as { appointment_id?: unknown })?.appointment_id || "");

    if (!appointment_id) return jsonResponse(400, { error: "appointment_id is required" });

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    };

    const apptRes = await fetch(
      `${supabaseUrl}/rest/v1/appointments?appointment_id=eq.${appointment_id}&select=appointment_id,service_type,date,time,status,clients(name,phone,email)`,
      { headers }
    );

    if (!apptRes.ok) {
      const errText = await apptRes.text();
      throw new Error(`Supabase REST error: ${apptRes.status} ${errText}`);
    }

    const apptArr = await apptRes.json();
    const appt = apptArr?.[0];

    if (!appt) return jsonResponse(404, { error: "Appointment not found" });

    const clientName = String(appt.clients?.name || "");
    const clientPhone = String(appt.clients?.phone || "");
    const clientEmail = String(appt.clients?.email || "");
    const serviceType = String(appt.service_type || "");
    const date = String(appt.date || "");
    const time = String(appt.time || "").slice(0, 5);

    const clientMsg = `Hi ${clientName}, your appointment is booked.\n\nService: ${serviceType}\nDate: ${date}\nTime: ${time}\n\nThank you.`;
    const adminMsg = `New booking:\nClient: ${clientName} (${clientPhone})\nService: ${serviceType}\nDate: ${date} ${time}\nStatus: ${appt.status}`;
    
    const clientEmailHtml = `
      <h2>Appointment Confirmation</h2>
      <p>Hi ${clientName},</p>
      <p>Your appointment has been successfully booked.</p>
      <ul>
        <li><strong>Service:</strong> ${serviceType}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
      <p>Thank you for choosing us!</p>
    `;
    
    const adminEmailHtml = `
      <h2>New Appointment Booking</h2>
      <ul>
        <li><strong>Client:</strong> ${clientName}</li>
        <li><strong>Phone:</strong> ${clientPhone}</li>
        <li><strong>Email:</strong> ${clientEmail}</li>
        <li><strong>Service:</strong> ${serviceType}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Status:</strong> ${appt.status}</li>
      </ul>
    `;

    if (clientPhone) {
      await sendWhatsAppText({
        accessToken: waAccessToken,
        phoneNumberId: waPhoneNumberId,
        to: clientPhone,
        text: clientMsg
      });
    }

    if (adminWhatsAppNumber) {
      await sendWhatsAppText({
        accessToken: waAccessToken,
        phoneNumberId: waPhoneNumberId,
        to: adminWhatsAppNumber,
        text: adminMsg
      });
    }

    if (clientEmail) {
      await sendEmail({
        supabaseUrl,
        serviceRoleKey,
        to: clientEmail,
        subject: "Appointment Confirmation",
        body: clientEmailHtml
      });
    }

    if (adminEmail) {
      await sendEmail({
        supabaseUrl,
        serviceRoleKey,
        to: adminEmail,
        subject: "New Appointment Booking",
        body: adminEmailHtml
      });
    }

    return jsonResponse(200, { ok: true });
  } catch (e: unknown) {
    return jsonResponse(500, { error: getErrorMessage(e) });
  }
});
