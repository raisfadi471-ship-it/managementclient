# Smart Appointment & Client Management System

Modern appointment booking system with WhatsApp/Email notifications, real-time admin dashboard, and secure client management.

## Features
- **Public booking form** with real-time availability checking
- **Admin dashboard** with appointment management, rescheduling, and client history
- **WhatsApp & email notifications** via Supabase Edge Functions
- **Real-time updates** using Supabase Realtime
- **Row-level security** protecting client data
- **Double-booking prevention** via database constraints

## Quick Setup
1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Run SQL schema**: Copy `supabase/schema.sql` into SQL Editor and execute
3. **Create admin user**: Auth → Users → Add User
4. **Grant admin role**:
```sql
insert into public.profiles (user_id, role) values ('<USER_UUID>', 'admin');
```
5. **Configure frontend**: Edit `config.js` with your Supabase URL and anon key
6. **Deploy Edge Functions** (optional):
```bash
supabase functions deploy send-booking-notifications
supabase functions deploy send-email
```

## Configuration
Edit `config.js`:
```javascript
SUPABASE_URL: "https://xxxxx.supabase.co"
SUPABASE_ANON_KEY: "eyJhbGci..."
ADMIN_WHATSAPP_NUMBER: "+923001234567"
ADMIN_EMAIL: "admin@clinic.com"
```

## Edge Function Secrets
```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN="..."
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="..."
supabase secrets set SMTP_HOST="smtp.gmail.com"
supabase secrets set SMTP_PORT="587"
supabase secrets set SMTP_USER="your@email.com"
supabase secrets set SMTP_PASS="your-password"
```

## Tech Stack
- **Frontend**: Vanilla JS + HTML + CSS (no build step)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Notifications**: WhatsApp Cloud API + SMTP Email
- **Hosting**: Any static host (Netlify, Vercel, GitHub Pages, or local)
