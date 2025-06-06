import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Kanit } from 'next/font/google';

// Initialize the Kanit font
const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700', '800', '900'], // Optional: Specify desired weights
  subsets: ['latin'], // Optional: Specify subsets
  variable: '--font-kanit', // Optional: Create a CSS variable for the font
});

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className={`${kanit.variable} ${kanit.className}`}>
      <body>{children}</body>
    </html>
  )
}
