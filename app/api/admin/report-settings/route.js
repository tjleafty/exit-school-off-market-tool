import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET() {
  try {
    console.log('=== ADMIN REPORT SETTINGS API - GET ===')
    
    // Fetch report settings from database
    const { data: settings, error } = await supabase
      .from('report_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no settings found, return default settings
      if (error.code === 'PGRST116') {
        console.log('No report settings found, returning defaults')
        return NextResponse.json({
          success: true,
          settings: getDefaultSettings()
        })
      }
      throw error
    }

    console.log('Report settings fetched successfully')
    return NextResponse.json({
      success: true,
      settings: settings.settings_data
    })

  } catch (error) {
    console.error('=== ERROR FETCHING REPORT SETTINGS ===')
    console.error('Error details:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch report settings',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    console.log('=== ADMIN REPORT SETTINGS API - POST ===')
    
    const { settings } = await request.json()
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings data is required' },
        { status: 400 }
      )
    }

    console.log('Validating settings structure...')
    validateSettings(settings)

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('report_settings')
      .select('id')
      .limit(1)
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      console.log('Updating existing report settings...')
      result = await supabase
        .from('report_settings')
        .update({
          settings_data: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)
        .select()
        .single()
    } else {
      // Create new settings
      console.log('Creating new report settings...')
      result = await supabase
        .from('report_settings')
        .insert({
          settings_data: settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      throw result.error
    }

    console.log('Report settings saved successfully')
    return NextResponse.json({
      success: true,
      message: 'Report settings saved successfully',
      settings: result.data.settings_data
    })

  } catch (error) {
    console.error('=== ERROR SAVING REPORT SETTINGS ===')
    console.error('Error details:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save report settings',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

function validateSettings(settings) {
  const requiredReportTypes = ['enhanced', 'bi']
  const requiredEnhancedSections = [
    'system_prompt',
    'executive_summary', 
    'company_overview',
    'company_owner_info',
    'employees',
    'revenue',
    'growth_opportunities',
    'recommendations'
  ]
  const requiredBISections = [
    'system_prompt',
    'executive_summary',
    'company_overview', 
    'market_analysis',
    'financial_insights',
    'key_personnel',
    'growth_opportunities',
    'risk_assessment',
    'recommendations'
  ]

  for (const reportType of requiredReportTypes) {
    if (!settings[reportType]) {
      throw new Error(`Missing ${reportType} report settings`)
    }

    const sections = reportType === 'enhanced' ? requiredEnhancedSections : requiredBISections
    for (const section of sections) {
      const sectionData = settings[reportType][section]
      
      // Handle enriched data sections (objects with prompt and api)
      if (reportType === 'enhanced' && ['company_owner_info', 'employees', 'revenue'].includes(section)) {
        if (!sectionData || typeof sectionData !== 'object') {
          throw new Error(`Missing or invalid ${section} in ${reportType} settings`)
        }
        if (!sectionData.prompt || typeof sectionData.prompt !== 'string') {
          throw new Error(`Missing or invalid prompt in ${section} for ${reportType} settings`)
        }
        if (!sectionData.api || typeof sectionData.api !== 'string') {
          throw new Error(`Missing or invalid api in ${section} for ${reportType} settings`)
        }
      } else {
        // Handle regular sections (strings)
        if (!sectionData || typeof sectionData !== 'string') {
          throw new Error(`Missing or invalid ${section} in ${reportType} settings`)
        }
      }
    }
  }
}

function getDefaultSettings() {
  return {
    enhanced: {
      system_prompt: "You are a business analyst creating an enhanced company overview report. Provide clear, concise insights about the company's potential and key opportunities. Keep the analysis practical and focused on immediate opportunities.",
      executive_summary: "Generate a comprehensive 2-3 paragraph executive summary that highlights the company's key strengths, market position, and primary opportunities for partnership or engagement.",
      company_overview: "Provide a detailed analysis of the company's operations, market presence, and competitive positioning based on available data.",
      company_owner_info: {
        prompt: "Analyze company ownership, leadership structure, and key decision makers based on enriched data. Include owner contact information, background, and decision-making authority for partnership discussions.",
        api: "hunter"
      },
      employees: {
        prompt: "Evaluate company size, employee count, organizational structure, and workforce composition using available data. Assess team capabilities and organizational maturity for partnership evaluation.",
        api: "apollo"
      },
      revenue: {
        prompt: "Assess financial performance, revenue estimates, and business scale based on available financial data. Include growth indicators and financial health assessment for partnership viability.",
        api: "zoominfo"
      },
      growth_opportunities: "Identify specific growth opportunities, partnership potential, and areas for business development collaboration.",
      recommendations: "Provide actionable recommendations for engagement, partnership approaches, and next steps for business development."
    },
    bi: {
      system_prompt: "You are a business intelligence analyst creating a comprehensive B2B company report. Generate detailed insights with market analysis, financial projections, and strategic recommendations. Focus on data-driven insights and actionable intelligence.",
      executive_summary: "Create an executive summary that provides strategic insights into the company's market position, financial health, and growth trajectory with specific recommendations for stakeholders.",
      company_overview: "Deliver a comprehensive analysis of the company's business model, operations, competitive landscape, and market positioning with supporting data and metrics.",
      market_analysis: "Perform comprehensive market analysis including industry trends, competitive positioning, market size, growth projections, and sector-specific opportunities and challenges.",
      financial_insights: "Analyze financial performance, revenue trends, profitability indicators, and provide financial projections based on available data and industry benchmarks.",
      key_personnel: "Conduct detailed analysis of leadership team, key personnel, organizational structure, and assess management capabilities and track record.",
      growth_opportunities: "Identify and evaluate strategic growth opportunities including market expansion, product development, partnerships, and investment potential with supporting analysis.",
      risk_assessment: "Evaluate potential risks including market risks, competitive threats, operational challenges, financial risks, and regulatory considerations with mitigation strategies.",
      recommendations: "Provide strategic recommendations with specific action items, investment considerations, partnership strategies, and detailed implementation roadmap."
    }
  }
}