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

interface InvitationEmailProps {
  name?: string
  acceptUrl: string
  expiresAt: string
  companyName?: string
}

export function InvitationEmail({ 
  name, 
  acceptUrl, 
  expiresAt,
  companyName 
}: InvitationEmailProps) {
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Html>
      <Head />
      <Preview>Your Exit School Off-Market Tool account has been approved!</Preview>
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
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={heading}>🎉 Account Approved!</Text>
            
            <Text style={paragraph}>
              Hi {name || 'there'},
            </Text>
            
            <Text style={paragraph}>
              Great news! Your request for access to the <strong>Exit School Off-Market Tool</strong> has been approved. 
              You can now complete your account setup and start discovering off-market business opportunities.
            </Text>

            {companyName && (
              <Text style={paragraph}>
                We're excited to have <strong>{companyName}</strong> join our platform!
              </Text>
            )}

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Text style={ctaText}>Ready to get started?</Text>
              <Button style={button} href={acceptUrl}>
                Complete Account Setup
              </Button>
            </Section>

            {/* Features Section */}
            <Section style={featuresSection}>
              <Text style={sectionHeading}>What you'll get access to:</Text>
              <ul style={featuresList}>
                <li style={featureItem}>🔍 Advanced business search with Google Places integration</li>
                <li style={featureItem}>📊 AI-powered business intelligence reports</li>
                <li style={featureItem}>📧 Automated email campaign management</li>
                <li style={featureItem}>💾 Secure data storage and export capabilities</li>
                <li style={featureItem}>📈 Performance analytics and tracking</li>
              </ul>
            </Section>

            <Hr style={divider} />

            {/* Important Info */}
            <Section style={importantSection}>
              <Text style={importantHeading}>⏰ Important Information</Text>
              <Text style={importantText}>
                This invitation link expires on <strong>{expirationDate}</strong>. 
                Please complete your account setup before this date to ensure uninterrupted access.
              </Text>
            </Section>

            <Text style={paragraph}>
              If you have any questions or need assistance, please don't hesitate to reach out to our support team.
            </Text>

            <Text style={paragraph}>
              Best regards,<br />
              <strong>The Exit School Team</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {name ? `${name} at ` : ''}<strong>{acceptUrl.split('?')[0]}</strong>.
            </Text>
            <Text style={footerText}>
              If you didn't request access to Exit School Off-Market Tool, you can safely ignore this email.
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
  maxWidth: '600px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
}

const header = {
  backgroundColor: '#667eea',
  backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '20px 30px',
  borderRadius: '8px 8px 0 0',
}

const logo = {
  margin: '0',
}

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

const button = {
  backgroundColor: '#667eea',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '0',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
}

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

const importantSection = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #f59e0b',
  margin: '24px 0',
}

const importantHeading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#92400e',
  margin: '0 0 8px',
}

const importantText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#92400e',
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