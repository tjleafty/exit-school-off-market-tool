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
  // Professional CSV template structure with proper formatting
  const reportInfo = [
    ['Exit School Off-Market Tool - Company Intelligence Report'],
    [''],
    ['Report Generated:', new Date().toLocaleString()],
    ['Data Date:', exportDate.toLocaleDateString()],
    ['Total Companies:', companies.length.toString()],
    ['Enriched Companies:', companies.filter(c => c.is_enriched).length.toString()],
    ['Pending Enrichment:', companies.filter(c => !c.is_enriched).length.toString()],
    ['']
  ]

  // Professional headers in row 8 (0-indexed row 7)
  const headers = [
    'Company Name',
    'Primary Contact Email',
    'Phone Number',
    'Website URL',
    'Business Address',
    'Industry Category',
    'Owner/Decision Maker',
    'Employee Count',
    'Company Size Range',
    'Annual Revenue',
    'Revenue Range',
    'Google Rating',
    'Total Reviews',
    'Business Status',
    'Email Confidence Level',
    'Data Enrichment Status',
    'Enrichment Source',
    'Discovery Date',
    'Last Enriched',
    'Company ID',
    'Place ID',
    'Data Quality Score'
  ]

  // Convert companies to professional CSV rows
  const dataRows = companies.map(company => [
    escapeCSV(company.name || 'N/A'),
    escapeCSV(company.email || 'Not Available'),
    escapeCSV(formatPhoneNumber(company.phone || company.formatted_phone_number || '')),
    escapeCSV(company.website || 'Not Available'),
    escapeCSV(company.formatted_address || company.location || 'Not Available'),
    escapeCSV(company.industry || determineIndustryFromTypes(company.types) || 'Not Specified'),
    escapeCSV(company.owner_name || 'Not Identified'),
    company.employee_count || 'Unknown',
    escapeCSV(company.employees_range || determineEmployeeRange(company.employee_count) || 'Not Available'),
    company.revenue ? `$${company.revenue.toLocaleString()}` : 'Not Available',
    escapeCSV(company.revenue_range || determineRevenueRange(company.revenue) || 'Not Available'),
    company.rating ? `${company.rating}/5.0` : 'No Rating',
    company.user_ratings_total || company.total_reviews || '0',
    escapeCSV(company.business_status || 'Unknown'),
    escapeCSV(company.email_confidence || 'Not Assessed'),
    company.is_enriched ? 'Enriched' : 'Pending Enrichment',
    escapeCSV(company.enrichment_source || 'Initial Discovery'),
    formatDate(company.created_at),
    company.enriched_at ? formatDate(company.enriched_at) : 'Not Enriched',
    company.id,
    escapeCSV(company.place_id || ''),
    calculateDataQualityScore(company)
  ])

  // Combine all sections
  const allRows = [...reportInfo, headers, ...dataRows]
  
  // Convert to CSV string with proper line breaks
  return allRows.map(row => Array.isArray(row) ? row.join(',') : row).join('\n')
}

// Helper functions for better data formatting
function formatPhoneNumber(phone) {
  if (!phone) return 'Not Available'
  // Clean and format phone number
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  return phone
}

function determineIndustryFromTypes(types) {
  if (!types || !Array.isArray(types)) return null
  
  const industryMap = {
    'restaurant': 'Food & Beverage',
    'food': 'Food & Beverage', 
    'store': 'Retail',
    'clothing_store': 'Retail - Apparel',
    'health': 'Healthcare',
    'hospital': 'Healthcare',
    'school': 'Education',
    'university': 'Education',
    'bank': 'Financial Services',
    'real_estate': 'Real Estate',
    'lawyer': 'Legal Services',
    'accounting': 'Professional Services',
    'beauty_salon': 'Personal Services',
    'gym': 'Fitness & Recreation',
    'car_dealer': 'Automotive',
    'gas_station': 'Automotive'
  }
  
  for (const type of types) {
    if (industryMap[type]) return industryMap[type]
  }
  return null
}

function determineEmployeeRange(count) {
  if (!count) return null
  if (count <= 10) return '1-10 employees'
  if (count <= 50) return '11-50 employees'
  if (count <= 200) return '51-200 employees'
  if (count <= 1000) return '201-1000 employees'
  return '1000+ employees'
}

function determineRevenueRange(revenue) {
  if (!revenue) return null
  if (revenue <= 100000) return '$0-$100K'
  if (revenue <= 1000000) return '$100K-$1M'
  if (revenue <= 10000000) return '$1M-$10M'
  if (revenue <= 100000000) return '$10M-$100M'
  return '$100M+'
}

function calculateDataQualityScore(company) {
  let score = 0
  let maxScore = 0
  
  // Scoring criteria
  const criteria = [
    { field: 'name', weight: 10 },
    { field: 'email', weight: 15 },
    { field: 'phone', weight: 10 },
    { field: 'website', weight: 10 },
    { field: 'formatted_address', weight: 8 },
    { field: 'owner_name', weight: 12 },
    { field: 'employee_count', weight: 8 },
    { field: 'revenue', weight: 8 },
    { field: 'industry', weight: 5 },
    { field: 'rating', weight: 4 }
  ]
  
  criteria.forEach(criterion => {
    maxScore += criterion.weight
    if (company[criterion.field] && company[criterion.field] !== '') {
      score += criterion.weight
    }
  })
  
  // Bonus for enrichment
  if (company.is_enriched) score += 10
  maxScore += 10
  
  return `${Math.round((score / maxScore) * 100)}%`
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