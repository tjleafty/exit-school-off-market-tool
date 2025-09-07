import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase config:', {
  url: supabaseUrl ? 'SET' : 'MISSING',
  key: supabaseAnonKey ? 'SET' : 'MISSING'
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  return { error: error.message || 'An error occurred' }
}