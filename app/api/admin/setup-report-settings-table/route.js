import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST() {
  try {
    console.log('=== SETTING UP REPORT SETTINGS TABLE ===')
    
    // First, check if table already exists
    console.log('Checking if report_settings table exists...')
    const { data: existingData, error: checkError } = await supabase
      .from('report_settings')
      .select('id')
      .limit(1)
    
    if (!checkError) {
      console.log('Table already exists with data')
      return NextResponse.json({
        success: true,
        message: 'Report settings table already exists and is accessible',
        tableExists: true,
        hasData: existingData && existingData.length > 0
      })
    }
    
    if (checkError.code !== 'PGRST205') {
      console.error('Unexpected error checking table:', checkError)
      throw checkError
    }
    
    console.log('Table does not exist, attempting to create it...')
    
    // Try to insert default data - this will create the table if it doesn't exist
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
    
    console.log('Attempting to create table by inserting default settings...')
    const { data: insertData, error: insertError } = await supabase
      .from('report_settings')
      .insert({
        settings_data: defaultSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting default settings:', insertError)
      
      if (insertError.code === 'PGRST205') {
        return NextResponse.json({
          success: false,
          error: 'Table does not exist and cannot be created automatically. Please run the database migration manually.',
          needsManualSetup: true,
          migrationFile: 'supabase/migrations/004_report_settings.sql'
        }, { status: 400 })
      }
      
      throw insertError
    }
    
    console.log('Successfully created table and inserted default settings')
    return NextResponse.json({
      success: true,
      message: 'Report settings table created successfully with default settings',
      tableCreated: true,
      settingsId: insertData.id
    })
    
  } catch (error) {
    console.error('=== ERROR SETTING UP REPORT SETTINGS TABLE ===')
    console.error('Error details:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup report settings table',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}