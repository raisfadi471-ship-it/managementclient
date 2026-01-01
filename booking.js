const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = (id) => document.getElementById(id);

function setNotice(kind, text) {
  const n = el('notice');
  n.style.display = 'block';
  n.className = `notice ${kind}`;
  n.textContent = text;
}

function normalizePhone(phone) {
  return String(phone || '').trim();
}

async function upsertClient({ name, phone, email }) {
  const payload = {
    name: String(name).trim(),
    phone: normalizePhone(phone),
    email: String(email || '').trim() || null
  };

  const { data, error } = await supabase
    .from('clients')
    .upsert(payload, { onConflict: 'phone' })
    .select('client_id')
    .single();

  if (error) throw error;
  return data.client_id;
}

async function createAppointment({ client_id, service_type, date, time }) {
  const payload = {
    client_id,
    service_type,
    date,
    time,
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('appointment_id')
    .single();

  if (error) throw error;
  return data.appointment_id;
}

async function sendNotifications({ appointment_id }) {
  const { error } = await supabase.functions.invoke('send-booking-notifications', {
    body: { appointment_id }
  });

  if (error) {
    // Booking should still succeed even if notifications fail.
    console.warn('Notification error', error);
  }
}

async function checkAvailability(date, time) {
  if (!date) return { available: true, bookedSlots: [] };
  
  const { data, error } = await supabase
    .from('appointments')
    .select('time')
    .eq('date', date)
    .not('status', 'eq', 'cancelled');
  
  if (error) throw error;
  
  const bookedSlots = data.map(a => String(a.time).slice(0, 5));
  const available = time ? !bookedSlots.includes(time) : true;
  
  return { available, bookedSlots };
}

async function onBook() {
  try {
    el('bookBtn').disabled = true;
    el('bookBtn').textContent = 'Booking...';
    setNotice('', '');
    el('notice').style.display = 'none';

    const name = el('name').value;
    const phone = el('phone').value;
    const email = el('email').value;
    const service_type = el('service').value;
    const date = el('date').value;
    const time = el('time').value;

    if (!String(name).trim()) {
      setNotice('bad', 'Full name is required.');
      return;
    }
    if (!normalizePhone(phone)) {
      setNotice('bad', 'Phone number is required.');
      return;
    }
    if (!date) {
      setNotice('bad', 'Date is required.');
      return;
    }
    if (!time) {
      setNotice('bad', 'Time is required.');
      return;
    }

    const { available } = await checkAvailability(date, time);
    if (!available) {
      setNotice('bad', 'That time slot is already booked. Please select another time.');
      return;
    }

    const client_id = await upsertClient({ name, phone, email });
    const appointment_id = await createAppointment({ client_id, service_type, date, time });

    await sendNotifications({ appointment_id });

    setNotice('ok', '✓ Booked successfully! You will receive WhatsApp and email confirmations shortly.');
    
    el('name').value = '';
    el('phone').value = '';
    el('email').value = '';
    el('date').value = '';
    el('time').value = '';
  } catch (e) {
    const msg = String(e?.message || e);

    if (msg.toLowerCase().includes('appointments_no_double_booking')) {
      setNotice('bad', 'That time slot is already booked. Please select another time.');
    } else {
      setNotice('bad', msg);
    }
  } finally {
    el('bookBtn').disabled = false;
    el('bookBtn').textContent = 'Book appointment';
  }
}

async function showAvailableSlots() {
  const date = el('date').value;
  if (!date) return;
  
  try {
    const { bookedSlots } = await checkAvailability(date, null);
    
    if (bookedSlots.length > 0) {
      const slotsText = bookedSlots.join(', ');
      setNotice('warn', `Booked times on ${date}: ${slotsText}`);
    } else {
      setNotice('ok', `All time slots available for ${date}`);
    }
  } catch (e) {
    console.error(e);
  }
}

el('bookBtn').addEventListener('click', onBook);
el('date').addEventListener('change', showAvailableSlots);
