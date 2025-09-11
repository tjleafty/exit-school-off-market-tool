import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    console.log('=== GENERATING BUSINESS INTELLIGENCE REPORT ===')
    
    const body = await request.json()
    const { companyId, tier = 'BI', userId } = body
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    console.log(`Generating ${tier} report for company ${companyId}`)

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('Company fetch error:', companyError)
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    console.log('Found company:', company.name)

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('reports')
      .select('*')
      .eq('company_id', companyId)
      .eq('tier', tier)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingReport) {
      console.log('Report already exists, returning existing report')
      return NextResponse.json({
        success: true,
        data: existingReport,
        message: 'Report already exists'
      })
    }

    // If BI report, automatically enrich company first
    if (tier === 'BI' && !company.is_enriched) {
      console.log('BI report requested - enriching company first...')
      
      try {
        const enrichResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/companies/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: companyId,
            companyData: company
          })
        })

        const enrichResult = await enrichResponse.json()
        
        if (enrichResult.success) {
          console.log('Company enriched successfully')
          // Update company data with enriched information
          company.is_enriched = true
          Object.assign(company, enrichResult.data)
        } else {
          console.log('Enrichment failed, proceeding with basic data')
        }
      } catch (enrichError) {
        console.error('Enrichment error:', enrichError)
        console.log('Proceeding with report generation without enrichment')
      }
    }

    // Call the Supabase Edge Function to generate the report
    try {
      console.log('Calling generate-report edge function...')
      
      const { data: reportResult, error: reportError } = await supabase.functions.invoke('generate-report', {
        body: {
          companyId: companyId,
          userId: userId || 'system',
          tier: tier
        }
      })

      if (reportError) {
        console.error('Report generation error:', reportError)
        return NextResponse.json(
          { error: 'Failed to generate report', details: reportError.message },
          { status: 500 }
        )
      }

      console.log('Report generated successfully')

      // Get the newly created report
      const { data: newReport, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('company_id', companyId)
        .eq('tier', tier)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) {
        console.error('Error fetching generated report:', fetchError)
        return NextResponse.json(
          { error: 'Report generated but could not retrieve' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: newReport,
        message: `${tier} report generated successfully!`
      })

    } catch (error) {
      console.error('Edge function call error:', error)
      
      // Fallback: Create a basic report entry in the database
      const basicReport = {
        company_id: companyId,
        user_id: userId || 'system',
        tier: tier,
        content_json: {
          executive_summary: `Business Intelligence report for ${company.name}`,
          company_overview: `${company.name} is located at ${company.formatted_address || company.location}`,
          key_personnel: 'Data enrichment required for detailed personnel information',
          growth_opportunities: 'Comprehensive analysis requires additional data enrichment',
          recommendations: 'Consider running data enrichment to unlock detailed insights',
          data_sources: ['Google Places API', 'Company Database'],
          generated_at: new Date().toISOString()
        },
        content_html: `<h1>Business Intelligence Report: ${company.name}</h1><p>Basic report generated. For comprehensive analysis, please ensure company data is enriched.</p>`
      }

      const { data: fallbackReport, error: insertError } = await supabase
        .from('reports')
        .insert([basicReport])
        .select()
        .single()

      if (insertError) {
        console.error('Fallback report creation error:', insertError)
        return NextResponse.json(
          { error: 'Failed to generate report' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: fallbackReport,
        message: `Basic ${tier} report generated successfully!`,
        note: 'For comprehensive analysis, ensure the Supabase Edge Function is properly configured.'
      })
    }

  } catch (error) {
    console.error('=== REPORT GENERATION ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error.message)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate report',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}