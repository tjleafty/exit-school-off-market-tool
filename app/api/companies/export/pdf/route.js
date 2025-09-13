import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

export async function POST(request) {
  try {
    const { companyId } = await request.json()
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Get company data
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (error || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Generate PDF using browser printing approach
    const htmlContent = generateCompanyReportHTML(company)
    
    // Return structured data for client-side PDF generation
    return NextResponse.json({
      success: true,
      companyName: company.name,
      htmlContent: htmlContent,
      filename: `company-report-${company.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
    })

  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    )
  }
}

function generateCompanyReportHTML(company) {
  const enrichedDate = company.enriched_at ? new Date(company.enriched_at).toLocaleString() : 'Not enriched'
  const createdDate = new Date(company.created_at).toLocaleString()
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Company Report - ${company.name}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
        }
        .header { 
            border-bottom: 2px solid #3B82F6; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #1F2937; 
            margin: 0;
            font-size: 28px;
        }
        .header .subtitle { 
            color: #6B7280; 
            font-size: 14px;
            margin-top: 5px;
        }
        .section { 
            margin-bottom: 25px; 
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
        }
        .section h2 { 
            color: #374151; 
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 10px;
            margin-top: 0;
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-top: 15px;
        }
        .info-item { 
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #3B82F6;
        }
        .info-label { 
            font-weight: 600; 
            color: #374151;
            display: block;
            margin-bottom: 4px;
        }
        .info-value { 
            color: #6B7280; 
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-enriched {
            background: #D1FAE5;
            color: #065F46;
        }
        .status-pending {
            background: #FEF3C7;
            color: #92400E;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${company.name}</h1>
        <div class="subtitle">Company Intelligence Report • Generated ${new Date().toLocaleString()}</div>
    </div>

    <div class="section">
        <h2>📊 Company Overview</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                    <span class="status-badge ${company.is_enriched ? 'status-enriched' : 'status-pending'}">
                        ${company.is_enriched ? 'Enriched' : 'Pending'}
                    </span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">Industry</span>
                <span class="info-value">${company.industry || 'Not specified'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Website</span>
                <span class="info-value">${company.website || 'Not available'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Rating</span>
                <span class="info-value">${company.rating ? `${company.rating}/5.0 (${company.user_ratings_total || 0} reviews)` : 'No rating'}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📍 Contact Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Address</span>
                <span class="info-value">${company.formatted_address || company.location || 'Not available'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone</span>
                <span class="info-value">${company.phone || company.formatted_phone_number || 'Not available'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email</span>
                <span class="info-value">${company.email || 'Not available'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Owner</span>
                <span class="info-value">${company.owner_name || 'Not identified'}</span>
            </div>
        </div>
    </div>

    ${company.is_enriched ? `
    <div class="section">
        <h2>💼 Business Intelligence</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Employee Count</span>
                <span class="info-value">${company.employee_count || 'Not available'} ${company.employees_range ? `(${company.employees_range})` : ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Revenue</span>
                <span class="info-value">${company.revenue ? `$${company.revenue.toLocaleString()}` : 'Not available'} ${company.revenue_range ? `(${company.revenue_range})` : ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email Confidence</span>
                <span class="info-value">${company.email_confidence || 'Not specified'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Enrichment Source</span>
                <span class="info-value">${company.enrichment_source || 'Not specified'}</span>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>🔍 Discovery Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Created</span>
                <span class="info-value">${createdDate}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Last Updated</span>
                <span class="info-value">${new Date(company.updated_at).toLocaleString()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Enriched At</span>
                <span class="info-value">${enrichedDate}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Company ID</span>
                <span class="info-value">${company.id}</span>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This report was generated by Exit School Off-Market Tool</p>
        <p>Report generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`
}