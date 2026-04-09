import { LayoutClient } from '../components/LayoutClient'
import VolunteerPage from '../../src/views/VolunteerPage'

export const metadata = {
  title: 'Get Involved | Michael H. Mugenya 2027',
  description: 'Volunteer and get involved with Michael H. Mugenya 2027',
  openGraph: {
    title: 'Get Involved | Michael H. Mugenya 2027',
    description: 'Volunteer and get involved with Michael H. Mugenya 2027',
    url: 'https://www.funyula.com/get-involved',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Get Involved | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Get Involved | Michael H. Mugenya 2027',
    description: 'Volunteer and get involved with Michael H. Mugenya 2027',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <VolunteerPage />
    </LayoutClient>
  )
}
