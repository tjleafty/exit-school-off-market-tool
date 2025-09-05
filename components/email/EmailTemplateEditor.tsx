'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import { validateEmailTemplate, replaceEmailVariables } from '@/lib/email'
import { 
  Save, 
  Eye, 
  Send,
  Copy,
  AlertCircle,
  CheckCircle,
  Mail,
  Variable,
  Palette,
  Code,
  FileText
} from 'lucide-react'

type Supabase = Database

interface EmailTemplate {
  id?: string
  name: string
  subject: string
  content: string
  type: 'CAMPAIGN' | 'INVITATION' | 'REPORT_READY' | 'CUSTOM'
  variables: string[]
  is_active: boolean
}

const TEMPLATE_VARIABLES = {
  CAMPAIGN: [
    'recipient_name',
    'company_name',
    'sender_name',
    'sender_company',
    'industry',
    'city',
    'state'
  ],
  INVITATION: [
    'name',
    'company_name',
    'accept_url',
    'expires_at'
  ],
  REPORT_READY: [
    'user_name',
    'company_name',
    'report_url',
    'report_tier',
    'generated_at'
  ],
  CUSTOM: [
    'recipient_name',
    'company_name',
    'sender_name'
  ]
}

const SAMPLE_VALUES = {
  recipient_name: 'John Smith',
  company_name: 'Acme Corporation',
  sender_name: 'Sarah Johnson',
  sender_company: 'Exit School',
  industry: 'Technology',
  city: 'Seattle',
  state: 'WA',
  accept_url: 'https://app.exitschool.com/signup?token=abc123',
  expires_at: 'Friday, December 15, 2023',
  user_name: 'Alex Chen',
  report_url: 'https://app.exitschool.com/reports/123',
  report_tier: 'Business Intelligence',
  generated_at: 'Wednesday, December 13, 2023 at 2:30 PM'
}

export default function EmailTemplateEditor({ templateId }: { templateId?: string }) {
  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    subject: '',
    content: '',
    type: 'CAMPAIGN',
    variables: [],
    is_active: true
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [validation, setValidation] = useState({ isValid: true, missingVariables: [] })
  
  const supabase = createClientComponentClient<Supabase>()

  useEffect(() => {
    if (templateId) {
      loadTemplate()
    } else {
      // Set default variables for new template
      handleTypeChange('CAMPAIGN')
    }
  }, [templateId])

  useEffect(() => {
    updatePreview()
    validateTemplate()
  }, [template.subject, template.content, template.type])

  async function loadTemplate() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error || !data) {
        throw new Error('Template not found')
      }

      setTemplate({
        id: data.id,
        name: data.name,
        subject: data.subject,
        content: data.content,
        type: data.type as EmailTemplate['type'],
        variables: data.variables || [],
        is_active: data.is_active
      })

    } catch (error) {
      console.error('Error loading template:', error)
      toast({
        title: 'Failed to load template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function handleTypeChange(type: EmailTemplate['type']) {
    setTemplate(prev => ({
      ...prev,
      type,
      variables: TEMPLATE_VARIABLES[type]
    }))
  }

  function validateTemplate() {
    const subjectValidation = validateEmailTemplate(template.subject, SAMPLE_VALUES)
    const contentValidation = validateEmailTemplate(template.content, SAMPLE_VALUES)
    
    const allMissingVariables = [
      ...subjectValidation.missingVariables,
      ...contentValidation.missingVariables
    ]
    
    const uniqueMissingVariables = [...new Set(allMissingVariables)]
    
    setValidation({
      isValid: uniqueMissingVariables.length === 0,
      missingVariables: uniqueMissingVariables
    })
  }

  function updatePreview() {
    const previewSubject = replaceEmailVariables(template.subject, SAMPLE_VALUES)
    const previewContent = replaceEmailVariables(template.content, SAMPLE_VALUES)
    
    setPreview(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6;">
          <h3 style="margin: 0; color: #333;">Subject: ${previewSubject}</h3>
        </div>
        <div style="padding: 30px; background: white;">
          ${previewContent.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
      </div>
    `)
  }

  async function handleSave() {
    if (!template.name || !template.subject || !template.content) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const templateData = {
        name: template.name,
        subject: template.subject,
        content: template.content,
        type: template.type,
        variables: template.variables,
        is_active: template.is_active,
        updated_at: new Date().toISOString()
      }

      let result

      if (template.id) {
        // Update existing template
        result = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', template.id)
          .select()
          .single()
      } else {
        // Create new template
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!userProfile) {
          throw new Error('User profile not found')
        }

        result = await supabase
          .from('email_templates')
          .insert({
            ...templateData,
            user_id: userProfile.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      setTemplate(prev => ({ ...prev, id: result.data.id }))

      toast({
        title: 'Template saved',
        description: 'Email template saved successfully'
      })

    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: 'Failed to save template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  function insertVariable(variable: string) {
    const cursorPos = document.activeElement?.selectionStart || 0
    const textArea = document.activeElement as HTMLTextAreaElement
    
    if (textArea && (textArea.name === 'subject' || textArea.name === 'content')) {
      const currentValue = textArea.value
      const newValue = 
        currentValue.slice(0, cursorPos) + 
        `{{${variable}}}` + 
        currentValue.slice(cursorPos)
      
      if (textArea.name === 'subject') {
        setTemplate(prev => ({ ...prev, subject: newValue }))
      } else {
        setTemplate(prev => ({ ...prev, content: newValue }))
      }
    }
  }

  async function sendTestEmail() {
    if (!template.subject || !template.content) {
      toast({
        title: 'Cannot send test',
        description: 'Please add subject and content first',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user email for test
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, name')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Send test email with sample data
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: userProfile.email,
          subject: replaceEmailVariables(template.subject, SAMPLE_VALUES),
          content: replaceEmailVariables(template.content, SAMPLE_VALUES),
          templateType: template.type
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send test email')
      }

      toast({
        title: 'Test email sent',
        description: `Test email sent to ${userProfile.email}`
      })

    } catch (error) {
      console.error('Error sending test email:', error)
      toast({
        title: 'Failed to send test',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {templateId ? 'Edit Email Template' : 'Create Email Template'}
          </h2>
          <p className="text-gray-600">
            Design and customize email templates for your campaigns
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={sendTestEmail}
            disabled={!template.subject || !template.content}
            className="flex items-center"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Test
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !template.name}
            className="flex items-center"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2" />
                Template Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Partnership Outreach"
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Template Type</Label>
                  <Select 
                    value={template.type} 
                    onValueChange={(value) => handleTypeChange(value as EmailTemplate['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAMPAIGN">Campaign Email</SelectItem>
                      <SelectItem value="INVITATION">Account Invitation</SelectItem>
                      <SelectItem value="REPORT_READY">Report Ready</SelectItem>
                      <SelectItem value="CUSTOM">Custom Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject Line */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject Line <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="Enter email subject with variables like {{company_name}}"
                  value={template.subject}
                  onChange={(e) => setTemplate(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Email Content */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  Email Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter your email content here. Use variables like {{recipient_name}} for personalization."
                  value={template.content}
                  onChange={(e) => setTemplate(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              {/* Validation */}
              {!validation.isValid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing variables:</strong> {validation.missingVariables.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {validation.isValid && (template.subject || template.content) && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Template validation passed. All variables are properly defined.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Variable className="h-4 w-4 mr-2" />
                Variables
              </CardTitle>
              <CardDescription>
                Click to insert into template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {template.variables.map((variable) => (
                  <Button
                    key={variable}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable)}
                    className="justify-start text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {variable}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Live Preview
              </CardTitle>
              <CardDescription>
                How your email will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}