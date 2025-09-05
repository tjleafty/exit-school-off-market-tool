import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify request is from Vercel Cron
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Processing enrichments cron job started')

    // Get companies that need enrichment (created recently or never enriched)
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        website,
        phone,
        address,
        enrichments!left(
          id,
          status,
          enriched_at
        )
      `)
      .or('enrichments.is.null,enrichments.status.eq.PENDING')
      .limit(50) // Process in batches

    if (error) {
      throw error
    }

    let processed = 0
    let failed = 0

    for (const company of companies || []) {
      try {
        // Call enrichment edge function
        const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/enrich-company`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyId: company.id
          })
        })

        if (response.ok) {
          processed++
          console.log(`Enriched company: ${company.name}`)
        } else {
          failed++
          console.error(`Failed to enrich ${company.name}:`, await response.text())
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        failed++
        console.error(`Error processing ${company.name}:`, error)
      }
    }

    console.log(`Enrichment cron job completed. Processed: ${processed}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      processed,
      failed,
      message: `Processed ${processed} companies, ${failed} failed`
    })

  } catch (error) {
    console.error('Enrichment cron job error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'process-enrichments',
    timestamp: new Date().toISOString()
  })
}