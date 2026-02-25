import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'

export const metadata = {
  title: 'Veno App - QR Menu & Ordering for Restaurants',
  description: 'Let your customers scan, browse your menu, and order directly from their table.',
  manifest: '/api/manifest',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Veno App'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6262bd'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/api/icon/192" />
        <link rel="apple-touch-icon" sizes="512x512" href="/api/icon/512" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Veno App" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}