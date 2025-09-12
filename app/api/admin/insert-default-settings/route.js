import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST() {
  try {
    console.log('=== INSERTING DEFAULT REPORT SETTINGS ===')
    
    // Check if table exists and has data
    const { data: existingData, error: checkError } = await supabase
      .from('report_settings')
      .select('id')
      .limit(1)
    
    if (checkError) {
      console.error('Error checking table:', checkError)
      return NextResponse.json({
        success: false,
        error: 'Report settings table does not exist. Please run the table creation SQL first.',
        tableExists: false
      }, { status: 400 })
    }
    
    if (existingData && existingData.length > 0) {
      console.log('Default settings already exist')
      return NextResponse.json({
        success: true,
        message: 'Default settings already exist',
        alreadyExists: true
      })
    }
    
    console.log('Inserting default settings...')
    
    const defaultSettings = {
      enhanced: {
        system_prompt: "You are a business analyst creating an enhanced company overview report. Provide clear, concise insights about the company's potential and key opportunities. Keep the analysis practical and focused on immediate opportunities.",
        company_owner_info: {
          prompt: "Analyze company ownership, leadership structure, and key decision makers based on enriched data. Include owner contact information, background, and decision-making authority for partnership discussions.",
          api: "hunter"
        },
        employees: {
          prompt: "Evaluate company size, employee count, organizational structure, and workforce composition using available data. Assess team capabilities and organizational maturity for partnership evaluation.",
          api: "apollo"
        },
        company_structure: {
          prompt: "Analyze company structure, organizational hierarchy, business model, and operational framework using available data. Assess corporate structure and organizational maturity for partnership evaluation.",
          api: "zoominfo"
        }
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
    
    const { data, error } = await supabase
      .from('report_settings')
      .insert({
        settings_data: defaultSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error inserting default settings:', error)
      throw error
    }
    
    console.log('Default settings inserted successfully')
    return NextResponse.json({
      success: true,
      message: 'Default report settings inserted successfully',
      settingsId: data.id
    })
    
  } catch (error) {
    console.error('=== ERROR INSERTING DEFAULT SETTINGS ===')
    console.error('Error details:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert default settings',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}