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
      <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <p className="text-sm sm:text-base text-gray-700">
        Register for the Samia Women Business Expo this April.
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
