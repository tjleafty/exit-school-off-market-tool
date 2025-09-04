import { supabase, createServerSupabaseClient } from './supabase'
import type {
  User,
  UserInsert,
  UserUpdate,
  Search,
  SearchInsert,
  Company,
  CompanyUpdate,
  Enrichment,
  Report,
  Campaign,
  EmailTemplate,
  UserRole,
  EnrichStatus
} from './supabase'

// User queries
export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const updateUserRole = async (userId: string, role: UserRole) => {
  const serverClient = createServerSupabaseClient()
  
  const { data, error } = await serverClient
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserStats = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('get_user_stats', { p_user_id: userId })
  
  if (error) throw error
  return data
}

// Search queries
export const createSearch = async (searchData: SearchInsert) => {
  const { data, error } = await supabase
    .from('searches')
    .insert(searchData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserSearches = async (userId: string) => {
  const { data, error } = await supabase
    .from('searches')
    .select(`
      *,
      companies(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getSearchWithCompanies = async (searchId: string) => {
  const { data, error } = await supabase
    .from('searches')
    .select(`
      *,
      companies(
        *,
        enrichments(*)
      )
    `)
    .eq('id', searchId)
    .single()
  
  if (error) throw error
  return data
}

// Company queries
export const updateCompanySelection = async (companyId: string, selected: boolean) => {
  const { data, error } = await supabase
    .from('companies')
    .update({ selected })
    .eq('id', companyId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getSelectedCompanies = async (searchId: string) => {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      enrichments(*)
    `)
    .eq('search_id', searchId)
    .eq('selected', true)
  
  if (error) throw error
  return data
}

// Enrichment queries
export const startEnrichment = async (companyId: string) => {
  const { data, error } = await supabase
    .rpc('start_enrichment', { p_company_id: companyId })
  
  if (error) throw error
  return data
}

export const updateEnrichmentStatus = async (
  enrichmentId: string,
  status: EnrichStatus,
  data?: any
) => {
  const { data: result, error } = await supabase
    .rpc('update_enrichment_status', {
      p_enrichment_id: enrichmentId,
      p_status: status,
      p_data: data
    })
  
  if (error) throw error
  return result
}

export const getEnrichmentByCompany = async (companyId: string) => {
  const { data, error } = await supabase
    .from('enrichments')
    .select('*')
    .eq('company_id', companyId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error // Ignore not found error
  return data
}

// Report queries
export const createReport = async (
  companyId: string,
  userId: string,
  tier: 'ENHANCED' | 'BI',
  contentJson: any,
  contentHtml?: string,
  pdfPath?: string
) => {
  const { data, error } = await supabase
    .rpc('create_report', {
      p_company_id: companyId,
      p_user_id: userId,
      p_tier: tier,
      p_content_json: contentJson,
      p_content_html: contentHtml,
      p_pdf_path: pdfPath
    })
  
  if (error) throw error
  return data
}

export const getUserReports = async (userId: string) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      companies(name, website)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Campaign queries
export const getUserCampaigns = async (userId: string) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      email_templates(name, subject),
      outreach_targets(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createCampaign = async (campaignData: any) => {
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaignData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Email template queries
export const getEmailTemplates = async (userId?: string) => {
  let query = supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`)
  } else {
    query = query.is('user_id', null)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

// Admin queries
export const getSystemStats = async () => {
  const { data, error } = await supabase
    .rpc('get_system_stats')
  
  if (error) throw error
  return data
}

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createInvitation = async (userId: string, expiresHours = 168) => {
  const { data, error } = await supabase
    .rpc('create_invitation', {
      p_user_id: userId,
      p_expires_hours: expiresHours
    })
  
  if (error) throw error
  return data?.[0] // Function returns array, we want first result
}

export const acceptInvitation = async (token: string) => {
  const { data, error } = await supabase
    .rpc('accept_invitation', { p_token: token })
  
  if (error) throw error
  return data
}