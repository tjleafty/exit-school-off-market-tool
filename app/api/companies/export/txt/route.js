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

    // Generate TXT content
    const txtContent = generateTXT(companies, targetDate)
    
    // Format filename with date
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `companies-export-${dateStr}.txt`

    return new NextResponse(txtContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('TXT export error:', error)
    return NextResponse.json(
      { error: 'Failed to export TXT' },
      { status: 500 }
    )
  }
}

function generateTXT(companies, exportDate) {
  let content = ''
  
  // Report header
  content += '================================================================================\n'
  content += '            Exit School Off-Market Tool - Company Intelligence Report\n'
  content += '================================================================================\n\n'
  
  // Report metadata
  content += `Report Generated: ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`
  content += `Data Date: ${exportDate.toLocaleDateString()}\n`
  content += `Total Companies: ${companies.length}\n`
  content += `Enriched Companies: ${companies.filter(c => c.is_enriched).length}\n`
  content += `Pending Enrichment: ${companies.filter(c => !c.is_enriched).length}\n\n`
  
  content += '================================================================================\n'
  content += '                              COMPANY LISTINGS\n'
  content += '================================================================================\n\n'

  // Process each company
  companies.forEach((company, index) => {
    content += `[${index + 1}] ${company.name || 'N/A'}\n`
    content += '─'.repeat(60) + '\n'
    
    // Basic Information
    content += '📧 Contact Information:\n'
    content += `   Email: ${company.email || 'Not Available'}\n`
    content += `   Phone: ${formatPhoneNumber(company.phone || company.formatted_phone_number || '')}\n`
    content += `   Website: ${company.website || 'Not Available'}\n\n`
    
    // Location Information
    content += '📍 Location:\n'
    content += `   Address: ${company.formatted_address || company.location || 'Not Available'}\n`
    if (company.place_id) {
      content += `   Google Maps: https://www.google.com/maps/place/?q=place_id:${company.place_id}\n`
    }
    content += '\n'
    
    // Business Information
    content += '🏢 Business Details:\n'
    content += `   Industry: ${company.industry || determineIndustryFromTypes(company.types) || 'Not Specified'}\n`
    content += `   Status: ${company.business_status || 'Unknown'}\n`
    if (company.rating) {
      content += `   Google Rating: ${company.rating}/5.0 (${company.user_ratings_total || company.total_reviews || '0'} reviews)\n`
    }
    content += '\n'
    
    // Owner/Decision Maker Information
    if (company.owner_name || company.owner_email || company.owner_phone || company.owner_linkedin) {
      content += '👤 Decision Maker:\n'
      if (company.owner_name) content += `   Name: ${company.owner_name}\n`
      if (company.owner_email) content += `   Email: ${company.owner_email}\n`
      if (company.owner_phone) content += `   Phone: ${formatPhoneNumber(company.owner_phone)}\n`
      if (company.owner_linkedin) content += `   LinkedIn: ${company.owner_linkedin}\n`
      content += '\n'
    }
    
    // Company Size & Revenue
    if (company.employee_count || company.employees_range || company.revenue || company.revenue_range) {
      content += '📊 Company Metrics:\n'
      
      // Handle employee data
      if (company.employee_count) {
        if (company.employee_count === 'Data not verified') {
          content += `   Employees: Data not verified\n`
        } else {
          const employeeRange = company.employees_range === 'Data not verified' 
            ? 'Data not verified' 
            : company.employees_range || determineEmployeeRange(company.employee_count) || 'Range not available'
          content += `   Employees: ${company.employee_count} (${employeeRange})\n`
        }
      } else if (company.employees_range) {
        content += `   Employee Range: ${company.employees_range}\n`
      }
      
      // Handle revenue data
      if (company.revenue) {
        if (company.revenue === 'Data not verified') {
          content += `   Annual Revenue: Data not verified\n`
        } else {
          const revenueRange = company.revenue_range === 'Data not verified' 
            ? 'Data not verified' 
            : company.revenue_range || determineRevenueRange(company.revenue) || 'Range not available'
          content += `   Annual Revenue: $${company.revenue} (${revenueRange})\n`
        }
      } else if (company.revenue_range) {
        content += `   Revenue Range: ${company.revenue_range}\n`
      }
      content += '\n'
    }
    
    // Data Quality & Status
    content += '📈 Data Information:\n'
    content += `   Enrichment Status: ${company.is_enriched ? 'Enriched' : 'Pending Enrichment'}\n`
    content += `   Enrichment Source: ${company.enrichment_source || 'Initial Discovery'}\n`
    content += `   Discovery Date: ${formatDate(company.created_at)}\n`
    if (company.enriched_at) {
      content += `   Last Enriched: ${formatDate(company.enriched_at)}\n`
    }
    content += `   Data Quality Score: ${calculateDataQualityScore(company)}\n`
    if (company.email_confidence) {
      content += `   Email Confidence: ${company.email_confidence}\n`
    }
    content += `   Company ID: ${company.id || ''}\n`
    if (company.place_id) {
      content += `   Google Place ID: ${company.place_id}\n`
    }
    
    content += '\n' + '='.repeat(80) + '\n\n'
  })
  
  // Footer
  content += '================================================================================\n'
  content += '                           END OF REPORT\n'
  content += '================================================================================\n'
  content += `Generated by Exit School Off-Market Tool on ${new Date().toLocaleDateString('en-US')}\n`
  content += `Total Companies Exported: ${companies.length}\n`
  
  return content
}

// Helper functions (reused from CSV export)
function formatPhoneNumber(phone) {
  if (!phone) return 'Not Available'
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
  
  const criteria = [
    { field: 'name', weight: 10 },
    { field: 'email', weight: 12 },
    { field: 'phone', weight: 8 },
    { field: 'website', weight: 10 },
    { field: 'formatted_address', weight: 8 },
    { field: 'owner_name', weight: 10 },
    { field: 'owner_email', weight: 12 },
    { field: 'owner_phone', weight: 8 },
    { field: 'owner_linkedin', weight: 6 },
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
  
  if (company.is_enriched) score += 10
  maxScore += 10
  
  return `${Math.round((score / maxScore) * 100)}%`
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