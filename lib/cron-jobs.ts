import { createServerSupabaseClient } from './supabase'
import { edgeFunctions } from './edge-functions'

// Cron job utilities for scheduled tasks
export class CronJobManager {
  private serverSupabase = createServerSupabaseClient()

  // Process pending enrichments
  async processPendingEnrichments(): Promise<{
    processed: number
    failed: number
    message: string
  }> {
    try {
      console.log('🔍 Processing pending enrichments...')

      const { data: pendingEnrichments } = await this.serverSupabase
        .from('enrichments')
        .select(`
          id,
          company_id,
          created_at,
          companies(name)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(10) // Process in batches

      if (!pendingEnrichments?.length) {
        return {
          processed: 0,
          failed: 0,
          message: 'No pending enrichments found'
        }
      }

      let processed = 0
      let failed = 0

      for (const enrichment of pendingEnrichments) {
        try {
          console.log(`Processing enrichment for company: ${enrichment.companies?.name}`)

          const result = await edgeFunctions.enrichCompany({
            companyId: enrichment.company_id,
            providers: ['hunter', 'apollo']
          })

          if (result.success) {
            processed++
          } else {
            failed++
            console.error(`Enrichment failed: ${result.error}`)
          }

          // Small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (error) {
          failed++
          console.error(`Error processing enrichment ${enrichment.id}:`, error)
        }
      }

      return {
        processed,
        failed,
        message: `Processed ${processed} enrichments, ${failed} failed`
      }

    } catch (error) {
      console.error('Error processing pending enrichments:', error)
      return {
        processed: 0,
        failed: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Process scheduled email campaigns
  async processScheduledEmails(): Promise<{
    campaignsSent: number
    totalEmailsSent: number
    failed: number
    message: string
  }> {
    try {
      console.log('📧 Processing scheduled email campaigns...')

      const now = new Date()
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const currentHour = now.getHours()

      // Find campaigns scheduled for this day and hour
      const { data: scheduledCampaigns } = await this.serverSupabase
        .from('campaigns')
        .select(`
          id,
          name,
          user_id,
          users(name, email)
        `)
        .eq('is_active', true)
        .eq('weekday', currentDay)
        .eq('hour', currentHour)

      if (!scheduledCampaigns?.length) {
        return {
          campaignsSent: 0,
          totalEmailsSent: 0,
          failed: 0,
          message: `No campaigns scheduled for day ${currentDay} hour ${currentHour}`
        }
      }

      let campaignsSent = 0
      let totalEmailsSent = 0
      let failed = 0

      for (const campaign of scheduledCampaigns) {
        try {
          console.log(`Processing campaign: ${campaign.name}`)

          const result = await edgeFunctions.sendEmails({
            campaignId: campaign.id,
            immediate: false // Respect campaign scheduling
          })

          if (result.success) {
            campaignsSent++
            totalEmailsSent += result.data?.emailsSent || 0
          } else {
            failed++
            console.error(`Campaign failed: ${result.error}`)
          }

          // Delay between campaigns to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (error) {
          failed++
          console.error(`Error processing campaign ${campaign.id}:`, error)
        }
      }

      return {
        campaignsSent,
        totalEmailsSent,
        failed,
        message: `Processed ${campaignsSent} campaigns, sent ${totalEmailsSent} emails, ${failed} failed`
      }

    } catch (error) {
      console.error('Error processing scheduled emails:', error)
      return {
        campaignsSent: 0,
        totalEmailsSent: 0,
        failed: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Cleanup old data and expired sessions
  async performMaintenance(): Promise<{
    invitationsCleanedUp: number
    auditLogsArchived: number
    message: string
  }> {
    try {
      console.log('🧹 Performing maintenance tasks...')

      // Clean up expired invitations
      const { data: cleanupResult } = await this.serverSupabase
        .rpc('cleanup_expired_invitations')

      const invitationsCleanedUp = cleanupResult || 0

      // Archive old audit logs (older than 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { count: auditLogsArchived } = await this.serverSupabase
        .from('audit_log')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString())
        .select('*', { count: 'exact', head: true })

      // Log maintenance activity
      await this.serverSupabase.rpc('create_audit_log', {
        p_user_id: null,
        p_action: 'MAINTENANCE',
        p_entity: 'SYSTEM',
        p_metadata: {
          invitations_cleaned: invitationsCleanedUp,
          audit_logs_archived: auditLogsArchived || 0,
          timestamp: new Date().toISOString()
        }
      })

      return {
        invitationsCleanedUp,
        auditLogsArchived: auditLogsArchived || 0,
        message: `Maintenance completed: ${invitationsCleanedUp} invitations cleaned, ${auditLogsArchived || 0} audit logs archived`
      }

    } catch (error) {
      console.error('Error performing maintenance:', error)
      return {
        invitationsCleanedUp: 0,
        auditLogsArchived: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Generate daily reports for active users
  async generateDailyReports(): Promise<{
    reportsGenerated: number
    failed: number
    message: string
  }> {
    try {
      console.log('📊 Generating daily reports...')

      // Find companies that need daily reports (selected companies with recent enrichments)
      const { data: companiesForReports } = await this.serverSupabase
        .from('companies')
        .select(`
          id,
          name,
          searches(user_id, users(id, name)),
          enrichments(status, updated_at)
        `)
        .eq('selected', true)
        .not('enrichments', 'is', null)
        .eq('enrichments.status', 'COMPLETED')
        .gte('enrichments.updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (!companiesForReports?.length) {
        return {
          reportsGenerated: 0,
          failed: 0,
          message: 'No companies eligible for daily reports'
        }
      }

      let reportsGenerated = 0
      let failed = 0

      for (const company of companiesForReports) {
        try {
          const userId = company.searches?.users?.id
          if (!userId) continue

          // Check if report already exists today
          const today = new Date().toISOString().split('T')[0]
          const { data: existingReport } = await this.serverSupabase
            .from('reports')
            .select('id')
            .eq('company_id', company.id)
            .eq('user_id', userId)
            .gte('created_at', `${today}T00:00:00Z`)
            .single()

          if (existingReport) {
            console.log(`Report already exists for ${company.name} today`)
            continue
          }

          console.log(`Generating daily report for: ${company.name}`)

          const result = await edgeFunctions.generateReport({
            companyId: company.id,
            userId: userId,
            tier: 'ENHANCED' // Daily reports use ENHANCED tier
          })

          if (result.success) {
            reportsGenerated++
          } else {
            failed++
            console.error(`Report generation failed: ${result.error}`)
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000))

        } catch (error) {
          failed++
          console.error(`Error generating report for ${company.id}:`, error)
        }
      }

      return {
        reportsGenerated,
        failed,
        message: `Generated ${reportsGenerated} reports, ${failed} failed`
      }

    } catch (error) {
      console.error('Error generating daily reports:', error)
      return {
        reportsGenerated: 0,
        failed: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Run all scheduled jobs
  async runAllJobs(): Promise<{
    enrichments: any
    emails: any
    maintenance: any
    reports: any
    summary: string
  }> {
    console.log('🚀 Running all scheduled jobs...')

    const enrichments = await this.processPendingEnrichments()
    const emails = await this.processScheduledEmails()
    const maintenance = await this.performMaintenance()
    const reports = await this.generateDailyReports()

    const summary = `
Scheduled jobs completed:
- Enrichments: ${enrichments.message}
- Emails: ${emails.message}
- Maintenance: ${maintenance.message}
- Reports: ${reports.message}
`

    console.log(summary)

    return {
      enrichments,
      emails,
      maintenance,
      reports,
      summary: summary.trim()
    }
  }
}

// Export singleton instance
export const cronJobs = new CronJobManager()

// Utility function to run specific job
export async function runCronJob(jobName: string) {
  const manager = new CronJobManager()

  switch (jobName) {
    case 'enrichments':
      return manager.processPendingEnrichments()
    case 'emails':
      return manager.processScheduledEmails()
    case 'maintenance':
      return manager.performMaintenance()
    case 'reports':
      return manager.generateDailyReports()
    case 'all':
      return manager.runAllJobs()
    default:
      throw new Error(`Unknown cron job: ${jobName}`)
  }
}