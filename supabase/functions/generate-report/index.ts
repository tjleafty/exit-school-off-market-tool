import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  companyId: string
  userId: string
  tier: 'ENHANCED' | 'BI'
}

interface ReportContent {
  executive_summary: string
  company_overview: string
  market_analysis?: string
  financial_insights?: string
  key_personnel: string
  growth_opportunities: string
  risk_assessment?: string
  recommendations: string
  data_sources: string[]
  generated_at: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { companyId, userId, tier }: ReportRequest = await req.json()
    
    if (!companyId || !userId || !tier) {
      throw new Error('Missing required parameters: companyId, userId, tier')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`Generating ${tier} report for company ${companyId} by user ${userId}`)

    // Fetch report settings from database
    const { data: reportSettings } = await supabase
      .from('report_settings')
      .select('settings_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Use custom settings if available, otherwise fallback to defaults
    const settings = reportSettings?.settings_data || getDefaultPromptSettings()
    console.log('Using report settings:', settings ? 'custom' : 'default')

    // Fetch company and enrichment data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(`
        *,
        enrichments(*),
        searches(*)
      `)
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`)
    }

    // Verify user has access to this company
    const { data: userCheck } = await supabase
      .from('searches')
      .select('user_id')
      .eq('id', company.search_id)
      .eq('user_id', userId)
      .single()

    if (!userCheck) {
      throw new Error('User does not have access to this company')
    }

    // Generate report with OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!
    })

    const reportContent = await generateReportWithAI(openai, company, tier, settings)
    const reportHtml = generateHTML(reportContent, company, tier)

    // Save report to database
    const { data: report, error: saveError } = await supabase.rpc('create_report', {
      p_company_id: companyId,
      p_user_id: userId,
      p_tier: tier,
      p_content_json: reportContent,
      p_content_html: reportHtml
    })

    if (saveError) {
      throw saveError
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_user_id: userId,
      p_action: 'REPORT_GENERATED',
      p_entity: 'REPORT',
      p_entity_id: report,
      p_metadata: {
        company_name: company.name,
        tier: tier,
        word_count: reportContent.executive_summary.split(' ').length
      }
    })

    // Send report ready email notification
    try {
      await fetch(`${Deno.env.get('NEXT_PUBLIC_APP_URL')}/api/email/report-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          reportId: report,
          companyName: company.name,
          tier: tier,
          userId: userId
        })
      })
    } catch (emailError) {
      console.error('Failed to send report ready email:', emailError)
      // Don't fail the report generation if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reportId: report,
        companyName: company.name,
        tier: tier,
        message: `${tier} report generated successfully`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Report generation error:', error)

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

async function generateReportWithAI(
  openai: OpenAI, 
  company: any, 
  tier: 'ENHANCED' | 'BI',
  settings: any
): Promise<ReportContent> {
  const enrichment = company.enrichments?.[0] || {}
  const search = company.searches
  
  // Build context for AI
  const context = {
    company_name: company.name,
    website: company.website,
    phone: company.phone,
    address: company.address,
    rating: company.rating,
    review_count: company.review_count,
    industry: search?.industry,
    city: search?.city,
    state: search?.state,
    owner_name: enrichment.owner_name,
    owner_email: enrichment.owner_email,
    owner_phone: enrichment.owner_phone,
    employee_count: enrichment.employee_count,
    revenue: enrichment.revenue,
    confidence: enrichment.confidence
  }

  // Use custom system prompt from settings or fallback to default
  const reportTypeSettings = settings[tier.toLowerCase()]
  const systemPrompt = reportTypeSettings?.system_prompt || (tier === 'BI' ? 
    `You are a business intelligence analyst creating a comprehensive B2B company report. 
     Generate detailed insights with market analysis, financial projections, and strategic recommendations.
     Focus on data-driven insights and actionable intelligence.` :
    `You are a business analyst creating an enhanced company overview report.
     Provide clear, concise insights about the company's potential and key opportunities.
     Keep the analysis practical and focused on immediate opportunities.`)

  const userPrompt = `Generate a ${tier.toLowerCase()} business report for the following company:

Company Information:
- Name: ${context.company_name}
- Website: ${context.website || 'Not available'}
- Location: ${context.address || `${context.city}, ${context.state}`}
- Industry: ${context.industry}
- Phone: ${context.phone || 'Not available'}
- Rating: ${context.rating ? `${context.rating}/5.0` : 'Not available'}
- Reviews: ${context.review_count || 'Not available'}

Enrichment Data:
- Owner: ${context.owner_name || 'Not identified'}
- Owner Email: ${context.owner_email || 'Not available'}  
- Owner Phone: ${context.owner_phone || 'Not available'}
- Employee Count: ${context.employee_count || 'Not available'}
- Annual Revenue: ${context.revenue ? `$${context.revenue.toLocaleString()}` : 'Not available'}
- Data Confidence: ${context.confidence ? `${Math.round(context.confidence * 100)}%` : 'Low'}

Please provide a structured report with the following sections:
1. Executive Summary (2-3 paragraphs)
2. Company Overview (detailed analysis)
${tier === 'BI' ? '3. Market Analysis (industry position, competitive landscape)' : ''}
${tier === 'BI' ? '4. Financial Insights (revenue analysis, growth projections)' : ''}
3. Key Personnel (based on available data)
4. Growth Opportunities (specific recommendations)
${tier === 'BI' ? '5. Risk Assessment (potential challenges and mitigation)' : ''}
5. Recommendations (actionable next steps)

Make the report professional, data-driven, and actionable.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: tier === 'BI' ? 2000 : 1200,
      temperature: 0.3
    })

    const content = completion.choices[0]?.message?.content || ''
    
    // Parse the AI response into structured sections using custom prompts
    const reportContent: ReportContent = {
      executive_summary: extractSection(content, 'Executive Summary') || 
        generateFallbackContent('executive_summary', reportTypeSettings, company, context),
      company_overview: extractSection(content, 'Company Overview') ||
        generateFallbackContent('company_overview', reportTypeSettings, company, context),
      key_personnel: extractSection(content, 'Key Personnel') ||
        generateFallbackContent('key_personnel', reportTypeSettings, company, context),
      growth_opportunities: extractSection(content, 'Growth Opportunities') ||
        generateFallbackContent('growth_opportunities', reportTypeSettings, company, context),
      recommendations: extractSection(content, 'Recommendations') ||
        generateFallbackContent('recommendations', reportTypeSettings, company, context),
      data_sources: buildDataSources(enrichment.sources || {}),
      generated_at: new Date().toISOString()
    }

    // Add BI-specific sections
    if (tier === 'BI') {
      reportContent.market_analysis = extractSection(content, 'Market Analysis') ||
        generateFallbackContent('market_analysis', reportTypeSettings, company, context)
      reportContent.financial_insights = extractSection(content, 'Financial Insights') ||
        generateFallbackContent('financial_insights', reportTypeSettings, company, context)
      reportContent.risk_assessment = extractSection(content, 'Risk Assessment') ||
        generateFallbackContent('risk_assessment', reportTypeSettings, company, context)
    }

    return reportContent

  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback report if AI fails
    return createFallbackReport(company, tier, context)
  }
}

