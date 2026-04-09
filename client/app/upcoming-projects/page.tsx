import { LayoutClient } from '../components/LayoutClient'
import UpcomingProjectsPage from '../../src/views/UpcomingProjectsPage'

export const metadata = {
  title: 'Upcoming Projects | Michael H. Mugenya 2027',
  description: 'Upcoming projects and initiatives from Michael H. Mugenya 2027',
  openGraph: {
    title: 'Upcoming Projects | Michael H. Mugenya 2027',
    description: 'Upcoming projects and initiatives from Michael H. Mugenya 2027',
    url: 'https://www.funyula.com/upcoming-projects',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'Upcoming Projects | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Upcoming Projects | Michael H. Mugenya 2027',
    description: 'Upcoming projects and initiatives from Michael H. Mugenya 2027',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <UpcomingProjectsPage />
    </LayoutClient>
  )
}
