'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const BANNERS = [
  { src: '/images/banner-1.jpeg', alt: 'Banner 1' },
  { src: '/images/banner-2.jpeg', alt: 'Banner 2' },
]

const AUTOSCROLL_INTERVAL_MS = 5000

const AutoScrollBanner = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BANNERS.length)
    }, AUTOSCROLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative w-full overflow-hidden bg-gray-100 py-4">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="relative w-full aspect-[2/1] min-h-[280px] max-h-[480px] rounded-lg overflow-hidden bg-gray-200">
          {BANNERS.map((banner, index) => (
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
                className="object-contain object-center"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 mt-3">
          {BANNERS.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-6 bg-gray-700'
                  : 'w-2 bg-gray-400 hover:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default AutoScrollBanner
