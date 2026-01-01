const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = (id) => document.getElementById(id);

function setNotice(targetEl, kind, text) {
  targetEl.style.display = 'block';
  targetEl.className = `notice ${kind}`;
  targetEl.textContent = text;
}

function hideNotice(targetEl) {
  targetEl.style.display = 'none';
  targetEl.textContent = '';
}

async function loadAppointments() {
  hideNotice(el('dashNotice'));
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_id, service_type, date, time, status, clients(client_id, name, phone, email)')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) throw error;

  const body = el('apptBody');
  body.innerHTML = '';

  if (data.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">No appointments yet. Share the booking link with clients!</td></tr>';
    return;
  }

  for (const row of data) {
    const tr = document.createElement('tr');

    const statusClass = row.status === 'confirmed'
      ? 'ok'
      : row.status === 'cancelled'
        ? 'bad'
        : 'warn';

    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${String(row.time).slice(0,5)}</td>
      <td>${row.service_type}</td>
      <td>
        <div><a href="#" class="link" data-action="history" data-client-id="${row.clients?.client_id || ''}" data-client-name="${row.clients?.name || ''}">${row.clients?.name || ''}</a></div>
        <div class="small">${row.clients?.phone || ''}${row.clients?.email ? ' · ' + row.clients.email : ''}</div>
      </td>
      <td><span class="badge ${statusClass}">${row.status}</span></td>
      <td class="row" style="justify-content: flex-end;">
        <button data-action="reschedule" data-id="${row.appointment_id}" data-date="${row.date}" data-time="${row.time}">Reschedule</button>
        <button data-action="confirm" data-id="${row.appointment_id}">Confirm</button>
        <button class="danger" data-action="cancel" data-id="${row.appointment_id}">Cancel</button>
      </td>
    `;

    body.appendChild(tr);
  }
}

async function updateStatus(appointment_id, status) {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('appointment_id', appointment_id);

  if (error) throw error;
}

let currentRescheduleId = null;

function showRescheduleModal(appointment_id, currentDate, currentTime) {
  currentRescheduleId = appointment_id;
  el('rescheduleDate').value = currentDate;
  el('rescheduleTime').value = String(currentTime).slice(0, 5);
  el('rescheduleModal').style.display = 'flex';
}

function hideRescheduleModal() {
  el('rescheduleModal').style.display = 'none';
  currentRescheduleId = null;
}

async function saveReschedule() {
  if (!currentRescheduleId) return;
  
  const newDate = el('rescheduleDate').value;
  const newTime = el('rescheduleTime').value;
  
  if (!newDate || !newTime) {
    alert('Please select both date and time');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ 
        date: newDate, 
        time: newTime,
        status: 'rescheduled'
      })
      .eq('appointment_id', currentRescheduleId);
    
    if (error) throw error;
    
    hideRescheduleModal();
    await loadAppointments();
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes('appointments_no_double_booking')) {
      alert('That time slot is already booked. Please choose another time.');
    } else {
      alert(msg);
    }
  }
}

async function showClientHistory(client_id, clientName) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('date, time, service_type, status')
      .eq('client_id', client_id)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    
    if (error) throw error;
    
    el('historyTitle').textContent = `${clientName} - Booking History`;
    
    const body = el('historyBody');
    body.innerHTML = '';
    
    if (data.length === 0) {
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No appointments found</td></tr>';
    } else {
      for (const row of data) {
        const statusClass = row.status === 'confirmed'
          ? 'ok'
          : row.status === 'cancelled'
            ? 'bad'
            : 'warn';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.date}</td>
          <td>${String(row.time).slice(0,5)}</td>
          <td>${row.service_type}</td>
          <td><span class="badge ${statusClass}">${row.status}</span></td>
        `;
        body.appendChild(tr);
      }
    }
    
    el('historyModal').style.display = 'flex';
  } catch (err) {
    alert(String(err?.message || err));
  }
}

function setAuthedUI(session) {
  const isAuthed = !!session;

  el('loginBtn').style.display = isAuthed ? 'none' : 'inline-block';
  el('logoutBtn').style.display = isAuthed ? 'inline-block' : 'none';
  el('dashboard').style.display = isAuthed ? 'block' : 'none';

  if (isAuthed) {
    el('sessionInfo').textContent = `Logged in as ${session.user.email}`;
  } else {
    el('sessionInfo').textContent = '';
  }
}

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  setAuthedUI(data.session);
  return data.session;
}

async function login() {
  hideNotice(el('authNotice'));

  const email = el('adminEmail').value;
  const password = el('adminPassword').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setNotice(el('authNotice'), 'bad', error.message);
    return;
  }

  setNotice(el('authNotice'), 'ok', 'Logged in. Loading appointments...');
  const session = await refreshSession();
  if (session) await loadAppointments();
  hideNotice(el('authNotice'));
}

async function logout() {
  await supabase.auth.signOut();
  await refreshSession();
}

el('loginBtn').addEventListener('click', login);
el('logoutBtn').addEventListener('click', logout);
el('refreshBtn').addEventListener('click', async () => {
  try {
    await loadAppointments();
  } catch (e) {
    setNotice(el('dashNotice'), 'bad', String(e?.message || e));
  }
});

el('apptBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  const link = e.target.closest('a');
  
  if (btn) {
    const action = btn.getAttribute('data-action');
    const appointment_id = btn.getAttribute('data-id');

    try {
      if (action === 'confirm') {
        await updateStatus(appointment_id, 'confirmed');
        await loadAppointments();
      } else if (action === 'cancel') {
        await updateStatus(appointment_id, 'cancelled');
        await loadAppointments();
      } else if (action === 'reschedule') {
        const date = btn.getAttribute('data-date');
        const time = btn.getAttribute('data-time');
        showRescheduleModal(appointment_id, date, time);
      }
    } catch (err) {
      setNotice(el('dashNotice'), 'bad', String(err?.message || err));
    }
  }
  
  if (link) {
    e.preventDefault();
    const action = link.getAttribute('data-action');
    if (action === 'history') {
      const clientId = link.getAttribute('data-client-id');
      const clientName = link.getAttribute('data-client-name');
      if (clientId) {
        await showClientHistory(clientId, clientName);
      }
    }
  }
});

el('cancelReschedule').addEventListener('click', hideRescheduleModal);
el('saveReschedule').addEventListener('click', saveReschedule);
el('closeHistory').addEventListener('click', () => {
  el('historyModal').style.display = 'none';
});

el('rescheduleModal').addEventListener('click', (e) => {
  if (e.target === el('rescheduleModal')) hideRescheduleModal();
});

el('historyModal').addEventListener('click', (e) => {
  if (e.target === el('historyModal')) el('historyModal').style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (el('rescheduleModal').style.display === 'flex') hideRescheduleModal();
    if (el('historyModal').style.display === 'flex') el('historyModal').style.display = 'none';
  }
});

// Realtime: refresh table when new appointments arrive
supabase
  .channel('appointments-admin')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (session) {
      try { await loadAppointments(); } catch (_) {}
    }
  })
  .subscribe();

(async () => {
  const session = await refreshSession();
  if (session) {
    try { await loadAppointments(); } catch (e) {
      setNotice(el('dashNotice'), 'bad', String(e?.message || e));
    }
  }
})();
