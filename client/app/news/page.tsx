import { LayoutClient } from '../components/LayoutClient'
import NewsPage from '../../src/views/NewsPage'

export const metadata = {
  title: 'News | Michael H. Mugenya 2027',
  description: 'Latest news and updates from Michael H. Mugenya 2027',
  openGraph: {
    title: 'News | Michael H. Mugenya 2027',
    description: 'Latest news and updates from Michael H. Mugenya 2027',
    url: 'https://www.funyula.com/news',
    siteName: 'Michael H. Mugenya 2027',
    images: [{ url: 'https://i.postimg.cc/cL5MWGTh/logo.png', alt: 'News | Michael H. Mugenya 2027' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'News | Michael H. Mugenya 2027',
    description: 'Latest news and updates from Michael H. Mugenya 2027',
    images: ['https://i.postimg.cc/cL5MWGTh/logo.png'],
  },
}

export default function Page() {
  return (
    <LayoutClient>
      <NewsPage />
    </LayoutClient>
  )
}
