import OpenAI from 'openai'
import { 
  ReportTier, 
  ReportContent, 
  CompanyContext, 
  ReportVariables,
  PromptTemplate,
  DEFAULT_ENHANCED_TEMPLATE,
  DEFAULT_BI_TEMPLATE,
  ReportContentSchema,
  CompanyContextSchema
} from './report-schemas'

export class ReportGenerator {
  private openai: OpenAI
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Generate a business intelligence report using OpenAI
   */
  async generateReport(
    company: CompanyContext,
    tier: ReportTier,
    customTemplate?: PromptTemplate
  ): Promise<ReportContent> {
    // Validate company data
    const validatedCompany = CompanyContextSchema.parse(company)
    
    // Get appropriate template
    const template = customTemplate || this.getDefaultTemplate(tier)
    
    // Build variables for template
    const variables = this.buildReportVariables(validatedCompany)
    
    // Generate report sections using AI
    const reportContent = await this.callOpenAI(template, variables, tier)
    
    // Validate and return report
    return ReportContentSchema.parse({ ...reportContent, tier })
  }

  /**
   * Generate report variables from company context
   */
  private buildReportVariables(company: CompanyContext): ReportVariables {
    return {
      company_name: company.name,
      owner_name: company.enrichment?.owner_name || 'Contact not identified',
      industry: company.search.industry,
      location: `${company.search.city}, ${company.search.state}`,
      website: company.website || 'Not available',
      employee_count: company.enrichment?.employee_count?.toString() || 'Not disclosed',
      revenue: company.enrichment?.revenue 
        ? `$${company.enrichment.revenue.toLocaleString()}` 
        : 'Not disclosed',
      rating: company.rating ? `${company.rating}/5.0` : 'Not rated',
      confidence_score: company.enrichment?.confidence 
        ? `${Math.round(company.enrichment.confidence * 100)}%` 
        : 'Low',
      current_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }),
      analyst_name: 'Exit School AI Analyst'
    }
  }

  /**
   * Replace template variables in prompt text
   */
  private replaceTemplateVariables(template: string, variables: ReportVariables): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, value)
    })
    
    return result
  }

  /**
   * Call OpenAI API to generate report content
   */
  private async callOpenAI(
    template: PromptTemplate,
    variables: ReportVariables,
    tier: ReportTier
  ): Promise<Omit<ReportContent, 'tier'>> {
    const systemPrompt = this.replaceTemplateVariables(template.system_prompt, variables)
    const userPrompt = this.replaceTemplateVariables(template.user_prompt_template, variables)

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: template.max_tokens,
        temperature: template.temperature
      })

      const content = completion.choices[0]?.message?.content || ''
      
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      // Parse AI response into structured sections
      return this.parseAIResponse(content, tier, variables)

    } catch (error) {
      console.error('OpenAI API error:', error)
      
      // Generate fallback report
      return this.generateFallbackReport(variables, tier)
    }
  }

  /**
   * Parse AI response into structured report sections
   */
  private parseAIResponse(
    content: string, 
    tier: ReportTier,
    variables: ReportVariables
  ): Omit<ReportContent, 'tier'> {
    const sections = this.extractSections(content)
    
    const baseReport = {
      executive_summary: sections['Executive Summary'] || 
        `This report provides an analysis of ${variables.company_name} based on available data.`,
      company_overview: sections['Company Overview'] ||
        `${variables.company_name} is a ${variables.industry} company located in ${variables.location}.`,
      key_personnel: sections['Key Personnel'] ||
        `Primary contact: ${variables.owner_name}`,
      growth_opportunities: sections['Growth Opportunities'] ||
        'Opportunities for growth and partnership to be explored.',
      recommendations: sections['Recommendations'] ||
        'Further research recommended to identify specific partnership opportunities.',
      data_sources: this.buildDataSources(variables),
      generated_at: new Date().toISOString()
    }

    // Add BI-specific sections
    if (tier === 'BI') {
      return {
        ...baseReport,
        market_analysis: sections['Market Analysis'] ||
          `Market analysis for ${variables.industry} sector in ${variables.location}.`,
        financial_insights: sections['Financial Insights'] ||
          `Financial analysis based on available revenue data: ${variables.revenue}.`,
        risk_assessment: sections['Risk Assessment'] ||
          'Standard business risks apply. Further due diligence recommended.',
        competitive_landscape: sections['Competitive Landscape'] || undefined,
        industry_trends: sections['Industry Trends'] || undefined
      }
    }

    return baseReport
  }

  /**
   * Extract sections from AI response using regex
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {}
    
    // Common section patterns
    const sectionPatterns = [
      'Executive Summary',
      'Company Overview',
      'Market Analysis',
      'Financial Insights',
      'Key Personnel',
      'Growth Opportunities', 
      'Risk Assessment',
      'Recommendations',
      'Competitive Landscape',
      'Industry Trends'
    ]

    sectionPatterns.forEach(sectionName => {
      const regex = new RegExp(
        `${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\d+\\.|\\n[A-Z][^\\n]*:|$)`, 
        'i'
      )
      const match = content.match(regex)
      if (match && match[1]) {
        sections[sectionName] = match[1].trim()
      }
    })

    return sections
  }

  /**
   * Build data sources list based on enrichment sources
   */
  private buildDataSources(variables: ReportVariables): string[] {
    const sources = ['Company website', 'Public business records']
    
    // Add specific sources based on data availability
    if (variables.owner_name !== 'Contact not identified') {
      sources.push('Contact database')
    }
    
    if (variables.revenue !== 'Not disclosed') {
      sources.push('Financial data providers')
    }

    if (variables.employee_count !== 'Not disclosed') {
      sources.push('Employment data')
    }
    
    return sources
  }

  /**
   * Generate fallback report when AI fails
   */
  private generateFallbackReport(
    variables: ReportVariables,
    tier: ReportTier
  ): Omit<ReportContent, 'tier'> {
    const baseReport = {
      executive_summary: `${variables.company_name} is a ${variables.industry} company based in ${variables.location}. This report provides an analysis of available business data and potential partnership opportunities.`,
      company_overview: `${variables.company_name} operates in the ${variables.industry} sector with ${variables.employee_count !== 'Not disclosed' ? `approximately ${variables.employee_count} employees` : 'undisclosed workforce size'}. The company maintains a ${variables.rating !== 'Not rated' ? variables.rating + ' rating' : 'positive'} market presence.`,
      key_personnel: `Primary contact: ${variables.owner_name}. Additional contact information available upon request.`,
      growth_opportunities: 'Partnership opportunities exist in areas of mutual benefit. Direct engagement recommended to explore specific collaboration possibilities.',
      recommendations: 'Schedule initial discovery call to discuss partnership potential and mutual value propositions.',
      data_sources: this.buildDataSources(variables),
      generated_at: new Date().toISOString()
    }

    if (tier === 'BI') {
      return {
        ...baseReport,
        market_analysis: `Market analysis for ${variables.industry} sector in ${variables.location}. Industry dynamics and competitive landscape require further research.`,
        financial_insights: `Financial analysis based on available revenue data: ${variables.revenue}. Additional financial due diligence recommended.`,
        risk_assessment: 'Standard business risks apply including market competition, regulatory changes, and economic factors. Comprehensive risk assessment recommended.',
        competitive_landscape: undefined,
        industry_trends: undefined
      }
    }

    return baseReport
  }

  /**
   * Get default template for tier
   */
  private getDefaultTemplate(tier: ReportTier): PromptTemplate {
    return tier === 'BI' ? DEFAULT_BI_TEMPLATE : DEFAULT_ENHANCED_TEMPLATE
  }
}

