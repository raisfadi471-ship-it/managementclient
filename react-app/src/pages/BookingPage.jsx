import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function BookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'Swedish Massage',
    date: '',
    time: ''
  })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState({ message: '', type: '' })
  const [availableSlots, setAvailableSlots] = useState([])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const checkAvailability = async (date) => {
    if (!date) return []
    
    const { data, error } = await supabase
      .from('appointments')
      .select('time')
      .eq('date', date)
      .not('status', 'eq', 'cancelled')
    
    if (error) {
      console.error('Error checking availability:', error)
      return []
    }
    
    return data.map(a => String(a.time).slice(0, 5))
  }

  useEffect(() => {
    if (formData.date) {
      checkAvailability(formData.date).then(setAvailableSlots)
    }
  }, [formData.date])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setNotice({ message: '', type: '' })

    try {
      if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
        setNotice({ message: 'Please fill in all required fields', type: 'bad' })
        return
      }

      const bookedSlots = await checkAvailability(formData.date)
      if (bookedSlots.includes(formData.time)) {
        setNotice({ message: 'This time slot is already booked. Please select another time.', type: 'warn' })
        return
      }

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .upsert({ phone: formData.phone, name: formData.name, email: formData.email }, { onConflict: 'phone' })
        .select()
        .single()

      if (clientError) throw clientError

      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: clientData.client_id,
          service_type: formData.service,
          date: formData.date,
          time: formData.time,
          status: 'pending'
        })
        .select()
        .single()

      if (appointmentError) throw appointmentError

      await supabase.functions.invoke('send-booking-notifications', {
        body: { appointment_id: appointmentData.appointment_id }
      })

      setNotice({ 
        message: `✅ Appointment booked successfully! Admin has been notified.`, 
        type: 'ok' 
      })
      
      setFormData({
        name: '',
        phone: '',
        email: '',
        service: 'Swedish Massage',
        date: '',
        time: ''
      })
    } catch (error) {
      setNotice({ 
        message: `Error: ${error.message}`, 
        type: 'bad' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>✨ Book Your Appointment</h1>
          <p className="small" style={{ marginTop: '8px', opacity: 0.9 }}>
            Professional massage and training services
          </p>
        </div>
        <Link className="link" to="/admin">Admin Login →</Link>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>📅 Schedule Your Visit</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div>
              <label>Full name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label>Phone number</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +923001234567"
                required
              />
            </div>
            <div>
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="optional"
              />
            </div>
            <div>
              <label>Service type</label>
              <select name="service" value={formData.service} onChange={handleChange}>
                <option value="Swedish Massage">Swedish Massage</option>
                <option value="Deep Tissue">Deep Tissue</option>
                <option value="Sports Massage">Sports Massage</option>
                <option value="Relaxation">Relaxation</option>
                <option value="Training Session">Training Session</option>
              </select>
            </div>
            <div>
              <label>Date</label>
              <input
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Time</label>
              <input
                name="time"
                type="time"
                step="900"
                value={formData.time}
                onChange={handleChange}
                required
              />
              <div className="small">15-minute intervals. Select date first to see availability.</div>
            </div>
          </div>

          {availableSlots.length > 0 && (
            <div className="notice warn" style={{ marginTop: '20px' }}>
              <strong>⚠️ Already Booked:</strong> {availableSlots.join(', ')}
            </div>
          )}

          <div className="row" style={{ marginTop: '20px', justifyContent: 'space-between' }}>
            <div className="small">By booking you agree to be contacted on WhatsApp/SMS.</div>
            <button type="submit" disabled={loading}>
              {loading ? 'Booking...' : 'Book appointment'}
            </button>
          </div>

          {notice.message && (
            <div className={`notice ${notice.type}`}>
              {notice.message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
