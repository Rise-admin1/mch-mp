'use client'

import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import SocialLinks from '../../src/components/SocialLinks'
import { ExpoRegisterProvider, useExpoRegister } from '../../src/context/ExpoRegisterContext'

function StickyBar() {
  const { openModal } = useExpoRegister()
  return (
    <></>
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
