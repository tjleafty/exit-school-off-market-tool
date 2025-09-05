import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Hr,
  Row,
  Column
} from '@react-email/components'

interface ReportReadyEmailProps {
  userName?: string
  companyName: string
  reportUrl: string
  reportTier: 'ENHANCED' | 'BI'
  generatedAt: string
}

export function ReportReadyEmail({ 
  userName, 
  companyName, 
  reportUrl,
  reportTier,
  generatedAt
}: ReportReadyEmailProps) {
  const tierLabel = reportTier === 'BI' ? 'Business Intelligence' : 'Enhanced Analysis'
  const tierColor = reportTier === 'BI' ? '#dc2626' : '#059669'
  
  const generationDate = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

  return (
    <Html>
      <Head />
      <Preview>Your {tierLabel} report for {companyName} is ready to view</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Img
                  src="https://exitschool.com/logo.png"
                  width="150"
                  height="40"
                  alt="Exit School"
                  style={logo}
                />
              </Column>
              <Column align="right">
                <Text style={headerBadge(tierColor)}>
                  {tierLabel} Report
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={heading}>📊 Your Report is Ready!</Text>
            
            <Text style={paragraph}>
              Hi {userName || 'there'},
            </Text>
            
            <Text style={paragraph}>
              Your <strong>{tierLabel}</strong> report for <strong>{companyName}</strong> has been 
              successfully generated and is now ready for review.
            </Text>

            {/* Report Summary */}
            <Section style={reportSummary}>
              <Text style={summaryHeading}>Report Summary</Text>
              <Row>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Company:</Text>
                  <Text style={summaryValue}>{companyName}</Text>
                </Column>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Report Type:</Text>
                  <Text style={summaryValue}>{tierLabel}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Generated:</Text>
                  <Text style={summaryValue}>{generationDate}</Text>
                </Column>
                <Column style={summaryColumn}>
                  <Text style={summaryLabel}>Status:</Text>
                  <Text style={summaryValue}>✅ Complete</Text>
                </Column>
              </Row>
            </Section>

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Text style={ctaText}>Ready to review your insights?</Text>
              <Button style={button(tierColor)} href={reportUrl}>
                View Report
              </Button>
            </Section>

            {/* Report Features */}
            <Section style={featuresSection}>
              <Text style={sectionHeading}>What's included in your report:</Text>
              <ul style={featuresList}>
                <li style={featureItem}>📋 Executive Summary with key findings</li>
                <li style={featureItem}>🏢 Comprehensive Company Overview</li>
                <li style={featureItem}>👥 Key Personnel Analysis</li>
                <li style={featureItem}>🚀 Growth Opportunities Assessment</li>
                <li style={featureItem}>💡 Strategic Recommendations</li>
                {reportTier === 'BI' && (
                  <>
                    <li style={featureItem}>📈 Market Analysis & Competitive Landscape</li>
                    <li style={featureItem}>💰 Financial Insights & Projections</li>
                    <li style={featureItem}>⚠️ Risk Assessment & Mitigation Strategies</li>
                  </>
                )}
              </ul>
            </Section>

            <Hr style={divider} />

            {/* Actions Section */}
            <Section style={actionsSection}>
              <Text style={sectionHeading}>What you can do next:</Text>
              <Row>
                <Column style={actionColumn}>
                  <Text style={actionTitle}>📥 Download</Text>
                  <Text style={actionText}>Export your report as HTML or PDF for offline viewing</Text>
                </Column>
                <Column style={actionColumn}>
                  <Text style={actionTitle}>📤 Share</Text>
                  <Text style={actionText}>Share insights with your team or stakeholders</Text>
                </Column>
              </Row>
              <Row>
                <Column style={actionColumn}>
                  <Text style={actionTitle}>📧 Email Campaign</Text>
                  <Text style={actionText}>Create targeted outreach based on report insights</Text>
                </Column>
                <Column style={actionColumn}>
                  <Text style={actionTitle}>🔄 Generate More</Text>
                  <Text style={actionText}>Generate reports for other companies in your pipeline</Text>
                </Column>
              </Row>
            </Section>

            <Text style={paragraph}>
              Need help interpreting your report or have questions about the insights? 
              Our team is here to help you make the most of your business intelligence.
            </Text>

            <Text style={paragraph}>
              Best regards,<br />
              <strong>The Exit School Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This report was generated for <strong>{userName || 'your account'}</strong> on {generationDate}.
            </Text>
            <Text style={footerText}>
              You're receiving this email because you requested a report generation in your Exit School dashboard.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} Exit School. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '650px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
}

const header = {
  backgroundColor: '#1f2937',
  padding: '20px 30px',
  borderRadius: '8px 8px 0 0',
}

const logo = {
  margin: '0',
}

const headerBadge = (color: string) => ({
  backgroundColor: color,
  color: '#ffffff',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '0',
})

const content = {
  padding: '40px 30px',
}

const heading = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '36px',
  color: '#1f2937',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  margin: '0 0 16px',
}

const reportSummary = {
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  margin: '24px 0',
}

const summaryHeading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 16px',
}

const summaryColumn = {
  width: '50%',
  paddingRight: '12px',
}

const summaryLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px',
  fontWeight: '500',
}

const summaryValue = {
  fontSize: '15px',
  color: '#1f2937',
  margin: '0 0 16px',
  fontWeight: '600',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
}

const ctaText = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 16px',
}

const button = (color: string) => ({
  backgroundColor: color,
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '0',
  boxShadow: `0 4px 15px ${color}30`,
})

const sectionHeading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '24px 0 12px',
}

const featuresSection = {
  margin: '24px 0',
}

const featuresList = {
  margin: '0',
  padding: '0 0 0 16px',
}

const featureItem = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4b5563',
  margin: '0 0 8px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const actionsSection = {
  margin: '24px 0',
}

const actionColumn = {
  width: '50%',
  paddingRight: '16px',
  marginBottom: '16px',
}

const actionTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 4px',
}

const actionText = {
  fontSize: '13px',
  lineHeight: '18px',
  color: '#6b7280',
  margin: '0',
}

const footer = {
  backgroundColor: '#f8fafc',
  padding: '20px 30px',
  borderTop: '1px solid #e5e7eb',
  borderRadius: '0 0 8px 8px',
}

const footerText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}