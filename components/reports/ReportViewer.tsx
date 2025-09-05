'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import { ReportContent, ReportTier } from '@/lib/report-schemas'
import { 
  FileText, 
  Download, 
  Mail, 
  Share, 
  Calendar,
  Building,
  MapPin,
  Phone,
  Globe,
  Star,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  BarChart3
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Supabase = Database

interface ReportViewerProps {
  reportId: string
  companyId: string
}

interface ReportData {
  id: string
  company_id: string
  tier: ReportTier
  content_json: ReportContent
  content_html: string
  generated_at: string
  company: {
    id: string
    name: string
    website?: string
    phone?: string
    address?: string
    rating?: number
    review_count?: number
    searches: {
      industry: string
      city: string
      state: string
    }
    enrichments: Array<{
      owner_name?: string
      owner_email?: string
      employee_count?: number
      revenue?: number
      confidence?: number
    }>
  }
}

export default function ReportViewer({ reportId, companyId }: ReportViewerProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    if (reportId) {
      loadReport()
    } else {
      setLoading(false)
    }
  }, [reportId])

  async function loadReport() {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('reports')
        .select(`
          *,
          company:companies (
            id,
            name,
            website,
            phone,
            address,
            rating,
            review_count,
            searches!inner (
              industry,
              city,
              state
            ),
            enrichments (
              owner_name,
              owner_email,
              employee_count,
              revenue,
              confidence
            )
          )
        `)
        .eq('id', reportId)
        .single()

      if (fetchError || !data) {
        throw new Error('Report not found')
      }

      setReport(data as ReportData)

    } catch (error) {
      console.error('Error loading report:', error)
      setError(error instanceof Error ? error.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  async function generateNewReport(tier: ReportTier) {
    try {
      setGenerating(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Call report generation edge function
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          companyId,
          userId: userProfile.id,
          tier
        }
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Report generated',
        description: `${tier} report generated successfully`
      })

      // Reload the component with the new report
      if (data.reportId) {
        window.location.href = `/user/reports/${data.reportId}?companyId=${companyId}`
      }

    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive'
      })
    } finally {
      setGenerating(false)
    }
  }

  function downloadReport(format: 'html' | 'pdf' = 'html') {
    if (!report) return

    if (format === 'html') {
      const blob = new Blob([report.content_html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${report.company.name}-${report.tier}-Report.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    toast({
      title: 'Download started',
      description: `${format.toUpperCase()} report downloaded`
    })
  }

  function getTierBadge(tier: ReportTier) {
    return (
      <Badge 
        variant={tier === 'BI' ? 'destructive' : 'default'}
        className="text-xs font-semibold"
      >
        {tier === 'BI' ? 'Business Intelligence' : 'Enhanced Analysis'}
      </Badge>
    )
  }

  function SectionIcon({ section }: { section: string }) {
    const icons = {
      'executive_summary': Target,
      'company_overview': Building,
      'market_analysis': BarChart3,
      'financial_insights': DollarSign,
      'key_personnel': Users,
      'growth_opportunities': TrendingUp,
      'risk_assessment': AlertTriangle,
      'recommendations': Lightbulb
    }
    
    const Icon = icons[section as keyof typeof icons] || FileText
    return <Icon className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Report Not Found</h3>
            <p className="text-gray-600 mb-6">{error || 'This report could not be loaded.'}</p>
            <div className="flex justify-center space-x-3">
              <Button
                onClick={() => generateNewReport('ENHANCED')}
                disabled={generating}
                variant="outline"
              >
                Generate Enhanced Report
              </Button>
              <Button
                onClick={() => generateNewReport('BI')}
                disabled={generating}
              >
                Generate BI Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const enrichment = report.company.enrichments?.[0]

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-6 w-6" />
                {report.company.name}
                {getTierBadge(report.tier)}
              </CardTitle>
              <CardDescription className="mt-2">
                Generated {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport('html')}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport('pdf')}
                className="flex items-center"
                disabled
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {report.company.searches.city}, {report.company.searches.state}
              </span>
            </div>
            {report.company.website && (
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <a 
                  href={report.company.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Website
                </a>
              </div>
            )}
            {report.company.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{report.company.phone}</span>
              </div>
            )}
            {report.company.rating && (
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">
                  {report.company.rating}/5.0 ({report.company.review_count || 0} reviews)
                </span>
              </div>
            )}
            {enrichment?.employee_count && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{enrichment.employee_count} employees</span>
              </div>
            )}
            {enrichment?.revenue && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-sm">${enrichment.revenue.toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Report Overview</TabsTrigger>
          <TabsTrigger value="html">HTML Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SectionIcon section="executive_summary" />
                <span className="ml-2">Executive Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {report.content_json.executive_summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SectionIcon section="company_overview" />
                <span className="ml-2">Company Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {report.content_json.company_overview.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BI-Specific Sections */}
          {report.tier === 'BI' && 'market_analysis' in report.content_json && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SectionIcon section="market_analysis" />
                  <span className="ml-2">Market Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {report.content_json.market_analysis!.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.tier === 'BI' && 'financial_insights' in report.content_json && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SectionIcon section="financial_insights" />
                  <span className="ml-2">Financial Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {report.content_json.financial_insights!.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Personnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SectionIcon section="key_personnel" />
                <span className="ml-2">Key Personnel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {report.content_json.key_personnel.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Growth Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SectionIcon section="growth_opportunities" />
                <span className="ml-2">Growth Opportunities</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {report.content_json.growth_opportunities.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BI Risk Assessment */}
          {report.tier === 'BI' && 'risk_assessment' in report.content_json && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SectionIcon section="risk_assessment" />
                  <span className="ml-2">Risk Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {report.content_json.risk_assessment!.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SectionIcon section="recommendations" />
                <span className="ml-2">Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {report.content_json.recommendations.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="html">
          <Card>
            <CardHeader>
              <CardTitle>HTML Preview</CardTitle>
              <CardDescription>
                Preview of the formatted report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: report.content_html }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}