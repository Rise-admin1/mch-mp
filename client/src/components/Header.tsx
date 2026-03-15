'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const contributeClass = pathname === '/contribute' ? 'btn-primary' : 'nav-link text-sm'

  return (
    <>
      <header className="bg-white border-b-4 border-trump-maingreen sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex-shrink-0">
              <Link href="/" onClick={closeMobileMenu}>
                <img
                  src="https://dubaianalytica.com/wp-content/uploads/2025/03/logo.png"
                  alt="Funyula Logo"
                  className="h-10 md:h-24"
                />
              </Link>
            </div>

            <div className="flex items-center">
              <nav className="hidden lg:flex items-center space-x-6 mr-4">
                <Link href="/news" className="nav-link text-sm">NEWS</Link>
                <Link href="/platform" className="nav-link text-sm">VISION</Link>
                <Link href="/our-work" className="nav-link text-sm">OUR WORK</Link>
                <Link href="/upcoming-projects" className="nav-link text-sm">UPCOMING PROJECTS</Link>
                <Link href="/gallery" className="nav-link text-sm">GALLERY</Link>
                <Link href="/get-involved" className="nav-link text-sm">GET INVOLVED </Link>
              </nav>

              <div className="hidden md:flex items-center">
                <Link href="/contribute" className={contributeClass}>
                  SUPPORT THE CAUSE
                </Link>
              </div>

              <div className="lg:hidden">
                <button
                  type="button"
                  className="text-trump-light-navy p-2"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4 flex flex-col space-y-4">
              <Link href="/news" className="nav-link" onClick={closeMobileMenu}>NEWS</Link>
              <Link href="/platform" className="nav-link" onClick={closeMobileMenu}>VISION</Link>
              <Link href="/our-work" className="nav-link" onClick={closeMobileMenu}>OUR WORK</Link>
              <Link href="/upcoming-projects" className="nav-link" onClick={closeMobileMenu}>UPCOMING PROJECTS</Link>
              <Link href="/gallery" className="nav-link" onClick={closeMobileMenu}>GALLERY</Link>
              <Link href="/get-involved" className="nav-link" onClick={closeMobileMenu}>GET INVOLVED</Link>
              <Link href="/contribute" className="nav-link" onClick={closeMobileMenu}>SUPPORT THE CAUSE</Link>
            </nav>
          )}
        </div>
      </header>
    </>
  )
}

export default Header
