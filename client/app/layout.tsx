import type { Metadata } from 'next'
import Script from 'next/script'
import '../src/index.css'
import { GoogleAnalytics } from './components/GoogleAnalytics'
import { getPublicSiteUrl } from '../src/utils/siteUrl'

const siteUrl = getPublicSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Home | Michael H. Mugenya 2027',
  description: 'Certified Website of Michael H. Mugenya',
  openGraph: {
    title: 'Michael H. Mugenya 2027',
    description: 'Certified Website of Michael H. Mugenya',
    url: siteUrl,
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Michael H. Mugenya 2027',
    description: 'Certified Website of Michael H. Mugenya',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://i.postimg.cc/cL5MWGTh/logo.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-GL3T16FR3C"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GL3T16FR3C');
          `}
        </Script>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
}
