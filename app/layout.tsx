import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Exit School Off-Market Tool',
  description: 'Discover and connect with off-market businesses for acquisition opportunities',
  keywords: ['business acquisition', 'off-market deals', 'company search', 'business intelligence'],
  authors: [{ name: 'Exit School' }],
  creator: 'Exit School',
  publisher: 'Exit School',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'),
  openGraph: {
    title: 'Exit School Off-Market Tool',
    description: 'Discover and connect with off-market businesses for acquisition opportunities',
    type: 'website',
    locale: 'en_US',
    siteName: 'Exit School Off-Market Tool',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Exit School Off-Market Tool',
    description: 'Discover and connect with off-market businesses for acquisition opportunities',
  },
  robots: {
    index: process.env.NODE_ENV === 'production',
    follow: process.env.NODE_ENV === 'production',
    googleBot: {
      index: process.env.NODE_ENV === 'production',
      follow: process.env.NODE_ENV === 'production',
    },
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Monitoring and Analytics DNS prefetch */}
        {process.env.NEXT_PUBLIC_SENTRY_DSN && (
          <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).hostname} />
        )}
        <link rel="dns-prefetch" href="vitals.vercel-analytics.com" />
        <link rel="dns-prefetch" href="va.vercel-scripts.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                {children}
              </div>
            </div>
            <Toaster />
          </Providers>
        </ErrorBoundary>
        
        {/* Analytics and Performance Monitoring */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Analytics 
              debug={process.env.NODE_ENV === 'development'}
              beforeSend={(event) => {
                // Filter out sensitive data
                if (event.url && (
                  event.url.includes('password') || 
                  event.url.includes('token') ||
                  event.url.includes('key')
                )) {
                  return null
                }
                return event
              }}
            />
            <SpeedInsights 
              debug={process.env.NODE_ENV === 'development'}
              sampleRate={process.env.NODE_ENV === 'production' ? 0.1 : 1}
            />
          </>
        )}
      </body>
    </html>
  )
}

export const runtime = 'nodejs'