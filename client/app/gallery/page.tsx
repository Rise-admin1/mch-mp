import { LayoutClient } from '../components/LayoutClient'
import GaleryPage from '../../src/views/GaleryPage'

export const metadata = {
  title: 'Gallery | Michael H. Mugenya 2027',
  description: 'Photo gallery of Michael H. Mugenya 2027',
  openGraph: {
    title: 'Gallery | Michael H. Mugenya 2027',
    description: 'Photo gallery of Michael H. Mugenya 2027',
    url: 'https://www.funyula.com/gallery',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Gallery | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Gallery | Michael H. Mugenya 2027',
    description: 'Photo gallery of Michael H. Mugenya 2027',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <GaleryPage />
    </LayoutClient>
  )
}
