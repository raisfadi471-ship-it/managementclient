import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://dvujybbazmdhpzyaszbe.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWp5YmJhem1kaHB6eWFzemJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNDE0ODIsImV4cCI6MjA4MjgxNzQ4Mn0.7uWAlK4HbbCZo13yBpKa-44UTlPHVDHZb4hdadNyT_c"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const config = {
  ADMIN_WHATSAPP_NUMBER: "",
  ADMIN_EMAIL: "fadibaloch544@gmail.com"
}
