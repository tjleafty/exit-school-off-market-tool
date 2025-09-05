import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface TestEmailRequest {
  to: string
  subject: string
  content: string
  templateType: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, content, templateType }: TestEmailRequest = await request.json()

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      )
    }

    // Convert plain text content to HTML
    const htmlContent = content
      .split('\n\n')
      .filter(paragraph => paragraph.trim().length > 0)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email - ${templateType}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
            <h3 style="margin: 0; color: #007bff; font-size: 14px; text-transform: uppercase;">
              🧪 Test Email - ${templateType} Template
            </h3>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #6c757d;">
              This is a test email sent from your Exit School dashboard
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 8px; border: 1px solid #e9ecef;">
            ${htmlContent}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d; text-align: center;">
            <p>This test email was sent from Exit School Off-Market Tool</p>
            <p>Generated at ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `

    // Send test email
    const { data, error } = await resend.emails.send({
      from: 'Exit School Test <test@exitschool.com>',
      to: to,
      subject: `[TEST] ${subject}`,
      html: emailHtml,
      tags: [
        { name: 'category', value: 'test' },
        { name: 'template_type', value: templateType }
      ],
    })

    if (error) {
      console.error('Failed to send test email:', error)
      return NextResponse.json(
        { error: 'Failed to send test email', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: data.id,
      message: 'Test email sent successfully'
    })

  } catch (error) {
    console.error('Test email API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}