import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request) {
  try {
    const { date, userId } = await request.json()
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Parse the date and get companies for that specific day
    const targetDate = new Date(date)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    let query = supabase
      .from('companies')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true })

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: companies, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies found for the specified date' },
        { status: 404 }
      )
    }

    // Generate CSV content
    const csvContent = generateCSV(companies, targetDate)
    
    // Format filename with date
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `companies-export-${dateStr}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}

function generateCSV(companies, exportDate) {
  // Define CSV headers
  const headers = [
    'Company Name',
    'Email',
    'Phone',
    'Website',
    'Address',
    'Industry',
    'Rating',
    'Total Reviews',
    'Owner Name',
    'Employee Count',
    'Employees Range',
    'Revenue',
    'Revenue Range',
    'Email Confidence',
    'Enrichment Status',
    'Enrichment Source',
    'Business Status',
    'Created Date',
    'Enriched Date',
    'Company ID'
  ]

  // Convert companies to CSV rows
  const rows = companies.map(company => [
    escapeCSV(company.name || ''),
    escapeCSV(company.email || ''),
    escapeCSV(company.phone || company.formatted_phone_number || ''),
    escapeCSV(company.website || ''),
    escapeCSV(company.formatted_address || company.location || ''),
    escapeCSV(company.industry || ''),
    company.rating || '',
    company.user_ratings_total || company.total_reviews || '',
    escapeCSV(company.owner_name || ''),
    company.employee_count || '',
    escapeCSV(company.employees_range || ''),
    company.revenue || '',
    escapeCSV(company.revenue_range || ''),
    escapeCSV(company.email_confidence || ''),
    company.is_enriched ? 'Enriched' : 'Pending',
    escapeCSV(company.enrichment_source || ''),
    escapeCSV(company.business_status || ''),
    formatDate(company.created_at),
    company.enriched_at ? formatDate(company.enriched_at) : '',
    company.id
  ])

  // Combine headers and rows
  const csvData = [headers, ...rows]
  
  // Convert to CSV string
  const csvString = csvData.map(row => row.join(',')).join('\\n')
  
  // Add metadata header
  const metadata = [
    `# Company Export Report`,
    `# Export Date: ${new Date().toLocaleString()}`,
    `# Data Date: ${exportDate.toLocaleDateString()}`,
    `# Total Companies: ${companies.length}`,
    `# Enriched: ${companies.filter(c => c.is_enriched).length}`,
    `# Pending: ${companies.filter(c => !c.is_enriched).length}`,
    `#`,
    ``
  ].join('\\n')
  
  return metadata + csvString
}

function escapeCSV(value) {
  if (typeof value !== 'string') return ''
  
  // Escape quotes and wrap in quotes if necessary
  if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(dateString) {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString()
  } catch {
    return dateString
  }
}