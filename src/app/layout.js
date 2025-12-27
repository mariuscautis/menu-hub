import './globals.css'
import { ThemeProvider } from '@/lib/ThemeContext'

export const metadata = {
  title: 'Menu Hub - QR Menu & Ordering for Restaurants',
  description: 'Let your customers scan, browse your menu, and order directly from their table.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}