function generateFallbackContent(section: string, settings: any, company: any, context: any): string {
  // Use custom prompt as guidance for fallback content if available
  const customPrompt = settings?.[section]
  
  // Default fallbacks based on section
  const defaults = {
    executive_summary: `This report provides an analysis of ${company.name} based on available data.`,
    company_overview: `${company.name} is a ${context.industry} company located in ${context.city}, ${context.state}.`,
    key_personnel: `Primary contact: ${context.owner_name || 'Not identified'}`,
    growth_opportunities: 'Opportunities for growth and partnership to be explored.',
    recommendations: 'Further research recommended to identify specific partnership opportunities.',
    market_analysis: `Market analysis for ${context.industry} sector in ${context.city}, ${context.state}.`,
    financial_insights: `Financial analysis based on available revenue data: ${context.revenue ? `$${context.revenue.toLocaleString()}` : 'Limited financial data available'}.`,
    risk_assessment: 'Standard business risks apply. Further due diligence recommended.'
  }
  
  return defaults[section] || 'Content not available for this section.'
}

function extractSection(content: string, sectionName: string): string | null {
  const regex = new RegExp(`${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\d+\\.|\\n[A-Z][^\\n]*:|$)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

function buildDataSources(sources: Record<string, string>): string[] {
  const sourceList = ['Company website', 'Public business records']
  
  if (sources.owner_email === 'hunter') sourceList.push('Hunter.io')
  if (sources.employee_count === 'apollo') sourceList.push('Apollo.io')  
  if (sources.owner_phone === 'zoominfo') sourceList.push('ZoomInfo')
  
  return sourceList
}

function createFallbackReport(company: any, tier: string, context: any): ReportContent {
  return {
    executive_summary: `${company.name} is a ${context.industry} company based in ${context.city}, ${context.state}. This report provides an analysis of available business data and potential partnership opportunities.`,
    company_overview: `${company.name} operates in the ${context.industry} sector with ${context.employee_count ? `approximately ${context.employee_count} employees` : 'undisclosed workforce size'}. The company maintains a ${context.rating ? `${context.rating}-star rating` : 'positive'} market presence.`,
    key_personnel: `Primary contact: ${context.owner_name || 'Contact information available upon request'}. Email: ${context.owner_email || 'Available through company website'}.`,
    growth_opportunities: 'Partnership opportunities exist in areas of mutual benefit. Direct engagement recommended to explore specific collaboration possibilities.',
    recommendations: 'Schedule initial discovery call to discuss partnership potential and mutual value propositions.',
    data_sources: buildDataSources({}),
    generated_at: new Date().toISOString()
  }
}

function getDefaultPromptSettings() {
  return {
    enhanced: {
      system_prompt: "You are a business analyst creating an enhanced company overview report. Provide clear, concise insights about the company's potential and key opportunities. Keep the analysis practical and focused on immediate opportunities.",
      executive_summary: "Generate a comprehensive 2-3 paragraph executive summary that highlights the company's key strengths, market position, and primary opportunities for partnership or engagement.",
      company_overview: "Provide a detailed analysis of the company's operations, market presence, and competitive positioning based on available data.",
      key_personnel: "Identify and analyze key personnel, leadership structure, and important contacts based on available data.",
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

function generateHTML(reportContent: ReportContent, company: any, tier: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tier} Report - ${company.name}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            color: #333;
        }
        .header { 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .tier-badge {
            display: inline-block;
            background: ${tier === 'BI' ? '#dc2626' : '#059669'};
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .section { 
            margin-bottom: 25px; 
        }
        .section h2 { 
            color: #1f2937; 
            border-left: 4px solid #2563eb;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .company-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${company.name}</h1>
        <span class="tier-badge">${tier} Report</span>
        <p><strong>Generated:</strong> ${new Date(reportContent.generated_at).toLocaleDateString()}</p>
    </div>

    <div class="company-info">
        <h3>Company Information</h3>
        <p><strong>Website:</strong> ${company.website || 'Not available'}</p>
        <p><strong>Location:</strong> ${company.address || 'Address not available'}</p>
        <p><strong>Phone:</strong> ${company.phone || 'Not available'}</p>
        <p><strong>Rating:</strong> ${company.rating ? `${company.rating}/5.0` : 'Not available'}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <p>${reportContent.executive_summary}</p>
    </div>

    <div class="section">
        <h2>Company Overview</h2>
        <p>${reportContent.company_overview}</p>
    </div>

    ${reportContent.market_analysis ? `
    <div class="section">
        <h2>Market Analysis</h2>
        <p>${reportContent.market_analysis}</p>
    </div>
    ` : ''}

    ${reportContent.financial_insights ? `
    <div class="section">
        <h2>Financial Insights</h2>
        <p>${reportContent.financial_insights}</p>
    </div>
    ` : ''}

    <div class="section">
        <h2>Key Personnel</h2>
        <p>${reportContent.key_personnel}</p>
    </div>

    <div class="section">
        <h2>Growth Opportunities</h2>
        <p>${reportContent.growth_opportunities}</p>
    </div>

    ${reportContent.risk_assessment ? `
    <div class="section">
        <h2>Risk Assessment</h2>
        <p>${reportContent.risk_assessment}</p>
    </div>
    ` : ''}

    <div class="section">
        <h2>Recommendations</h2>
        <p>${reportContent.recommendations}</p>
    </div>

    <div class="footer">
        <p><strong>Data Sources:</strong> ${reportContent.data_sources.join(', ')}</p>
        <p>This report was generated by Exit School's business intelligence platform.</p>
    </div>
</body>
</html>`
}