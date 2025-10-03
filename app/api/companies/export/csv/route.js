import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Generate multi-sheet Excel file with separate sheets for each enrichment source
    const excelBuffer = generateMultiSheetExcel(companies, targetDate)

    // Format filename with date
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `companies-export-${dateStr}.xlsx`

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

function generateMultiSheetExcel(companies, exportDate) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Main Company Data (existing format)
  const mainSheetData = generateMainSheetData(companies, exportDate)
  const mainSheet = XLSX.utils.aoa_to_sheet(mainSheetData)
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'All Companies')

  // Sheet 2: ZoomInfo Data
  const zoomInfoData = generateZoomInfoSheetData(companies, exportDate)
  const zoomInfoSheet = XLSX.utils.aoa_to_sheet(zoomInfoData)
  XLSX.utils.book_append_sheet(workbook, zoomInfoSheet, 'ZoomInfo Data')

  // Sheet 3: Hunter.io Data
  const hunterData = generateHunterSheetData(companies, exportDate)
  const hunterSheet = XLSX.utils.aoa_to_sheet(hunterData)
  XLSX.utils.book_append_sheet(workbook, hunterSheet, 'Hunter.io Data')

  // Sheet 4: Apollo.io Data
  const apolloData = generateApolloSheetData(companies, exportDate)
  const apolloSheet = XLSX.utils.aoa_to_sheet(apolloData)
  XLSX.utils.book_append_sheet(workbook, apolloSheet, 'Apollo.io Data')

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return excelBuffer
}

