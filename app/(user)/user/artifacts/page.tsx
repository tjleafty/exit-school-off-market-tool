'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import { 
  ComponentTemplate, 
  COMPONENT_TEMPLATES,
  generateComponentPrompt,
  generateDevelopmentChecklist,
  getTemplatesByCategory,
  searchTemplates
} from '@/lib/claude-artifacts'
import { 
  Search, 
  Copy, 
  Download, 
  Code, 
  Zap,
  Building,
  Table,
  FileText,
  Layout,
  Form,
  Mail,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react'

const categoryIcons = {
  'search': Search,
  'data-display': Table,
  'forms': Form,
  'navigation': Layout,
  'analytics': FileText,
  'communication': Mail
}

const categoryColors = {
  'search': 'bg-blue-100 text-blue-800',
  'data-display': 'bg-green-100 text-green-800',
  'forms': 'bg-purple-100 text-purple-800',
  'navigation': 'bg-orange-100 text-orange-800',
  'analytics': 'bg-red-100 text-red-800',
  'communication': 'bg-indigo-100 text-indigo-800'
}

export default function ArtifactsPage() {
  const [templates, setTemplates] = useState<ComponentTemplate[]>(COMPONENT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<ComponentTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customRequirements, setCustomRequirements] = useState<string[]>([])
  const [newRequirement, setNewRequirement] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [showChecklist, setShowChecklist] = useState(false)

  useEffect(() => {
    filterTemplates()
  }, [searchQuery, selectedCategory])

  function filterTemplates() {
    let filtered = COMPONENT_TEMPLATES

    if (searchQuery) {
      filtered = searchTemplates(searchQuery)
    }

    if (selectedCategory !== 'all') {
      filtered = getTemplatesByCategory(selectedCategory as ComponentTemplate['category'])
    }

    setTemplates(filtered)
  }

  function selectTemplate(template: ComponentTemplate) {
    setSelectedTemplate(template)
    setCustomRequirements([...template.requirements])
    setGeneratedPrompt('')
    setShowChecklist(false)
  }

  function addCustomRequirement() {
    if (newRequirement.trim() && !customRequirements.includes(newRequirement.trim())) {
      setCustomRequirements([...customRequirements, newRequirement.trim()])
      setNewRequirement('')
    }
  }

  function removeRequirement(index: number) {
    setCustomRequirements(customRequirements.filter((_, i) => i !== index))
  }

  function generatePrompt() {
    if (!selectedTemplate) return

    try {
      const prompt = generateComponentPrompt(
        selectedTemplate.id,
        customRequirements.length > 0 ? customRequirements : undefined
      )
      
      setGeneratedPrompt(prompt)
      
      toast({
        title: 'Prompt generated',
        description: 'Claude-optimized prompt is ready to use'
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate prompt',
        variant: 'destructive'
      })
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: 'Prompt copied successfully'
      })
    })
  }

  function downloadPrompt() {
    if (!generatedPrompt || !selectedTemplate) return

    const blob = new Blob([generatedPrompt], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedTemplate.name.replace(/\s+/g, '-').toLowerCase()}-prompt.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function getCategoryIcon(category: ComponentTemplate['category']) {
    const Icon = categoryIcons[category]
    return Icon ? <Icon className="h-4 w-4" /> : <Code className="h-4 w-4" />
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Claude Artifacts</h1>
        <p className="text-gray-600">
          Generate Claude-optimized prompts for component development
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Template Browser */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Component Templates
              </CardTitle>
              <CardDescription>
                Browse and select pre-built component templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="search">Search</SelectItem>
                      <SelectItem value="data-display">Data Display</SelectItem>
                      <SelectItem value="forms">Forms</SelectItem>
                      <SelectItem value="navigation">Navigation</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Template List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => selectTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-sm">{template.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${categoryColors[template.category]}`}
                        >
                          {getCategoryIcon(template.category)}
                          <span className="ml-1 capitalize">{template.category}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{template.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No templates found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Details and Configuration */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Tabs defaultValue="configure" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="configure">Configure</TabsTrigger>
                <TabsTrigger value="prompt" disabled={!generatedPrompt}>Generated Prompt</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
              </TabsList>

              <TabsContent value="configure" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {getCategoryIcon(selectedTemplate.category)}
                      <span className="ml-2">{selectedTemplate.name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 ${categoryColors[selectedTemplate.category]}`}
                      >
                        {selectedTemplate.category}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {selectedTemplate.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Requirements */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Requirements
                      </Label>
                      <div className="space-y-2">
                        {customRequirements.map((requirement, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{requirement}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRequirement(index)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                        
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Add custom requirement..."
                            value={newRequirement}
                            onChange={(e) => setNewRequirement(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addCustomRequirement()}
                            className="flex-1"
                          />
                          <Button 
                            onClick={addCustomRequirement}
                            disabled={!newRequirement.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Technical Notes */}
                    {selectedTemplate.technical_notes && (
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Technical Notes:</strong>
                          <ul className="mt-2 space-y-1">
                            {selectedTemplate.technical_notes.map((note, index) => (
                              <li key={index} className="text-sm">• {note}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Generate Button */}
                    <Button onClick={generatePrompt} className="w-full">
                      <Code className="h-4 w-4 mr-2" />
                      Generate Claude Prompt
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prompt" className="space-y-4">
                {generatedPrompt && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Generated Prompt</span>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generatedPrompt)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadPrompt}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Claude-optimized prompt ready for artifact generation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm whitespace-pre-wrap">{generatedPrompt}</pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="checklist" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Development Checklist</CardTitle>
                    <CardDescription>
                      Quality assurance checklist for {selectedTemplate.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {generateDevelopmentChecklist(selectedTemplate.category).map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a Template</h3>
                  <p>Choose a component template from the sidebar to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}