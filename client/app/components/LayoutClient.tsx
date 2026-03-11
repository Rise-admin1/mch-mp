'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import Header from '../../src/components/Header'
import Footer from '../../src/components/Footer'
import SocialLinks from '../../src/components/SocialLinks'
import { BACKEND_URL } from '../../src/utils/ipUrl'

const DESIGNATIONS = ['Official', 'Member'] as const

export function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    groupName: '',
    designation: 'Member' as (typeof DESIGNATIONS)[number],
    groupLeaderName: '',
    yourName: '',
    idNumber: '',
    phoneNumber: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await axios.post(`${BACKEND_URL}/api/volunteer/expo-register`, formData)
      setSuccess(true)
      setTimeout(() => {
        setModalOpen(false)
        setSuccess(false)
        setFormData({
          groupName: '',
          designation: 'Member',
          groupLeaderName: '',
          yourName: '',
          idNumber: '',
          phoneNumber: '',
        })
        router.push('/#join-movement')
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    if (!loading) {
      setModalOpen(false)
      setError(null)
      setFormData({
        groupName: '',
        designation: 'Member',
        groupLeaderName: '',
        yourName: '',
        idNumber: '',
        phoneNumber: '',
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div
        className="sticky top-16 md:top-32 z-40 w-full bg-white border-b border-gray-200 shadow-sm"
        aria-label="Sticky container"
      >
        <div className="container mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <p className="text-sm sm:text-base text-gray-700">
            Join the movement — Samia Women Business Expo this April. Funyula Stadium.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-primary text-sm font-bold py-2 px-4 rounded whitespace-nowrap"
          >
            Register
          </button>
        </div>
      </div>

      {/* Registration modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 id="modal-title" className="text-xl font-bold text-gray-800 mb-4">
                Expo Registration
              </h2>

              {success ? (
                <div className="text-center py-6">
                  <p className="text-green-600 font-semibold">Registration successful!</p>
                  <p className="text-gray-600 text-sm mt-2">Redirecting to manifesto...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                      Group name
                    </label>
                    <input
                      id="groupName"
                      name="groupName"
                      type="text"
                      required
                      value={formData.groupName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>

                  <div>
                    <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <select
                      id="designation"
                      name="designation"
                      required
                      value={formData.designation}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    >
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="groupLeaderName" className="block text-sm font-medium text-gray-700 mb-1">
                      Group leader name
                    </label>
                    <input
                      id="groupLeaderName"
                      name="groupLeaderName"
                      type="text"
                      required
                      value={formData.groupLeaderName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>

                  <div>
                    <label htmlFor="yourName" className="block text-sm font-medium text-gray-700 mb-1">
                      Your name
                    </label>
                    <input
                      id="yourName"
                      name="yourName"
                      type="text"
                      required
                      value={formData.yourName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>

                  <div>
                    <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      ID number
                    </label>
                    <input
                      id="idNumber"
                      name="idNumber"
                      type="text"
                      required
                      value={formData.idNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone number
                    </label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>

                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={loading}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-trump-maingreen text-white py-2 px-4 rounded font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow">{children}</main>
      <SocialLinks />
      <Footer />
    </div>
  )
}
