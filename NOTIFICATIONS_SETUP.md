# 📧 Setup Email/WhatsApp Notifications

Notifications are currently **disabled** in the booking form. Follow these steps to enable them:

## Option 1: Manual Deployment via Supabase Dashboard

### Step 1: Create Edge Function
1. Go to https://supabase.com/dashboard
2. Select project: `dvujybbazmdhpzyaszbe`
3. Click **Edge Functions** → **Create a new function**
4. Name: `send-booking-notifications`
5. Copy the code from: `supabase/functions/send-booking-notifications/index.ts`
6. Click **Deploy**

### Step 2: Create Email Function (Required)
1. Click **Create a new function** again
2. Name: `send-email`
3. Copy the code from: `supabase/functions/send-email/index.ts`
4. Click **Deploy**

### Step 3: Set Environment Secrets
Go to **Project Settings** → **Edge Functions** → **Manage secrets**

**Required for Email (Recommended - Easy Setup):**
```
ADMIN_EMAIL = fadibaloch544@gmail.com
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASSWORD = your-gmail-app-password
```

**Optional for WhatsApp (Requires Meta Business API):**
```
WHATSAPP_ACCESS_TOKEN = your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID = your-phone-number-id
ADMIN_WHATSAPP_NUMBER = +923001234567
```

### Step 4: Enable in React App
In `react-app/src/pages/BookingPage.jsx`, uncomment lines 84-86:
```javascript
await supabase.functions.invoke('send-booking-notifications', {
  body: { appointment_id: appointmentData.appointment_id }
})
```

## Gmail App Password Setup
1. Enable 2-Factor Authentication on Gmail
2. Go to: https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Use that 16-character password as `SMTP_PASSWORD`

---

## Option 2: Supabase CLI (Advanced)

### Install Supabase CLI
```powershell
# Windows: Download from GitHub
# https://github.com/supabase/cli/releases
# Or use Scoop: scoop install supabase
```

### Deploy Functions
```powershell
supabase login
supabase link --project-ref dvujybbazmdhpzyaszbe
supabase functions deploy send-booking-notifications
supabase functions deploy send-email
```

### Set Secrets
```powershell
supabase secrets set ADMIN_EMAIL=fadibaloch544@gmail.com
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-email@gmail.com
supabase secrets set SMTP_PASSWORD=your-app-password
```

---

After setup, test by booking an appointment - you'll receive email notifications! 🎉
