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

interface CampaignEmailProps {
  recipientName?: string
  companyName: string
  senderName: string
  senderEmail: string
  senderCompany?: string
  subject: string
  content: string
  callToAction?: {
    text: string
    url: string
  }
  unsubscribeUrl?: string
}

export function CampaignEmail({ 
  recipientName,
  companyName,
  senderName,
  senderEmail,
  senderCompany,
  subject,
  content,
  callToAction,
  unsubscribeUrl
}: CampaignEmailProps) {
  
  // Convert plain text content to HTML paragraphs
  const htmlContent = content
    .split('\n\n')
    .filter(paragraph => paragraph.trim().length > 0)
    .map(paragraph => paragraph.replace(/\n/g, '<br />'))

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Text style={headerText}>
                  {senderCompany || 'Business Outreach'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>
              {recipientName ? `Hi ${recipientName},` : `Hello there,`}
            </Text>

            {htmlContent.map((paragraph, index) => (
              <Text 
                key={index} 
                style={paragraph}
                dangerouslySetInnerHTML={{ __html: paragraph }}
              />
            ))}

            {/* Call to Action */}
            {callToAction && (
              <Section style={ctaSection}>
                <Button style={button} href={callToAction.url}>
                  {callToAction.text}
                </Button>
              </Section>
            )}

            {/* Signature */}
            <Section style={signature}>
              <Hr style={divider} />
              <Text style={signatureName}>{senderName}</Text>
              {senderCompany && (
                <Text style={signatureCompany}>{senderCompany}</Text>
              )}
              <Text style={signatureEmail}>
                <a href={`mailto:${senderEmail}`} style={emailLink}>
                  {senderEmail}
                </a>
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to <strong>{companyName}</strong> as part of a business outreach campaign.
            </Text>
            {unsubscribeUrl && (
              <Text style={footerText}>
                <a href={unsubscribeUrl} style={unsubscribeLink}>
                  Unsubscribe from future emails
                </a>
              </Text>
            )}
            <Text style={footerText}>
              © {new Date().getFullYear()} {senderCompany || senderName}. All rights reserved.
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
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
}

const header = {
  backgroundColor: '#ffffff',
  padding: '20px 30px 0',
  borderRadius: '8px 8px 0 0',
}

const headerText = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0',
  textAlign: 'left' as const,
}

const content = {
  padding: '30px',
}

const greeting = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  margin: '0 0 20px',
  fontWeight: '500',
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
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0',
}

const signature = {
  margin: '32px 0 0',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0 0 16px',
}

const signatureName = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 4px',
}

const signatureCompany = {
  fontSize: '15px',
  color: '#6b7280',
  margin: '0 0 4px',
}

const signatureEmail = {
  fontSize: '15px',
  color: '#6b7280',
  margin: '0',
}

const emailLink = {
  color: '#2563eb',
  textDecoration: 'none',
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

const unsubscribeLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}