/**
 * Generate HTML report from report content
 */
export function generateReportHTML(
  reportContent: ReportContent,
  company: CompanyContext
): string {
  const tier = reportContent.tier
  const tierColor = tier === 'BI' ? '#dc2626' : '#059669'
  const tierLabel = tier === 'BI' ? 'Business Intelligence' : 'Enhanced Analysis'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tierLabel} Report - ${company.name}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px;
            color: #333;
            background: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, ${tierColor} 0%, ${tier === 'BI' ? '#991b1b' : '#047857'} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .tier-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 15px;
        }
        .company-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .company-info {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid ${tierColor};
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .info-item {
            display: flex;
            align-items: center;
            font-size: 14px;
        }
        .info-label {
            font-weight: 600;
            margin-right: 8px;
            min-width: 80px;
        }
        .section { 
            margin-bottom: 35px; 
        }
        .section h2 { 
            color: #1f2937; 
            border-left: 4px solid ${tierColor};
            padding-left: 20px;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 600;
        }
        .section-content {
            font-size: 16px;
            line-height: 1.7;
            color: #374151;
        }
        .section-content p {
            margin-bottom: 15px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 25px;
            border-top: 2px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .data-sources {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        .source-tag {
            background: #eff6ff;
            color: #1d4ed8;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .company-title { font-size: 24px; }
            .section h2 { font-size: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="tier-badge">${tierLabel}</div>
            <h1 class="company-title">${company.name}</h1>
            <p style="margin: 0; opacity: 0.9;">Generated on ${new Date(reportContent.generated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
        </div>

        <div class="content">
            <div class="company-info">
                <h3 style="margin-top: 0; color: #1f2937;">Company Information</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Industry:</span>
                        <span>${company.search.industry}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Location:</span>
                        <span>${company.search.city}, ${company.search.state}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Website:</span>
                        <span>${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'Not available'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Phone:</span>
                        <span>${company.phone || 'Not available'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Rating:</span>
                        <span>${company.rating ? `${company.rating}/5.0` : 'Not available'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Employees:</span>
                        <span>${company.enrichment?.employee_count || 'Not disclosed'}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Executive Summary</h2>
                <div class="section-content">
                    ${reportContent.executive_summary.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>

            <div class="section">
                <h2>Company Overview</h2>
                <div class="section-content">
                    ${reportContent.company_overview.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>

            ${tier === 'BI' && 'market_analysis' in reportContent ? `
            <div class="section">
                <h2>Market Analysis</h2>
                <div class="section-content">
                    ${reportContent.market_analysis.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>
            ` : ''}

            ${tier === 'BI' && 'financial_insights' in reportContent ? `
            <div class="section">
                <h2>Financial Insights</h2>
                <div class="section-content">
                    ${reportContent.financial_insights.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>Key Personnel</h2>
                <div class="section-content">
                    ${reportContent.key_personnel.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>

            <div class="section">
                <h2>Growth Opportunities</h2>
                <div class="section-content">
                    ${reportContent.growth_opportunities.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>

            ${tier === 'BI' && 'risk_assessment' in reportContent ? `
            <div class="section">
                <h2>Risk Assessment</h2>
                <div class="section-content">
                    ${reportContent.risk_assessment.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>Recommendations</h2>
                <div class="section-content">
                    ${reportContent.recommendations.split('\n').map(p => `<p>${p}</p>`).join('')}
                </div>
            </div>

            <div class="footer">
                <p><strong>Data Sources:</strong></p>
                <div class="data-sources">
                    ${reportContent.data_sources.map(source => `<span class="source-tag">${source}</span>`).join('')}
                </div>
                <p style="margin-top: 20px;">
                    This report was generated by Exit School's AI-powered business intelligence platform. 
                    All analysis is based on publicly available data and should be verified for accuracy.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`
}