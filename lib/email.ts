import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvitationEmail } from '@/emails/invitation'
import { ReportReadyEmail } from '@/emails/report-ready'
import { CampaignEmail } from '@/emails/campaign-email'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const resend = new Resend(process.env.RESEND_API_KEY!)
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Email service configuration
const EMAIL_CONFIG = {
  from: {
    noreply: 'Exit School <noreply@exitschool.com>',
    reports: 'Exit School Reports <reports@exitschool.com>',
    campaigns: 'Exit School <outreach@exitschool.com>',
  },
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  unsubscribeUrl: process.env.NEXT_PUBLIC_APP_URL + '/unsubscribe'
}

// Email delivery status tracking
export type EmailStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED'

export interface EmailResult {
  id: string
  success: boolean
  error?: string
}

export interface EmailMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

/**
 * Send account invitation email with React Email template
 */
export async function sendInvitationEmail({
  email,
  name,
  token,
  companyName,
  expiresAt
}: {
  email: string
  name?: string
  token: string
  companyName?: string
  expiresAt: string
}): Promise<EmailResult> {
  try {
    const acceptUrl = `${EMAIL_CONFIG.baseUrl}/signup?token=${token}`

    const emailHtml = render(InvitationEmail({
      name,
      acceptUrl,
      expiresAt,
      companyName
    }))

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from.noreply,
      to: email,
      subject: 'Welcome to Exit School Off-Market Tool - Account Approved!',
      html: emailHtml,
      tags: [
        { name: 'category', value: 'invitation' },
        { name: 'token', value: token }
      ],
    })

    if (error) {
      console.error('Failed to send invitation email:', error)
      return {
        id: '',
        success: false,
        error: error.message
      }
    }

    // Log email send
    await logEmailSend({
      type: 'INVITATION',
      recipient_email: email,
      recipient_name: name,
      subject: 'Welcome to Exit School Off-Market Tool - Account Approved!',
      provider_id: data.id,
      status: 'SENT',
      metadata: {
        token,
        company_name: companyName,
        expires_at: expiresAt
      }
    })

    return {
      id: data.id,
      success: true
    }

  } catch (error) {
    console.error('Invitation email error:', error)
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send report ready notification email
 */
export async function sendReportReadyEmail({
  email,
  userName,
  companyName,
  reportId,
  reportTier,
  generatedAt
}: {
  email: string
  userName?: string
  companyName: string
  reportId: string
  reportTier: 'ENHANCED' | 'BI'
  generatedAt: string
}): Promise<EmailResult> {
  try {
    const reportUrl = `${EMAIL_CONFIG.baseUrl}/user/reports/${reportId}`

    const emailHtml = render(ReportReadyEmail({
      userName,
      companyName,
      reportUrl,
      reportTier,
      generatedAt
    }))

    const tierLabel = reportTier === 'BI' ? 'Business Intelligence' : 'Enhanced Analysis'

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from.reports,
      to: email,
      subject: `Your ${tierLabel} Report for ${companyName} is Ready`,
      html: emailHtml,
      tags: [
        { name: 'category', value: 'report' },
        { name: 'tier', value: reportTier.toLowerCase() },
        { name: 'report_id', value: reportId }
      ],
    })

    if (error) {
      console.error('Failed to send report ready email:', error)
      return {
        id: '',
        success: false,
        error: error.message
      }
    }

    // Log email send
    await logEmailSend({
      type: 'REPORT_READY',
      recipient_email: email,
      recipient_name: userName,
      subject: `Your ${tierLabel} Report for ${companyName} is Ready`,
      provider_id: data.id,
      status: 'SENT',
      metadata: {
        company_name: companyName,
        report_id: reportId,
        report_tier: reportTier,
        generated_at: generatedAt
      }
    })

    return {
      id: data.id,
      success: true
    }

  } catch (error) {
    console.error('Report ready email error:', error)
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send campaign email with personalization
 */
export async function sendCampaignEmail({
  recipientEmail,
  recipientName,
  companyName,
  campaignId,
  templateData,
  senderInfo,
  trackingId
}: {
  recipientEmail: string
  recipientName?: string
  companyName: string
  campaignId: string
  templateData: {
    subject: string
    content: string
    callToAction?: {
      text: string
      url: string
    }
  }
  senderInfo: {
    name: string
    email: string
    company?: string
  }
  trackingId?: string
}): Promise<EmailResult> {
  try {
    // Generate tracking URLs if trackingId provided
    const unsubscribeUrl = trackingId 
      ? `${EMAIL_CONFIG.unsubscribeUrl}?id=${trackingId}` 
      : undefined

    const callToAction = templateData.callToAction ? {
      text: templateData.callToAction.text,
      url: trackingId 
        ? `${templateData.callToAction.url}?utm_source=email&utm_campaign=${campaignId}&utm_medium=campaign&tracking_id=${trackingId}`
        : templateData.callToAction.url
    } : undefined

    const emailHtml = render(CampaignEmail({
      recipientName,
      companyName,
      senderName: senderInfo.name,
      senderEmail: senderInfo.email,
      senderCompany: senderInfo.company,
      subject: templateData.subject,
      content: templateData.content,
      callToAction,
      unsubscribeUrl
    }))

    const { data, error } = await resend.emails.send({
      from: `${senderInfo.name} <${EMAIL_CONFIG.from.campaigns.split('<')[1].split('>')[0]}>`,
      to: recipientEmail,
      subject: templateData.subject,
      html: emailHtml,
      replyTo: senderInfo.email,
      tags: [
        { name: 'category', value: 'campaign' },
        { name: 'campaign_id', value: campaignId },
        ...(trackingId ? [{ name: 'tracking_id', value: trackingId }] : [])
      ],
    })

    if (error) {
      console.error('Failed to send campaign email:', error)
      return {
        id: '',
        success: false,
        error: error.message
      }
    }

    // Log email send
    await logEmailSend({
      type: 'CAMPAIGN',
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: templateData.subject,
      provider_id: data.id,
      status: 'SENT',
      campaign_id: campaignId,
      metadata: {
        company_name: companyName,
        sender_name: senderInfo.name,
        sender_email: senderInfo.email,
        tracking_id: trackingId
      }
    })

    return {
      id: data.id,
      success: true
    }

  } catch (error) {
    console.error('Campaign email error:', error)
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send bulk campaign emails with rate limiting
 */
export async function sendBulkCampaignEmails({
  campaignId,
  emails,
  templateData,
  senderInfo,
  rateLimitPerMinute = 30
}: {
  campaignId: string
  emails: Array<{
    email: string
    name?: string
    companyName: string
    trackingId?: string
  }>
  templateData: {
    subject: string
    content: string
    callToAction?: {
      text: string
      url: string
    }
  }
  senderInfo: {
    name: string
    email: string
    company?: string
  }
  rateLimitPerMinute?: number
}): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  }

  const delay = (60 / rateLimitPerMinute) * 1000 // Delay in milliseconds

  for (const emailData of emails) {
    try {
      const result = await sendCampaignEmail({
        recipientEmail: emailData.email,
        recipientName: emailData.name,
        companyName: emailData.companyName,
        campaignId,
        templateData,
        senderInfo,
        trackingId: emailData.trackingId
      })

      if (result.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`${emailData.email}: ${result.error}`)
      }

      // Rate limiting delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      results.failed++
      results.errors.push(`${emailData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}

/**
 * Get email metrics for a campaign
 */
export async function getEmailMetrics(campaignId: string): Promise<EmailMetrics> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('status, metadata')
      .eq('campaign_id', campaignId)

    if (error) {
      throw error
    }

    const metrics: EmailMetrics = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0
    }

    data?.forEach(log => {
      switch (log.status) {
        case 'SENT':
          metrics.sent++
          break
        case 'DELIVERED':
          metrics.delivered++
          break
        case 'BOUNCED':
          metrics.bounced++
          break
        case 'COMPLAINED':
          metrics.complained++
          break
      }
    })

    return metrics

  } catch (error) {
    console.error('Error getting email metrics:', error)
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0
    }
  }
}

/**
 * Log email send to database
 */
async function logEmailSend({
  type,
  recipient_email,
  recipient_name,
  subject,
  provider_id,
  status,
  campaign_id,
  metadata
}: {
  type: 'INVITATION' | 'REPORT_READY' | 'CAMPAIGN'
  recipient_email: string
  recipient_name?: string
  subject: string
  provider_id: string
  status: EmailStatus
  campaign_id?: string
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        type,
        recipient_email,
        recipient_name,
        subject,
        provider_id,
        status,
        campaign_id,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
        metadata: {
          ...metadata,
          provider: 'resend',
          timestamp: new Date().toISOString()
        }
      })

    if (error) {
      console.error('Failed to log email send:', error)
    }

  } catch (error) {
    console.error('Error logging email send:', error)
  }
}

/**
 * Handle Resend webhook events for email tracking
 */
export async function handleEmailWebhook(event: {
  type: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    [key: string]: any
  }
}): Promise<void> {
  try {
    let status: EmailStatus

    switch (event.type) {
      case 'email.sent':
        status = 'SENT'
        break
      case 'email.delivered':
        status = 'DELIVERED'
        break
      case 'email.delivery_delayed':
        status = 'PENDING'
        break
      case 'email.bounced':
        status = 'BOUNCED'
        break
      case 'email.complained':
        status = 'COMPLAINED'
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
        return
    }

    // Update email log status
    const { error } = await supabase
      .from('email_logs')
      .update({
        status,
        delivered_at: status === 'DELIVERED' ? new Date().toISOString() : null,
        bounced_at: status === 'BOUNCED' ? new Date().toISOString() : null,
        complained_at: status === 'COMPLAINED' ? new Date().toISOString() : null,
        metadata: {
          webhook_data: event.data,
          updated_at: new Date().toISOString()
        }
      })
      .eq('provider_id', event.data.email_id)

    if (error) {
      console.error('Failed to update email status:', error)
    }

  } catch (error) {
    console.error('Error handling email webhook:', error)
  }
}

/**
 * Validate email template variables
 */
export function validateEmailTemplate(
  template: string,
  variables: Record<string, string>
): { isValid: boolean; missingVariables: string[] } {
  const variableRegex = /\{\{\s*(\w+)\s*\}\}/g
  const templateVariables = []
  let match

  while ((match = variableRegex.exec(template)) !== null) {
    templateVariables.push(match[1])
  }

  const missingVariables = templateVariables.filter(
    variable => !(variable in variables)
  )

  return {
    isValid: missingVariables.length === 0,
    missingVariables
  }
}

/**
 * Replace template variables in email content
 */
export function replaceEmailVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, variable) => {
    return variables[variable] || match
  })
}