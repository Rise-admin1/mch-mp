import { LayoutClient } from '../components/LayoutClient'
import OurWorkPage from '../../src/views/OurWorkPage'

export const metadata = {
  title: 'Our Work | Michael H. Mugenya 2027',
  description: 'Samia Women Business Expo - An ongoing initiative focused on mobilizing and supporting women in Samia through entrepreneurship, collaboration, and access to business opportunities.',
  openGraph: {
    title: 'Our Work | Michael H. Mugenya 2027',
    description: 'Samia Women Business Expo - An ongoing initiative focused on mobilizing and supporting women in Samia through entrepreneurship, collaboration, and access to business opportunities.',
    url: 'https://www.funyula.com/our-work',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Our Work | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Our Work | Michael H. Mugenya 2027',
    description: 'Samia Women Business Expo - An ongoing initiative focused on mobilizing and supporting women in Samia through entrepreneurship, collaboration, and access to business opportunities.',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <OurWorkPage />
    </LayoutClient>
  )
}
