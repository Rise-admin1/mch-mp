'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { BACKEND_URL } from '../utils/ipUrl'
import { setupRecaptcha, sendVerificationCode, verifyCode } from '../utils/firebase'

const DESIGNATIONS = ['Official', 'Member', '--Options--'] as const

type FormData = {
  groupName: string
  designation: (typeof DESIGNATIONS)[number]
  groupLeaderName: string
  yourName: string
  idNumber: string
  phoneNumber: string
}

const initialFormData: FormData = {
  groupName: '',
  designation: '--Options--',
  groupLeaderName: '',
  yourName: '',
  idNumber: '',
  phoneNumber: '',
}

type ExpoRegisterContextType = {
  openModal: () => void
}

const ExpoRegisterContext = createContext<ExpoRegisterContextType | null>(null)

export function useExpoRegister() {
  const ctx = useContext(ExpoRegisterContext)
  if (!ctx) throw new Error('useExpoRegister must be used within ExpoRegisterProvider')
  return ctx
}

export function ExpoRegisterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [verifyPhoneNumber, setVerifyPhoneNumber] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<any>(null)
  const recaptchaId = 'expo-recaptcha-container'
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<any>(null)

  const openModal = () => setModalOpen(true)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    const noLeadingCountry = cleaned.startsWith('254') ? cleaned.slice(3) : cleaned
    const noLeadingZero = noLeadingCountry.startsWith('0') ? noLeadingCountry.slice(1) : noLeadingCountry
    return `+254${noLeadingZero}`
  }

  const isDesignationInvalid = formData.designation === '--Options--'

  useEffect(() => {
    if (!modalOpen) return
    if (!recaptchaContainerRef.current) return

    recaptchaContainerRef.current.innerHTML = ''
    try {
      recaptchaVerifierRef.current = setupRecaptcha(recaptchaId)
    } catch (err) {
      console.error('Error initializing reCAPTCHA:', err)
      setError('Failed to initialize verification. Please refresh the page and try again.')
    }

    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
      }
    }
  }, [modalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isDesignationInvalid) {
        setError('Please select a designation to continue.')
        return
      }

      const formattedPhoneNumber = formatPhoneNumber(formData.phoneNumber)

      const statusRes = await axios.post(`${BACKEND_URL}/api/volunteer/expo-phone-status`, {
        phoneNumber: formattedPhoneNumber,
      })

      if (statusRes.data?.isVerified) {
        await axios.post(`${BACKEND_URL}/api/volunteer/expo-register`, {
          ...formData,
          phoneNumber: formattedPhoneNumber,
          isVerified: true,
        })
        setSuccess(true)
        setTimeout(() => {
          setModalOpen(false)
          setSuccess(false)
          setFormData(initialFormData)
          window.location.assign('https://fpfplatform.funyula.com/')
        }, 1500)
        return
      }

      if (!recaptchaVerifierRef.current) {
        throw new Error('Verification not initialized. Please refresh the page and try again.')
      }

      const result = await sendVerificationCode(formattedPhoneNumber, recaptchaVerifierRef.current)
      setConfirmationResult(result)
      setVerifyPhoneNumber(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')

      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        try {
          recaptchaVerifierRef.current = setupRecaptcha(recaptchaId)
        } catch (e) {
          console.error('Error re-initializing reCAPTCHA:', e)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please try again.')
      }

      await verifyCode(confirmationResult, verificationCode)

      const formattedPhoneNumber = formatPhoneNumber(formData.phoneNumber)
      await axios.post(`${BACKEND_URL}/api/volunteer/expo-register`, {
        ...formData,
        phoneNumber: formattedPhoneNumber,
        isVerified: true,
      })

      setSuccess(true)
      setTimeout(() => {
        setModalOpen(false)
        setSuccess(false)
        setVerifyPhoneNumber(false)
        setVerificationCode('')
        setConfirmationResult(null)
        setFormData(initialFormData)
        window.location.assign('https://fpfplatform.funyula.com/')
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    if (!loading) {
      setModalOpen(false)
      setError(null)
      setVerifyPhoneNumber(false)
      setVerificationCode('')
      setConfirmationResult(null)
      setFormData(initialFormData)
    }
  }

  return (
    <ExpoRegisterContext.Provider value={{ openModal }}>
      {children}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="expo-modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 id="expo-modal-title" className="text-xl font-bold text-gray-800 mb-4">
                Expo Registration
              </h2>

              {success ? (
                <div className="text-center py-6">
                  <p className="text-green-600 font-semibold">Registration successful!</p>
                  <p className="text-gray-600 text-sm mt-2">Redirecting to manifesto...</p>
                </div>
              ) : (
                <form onSubmit={verifyPhoneNumber ? handleVerifyCode : handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="expo-groupName" className="block text-sm font-medium text-gray-700 mb-1">
                      Group name
                    </label>
                    <input
                      id="expo-groupName"
                      name="groupName"
                      type="text"
                      required
                      value={formData.groupName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>
                  <div>
                    <label htmlFor="expo-designation" className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <select
                      id="expo-designation"
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
                    {isDesignationInvalid && (
                      <p className="text-red-600 text-sm mt-1">Please select a designation.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="expo-groupLeaderName" className="block text-sm font-medium text-gray-700 mb-1">
                      Group leader name
                    </label>
                    <input
                      id="expo-groupLeaderName"
                      name="groupLeaderName"
                      type="text"
                      required
                      value={formData.groupLeaderName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>
                  <div>
                    <label htmlFor="expo-yourName" className="block text-sm font-medium text-gray-700 mb-1">
                      Your name
                    </label>
                    <input
                      id="expo-yourName"
                      name="yourName"
                      type="text"
                      required
                      value={formData.yourName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>
                  <div>
                    <label htmlFor="expo-idNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      ID number
                    </label>
                    <input
                      id="expo-idNumber"
                      name="idNumber"
                      type="text"
                      required
                      value={formData.idNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                    />
                  </div>
                  <div>
                    <label htmlFor="expo-phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone number
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                        +254
                      </div>
                      <input
                        id="expo-phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '')
                          setFormData((prev) => ({ ...prev, phoneNumber: digitsOnly }))
                          setError(null)
                        }}
                        className="w-full border border-gray-300 rounded pl-14 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>
                  {!verifyPhoneNumber && (
                    <div
                      id={recaptchaId}
                      ref={recaptchaContainerRef}
                      className="flex justify-center"
                    />
                  )}
                  {verifyPhoneNumber && (
                    <div>
                      <label htmlFor="expo-verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Verification code
                      </label>
                      <input
                        id="expo-verificationCode"
                        name="verificationCode"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-trump-maingreen"
                      />
                    </div>
                  )}
                  {error && <p className="text-red-600 text-sm">{error}</p>}
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
                      disabled={loading || (!verifyPhoneNumber && isDesignationInvalid)}
                      className="flex-1 bg-trump-maingreen text-white py-2 px-4 rounded font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {verifyPhoneNumber ? (loading ? 'Verifying...' : 'Verify & Continue') : (loading ? 'Submitting...' : 'Submit')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </ExpoRegisterContext.Provider>
  )
}
