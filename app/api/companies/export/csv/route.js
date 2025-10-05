import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    console.log('=== CSV EXPORT API CALLED ===')
    console.log('Runtime:', runtime)
    console.log('Dynamic:', dynamic)

    const { date, userId, companyIds } = await request.json()

    console.log('Export request:', { date, userId, companyIds: companyIds?.length })

    let companies = []
    let targetDate = new Date()

    // If specific company IDs provided, fetch those
    if (companyIds && companyIds.length > 0) {
      console.log('Fetching specific companies by IDs:', companyIds.length)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch companies' },
          { status: 500 }
        )
      }

      companies = data || []
      targetDate = new Date() // Use current date for filename
    } else {
      // Date-based export (original behavior)
      if (!date) {
        return NextResponse.json(
          { error: 'Date or companyIds is required' },
          { status: 400 }
        )
      }

      // Parse the date and get companies for that specific day
      targetDate = new Date(date)
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

      const { data, error } = await query

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch companies' },
          { status: 500 }
        )
      }

      companies = data || []
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies found' },
        { status: 404 }
      )
    }

    // Generate multi-sheet Excel file with separate sheets for each enrichment source
    console.log('Generating multi-sheet Excel with', companies.length, 'companies')
    const excelBuffer = generateMultiSheetExcel(companies, targetDate)
    console.log('Excel buffer generated, size:', excelBuffer.length, 'bytes')

    // Format filename with date
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `companies-export-${dateStr}.xlsx`

    console.log('Returning Excel file:', filename)
    console.log('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

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
    ['ZoomInfo Enrichment Data - All 61 Fields'],
    [''],
    ['Report Generated:', new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })],
    ['Data Date:', exportDate.toLocaleDateString()],
    ['Total Companies with ZoomInfo Data:', companies.filter(c => c.enrichment_data?.zoominfo_data && Object.keys(c.enrichment_data.zoominfo_data).length > 0).length.toString()],
    ['']
  ]

  // All 61 ZoomInfo fields organized by category
  const headers = [
    // Internal Reference
    'Company Name',
    'Company ID',

    // Contact Information (Basic)
    'Last Name',
    'First Name',
    'Job Title',
    'Direct Phone',
    'Email Address',
    'Mobile Phone',

    // Contact Extended (Enhanced)
    'Job Title Hierarchy Level',
    'Management Level',
    'Job Start Date',
    'Job Function',
    'Department',
    'LinkedIn Contact Profile',

    // Company Basic Information
    'Company Name (ZI)',
    'Website',
    'Company Phone',
    'Company Description',

    // Company Extended (Enhanced)
    'ZoomInfo Company ID',
    'Founded Year',
    'Fax Number',
    'Stock Ticker',
    'Alexa Rank',
    'ZoomInfo Profile URL',
    'Certified Active',
    'Certification Date',

    // Financial Information (Enhanced)
    'Revenue (USD)',
    'Revenue Range',
    'Marketing Budget',
    'Finance Budget',
    'IT Budget',
    'HR Budget',
    'Total Funding',
    'Recent Funding Amount',
    'Recent Funding Round',
    'Recent Funding Date',
    'Recent Investors',
    'All Investors',

    // Firmographics
    'Employee Count',
    'Employee Range',
    'Employee Growth (1 Year)',
    'Employee Growth (2 Years)',
    'Ownership Type',
    'Business Model',
    'Number of Locations',

    // Industry Classification
    'Primary Industry',
    'Primary Sub-Industry',
    'All Industries',
    'All Sub-Industries',
    'Industry Category',
    'SIC Code (Primary)',
    'SIC Codes (All)',
    'NAICS Code (Primary)',
    'NAICS Codes (All)',

    // Location Information
    'Street Address',
    'City',
    'State',
    'Zip Code',
    'Country',
    'Full Address',

    // Social Media (Enhanced)
    'LinkedIn Company URL',
    'Facebook Page',
    'Twitter Profile',

    // Metadata
    'Enriched At',
    'Data Source'
  ]

  const dataRows = companies
    .filter(c => c.enrichment_data?.zoominfo_data && Object.keys(c.enrichment_data.zoominfo_data).length > 0)
    .flatMap(company => {
      const zoomData = company.enrichment_data?.zoominfo_data || {}
      const companyData = zoomData.company || {}
      const contactsArray = zoomData.contacts || (zoomData.contact ? [zoomData.contact] : [])

      // If no contacts, create one row with company data only
      if (contactsArray.length === 0) {
        return [[
          // Internal Reference
          company.name || 'N/A',
          company.id || '',

          // Contact Information (Basic) - empty if no contacts
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',

          // Contact Extended (Enhanced) - empty if no contacts
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',
          'Not Available',

          ...getCompanyDataRow(company, companyData)
        ]]
      }

      // Create one row per contact
      return contactsArray.map(contactData => [
        // Internal Reference
        company.name || 'N/A',
        company.id || '',

        // Contact Information (Basic)
        contactData.lastName || contactData.last_name || 'Not Available',
        contactData.firstName || contactData.first_name || 'Not Available',
        contactData.jobTitle || contactData.title || 'Not Available',
        contactData.directPhone || contactData.direct_phone || 'Not Available',
        contactData.email || 'Not Available',
        contactData.mobilePhone || contactData.mobile_phone || 'Not Available',

        // Contact Extended (Enhanced)
        contactData.jobTitleHierarchyLevel || contactData.job_title_hierarchy_level || 'Not Available',
        contactData.managementLevel || contactData.management_level || 'Not Available',
        contactData.jobStartDate || contactData.job_start_date || 'Not Available',
        contactData.jobFunction || contactData.job_function || 'Not Available',
        contactData.department || 'Not Available',
        contactData.linkedinUrl || contactData.linkedin_url || 'Not Available',

        ...getCompanyDataRow(company, companyData)
      ])
    })

  // Helper function to extract company data row
  function getCompanyDataRow(company, companyData) {
    return [

        // Company Basic Information
        companyData.name || companyData.companyName || 'Not Available',
        companyData.website || companyData.websiteUrl || 'Not Available',
        companyData.phone || companyData.companyPhone || 'Not Available',
        companyData.description || companyData.companyDescription || 'Not Available',

        // Company Extended (Enhanced)
        companyData.id || companyData.companyId || 'Not Available',
        companyData.foundedYear || companyData.founded_year || 'Not Available',
        companyData.fax || 'Not Available',
        companyData.ticker || companyData.stockTicker || 'Not Available',
        companyData.alexaRank || companyData.alexa_rank || 'Not Available',
        companyData.zoomInfoUrl || companyData.zoominfo_url || 'Not Available',
        companyData.certifiedActive || companyData.certified_active || 'Not Available',
        companyData.certificationDate || companyData.certification_date || 'Not Available',

        // Financial Information (Enhanced)
        companyData.revenue || companyData.revenueUsd || 'Not Available',
        companyData.revenueRange || companyData.revenue_range || 'Not Available',
        companyData.marketingBudget || companyData.marketing_budget || 'Not Available',
        companyData.financeBudget || companyData.finance_budget || 'Not Available',
        companyData.itBudget || companyData.it_budget || 'Not Available',
        companyData.hrBudget || companyData.hr_budget || 'Not Available',
        companyData.totalFunding || companyData.total_funding || 'Not Available',
        companyData.recentFundingAmount || companyData.recent_funding_amount || 'Not Available',
        companyData.recentFundingRound || companyData.recent_funding_round || 'Not Available',
        companyData.recentFundingDate || companyData.recent_funding_date || 'Not Available',
        companyData.recentInvestors || companyData.recent_investors || 'Not Available',
        companyData.allInvestors || companyData.all_investors || 'Not Available',

        // Firmographics
        companyData.employees || companyData.employeeCount || companyData.employee_count || 'Not Available',
        companyData.employeeRange || companyData.employee_range || 'Not Available',
        companyData.employeeGrowth1Yr || companyData.employee_growth_1yr || 'Not Available',
        companyData.employeeGrowth2Yr || companyData.employee_growth_2yr || 'Not Available',
        companyData.ownershipType || companyData.ownership_type || 'Not Available',
        companyData.businessModel || companyData.business_model || 'Not Available',
        companyData.numberOfLocations || companyData.number_of_locations || 'Not Available',

        // Industry Classification
        companyData.primaryIndustry || companyData.primary_industry || companyData.industry || 'Not Available',
        companyData.primarySubIndustry || companyData.primary_sub_industry || 'Not Available',
        companyData.allIndustries || companyData.all_industries || 'Not Available',
        companyData.allSubIndustries || companyData.all_sub_industries || 'Not Available',
        companyData.industryCategory || companyData.industry_category || 'Not Available',
        companyData.sicCode1 || companyData.sic_code_1 || (Array.isArray(companyData.sicCodes) && companyData.sicCodes[0] ? `${companyData.sicCodes[0].id} - ${companyData.sicCodes[0].name}` : 'Not Available'),
        formatCodeArray(companyData.sicCodes || companyData.sic_codes),
        companyData.naicsCode1 || companyData.naics_code_1 || (Array.isArray(companyData.naicsCodes) && companyData.naicsCodes[0] ? `${companyData.naicsCodes[0].id} - ${companyData.naicsCodes[0].name}` : 'Not Available'),
        formatCodeArray(companyData.naicsCodes || companyData.naics_codes),

        // Location Information
        companyData.street || companyData.streetAddress || companyData.street_address || 'Not Available',
        companyData.city || 'Not Available',
        companyData.state || 'Not Available',
        companyData.zip || companyData.zipCode || companyData.zip_code || 'Not Available',
        companyData.country || 'Not Available',
        companyData.fullAddress || companyData.full_address || 'Not Available',

        // Social Media (Enhanced)
        companyData.linkedinUrl || companyData.linkedin_url || 'Not Available',
        companyData.facebookUrl || companyData.facebook_url || 'Not Available',
        companyData.twitterUrl || companyData.twitter_url || 'Not Available',

        // Metadata
        company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
        zoomData.source || 'zoominfo'
    ]
  }

  if (dataRows.length === 0) {
    dataRows.push(['No ZoomInfo data available', ...Array(headers.length - 1).fill('')])
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
    // Internal Reference
    'Company Name',
    'Company ID',

    // Contact Information (if people data available)
    'Contact First Name',
    'Contact Last Name',
    'Contact Title',
    'Contact Email',
    'Contact Phone',
    'Contact LinkedIn',
    'Contact Seniority',
    'Contact Department',

    // Apollo Organization Data
    'Apollo Org ID',
    'Organization Name',
    'Website',
    'Domain',
    'Industry',
    'Secondary Industries',
    'Keywords',

    // Company Metrics
    'Founded Year',
    'Employee Count',
    'Revenue (USD)',
    'Revenue (Printed)',
    'Alexa Ranking',
    'Retail Location Count',

    // Location
    'Street Address',
    'City',
    'State',
    'Country',
    'Postal Code',
    'Raw Address',

    // Contact Info
    'Phone',
    'Sanitized Phone',

    // Social & Web
    'LinkedIn URL',
    'LinkedIn UID',
    'Facebook URL',
    'Twitter URL',
    'Blog URL',
    'Logo URL',
    'Crunchbase URL',
    'AngelList URL',

    // Public Company Info
    'Publicly Traded Symbol',
    'Publicly Traded Exchange',

    // Additional Data
    'NAICS Codes',
    'Languages',

    // Metadata
    'Enriched At',
    'Data Source'
  ]

  const dataRows = companies
    .filter(c => c.enrichment_data?.apollo_data && Object.keys(c.enrichment_data.apollo_data).length > 0)
    .flatMap(company => {
      const apolloData = company.enrichment_data?.apollo_data || {}
      const organizations = apolloData.organizations || []
      const people = apolloData.people || []

      if (organizations.length === 0) {
        return [[
          company.name || 'N/A',
          company.id || '',
          ...Array(56).fill('Not Available'),
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          apolloData.source || 'apollo'
        ]]
      }

      const org = organizations[0] // Use first organization

      // If we have people data, create one row per person
      if (people.length > 0) {
        return people.map(person => [
          // Internal Reference
          company.name || 'N/A',
          company.id || '',

          // Contact Information
          person.first_name || 'Not Available',
          person.last_name || 'Not Available',
          person.title || 'Not Available',
          person.email || 'Not Available',
          person.phone_numbers?.[0]?.sanitized_number || person.phone_numbers?.[0]?.raw_number || 'Not Available',
          person.linkedin_url || 'Not Available',
          person.seniority || 'Not Available',
          person.departments?.[0] || 'Not Available',

          // Apollo Organization Data
          org.id || 'Not Available',
          org.name || 'Not Available',
          org.website_url || 'Not Available',
          org.primary_domain || 'Not Available',
          org.industry || 'Not Available',
          Array.isArray(org.secondary_industries) ? org.secondary_industries.join(', ') : 'Not Available',
          Array.isArray(org.keywords) ? org.keywords.slice(0, 20).join(', ') : 'Not Available',

          // Company Metrics
          org.founded_year || 'Not Available',
          org.estimated_num_employees || 'Not Available',
          org.organization_revenue || 'Not Available',
          org.organization_revenue_printed || 'Not Available',
          org.alexa_ranking || 'Not Available',
          org.retail_location_count || 'Not Available',

          // Location
          org.street_address || 'Not Available',
          org.city || 'Not Available',
          org.state || 'Not Available',
          org.country || 'Not Available',
          org.postal_code || 'Not Available',
          org.raw_address || 'Not Available',

          // Contact Info
          org.phone || 'Not Available',
          org.sanitized_phone || 'Not Available',

          // Social & Web
          org.linkedin_url || 'Not Available',
          org.linkedin_uid || 'Not Available',
          org.facebook_url || 'Not Available',
          org.twitter_url || 'Not Available',
          org.blog_url || 'Not Available',
          org.logo_url || 'Not Available',
          org.crunchbase_url || 'Not Available',
          org.angellist_url || 'Not Available',

          // Public Company Info
          org.publicly_traded_symbol || 'Not Available',
          org.publicly_traded_exchange || 'Not Available',

          // Additional Data
          Array.isArray(org.naics_codes) ? org.naics_codes.join(', ') : 'Not Available',
          Array.isArray(org.languages) ? org.languages.join(', ') : 'Not Available',

          // Metadata
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          apolloData.source || 'apollo'
        ])
      } else {
        // No people data, just organization
        return [[
          // Internal Reference
          company.name || 'N/A',
          company.id || '',

          // Contact Information - empty
          'Not Available', 'Not Available', 'Not Available', 'Not Available',
          'Not Available', 'Not Available', 'Not Available', 'Not Available',

          // Apollo Organization Data
          org.id || 'Not Available',
          org.name || 'Not Available',
          org.website_url || 'Not Available',
          org.primary_domain || 'Not Available',
          org.industry || 'Not Available',
          Array.isArray(org.secondary_industries) ? org.secondary_industries.join(', ') : 'Not Available',
          Array.isArray(org.keywords) ? org.keywords.slice(0, 20).join(', ') : 'Not Available',

          // Company Metrics
          org.founded_year || 'Not Available',
          org.estimated_num_employees || 'Not Available',
          org.organization_revenue || 'Not Available',
          org.organization_revenue_printed || 'Not Available',
          org.alexa_ranking || 'Not Available',
          org.retail_location_count || 'Not Available',

          // Location
          org.street_address || 'Not Available',
          org.city || 'Not Available',
          org.state || 'Not Available',
          org.country || 'Not Available',
          org.postal_code || 'Not Available',
          org.raw_address || 'Not Available',

          // Contact Info
          org.phone || 'Not Available',
          org.sanitized_phone || 'Not Available',

          // Social & Web
          org.linkedin_url || 'Not Available',
          org.linkedin_uid || 'Not Available',
          org.facebook_url || 'Not Available',
          org.twitter_url || 'Not Available',
          org.blog_url || 'Not Available',
          org.logo_url || 'Not Available',
          org.crunchbase_url || 'Not Available',
          org.angellist_url || 'Not Available',

          // Public Company Info
          org.publicly_traded_symbol || 'Not Available',
          org.publicly_traded_exchange || 'Not Available',

          // Additional Data
          Array.isArray(org.naics_codes) ? org.naics_codes.join(', ') : 'Not Available',
          Array.isArray(org.languages) ? org.languages.join(', ') : 'Not Available',

          // Metadata
          company.enrichment_data?.enriched_at || formatDate(company.enriched_at) || 'Not Available',
          apolloData.source || 'apollo'
        ]]
      }
    })

  if (dataRows.length === 0) {
    dataRows.push(['No Apollo.io data available', ...Array(57).fill('')])
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

// Helper function to format SIC/NAICS code arrays from ZoomInfo
function formatCodeArray(codes) {
  if (!Array.isArray(codes) || codes.length === 0) return 'Not Available'
  return codes.map(code => `${code.id} - ${code.name}`).join('; ')
}