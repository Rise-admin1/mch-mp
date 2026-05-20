import { LayoutClient } from '../components/LayoutClient'
import PrivacyPolicyPage from '../../src/views/PrivacyPolicyPage'

export const metadata = {
  title: 'Privacy Policy | Michael H. Mugenya 2027',
  description: 'Privacy Policy for Funyula.com',
  openGraph: {
    title: 'Privacy Policy | Michael H. Mugenya 2027',
    description: 'Privacy Policy for Funyula.com',
    url: 'https://www.funyula.com/privacy-policy',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Privacy Policy | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Privacy Policy | Michael H. Mugenya 2027',
    description: 'Privacy Policy for Funyula.com',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <PrivacyPolicyPage />
    </LayoutClient>
  )
}
