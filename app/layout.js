import './globals.css'

export const metadata = {
  title: 'Exit School Off-Market Tool',
  description: 'Single-tenant B2B intelligence platform with admin-gated onboarding, company discovery, multi-source enrichment, AI reports, and email automation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}