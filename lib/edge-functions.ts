import { supabase } from './supabase'

// Edge function client types
export interface EdgeFunctionResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface EnrichmentRequest {
  companyId: string
  providers?: string[]
}

export interface ReportRequest {
  companyId: string
  userId: string
  tier: 'ENHANCED' | 'BI'
}

export interface EmailCampaignRequest {
  campaignId?: string
  userId?: string
  immediate?: boolean
}

// Edge function client wrapper
class EdgeFunctionClient {
  private baseUrl: string

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
    }
    this.baseUrl = `${supabaseUrl}/functions/v1`
  }

  private async callFunction<T>(
    functionName: string,
    payload: any,
    options?: {
      timeout?: number
      retries?: number
    }
  ): Promise<EdgeFunctionResponse<T>> {
    const { timeout = 30000, retries = 1 } = options || {}

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (!token) {
          throw new Error('No authentication token available')
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(`${this.baseUrl}/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        return result as EdgeFunctionResponse<T>

      } catch (error) {
        console.error(`Edge function ${functionName} attempt ${attempt + 1} failed:`, error)

        if (attempt === retries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }

    return {
      success: false,
      error: 'All retry attempts failed'
    }
  }

  async enrichCompany(
    request: EnrichmentRequest,
    options?: { timeout?: number; retries?: number }
  ): Promise<EdgeFunctionResponse> {
    return this.callFunction('enrich-company', request, options)
  }

  async generateReport(
    request: ReportRequest,
    options?: { timeout?: number; retries?: number }
  ): Promise<EdgeFunctionResponse> {
    return this.callFunction('generate-report', request, {
      timeout: 60000, // Reports take longer
      retries: 0, // Don't retry report generation
      ...options
    })
  }

  async sendEmails(
    request: EmailCampaignRequest,
    options?: { timeout?: number; retries?: number }
  ): Promise<EdgeFunctionResponse> {
    return this.callFunction('send-emails', request, options)
  }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctionClient()

// Utility functions for common operations
export async function enrichCompanyById(
  companyId: string,
  providers: string[] = ['hunter', 'apollo']
): Promise<EdgeFunctionResponse> {
  return edgeFunctions.enrichCompany({ companyId, providers })
}

export async function generateCompanyReport(
  companyId: string,
  userId: string,
  tier: 'ENHANCED' | 'BI' = 'ENHANCED'
): Promise<EdgeFunctionResponse> {
  return edgeFunctions.generateReport({ companyId, userId, tier })
}

export async function triggerEmailCampaign(
  campaignId: string,
  immediate = false
): Promise<EdgeFunctionResponse> {
  return edgeFunctions.sendEmails({ campaignId, immediate })
}

export async function sendUserEmails(
  userId: string,
  immediate = false
): Promise<EdgeFunctionResponse> {
  return edgeFunctions.sendEmails({ userId, immediate })
}

// Background job status polling
export async function pollEnrichmentStatus(
  companyId: string,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<{ status: string; data?: any }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { data: enrichment } = await supabase
        .from('enrichments')
        .select('status, owner_name, owner_email, confidence')
        .eq('company_id', companyId)
        .single()

      if (!enrichment) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
        continue
      }

      if (enrichment.status === 'COMPLETED' || enrichment.status === 'FAILED') {
        return {
          status: enrichment.status,
          data: enrichment
        }
      }

      // Still processing, wait and try again
      await new Promise(resolve => setTimeout(resolve, intervalMs))

    } catch (error) {
      console.error('Error polling enrichment status:', error)
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  return {
    status: 'TIMEOUT',
    data: null
  }
}

// Helper to check if Edge Functions are available
export async function checkEdgeFunctionHealth(): Promise<{
  available: boolean
  functions: Record<string, boolean>
}> {
  const functions = ['enrich-company', 'generate-report', 'send-emails']
  const results: Record<string, boolean> = {}

  for (const functionName of functions) {
    try {
      const response = await fetch(`${new EdgeFunctionClient().baseUrl}/${functionName}`, {
        method: 'OPTIONS'
      })
      results[functionName] = response.ok
    } catch {
      results[functionName] = false
    }
  }

  const available = Object.values(results).some(status => status)

  return {
    available,
    functions: results
  }
}