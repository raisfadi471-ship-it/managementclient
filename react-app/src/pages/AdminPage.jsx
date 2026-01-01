import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [appointments, setAppointments] = useState([])
  const [notice, setNotice] = useState({ message: '', type: '' })
  const [rescheduleModal, setRescheduleModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadAppointments()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadAppointments()
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('appointments-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadAppointments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  const loadAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_id, service_type, date, time, status, clients(client_id, name, phone, email)')
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (error) {
      console.error('Error loading appointments:', error)
      return
    }

    setAppointments(data)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setNotice({ message: `Login failed: ${error.message}`, type: 'bad' })
    } else {
      setNotice({ message: 'Login successful!', type: 'ok' })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setNotice({ message: 'Logged out successfully', type: 'ok' })
  }

  const updateStatus = async (appointmentId, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('appointment_id', appointmentId)

    if (error) {
      setNotice({ message: `Error: ${error.message}`, type: 'bad' })
    } else {
      setNotice({ message: `Appointment ${newStatus}`, type: 'ok' })
      loadAppointments()
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleModal) return

    const { error } = await supabase
      .from('appointments')
      .update({ 
        date: rescheduleModal.newDate, 
        time: rescheduleModal.newTime,
        status: 'rescheduled'
      })
      .eq('appointment_id', rescheduleModal.id)

    if (error) {
      setNotice({ message: `Error: ${error.message}`, type: 'bad' })
    } else {
      setNotice({ message: 'Appointment rescheduled successfully', type: 'ok' })
      setRescheduleModal(null)
      loadAppointments()
    }
  }

  const loadClientHistory = async (clientId, clientName) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('date, time, service_type, status')
      .eq('client_id', clientId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading history:', error)
      return
    }

    setHistoryModal({ clientName, appointments: data })
  }

  if (!session) {
    return (
      <div className="container">
        <div className="header">
          <div>
            <h1>⚡ Admin Dashboard</h1>
            <p className="small" style={{ marginTop: '8px', opacity: 0.9 }}>
              Manage appointments and clients
            </p>
          </div>
          <Link className="link" to="/">← Back to Booking</Link>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="grid">
              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@clinic.com"
                  required
                />
              </div>
              <div>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="submit">Login</button>
            </div>
          </form>
          {notice.message && (
            <div className={`notice ${notice.type}`}>
              {notice.message}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>⚡ Admin Dashboard</h1>
          <p className="small" style={{ marginTop: '8px', opacity: 0.9 }}>
            Manage appointments and clients
          </p>
        </div>
        <div className="row">
          <Link className="link" to="/">← Back to Booking</Link>
          <button onClick={handleLogout} className="danger">Logout</button>
        </div>
      </div>

      <div className="card">
        <h2>📋 Appointments</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Service</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  No appointments yet. Share the booking link with clients!
                </td>
              </tr>
            ) : (
              appointments.map((appt) => (
                <tr key={appt.appointment_id}>
                  <td>
                    <a
                      href="#"
                      className="link"
                      onClick={(e) => {
                        e.preventDefault()
                        loadClientHistory(appt.clients.client_id, appt.clients.name)
                      }}
                    >
                      {appt.clients.name}
                    </a>
                    <div className="small">{appt.clients.phone}</div>
                  </td>
                  <td>{appt.service_type}</td>
                  <td>
                    {appt.date}
                    <div className="small">{appt.time}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      appt.status === 'confirmed' ? 'ok' :
                      appt.status === 'cancelled' ? 'bad' : 'warn'
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: '6px' }}>
                      {appt.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(appt.appointment_id, 'confirmed')}>
                            Confirm
                          </button>
                          <button
                            className="danger"
                            onClick={() => updateStatus(appt.appointment_id, 'cancelled')}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setRescheduleModal({
                          id: appt.appointment_id,
                          newDate: appt.date,
                          newTime: appt.time
                        })}
                      >
                        Reschedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {notice.message && (
          <div className={`notice ${notice.type}`}>
            {notice.message}
          </div>
        )}
      </div>

      {rescheduleModal && (
        <div className="modal" onClick={() => setRescheduleModal(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h2>Reschedule Appointment</h2>
            <div className="grid">
              <div>
                <label>New Date</label>
                <input
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, newDate: e.target.value })}
                />
              </div>
              <div>
                <label>New Time</label>
                <input
                  type="time"
                  step="900"
                  value={rescheduleModal.newTime}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, newTime: e.target.value })}
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setRescheduleModal(null)}>Cancel</button>
              <button onClick={handleReschedule}>Save</button>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modal" onClick={() => setHistoryModal(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <h2>Client History: {historyModal.clientName}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyModal.appointments.map((appt, idx) => (
                  <tr key={idx}>
                    <td>{appt.date}</td>
                    <td>{appt.time}</td>
                    <td>{appt.service_type}</td>
                    <td>
                      <span className={`badge ${
                        appt.status === 'confirmed' ? 'ok' :
                        appt.status === 'cancelled' ? 'bad' : 'warn'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setHistoryModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
