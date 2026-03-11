'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const BANNERS = [
  { src: '/images/banner-1.jpeg', alt: 'Banner 1' },
  { src: '/images/banner-2.jpeg', alt: 'Banner 2' },
]

const MOBILE_BANNERS = [
  { src: '/images/banner-1-portrait.jpeg', alt: 'Banner 1' },
  { src: '/images/banner-2-portrait.jpeg', alt: 'Banner 2' },
]

const AUTOSCROLL_INTERVAL_MS = 5000

const AutoScrollBanner = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % (isMobile ? MOBILE_BANNERS.length : BANNERS.length))
    }, AUTOSCROLL_INTERVAL_MS)

    return () => {
      window.removeEventListener('resize', updateIsMobile)
      clearInterval(timer)
    }
  }, [isMobile])

  const banners = isMobile ? MOBILE_BANNERS : BANNERS

  return (
    <section className="relative w-full overflow-hidden bg-gray-100 py-4">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="relative w-full aspect-[2/1] min-h-[280px] max-h-[480px] rounded-lg overflow-hidden bg-gray-200 md:aspect-[2/1] aspect-[4/5]">
          {banners.map((banner, index) => (
            <div
              key={banner.src}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                className="object-cover object-center"
                sizes="(max-width: 767px) 100vw, (max-width: 1280px) 100vw, 1280px"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AutoScrollBanner
