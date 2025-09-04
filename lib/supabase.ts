import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Server-side client for admin operations
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  })
}

// Database types re-export for convenience
export type {
  Database,
  UserStatus,
  UserRole,
  ReportTier,
  EnrichStatus,
  EmailStatus
} from './database.types'

// Utility types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Search = Database['public']['Tables']['searches']['Row']
export type SearchInsert = Database['public']['Tables']['searches']['Insert']
export type SearchUpdate = Database['public']['Tables']['searches']['Update']

export type Company = Database['public']['Tables']['companies']['Row']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']

export type Enrichment = Database['public']['Tables']['enrichments']['Row']
export type EnrichmentInsert = Database['public']['Tables']['enrichments']['Insert']
export type EnrichmentUpdate = Database['public']['Tables']['enrichments']['Update']

export type Report = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']
export type ReportUpdate = Database['public']['Tables']['reports']['Update']

export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
export type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

export type EmailTemplate = Database['public']['Tables']['email_templates']['Row']
export type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert']
export type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update']

export type EmailLog = Database['public']['Tables']['email_logs']['Row']
export type EmailLogInsert = Database['public']['Tables']['email_logs']['Insert']
export type EmailLogUpdate = Database['public']['Tables']['email_logs']['Update']

export type Settings = Database['public']['Tables']['settings']['Row']
export type SettingsUpdate = Database['public']['Tables']['settings']['Update']

export type AuditLog = Database['public']['Tables']['audit_log']['Row']