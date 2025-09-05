'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRange } from '@/components/ui/date-range-picker'
import { Database } from '@/lib/database.types'
import { getEmailMetrics, EmailMetrics } from '@/lib/email'
import { formatDistanceToNow, format } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import {
  Mail,
  Send,
  CheckCircle,
  Eye,
  MousePointer,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Activity,
  Users,
  Calendar
} from 'lucide-react'

type Supabase = Database

interface EmailLog {
  id: string
  type: string
  recipient_email: string
  recipient_name?: string
  subject: string
  status: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  complained_at?: string
  campaign_id?: string
  metadata: Record<string, any>
}

interface CampaignMetrics extends EmailMetrics {
  campaign_name: string
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export default function EmailAnalytics({ campaignId }: { campaignId?: string }) {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || 'all')
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  })
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<EmailMetrics>({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0
  })

  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    loadData()
  }, [selectedCampaign, dateRange])

  async function loadData() {
    try {
      setLoading(true)

      // Load campaigns
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      setCampaigns(campaignsData || [])

      // Load email logs with filters
      let query = supabase
        .from('email_logs')
        .select('*')
        .gte('sent_at', dateRange.from.toISOString())
        .lte('sent_at', dateRange.to.toISOString())

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign)
      }

      const { data: logsData } = await query.order('sent_at', { ascending: false })

      setEmailLogs(logsData || [])

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(logsData || [])
      setMetrics(calculatedMetrics)

    } catch (error) {
      console.error('Error loading email analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateMetrics(logs: EmailLog[]): EmailMetrics {
    const metrics: EmailMetrics = {
      sent: logs.filter(log => log.status === 'SENT').length,
      delivered: logs.filter(log => log.status === 'DELIVERED' || log.delivered_at).length,
      opened: logs.filter(log => log.opened_at).length,
      clicked: logs.filter(log => log.clicked_at).length,
      bounced: logs.filter(log => log.status === 'BOUNCED').length,
      complained: logs.filter(log => log.status === 'COMPLAINED').length
    }

    return metrics
  }

  function getStatusIcon(status: string) {
    const icons = {
      SENT: Send,
      DELIVERED: CheckCircle,
      PENDING: Activity,
      BOUNCED: XCircle,
      COMPLAINED: AlertTriangle,
      FAILED: XCircle
    }

    const Icon = icons[status as keyof typeof icons] || Mail
    return <Icon className="h-4 w-4" />
  }

  function getStatusColor(status: string) {
    const colors = {
      SENT: 'text-blue-600',
      DELIVERED: 'text-green-600',
      PENDING: 'text-yellow-600',
      BOUNCED: 'text-red-600',
      COMPLAINED: 'text-orange-600',
      FAILED: 'text-red-600'
    }

    return colors[status as keyof typeof colors] || 'text-gray-600'
  }

  const chartData = [
    { name: 'Sent', value: metrics.sent, color: '#3b82f6' },
    { name: 'Delivered', value: metrics.delivered, color: '#10b981' },
    { name: 'Opened', value: metrics.opened, color: '#8b5cf6' },
    { name: 'Clicked', value: metrics.clicked, color: '#f59e0b' },
    { name: 'Bounced', value: metrics.bounced, color: '#ef4444' }
  ]

  const openRate = metrics.delivered > 0 ? (metrics.opened / metrics.delivered * 100).toFixed(1) : '0'
  const clickRate = metrics.delivered > 0 ? (metrics.clicked / metrics.delivered * 100).toFixed(1) : '0'
  const bounceRate = metrics.sent > 0 ? (metrics.bounced / metrics.sent * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading email analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Email Analytics</h2>
          <p className="text-gray-600">Track email performance and engagement metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DateRange
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails Sent</p>
                <p className="text-2xl font-bold">{metrics.sent.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold">{openRate}%</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold">{clickRate}%</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <MousePointer className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bounce Rate</p>
                <p className="text-2xl font-bold">{bounceRate}%</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="details">Email Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Email Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of email delivery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
                <CardDescription>
                  Email engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Open Rate', value: parseFloat(openRate), target: 25 },
                    { name: 'Click Rate', value: parseFloat(clickRate), target: 5 },
                    { name: 'Bounce Rate', value: parseFloat(bounceRate), target: 2 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                    <Bar dataKey="value" fill="#3b82f6" />
                    <Bar dataKey="target" fill="#94a3b8" opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Campaign Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Performance metrics by campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Campaign</th>
                        <th className="text-left p-2">Sent</th>
                        <th className="text-left p-2">Delivered</th>
                        <th className="text-left p-2">Opened</th>
                        <th className="text-left p-2">Clicked</th>
                        <th className="text-left p-2">Bounced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(campaign => {
                        const campaignLogs = emailLogs.filter(log => log.campaign_id === campaign.id)
                        const campaignMetrics = calculateMetrics(campaignLogs)
                        const campaignOpenRate = campaignMetrics.delivered > 0 
                          ? (campaignMetrics.opened / campaignMetrics.delivered * 100).toFixed(1)
                          : '0'
                        
                        return (
                          <tr key={campaign.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{campaign.name}</td>
                            <td className="p-2">{campaignMetrics.sent}</td>
                            <td className="p-2">{campaignMetrics.delivered}</td>
                            <td className="p-2">
                              {campaignMetrics.opened} ({campaignOpenRate}%)
                            </td>
                            <td className="p-2">{campaignMetrics.clicked}</td>
                            <td className="p-2">{campaignMetrics.bounced}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No campaigns found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Email Details */}
          <Card>
            <CardHeader>
              <CardTitle>Email Details</CardTitle>
              <CardDescription>
                Individual email delivery status and timing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailLogs.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {emailLogs.slice(0, 100).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{log.subject}</div>
                        <div className="text-xs text-gray-500">
                          To: {log.recipient_email}
                          {log.sent_at && (
                            <span className="ml-2">
                              Sent {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={log.status === 'DELIVERED' ? 'default' : log.status === 'BOUNCED' ? 'destructive' : 'secondary'}
                          className={`flex items-center space-x-1 ${getStatusColor(log.status)}`}
                        >
                          {getStatusIcon(log.status)}
                          <span>{log.status}</span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No email logs found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}