function generateMainSheetData(companies, exportDate) {
  // Report header information
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

  // Column headers
  const headers = [
    'Company Name',
    'Primary Contact Email',
    'Phone Number',
    'Website URL',
    'Google Listing URL',
    'Business Address',
    'Industry Category',
    'Owner/Decision Maker',
    'Owner Email',
    'Owner Phone',
    'Owner LinkedIn',
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

  // Data rows
  const dataRows = companies.map(company => [
    company.name || 'N/A',
    company.email || 'Not Available',
    formatPhoneNumber(company.phone || company.formatted_phone_number || ''),
    company.website || 'Not Available',
    company.place_id ? `https://www.google.com/maps/place/?q=place_id:${company.place_id}` : 'Not Available',
    company.formatted_address || company.location || 'Not Available',
    company.industry || determineIndustryFromTypes(company.types) || 'Not Specified',
    company.owner_name || 'Not Identified',
    company.owner_email || company.email || 'Not Available',
    formatPhoneNumber(company.owner_phone || '') || 'Not Available',
    company.owner_linkedin || company.linkedin_url || 'Not Available',
    company.employee_count ? company.employee_count.toString() : 'Unknown',
    company.employees_range === 'Data not verified' ? 'Data not verified' : company.employees_range || determineEmployeeRange(company.employee_count) || 'Not Available',
    company.revenue === 'Data not verified' ? 'Data not verified' : company.revenue ? `$${company.revenue}` : 'Not Available',
    company.revenue_range === 'Data not verified' ? 'Data not verified' : company.revenue_range || determineRevenueRange(company.revenue) || 'Not Available',
    company.rating ? `${company.rating}/5.0` : 'No Rating',
    (company.user_ratings_total || company.total_reviews || '0').toString(),
    company.business_status || 'Unknown',
    company.email_confidence || 'Not Assessed',
    company.is_enriched ? 'Enriched' : 'Pending Enrichment',
    company.enrichment_source || 'Initial Discovery',
    formatDate(company.created_at),
    company.enriched_at ? formatDate(company.enriched_at) : 'Not Enriched',
    company.id || '',
    company.place_id || '',
    calculateDataQualityScore(company)
  ])

  return [...reportInfo, headers, ...dataRows]
}

function generateZoomInfoSheetData(companies, exportDate) {
  const reportInfo = [
    ['ZoomInfo Enrichment Data'],
    [''],
    ['Report Generated:', new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
    ['Data Date:', exportDate.toLocaleDateString()],
    ['Total Companies with ZoomInfo Data:', companies.filter(c => c.enrichment_data?.zoominfo_data && Object.keys(c.enrichment_data.zoominfo_data).length > 0).length.toString()],
    ['']
  ]

  const headers = [
    'Company Name',
    'Company ID',
    'ZoomInfo Company ID',
    'Company Website',
    'Company Phone',
    'Revenue',
    'Employee Count',
    'Contact Name',
    'Contact Email',
    'Contact Phone',
    'Contact Title',
    'Enriched At',
    'Data Source'
  ]

  const dataRows = companies
    .filter(c => c.enrichment_data?.zoominfo_data && Object.keys(c.enrichment_data.zoominfo_data).length > 0)
    .map(company => {
      const zoomData = company.enrichment_data?.zoominfo_data || {}
      const companyData = zoomData.company || {}
      const contactData = zoomData.contact || {}

      return [
        company.name || 'N/A',
        company.id || '',
        companyData.id || 'Not Available',
        companyData.website || company.website || 'Not Available',
        companyData.phone || 'Not Available',
        companyData.revenue || 'Not Available',
        companyData.employees || companyData.employeeCount || 'Not Available',
        contactData.firstName && contactData.lastName ? `${contactData.firstName} ${contactData.lastName}` : 'Not Available',
        contactData.email || 'Not Available',
        contactData.directPhone || contactData.phone || 'Not Available',
        contactData.title || contactData.jobTitle || 'Not Available',
        company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
        zoomData.source || 'zoominfo'
      ]
    })

  if (dataRows.length === 0) {
    dataRows.push(['No ZoomInfo data available', '', '', '', '', '', '', '', '', '', '', '', ''])
  }

  return [...reportInfo, headers, ...dataRows]
}

function generateHunterSheetData(companies, exportDate) {
  const reportInfo = [
    ['Hunter.io Enrichment Data'],
    [''],
    ['Report Generated:', new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
    ['Data Date:', exportDate.toLocaleDateString()],
    ['Total Companies with Hunter.io Data:', companies.filter(c => c.enrichment_data?.hunter_data && Object.keys(c.enrichment_data.hunter_data).length > 0).length.toString()],
    ['']
  ]

  const headers = [
    'Company Name',
    'Company ID',
    'Domain',
    'Organization',
    'Email',
    'First Name',
    'Last Name',
    'Position',
    'Department',
    'Email Type',
    'Confidence Score',
    'Phone Number',
    'LinkedIn',
    'Twitter',
    'Enriched At',
    'Data Source'
  ]

  const dataRows = companies
    .filter(c => c.enrichment_data?.hunter_data && Object.keys(c.enrichment_data.hunter_data).length > 0)
    .map(company => {
      const hunterData = company.enrichment_data?.hunter_data || {}
      const emails = hunterData.emails || []

      // If there are multiple emails, create a row for each
      if (emails.length > 0) {
        return emails.map(email => [
          company.name || 'N/A',
          company.id || '',
          hunterData.domain || 'Not Available',
          hunterData.organization || 'Not Available',
          email.value || 'Not Available',
          email.first_name || 'Not Available',
          email.last_name || 'Not Available',
          email.position || 'Not Available',
          email.department || 'Not Available',
          email.type || 'Not Available',
          email.confidence || 'Not Available',
          email.phone_number || 'Not Available',
          email.linkedin || 'Not Available',
          email.twitter || 'Not Available',
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          hunterData.source || 'hunter'
        ])
      } else {
        return [[
          company.name || 'N/A',
          company.id || '',
          hunterData.domain || 'Not Available',
          hunterData.organization || 'Not Available',
          'No emails found',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          hunterData.source || 'hunter'
        ]]
      }
    })
    .flat()

  if (dataRows.length === 0) {
    dataRows.push(['No Hunter.io data available', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  }

  return [...reportInfo, headers, ...dataRows]
}

function generateApolloSheetData(companies, exportDate) {
  const reportInfo = [
    ['Apollo.io Enrichment Data'],
    [''],
    ['Report Generated:', new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
    ['Data Date:', exportDate.toLocaleDateString()],
    ['Total Companies with Apollo.io Data:', companies.filter(c => c.enrichment_data?.apollo_data && Object.keys(c.enrichment_data.apollo_data).length > 0).length.toString()],
    ['']
  ]

  const headers = [
    'Company Name',
    'Company ID',
    'Apollo Organization ID',
    'Organization Name',
    'Website',
    'Domain',
    'Industry',
    'Keywords',
    'Founded Year',
    'Employee Count',
    'Estimated Revenue',
    'City',
    'State',
    'Country',
    'Phone',
    'LinkedIn URL',
    'Facebook URL',
    'Twitter URL',
    'Enriched At',
    'Data Source'
  ]

  const dataRows = companies
    .filter(c => c.enrichment_data?.apollo_data && Object.keys(c.enrichment_data.apollo_data).length > 0)
    .map(company => {
      const apolloData = company.enrichment_data?.apollo_data || {}
      const organizations = apolloData.organizations || []

      // If there are multiple organizations, create a row for each
      if (organizations.length > 0) {
        return organizations.map(org => [
          company.name || 'N/A',
          company.id || '',
          org.id || 'Not Available',
          org.name || 'Not Available',
          org.website_url || 'Not Available',
          org.primary_domain || 'Not Available',
          org.industry || 'Not Available',
          Array.isArray(org.keywords) ? org.keywords.join(', ') : 'Not Available',
          org.founded_year || 'Not Available',
          org.employee_count || org.estimated_num_employees || 'Not Available',
          org.estimated_annual_revenue || 'Not Available',
          org.city || 'Not Available',
          org.state || 'Not Available',
          org.country || 'Not Available',
          org.phone || 'Not Available',
          org.linkedin_url || 'Not Available',
          org.facebook_url || 'Not Available',
          org.twitter_url || 'Not Available',
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          apolloData.source || 'apollo'
        ])
      } else {
        return [[
          company.name || 'N/A',
          company.id || '',
          'Not Available',
          'No organization found',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          apolloData.source || 'apollo'
        ]]
      }
    })
    .flat()

  if (dataRows.length === 0) {
    dataRows.push(['No Apollo.io data available', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
  }

  return [...reportInfo, headers, ...dataRows]
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
    'Google Listing URL',
    'Business Address',
    'Industry Category',
    'Owner/Decision Maker',
    'Owner Email',
    'Owner Phone',
    'Owner LinkedIn',
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
    
    // Column 5: Google Listing URL
    const googleListingUrl = company.place_id ? `https://www.google.com/maps/place/?q=place_id:${company.place_id}` : 'Not Available'
    rowData.push(escapeCSV(googleListingUrl))
    
    // Column 6: Business Address
    rowData.push(escapeCSV(company.formatted_address || company.location || 'Not Available'))
    
    // Column 7: Industry Category
    rowData.push(escapeCSV(company.industry || determineIndustryFromTypes(company.types) || 'Not Specified'))
    
    // Column 8: Owner/Decision Maker
    rowData.push(escapeCSV(company.owner_name || 'Not Identified'))
    
    // Column 9: Owner Email
    rowData.push(escapeCSV(company.owner_email || company.email || 'Not Available'))
    
    // Column 10: Owner Phone
    rowData.push(escapeCSV(formatPhoneNumber(company.owner_phone || '') || 'Not Available'))
    
    // Column 11: Owner LinkedIn
    rowData.push(escapeCSV(company.owner_linkedin || company.linkedin_url || 'Not Available'))
    
    // Column 12: Employee Count
    rowData.push(escapeCSV(company.employee_count ? company.employee_count.toString() : 'Unknown'))
    
    // Column 13: Company Size Range
    const employeeRange = company.employees_range === 'Data not verified' 
      ? 'Data not verified' 
      : company.employees_range || determineEmployeeRange(company.employee_count) || 'Not Available'
    rowData.push(escapeCSV(employeeRange))
    
    // Column 14: Annual Revenue (no commas for CSV compatibility)
    const revenue = company.revenue === 'Data not verified' 
      ? 'Data not verified' 
      : company.revenue ? `$${company.revenue}` : 'Not Available'
    rowData.push(escapeCSV(revenue))
    
    // Column 15: Revenue Range
    const revenueRange = company.revenue_range === 'Data not verified' 
      ? 'Data not verified' 
      : company.revenue_range || determineRevenueRange(company.revenue) || 'Not Available'
    rowData.push(escapeCSV(revenueRange))
    
    // Column 16: Google Rating
    rowData.push(escapeCSV(company.rating ? `${company.rating}/5.0` : 'No Rating'))
    
    // Column 17: Total Reviews
    rowData.push(escapeCSV((company.user_ratings_total || company.total_reviews || '0').toString()))
    
    // Column 18: Business Status
    rowData.push(escapeCSV(company.business_status || 'Unknown'))
    
    // Column 19: Email Confidence Level
    rowData.push(escapeCSV(company.email_confidence || 'Not Assessed'))
    
    // Column 20: Data Enrichment Status
    rowData.push(escapeCSV(company.is_enriched ? 'Enriched' : 'Pending Enrichment'))
    
    // Column 21: Enrichment Source
    rowData.push(escapeCSV(company.enrichment_source || 'Initial Discovery'))
    
    // Column 22: Discovery Date
    rowData.push(escapeCSV(formatDate(company.created_at)))
    
    // Column 23: Last Enriched
    rowData.push(escapeCSV(company.enriched_at ? formatDate(company.enriched_at) : 'Not Enriched'))
    
    // Column 24: Company ID
    rowData.push(escapeCSV(company.id || ''))
    
    // Column 25: Place ID
    rowData.push(escapeCSV(company.place_id || ''))
    
    // Column 26: Data Quality Score
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