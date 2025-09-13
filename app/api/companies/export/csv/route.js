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
    ['Report Generated:', new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
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

  // Convert companies to professional CSV rows - ensure proper column mapping
  const dataRows = companies.map(company => {
    // Build row data carefully to match headers exactly
    const rowData = []
    
    // Column 1: Company Name
    rowData.push(escapeCSV(company.name || 'N/A'))
    
    // Column 2: Primary Contact Email  
    rowData.push(escapeCSV(company.email || 'Not Available'))
    
    // Column 3: Phone Number
    rowData.push(escapeCSV(formatPhoneNumber(company.phone || company.formatted_phone_number || '')))
    
    // Column 4: Website URL
    rowData.push(escapeCSV(company.website || 'Not Available'))
    
    // Column 5: Business Address
    rowData.push(escapeCSV(company.formatted_address || company.location || 'Not Available'))
    
    // Column 6: Industry Category
    rowData.push(escapeCSV(company.industry || determineIndustryFromTypes(company.types) || 'Not Specified'))
    
    // Column 7: Owner/Decision Maker
    rowData.push(escapeCSV(company.owner_name || 'Not Identified'))
    
    // Column 8: Employee Count
    rowData.push(escapeCSV(company.employee_count ? company.employee_count.toString() : 'Unknown'))
    
    // Column 9: Company Size Range
    rowData.push(escapeCSV(company.employees_range || determineEmployeeRange(company.employee_count) || 'Not Available'))
    
    // Column 10: Annual Revenue (no commas for CSV compatibility)
    rowData.push(escapeCSV(company.revenue ? `$${company.revenue}` : 'Not Available'))
    
    // Column 11: Revenue Range
    rowData.push(escapeCSV(company.revenue_range || determineRevenueRange(company.revenue) || 'Not Available'))
    
    // Column 12: Google Rating
    rowData.push(escapeCSV(company.rating ? `${company.rating}/5.0` : 'No Rating'))
    
    // Column 13: Total Reviews
    rowData.push(escapeCSV((company.user_ratings_total || company.total_reviews || '0').toString()))
    
    // Column 14: Business Status
    rowData.push(escapeCSV(company.business_status || 'Unknown'))
    
    // Column 15: Email Confidence Level
    rowData.push(escapeCSV(company.email_confidence || 'Not Assessed'))
    
    // Column 16: Data Enrichment Status
    rowData.push(escapeCSV(company.is_enriched ? 'Enriched' : 'Pending Enrichment'))
    
    // Column 17: Enrichment Source
    rowData.push(escapeCSV(company.enrichment_source || 'Initial Discovery'))
    
    // Column 18: Discovery Date
    rowData.push(escapeCSV(formatDate(company.created_at)))
    
    // Column 19: Last Enriched
    rowData.push(escapeCSV(company.enriched_at ? formatDate(company.enriched_at) : 'Not Enriched'))
    
    // Column 20: Company ID
    rowData.push(escapeCSV(company.id || ''))
    
    // Column 21: Place ID
    rowData.push(escapeCSV(company.place_id || ''))
    
    // Column 22: Data Quality Score
    rowData.push(escapeCSV(calculateDataQualityScore(company)))
    
    return rowData
  })

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
  // Convert to string and handle null/undefined
  if (value === null || value === undefined) return '""'
  
  const stringValue = String(value)
  
  // Always wrap in quotes to prevent column shifting issues
  // Escape any existing quotes by doubling them
  return `"${stringValue.replace(/"/g, '""')}"`
}

function formatDate(dateString) {
  if (!dateString) return 'Not Available'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } catch {
    return dateString
  }
}