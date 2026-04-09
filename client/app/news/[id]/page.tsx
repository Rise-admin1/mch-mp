import { LayoutClient } from '../../components/LayoutClient'
import SingleNews from '../../../src/views/SingleNews'
import { newsItems } from '../../../src/utils/newsData'
import { extractImageFromContent, extractDescriptionFromContent } from '../../../src/utils/metaUtils'
import { getPublicSiteUrl } from '../../../src/utils/siteUrl'

type Props = { params: Promise<{ id: string }> | { id: string } }

export async function generateMetadata({ params }: Props) {
  const base = getPublicSiteUrl()
  const resolved = await Promise.resolve(params)
  const id = resolved.id
  const newsItem = newsItems.find((item) => item.link === `/news/${id}`)
  const title = newsItem ? `${newsItem.title} | Michael H. Mugenya 2027` : 'Michael H. Mugenya 2027'
  const description = newsItem
    ? extractDescriptionFromContent(newsItem.content)
    : 'Certified Website of Michael H. Mugenya'
  const ogImage =
    newsItem && extractImageFromContent(newsItem.content)
      ? extractImageFromContent(newsItem.content)!
      : 'https://i.postimg.cc/cL5MWGTh/logo.png'
  const pageUrl = newsItem ? `${base}${newsItem.link}` : base

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: newsItem ? newsItem.title : 'Michael H. Mugenya 2027',
      description,
      url: pageUrl,
      siteName: 'Michael H. Mugenya 2027',
      images: [{ url: ogImage, alt: newsItem ? newsItem.title : 'Michael H. Mugenya 2027' }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: newsItem ? newsItem.title : 'Michael H. Mugenya 2027',
      description,
      images: [ogImage],
    },
  }
}

export default async function Page({ params }: Props) {
  const resolved = await Promise.resolve(params)
  return (
    <LayoutClient>
      <SingleNews id={resolved.id} />
    </LayoutClient>
  )
}
