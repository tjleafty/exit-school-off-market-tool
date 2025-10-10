import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase config:', {
  url: supabaseUrl ? 'SET' : 'MISSING',
  key: supabaseAnonKey ? 'SET' : 'MISSING',
  serviceKey: supabaseServiceKey ? 'SET' : 'MISSING'
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
}

// Client for general use (anon key)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Admin client for server-side operations (service role key)
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  return { error: error.message || 'An error occurred' }
}