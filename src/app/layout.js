import './globals.css'

export const metadata = {
  title: 'Menu Hub - QR Menu & Ordering for Restaurants',
  description: 'Let your customers scan, browse your menu, and order directly from their table.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}