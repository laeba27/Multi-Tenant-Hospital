import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geist_mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata = {
  // Without this, Next cannot turn the relative opengraph-image path into an
  // absolute URL and warns on every build, falling back to localhost:3000 --
  // which would ship a dead image URL to anyone sharing a link in production.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  // `template` gives every page a branded tab title without each one repeating
  // the product name; `default` covers routes that set no title of their own.
  title: {
    default: 'Smile Return - Hospital Management System',
    template: '%s | Smile Return',
  },
  description:
    'Smile Return is a multi-tenant hospital management system for appointments, staff, prescriptions and billing.',
  // icon.png / apple-icon.png / opengraph-image.png in this directory are picked
  // up by Next's file conventions -- no manual <link> tags needed.
  openGraph: {
    title: 'Smile Return - Hospital Management System',
    description:
      'Appointments, staff, prescriptions and billing for multi-tenant hospitals.',
    siteName: 'Smile Return',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geist_mono.variable} antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
