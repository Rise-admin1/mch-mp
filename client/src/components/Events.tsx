'use client'

import AutoScrollBanner from './AutoScrollBanner'
import { useExpoRegister } from '../context/ExpoRegisterContext'

const Events = () => {
  const { openModal } = useExpoRegister()

  return (
    <section className="w-full py-10 md:py-14 bg-white">
      <div className="container mx-auto px-8 relative z-10">
        <h2 className="text-3xl md:text-5xl font-black mb-6 text-black md:leading-tight">
          Events
        </h2>
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
    </section>
  )
}

export default Events
