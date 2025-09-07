import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET all API keys (returns masked keys)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('service, status, last_tested')
      .order('service', { ascending: true })

    if (error) throw error

    // Transform to expected format
    const apiKeys = {}
    data.forEach(key => {
      apiKeys[key.service] = {
        value: key.status === 'Connected' ? '••••••••' : '',
        status: key.status
      }
    })

    // Ensure all services exist
    const services = ['openai', 'google_places', 'hunter', 'apollo', 'zoominfo', 'resend']
    services.forEach(service => {
      if (!apiKeys[service]) {
        apiKeys[service] = { value: '', status: 'Not Connected' }
      }
    })

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    )
  }
}

// POST save/update API key
export async function POST(request) {
  try {
    const body = await request.json()
    const { service, value, status } = body

    // In production, you should encrypt the API key before storing
    // For now, we'll store a masked version
    const { data, error } = await supabase
      .from('api_keys')
      .upsert({
        service,
        encrypted_key: value ? '••••••••' : null, // In production, encrypt this
        status: status || 'Saved',
        last_tested: status === 'Connected' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}