'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const BANNERS = [
  {
    src: '/images/banner-1.jpeg',
    alt: 'Banner 1',
    content:
      'The upcoming Samia Women Business Expo, is an initiative that focus on mobilizing and empowering women through entrepreneurship and business collaboration.',
  },
  {
    src: '/images/banner-2.jpeg',
    alt: 'Banner 2',
    content:
      'Community outreach design for the Samia Women Business Expo, highlights efforts to bring women together to share ideas, build business groups, and expand economic opportunities.',
  },
]

const MOBILE_BANNERS = [
  {
    src: '/images/banner-1-portrait.jpeg',
    alt: 'Banner 1',
    content:
      'The upcoming Samia Women Business Expo, is an initiative that focus on mobilizing and empowering women through entrepreneurship and business collaboration.',
  },
  {
    src: '/images/banner-2-portrait.jpeg',
    alt: 'Banner 2',
    content:
      'Community outreach design for the Samia Women Business Expo, highlights efforts to bring women together to share ideas, build business groups, and expand economic opportunities.',
  },
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
    <section className="relative w-full overflow-hidden py-4">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="relative w-full aspect-[2/1] min-h-[280px] max-h-[520px] rounded-lg overflow-hidden md:aspect-[2/1] aspect-[4/5]">
          {banners.map((banner, index) => (
            <div
              key={banner.src}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col ${
                index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                className="object-contain object-center"
                sizes="(max-width: 767px) 100vw, (max-width: 1280px) 100vw, 1280px"
                priority={index === 0}
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-lg">
                <div className="relative p-4 md:p-6">
                  <p className="text-white text-sm md:text-base lg:text-lg leading-relaxed max-w-2xl">
                    {banner.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AutoScrollBanner
