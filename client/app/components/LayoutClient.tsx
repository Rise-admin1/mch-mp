'use client'

import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import SocialLinks from '../../src/components/SocialLinks'
import { ExpoRegisterProvider, useExpoRegister } from '../../src/context/ExpoRegisterContext'

function StickyBar() {
  const { openModal } = useExpoRegister()
  return (
    <div
      className="sticky top-16 md:top-32 z-40 w-full bg-white border-b border-gray-200 shadow-sm"
      aria-label="Sticky container"
    >
      <style jsx>{`
        @keyframes stickyMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Mobile: single-line marquee */}
      <div className="md:hidden overflow-hidden">
        <div
          className="flex w-max items-center gap-3 px-4 py-3 whitespace-nowrap will-change-transform"
          style={{ animation: 'stickyMarquee 14s linear infinite' }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openModal}
              className="text-base font-semibold text-gray-800 underline underline-offset-4 hover:text-trump-light-accent transition-colors"
            >
             Samia Women Business Expo
            </button>
            <button
              type="button"
              onClick={openModal}
              className="btn-primary text-base font-bold py-2 px-4 rounded whitespace-nowrap"
            >
              Register
            </button>
          </div>
          {/* duplicate for seamless loop */}
          <div className="flex items-center gap-3" aria-hidden="true">
            <button
              type="button"
              onClick={openModal}
              className="text-base font-semibold text-gray-800 underline underline-offset-4 hover:text-trump-light-accent transition-colors"
              tabIndex={-1}
            >
              Samia Women Business Expo
            </button>
            <button
              type="button"
              onClick={openModal}
              className="btn-primary text-base font-bold py-2 px-4 rounded whitespace-nowrap"
              tabIndex={-1}
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: static layout */}
      <div className="hidden md:flex container mx-auto px-4 py-2 flex-wrap items-center justify-center gap-2 sm:gap-3">
        <p className="text-sm sm:text-base text-gray-700">
          Samia Women Business Expo
        </p>
        <button
          type="button"
          onClick={openModal}
          className="btn-primary text-sm font-bold py-2 px-4 rounded whitespace-nowrap"
        >
          Register
        </button>
      </div>
    </div>
  )
}

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ExpoRegisterProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <StickyBar />
        <main className="flex-grow">{children}</main>
        <SocialLinks />
        <Footer />
      </div>
    </ExpoRegisterProvider>
  )
}
