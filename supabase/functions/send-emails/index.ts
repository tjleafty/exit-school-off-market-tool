import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailCampaignRequest {
  campaignId?: string
  userId?: string
  immediate?: boolean
}

interface EmailData {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { campaignId, userId, immediate = false }: EmailCampaignRequest = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let emailsSent = 0
    let emailsFailed = 0

    if (campaignId) {
      // Send emails for specific campaign
      const result = await processCampaignEmails(supabase, campaignId, immediate)
      emailsSent = result.sent
      emailsFailed = result.failed
    } else if (userId) {
      // Process all active campaigns for user
      const result = await processUserCampaigns(supabase, userId, immediate)
      emailsSent = result.sent
      emailsFailed = result.failed
    } else {
      // Process all active campaigns (scheduled job)
      const result = await processAllActiveCampaigns(supabase, immediate)
      emailsSent = result.sent
      emailsFailed = result.failed
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent,
        emailsFailed,
        message: `Email campaign processing completed. Sent: ${emailsSent}, Failed: ${emailsFailed}`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Email campaign error:', error)

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function processCampaignEmails(
  supabase: any,
  campaignId: string,
  immediate = false
): Promise<{ sent: number; failed: number }> {
  
  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      *,
      email_templates(*),
      users(name, email)
    `)
    .eq('id', campaignId)
    .eq('is_active', true)
    .single()

  if (campaignError || !campaign) {
    throw new Error(`Campaign not found or inactive: ${campaignError?.message}`)
  }

  // Check if it's time to send (skip if immediate is true)
  if (!immediate && !isTimeToSend(campaign)) {
    return { sent: 0, failed: 0 }
  }

  // Get outreach targets that are due for sending
  const { data: targets, error: targetsError } = await supabase
    .from('outreach_targets')
    .select(`
      *,
      companies(
        name,
        website,
        enrichments(owner_name, owner_email)
      )
    `)
    .eq('campaign_id', campaignId)

  if (targetsError) {
    throw new Error(`Failed to fetch targets: ${targetsError.message}`)
  }

  let sent = 0
  let failed = 0

  for (const target of targets) {
    try {
      // Check if we should send to this target
      if (!shouldSendToTarget(target, campaign, immediate)) {
        continue
      }

      const company = target.companies
      const enrichment = company.enrichments?.[0]

      if (!enrichment?.owner_email) {
        console.log(`Skipping ${company.name} - no email available`)
        continue
      }

      // Generate personalized email
      const emailData = await generatePersonalizedEmail(
        campaign,
        company,
        enrichment
      )

      // Send email
      await sendEmail(emailData)

      // Log successful send
      await logEmailSent(supabase, {
        campaignId: campaign.id,
        companyId: company.id,
        recipientEmail: enrichment.owner_email,
        subject: emailData.subject,
        status: 'SENT'
      })

      // Update outreach target
      await supabase
        .from('outreach_targets')
        .update({
          last_sent_at: new Date().toISOString(),
          send_count: target.send_count + 1
        })
        .eq('id', target.id)

      sent++
      console.log(`Email sent to ${enrichment.owner_email} for ${company.name}`)

    } catch (error) {
      console.error(`Failed to send email to ${target.companies.name}:`, error)
      
      // Log failed send
      await logEmailSent(supabase, {
        campaignId: campaign.id,
        companyId: target.companies.id,
        recipientEmail: target.companies.enrichments?.[0]?.owner_email || 'unknown',
        subject: campaign.email_templates?.subject || 'Email Campaign',
        status: 'FAILED',
        errorMessage: error.message
      })
      
      failed++
    }
  }

  return { sent, failed }
}

async function processUserCampaigns(
  supabase: any,
  userId: string,
  immediate = false
): Promise<{ sent: number; failed: number }> {
  
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  let totalSent = 0
  let totalFailed = 0

  for (const campaign of campaigns || []) {
    const result = await processCampaignEmails(supabase, campaign.id, immediate)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return { sent: totalSent, failed: totalFailed }
}

async function processAllActiveCampaigns(
  supabase: any,
  immediate = false
): Promise<{ sent: number; failed: number }> {
  
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, user_id')
    .eq('is_active', true)

  let totalSent = 0
  let totalFailed = 0

  for (const campaign of campaigns || []) {
    const result = await processCampaignEmails(supabase, campaign.id, immediate)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return { sent: totalSent, failed: totalFailed }
}

function isTimeToSend(campaign: any): boolean {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours()
  
  // Check if today matches the campaign's scheduled weekday
  if (campaign.weekday !== currentDay) {
    return false
  }
  
  // Check if current hour matches the campaign's scheduled hour
  if (campaign.hour !== currentHour) {
    return false
  }
  
  return true
}

function shouldSendToTarget(target: any, campaign: any, immediate: boolean): boolean {
  // Always send if immediate is true
  if (immediate) {
    return true
  }

  // Check max sends limit
  if (campaign.max_sends && target.send_count >= campaign.max_sends) {
    return false
  }

  // Check if we've sent recently (don't spam)
  if (target.last_sent_at) {
    const lastSent = new Date(target.last_sent_at)
    const daysSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
    
    // Don't send more than once per week
    if (daysSinceLastSent < 7) {
      return false
    }
  }

  return true
}

async function generatePersonalizedEmail(
  campaign: any,
  company: any,
  enrichment: any
): Promise<EmailData> {
  
  const template = campaign.email_templates
  const user = campaign.users
  
  if (!template) {
    throw new Error('No email template found for campaign')
  }

  // Template variables for personalization
  const variables = {
    company_name: company.name,
    owner_name: enrichment.owner_name || 'Hello',
    industry: campaign.industry || 'your industry',
    sender_name: user.name || 'Exit School Team',
    website: company.website || company.name
  }

  // Replace template variables in subject and content
  let subject = template.subject
  let content = template.content

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    subject = subject.replace(regex, value as string)
    content = content.replace(regex, value as string)
  }

  // Convert plain text to HTML
  const htmlContent = content
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  return {
    to: enrichment.owner_email,
    subject: subject,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${htmlContent}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This email was sent by Exit School. 
            <a href="mailto:${user.email}">Reply directly</a> to continue the conversation.
          </p>
        </body>
      </html>
    `,
    from: `${user.name} <${user.email}>`,
    replyTo: user.email
  }
}

async function sendEmail(emailData: EmailData): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable not found')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailData.from || 'Exit School <hello@exitschool.com>',
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
      reply_to: emailData.replyTo || emailData.from
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Resend API error: ${errorData.message || response.statusText}`)
  }

  const result = await response.json()
  console.log('Email sent successfully:', result.id)
}

async function logEmailSent(
  supabase: any,
  logData: {
    campaignId: string
    companyId: string
    recipientEmail: string
    subject: string
    status: string
    errorMessage?: string
  }
): Promise<void> {
  
  const { error } = await supabase
    .from('email_logs')
    .insert({
      campaign_id: logData.campaignId,
      company_id: logData.companyId,
      recipient_email: logData.recipientEmail,
      subject: logData.subject,
      status: logData.status,
      sent_at: logData.status === 'SENT' ? new Date().toISOString() : null,
      error_message: logData.errorMessage,
      metadata: {
        user_agent: 'edge-function-send-emails',
        timestamp: new Date().toISOString()
      }
    })

  if (error) {
    console.error('Failed to log email:', error)
  }
}