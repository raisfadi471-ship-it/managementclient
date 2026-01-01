import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Json = Record<string, unknown>;

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const body: unknown = await req.json();
    const payload = body as { to?: string; subject?: string; html?: string };

    const to = String(payload.to || "");
    const subject = String(payload.subject || "");
    const html = String(payload.html || "");

    if (!to || !subject) {
      return jsonResponse(400, { error: "to and subject are required" });
    }

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const fromEmail = Deno.env.get("FROM_EMAIL") || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP not configured, email not sent");
      return jsonResponse(200, { ok: true, message: "SMTP not configured" });
    }

    const encoder = new TextEncoder();
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: parseInt(smtpPort)
    });

    const decoder = new TextDecoder();
    const buf = new Uint8Array(1024);
    await conn.read(buf);

    async function sendCommand(cmd: string) {
      await conn.write(encoder.encode(cmd + "\r\n"));
      const n = await conn.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    }

    await sendCommand(`EHLO ${smtpHost}`);
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPass));
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const message = [
      `From: ${fromEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
      "."
    ].join("\r\n");

    await conn.write(encoder.encode(message + "\r\n"));
    await conn.read(buf);

    await sendCommand("QUIT");
    conn.close();

    return jsonResponse(200, { ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Email error:", message);
    return jsonResponse(500, { error: message });
  }
});
