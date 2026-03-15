import { LayoutClient } from '../components/LayoutClient'
import OurWorkPage from '../../src/views/OurWorkPage'

export const metadata = {
  title: 'Our Work | Michael H. Mugenya 2027',
  description: 'Samia Women Business Expo — Our Work',
  openGraph: {
    title: 'Our Work | Michael H. Mugenya 2027',
    description: 'Samia Women Business Expo — Our Work',
    url: 'https://funyula.com/our-work',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Our Work | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Our Work | Michael H. Mugenya 2027',
    description: 'Samia Women Business Expo — Our Work',
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
