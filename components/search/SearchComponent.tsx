'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Database } from '@/lib/database.types'
import { 
  Search, 
  Download, 
  Save, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

type Supabase = Database

interface SearchResult {
  place_id: string
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  review_count?: number
  business_status: string
  types: string[]
  latitude?: number
  longitude?: number
}

interface SearchQuery {
  industry: string
  city: string
  state: string
}

export default function SearchComponent() {
  const [query, setQuery] = useState<SearchQuery>({
    industry: '',
    city: '',
    state: ''
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [searchId, setSearchId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient<Supabase>()

  async function handleSearch() {
    if (!query.industry.trim() || !query.city.trim() || !query.state.trim()) {
      setError('Please fill in all search fields')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])
    setSelectedResults(new Set())

    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: query.industry.trim(),
          city: query.city.trim(),
          state: query.state.trim(),
          maxResults: 60
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.results)
      setSearchId(data.searchId)

      toast({
        title: 'Search completed',
        description: `Found ${data.results.length} businesses`
      })

    } catch (error) {
      console.error('Search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      setError(errorMessage)
      toast({
        title: 'Search failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSelected() {
    if (selectedResults.size === 0) {
      toast({
        title: 'No companies selected',
        description: 'Please select companies to save',
        variant: 'destructive'
      })
      return
    }

    if (!searchId) {
      toast({
        title: 'No search ID',
        description: 'Please perform a search first',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)

    try {
      const selectedCompanies = results.filter(result => 
        selectedResults.has(result.place_id)
      )

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) {
        throw new Error('User profile not found')
      }

      // Save companies to database
      const companiesToInsert = selectedCompanies.map(company => ({
        search_id: searchId,
        user_id: userProfile.id,
        place_id: company.place_id,
        name: company.name,
        address: company.address,
        phone: company.phone,
        website: company.website,
        rating: company.rating,
        review_count: company.review_count,
        latitude: company.latitude,
        longitude: company.longitude,
        raw_data: {
          business_status: company.business_status,
          types: company.types
        }
      }))

      const { error: insertError } = await supabase
        .from('companies')
        .insert(companiesToInsert)

      if (insertError) {
        throw insertError
      }

      // Update search with selected count
      await supabase
        .from('searches')
        .update({ companies_saved: selectedResults.size })
        .eq('id', searchId)

      // Create audit log
      await supabase.rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: 'COMPANIES_SAVED',
        p_entity: 'COMPANY',
        p_entity_id: searchId,
        p_metadata: {
          search_id: searchId,
          companies_count: selectedResults.size,
          industry: query.industry,
          city: query.city,
          state: query.state
        }
      })

      toast({
        title: 'Companies saved',
        description: `Successfully saved ${selectedResults.size} companies`
      })

      // Clear selection
      setSelectedResults(new Set())

    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save companies',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  function handleExportCSV() {
    if (results.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please perform a search first',
        variant: 'destructive'
      })
      return
    }

    setExporting(true)

    try {
      // Create CSV content
      const headers = [
        'Name',
        'Address', 
        'Phone',
        'Website',
        'Rating',
        'Review Count',
        'Business Status',
        'Categories'
      ]

      const csvContent = [
        headers.join(','),
        ...results.map(result => [
          `"${result.name}"`,
          `"${result.address}"`,
          `"${result.phone || ''}"`,
          `"${result.website || ''}"`,
          result.rating || '',
          result.review_count || '',
          result.business_status,
          `"${result.types.join(', ')}"`
        ].join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${query.industry}-${query.city}-${query.state}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Export completed',
        description: 'CSV file has been downloaded'
      })

    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: 'Failed to export data',
        variant: 'destructive'
      })
    } finally {
      setExporting(false)
    }
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedResults(new Set(results.map(r => r.place_id)))
    } else {
      setSelectedResults(new Set())
    }
  }

  function handleSelectResult(placeId: string, checked: boolean) {
    const newSelected = new Set(selectedResults)
    if (checked) {
      newSelected.add(placeId)
    } else {
      newSelected.delete(placeId)
    }
    setSelectedResults(newSelected)
  }

  function getBusinessStatusBadge(status: string) {
    const config = {
      'OPERATIONAL': { variant: 'default' as const, label: 'Open' },
      'CLOSED_TEMPORARILY': { variant: 'secondary' as const, label: 'Temp. Closed' },
      'CLOSED_PERMANENTLY': { variant: 'destructive' as const, label: 'Closed' }
    }
    
    const { variant, label } = config[status as keyof typeof config] || config.OPERATIONAL
    
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Business Search
          </CardTitle>
          <CardDescription>
            Search for businesses using Google Places API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">
                Industry <span className="text-red-500">*</span>
              </Label>
              <Input
                id="industry"
                placeholder="e.g., restaurants, dentists, auto repair"
                value={query.industry}
                onChange={(e) => setQuery({ ...query, industry: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g., Seattle"
                value={query.city}
                onChange={(e) => setQuery({ ...query, city: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">
                State <span className="text-red-500">*</span>
              </Label>
              <Input
                id="state"
                placeholder="e.g., WA"
                value={query.state}
                onChange={(e) => setQuery({ ...query, state: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <Button 
              onClick={handleSearch}
              disabled={loading || !query.industry || !query.city || !query.state}
              className="flex items-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Searching...' : 'Search Businesses'}
            </Button>

            {results.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={exporting}
                  className="flex items-center"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export CSV
                </Button>

                <Button
                  onClick={handleSaveSelected}
                  disabled={saving || selectedResults.size === 0}
                  className="flex items-center"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Selected ({selectedResults.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results ({results.length} businesses found)</span>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Checkbox
                  checked={selectedResults.size === results.length}
                  onCheckedChange={handleSelectAll}
                />
                <span>Select All</span>
              </div>
            </CardTitle>
            <CardDescription>
              Select businesses to save to your database or export to CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.place_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedResults.has(result.place_id)}
                          onCheckedChange={(checked) => 
                            handleSelectResult(result.place_id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-gray-500">
                          {result.types.slice(0, 2).join(', ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start space-x-1">
                          <MapPin className="h-3 w-3 mt-1 text-gray-400 flex-shrink-0" />
                          <span className="text-sm">{result.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {result.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{result.phone}</span>
                            </div>
                          )}
                          {result.website && (
                            <div className="flex items-center space-x-1">
                              <Globe className="h-3 w-3 text-gray-400" />
                              <a 
                                href={result.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 truncate"
                              >
                                Website
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.rating && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{result.rating}</span>
                            {result.review_count && (
                              <span className="text-xs text-gray-500">
                                ({result.review_count})
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getBusinessStatusBadge(result.business_status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No search results yet</p>
              <p>Enter your search criteria above to find businesses</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}