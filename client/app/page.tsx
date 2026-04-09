import { LayoutClient } from './components/LayoutClient'
import HomePage from '../src/views/HomePage'

export const metadata = {
  title: 'Home | Michael H. Mugenya 2027',
  description: 'Certified Website of Michael H. Mugenya',
  openGraph: {
    title: 'Michael H. Mugenya 2027',
    description: 'Certified Website of Michael H. Mugenya',
    url: 'https://www.funyula.com',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Michael H. Mugenya 2027',
    description: 'Certified Website of Michael H. Mugenya',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <HomePage />
    </LayoutClient>
  )
}
