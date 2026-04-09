import { LayoutClient } from '../components/LayoutClient'
import PlatformPage from '../../src/views/Platform'

export const metadata = {
  title: 'Platform | Michael H. Mugenya 2027',
  description: 'Read the official 2027 Future-Proof Funyula Platform',
  openGraph: {
    title: 'Platform | Michael H. Mugenya 2027',
    description: 'Read the official 2027 Future-Proof Funyula Platform',
    url: 'https://www.funyula.com/platform',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Platform | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Platform | Michael H. Mugenya 2027',
    description: 'Read the official 2027 Future-Proof Funyula Platform',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <PlatformPage />
    </LayoutClient>
  )
}
