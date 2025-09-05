import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { handleEmailWebhook } from '@/lib/email'
import crypto from 'crypto'

// Resend webhook signature verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Get request body and signature
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('resend-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(body, signature, webhookSecret)

    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const event = JSON.parse(body)

    // Validate event structure
    if (!event.type || !event.data || !event.data.email_id) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Handle the webhook event
    await handleEmailWebhook(event)

    console.log(`Successfully processed webhook event: ${event.type} for email ${event.data.email_id}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'resend-webhook',
    timestamp: new Date().toISOString()
  })
}