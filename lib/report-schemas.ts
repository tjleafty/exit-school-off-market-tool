import { z } from 'zod'

// Report tier enum
export const ReportTierSchema = z.enum(['ENHANCED', 'BI'])
export type ReportTier = z.infer<typeof ReportTierSchema>

// Base report content schema
export const BaseReportContentSchema = z.object({
  executive_summary: z.string().min(50, 'Executive summary must be at least 50 characters'),
  company_overview: z.string().min(100, 'Company overview must be at least 100 characters'),
  key_personnel: z.string().min(20, 'Key personnel section must be at least 20 characters'),
  growth_opportunities: z.string().min(50, 'Growth opportunities must be at least 50 characters'),
  recommendations: z.string().min(50, 'Recommendations must be at least 50 characters'),
  data_sources: z.array(z.string()).min(1, 'At least one data source required'),
  generated_at: z.string().datetime()
})

// Enhanced report content (includes all base fields)
export const EnhancedReportContentSchema = BaseReportContentSchema

// BI report content (includes additional analysis sections)
export const BIReportContentSchema = BaseReportContentSchema.extend({
  market_analysis: z.string().min(100, 'Market analysis must be at least 100 characters'),
  financial_insights: z.string().min(100, 'Financial insights must be at least 100 characters'),
  risk_assessment: z.string().min(100, 'Risk assessment must be at least 100 characters'),
  competitive_landscape: z.string().optional(),
  industry_trends: z.string().optional()
})

// Union type for report content
export const ReportContentSchema = z.discriminatedUnion('tier', [
  z.object({ tier: z.literal('ENHANCED') }).merge(EnhancedReportContentSchema),
  z.object({ tier: z.literal('BI') }).merge(BIReportContentSchema)
])

export type ReportContent = z.infer<typeof ReportContentSchema>
export type EnhancedReportContent = z.infer<typeof EnhancedReportContentSchema>
export type BIReportContent = z.infer<typeof BIReportContentSchema>

// Company context schema for report generation
export const CompanyContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  review_count: z.number().min(0).optional(),
  search: z.object({
    industry: z.string(),
    city: z.string(),
    state: z.string()
  }),
  enrichment: z.object({
    owner_name: z.string().optional(),
    owner_email: z.string().email().optional(),
    owner_phone: z.string().optional(),
    employee_count: z.number().min(0).optional(),
    revenue: z.number().min(0).optional(),
    confidence: z.number().min(0).max(1).optional(),
    sources: z.record(z.string()).optional()
  }).optional()
})

export type CompanyContext = z.infer<typeof CompanyContextSchema>

// Report generation request schema
export const ReportGenerationRequestSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  tier: ReportTierSchema,
  customPrompt: z.string().optional(),
  includeMarketData: z.boolean().default(true),
  includeFinancialAnalysis: z.boolean().default(true)
})

export type ReportGenerationRequest = z.infer<typeof ReportGenerationRequestSchema>

// Report template variables schema
export const ReportVariablesSchema = z.object({
  company_name: z.string(),
  owner_name: z.string().default('Contact not identified'),
  industry: z.string(),
  location: z.string(),
  website: z.string().default('Not available'),
  employee_count: z.string().default('Not disclosed'),
  revenue: z.string().default('Not disclosed'),
  rating: z.string().default('Not rated'),
  confidence_score: z.string().default('Low'),
  current_date: z.string(),
  analyst_name: z.string().default('Exit School AI Analyst')
})

export type ReportVariables = z.infer<typeof ReportVariablesSchema>

// AI prompt template schema
export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: ReportTierSchema,
  system_prompt: z.string(),
  user_prompt_template: z.string(),
  max_tokens: z.number().min(100).max(4000),
  temperature: z.number().min(0).max(1),
  variables: z.array(z.string())
})

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>

// Default prompt templates
export const DEFAULT_ENHANCED_TEMPLATE: PromptTemplate = {
  id: 'enhanced-default',
  name: 'Enhanced Business Analysis',
  tier: 'ENHANCED',
  system_prompt: `You are a business intelligence analyst creating an enhanced company overview report. 
    Provide clear, concise insights about the company's potential and key opportunities.
    Keep the analysis practical and focused on immediate partnership opportunities.
    Use professional language and focus on actionable insights.`,
  user_prompt_template: `Generate an enhanced business report for {{company_name}}.

Company Information:
- Name: {{company_name}}
- Industry: {{industry}}
- Location: {{location}}
- Website: {{website}}
- Rating: {{rating}}
- Owner: {{owner_name}}
- Employee Count: {{employee_count}}
- Revenue: {{revenue}}
- Data Confidence: {{confidence_score}}

Please provide a structured report with the following sections:
1. Executive Summary (2-3 paragraphs highlighting key opportunities)
2. Company Overview (detailed business analysis)
3. Key Personnel (leadership and contact information)
4. Growth Opportunities (specific partnership potential)
5. Recommendations (actionable next steps)

Focus on practical insights and partnership potential. Make the report professional and actionable.`,
  max_tokens: 1200,
  temperature: 0.3,
  variables: ['company_name', 'industry', 'location', 'website', 'rating', 'owner_name', 'employee_count', 'revenue', 'confidence_score']
}

export const DEFAULT_BI_TEMPLATE: PromptTemplate = {
  id: 'bi-default',
  name: 'Business Intelligence Deep Analysis',
  tier: 'BI',
  system_prompt: `You are a senior business intelligence analyst creating a comprehensive B2B company report.
    Generate detailed insights with market analysis, financial projections, and strategic recommendations.
    Focus on data-driven insights, competitive positioning, and actionable intelligence.
    Use advanced analytical frameworks and provide strategic depth.`,
  user_prompt_template: `Generate a comprehensive business intelligence report for {{company_name}}.

Company Information:
- Name: {{company_name}}
- Industry: {{industry}}
- Location: {{location}}
- Website: {{website}}
- Rating: {{rating}}
- Owner: {{owner_name}}
- Employee Count: {{employee_count}}
- Annual Revenue: {{revenue}}
- Data Confidence: {{confidence_score}}

Please provide a comprehensive report with the following sections:
1. Executive Summary (strategic overview and key findings)
2. Company Overview (comprehensive business analysis)
3. Market Analysis (industry position, competitive landscape, market size)
4. Financial Insights (revenue analysis, growth projections, financial health)
5. Key Personnel (leadership analysis and organizational structure)
6. Growth Opportunities (strategic partnerships, expansion potential)
7. Risk Assessment (business risks, market challenges, mitigation strategies)
8. Recommendations (strategic action plan with timeline)

Provide deep analytical insights, quantitative analysis where possible, and strategic recommendations.
Focus on competitive intelligence and market positioning.`,
  max_tokens: 2000,
  temperature: 0.3,
  variables: ['company_name', 'industry', 'location', 'website', 'rating', 'owner_name', 'employee_count', 'revenue', 'confidence_score']
}