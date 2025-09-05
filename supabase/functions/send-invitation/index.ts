import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationRequest {
  userId: string
  token: string
  userEmail?: string
  userName?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, token, userEmail, userName }: InvitationRequest = await req.json()

    if (!userId || !token) {
      throw new Error('Missing required parameters: userId and token')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user and invitation details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('user_id', userId)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      throw new Error(`Invitation not found: ${invitationError?.message}`)
    }

    // Check if invitation is still valid
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired')
    }

    // Send invitation email using the API
    const emailResponse = await fetch(`${Deno.env.get('NEXT_PUBLIC_APP_URL')}/api/email/invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        email: user.email,
        name: user.name || 'User',
        token: token,
        expiresAt: invitation.expires_at
      })
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json()
      throw new Error(`Failed to send email: ${errorData.error}`)
    }

    // Update invitation status
    await supabase
      .from('invitations')
      .update({ 
        sent_at: new Date().toISOString(),
        status: 'SENT' 
      })
      .eq('id', invitation.id)

    console.log(`Invitation sent to ${user.email}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Invitation sent to ${user.email}`,
        token: token
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Send invitation error:', error)

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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

async function sendInvitationEmail({
  email,
  name,
  token,
  expiresAt
}: {
  email: string
  name: string
  token: string
  expiresAt: string
}): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable not found')
  }

  const baseUrl = Deno.env.get('NEXT_PUBLIC_BASE_URL') || 'http://localhost:3000'
  const invitationUrl = `${baseUrl}/signup?token=${token}`
  
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Exit School Off-Market Tool</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Welcome to Exit School</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Off-Market Tool</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">Your Account Has Been Approved! 🎉</h2>
            
            <p style="margin-bottom: 20px; font-size: 16px;">
              Hi ${name},
            </p>
            
            <p style="margin-bottom: 20px; font-size: 16px;">
              Great news! Your request for access to the <strong>Exit School Off-Market Tool</strong> has been approved. 
              You can now complete your account setup and start discovering off-market business opportunities.
            </p>

            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #495057; font-size: 18px;">What's Next?</h3>
              <ol style="margin: 15px 0; padding-left: 20px; color: #6c757d;">
                <li style="margin-bottom: 8px;">Click the invitation link below</li>
                <li style="margin-bottom: 8px;">Create your secure password</li>
                <li style="margin-bottom: 8px;">Start exploring the platform</li>
              </ol>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                Complete Account Setup
              </a>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                ⏰ <strong>Important:</strong> This invitation link expires on <strong>${expiresDate}</strong>. 
                Please complete your account setup before this date.
              </p>
            </div>

            <p style="margin-bottom: 20px; font-size: 16px;">
              If you have any questions or need assistance, please don't hesitate to reach out to our support team.
            </p>

            <p style="margin-bottom: 10px; font-size: 16px;">
              Best regards,<br>
              <strong>The Exit School Team</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              This email was sent to ${email}. If you didn't request access to Exit School Off-Market Tool, 
              please ignore this email.
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #adb5bd;">
              © ${new Date().getFullYear()} Exit School. All rights reserved.
            </p>
          </div>

        </div>
      </body>
    </html>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Exit School <noreply@exitschool.com>',
      to: [email],
      subject: 'Welcome to Exit School Off-Market Tool - Account Approved!',
      html: htmlContent,
      text: `
        Hi ${name},

        Your request for access to the Exit School Off-Market Tool has been approved!

        Complete your account setup by visiting:
        ${invitationUrl}

        This invitation expires on ${expiresDate}.

        Best regards,
        The Exit School Team
      `.trim()
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Resend API error: ${errorData.message || response.statusText}`)
  }

  const result = await response.json()
  console.log('Invitation email sent successfully:', result.id)
}