'use client'

import AutoScrollBanner from '../components/AutoScrollBanner'
import { useExpoRegister } from '../context/ExpoRegisterContext'

const OurWorkPage = () => {
  const { openModal } = useExpoRegister()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="flex-1">
        <div className="relative flex items-center justify-center py-20 md:py-28 bg-white">
          <div className="container mx-auto px-8 text-center">
            <h1 className="text-3xl md:text-5xl font-black text-black md:leading-tight mb-4">
              Our Work
            </h1>
            <p className="text-lg md:text-xl text-black/80 mb-2">
              Samia Women Business Expo
            </p>
            <p className="text-base md:text-lg text-black/70 max-w-2xl mx-auto">
              An ongoing initiative focused on mobilizing and supporting women in Samia through entrepreneurship, collaboration, and access to business opportunities.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-8 pb-14">
          <div className="space-y-6">
            <AutoScrollBanner />
            <div className="flex justify-start">
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center border border-trump-light-accent text-trump-light-accent hover:bg-trump-light-accent hover:text-white px-8 py-3 uppercase font-bold transition-colors"
              >
                <span>Register</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OurWorkPage
