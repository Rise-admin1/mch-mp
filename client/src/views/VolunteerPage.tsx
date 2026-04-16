'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { setupRecaptcha, sendVerificationCode, verifyCode } from '../utils/firebase'
import { BACKEND_URL } from '../utils/ipUrl'
import Link from 'next/link'
import {
  WARD_OPTIONS,
  geoOptionLabel,
  getLocationsForWard,
  getPollingStationsFor,
  getSubLocationsFor,
} from '../data/pollingStationHelpers'

const VOLUNTEER_RECAPTCHA_ID = 'volunteer-recaptcha-container'

const VOLUNTEER_ROLES = ['POLLING_AGENT', 'BLOGGING_TEAM', 'VOTER'] as const
type VolunteerRole = (typeof VOLUNTEER_ROLES)[number]

const VOLUNTEER_GENDERS = ['MALE', 'FEMALE'] as const
type VolunteerGender = (typeof VOLUNTEER_GENDERS)[number]

const ROLE_LABELS: Record<VolunteerRole, string> = {
  POLLING_AGENT: 'Polling agent',
  BLOGGING_TEAM: 'Blogging team',
  VOTER: 'Voter',
}

const GENDER_LABELS: Record<VolunteerGender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
}

/** National digits only or with leading 0 / 254 — stored as +254… */
function formatPhoneToE164(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('254')) d = d.slice(3)
  else if (d.startsWith('0')) d = d.slice(1)
  return `+254${d}`
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  formatLabel = (v: string) => v,
}: {
  label: string
  value: string | null
  onChange: (v: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
  error?: string
  formatLabel?: (value: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) setQuery(value == null ? '' : formatLabel(value))
  }, [open, value, formatLabel])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const raw = o.toLowerCase()
      const labeled = formatLabel(o).toLowerCase()
      return raw.includes(q) || labeled.includes(q)
    })
  }, [options, query, formatLabel])

  const baseInput = `w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
    error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-300'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`

  const closedDisplay = value == null ? '' : formatLabel(value)

  return (
    <div ref={ref} className="relative">
      <span className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{label}</span>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : closedDisplay}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery(value == null ? '' : formatLabel(value))
          setOpen(true)
        }}
        className={baseInput}
      />
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto border border-gray-300 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
          ) : (
            filtered.map((opt, idx) => (
              <li key={`${opt || '__empty__'}-${idx}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt)
                    setQuery(formatLabel(opt))
                    setOpen(false)
                  }}
                >
                  {formatLabel(opt)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  )
}

const VolunteerPage = () => {
  const [formData, setFormData] = useState<{
    fullName: string
    role: VolunteerRole
    gender: VolunteerGender
    ward: string
    location: string | null
    subLocation: string | null
    pollingStation: string | null
    phone: string
    privacyPolicy: boolean
  }>({
    fullName: '',
    role: 'POLLING_AGENT',
    gender: 'MALE',
    ward: '',
    location: null,
    subLocation: null,
    pollingStation: null,
    phone: '',
    privacyPolicy: false,
  })

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [recaptchaVerified, setRecaptchaVerified] = useState(false)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<ReturnType<typeof setupRecaptcha> | null>(null)
  const [phoneStep, setPhoneStep] = useState<'idle' | 'awaiting_otp'>('idle')
  const [confirmationResult, setConfirmationResult] = useState<any>(null)
  const [otpCode, setOtpCode] = useState('')
  const [e164Phone, setE164Phone] = useState('')

  const locationOptions = useMemo(() => getLocationsForWard(formData.ward), [formData.ward])
  const subLocationOptions = useMemo(() => {
    if (formData.ward === '' || formData.location === null) return []
    return getSubLocationsFor(formData.ward, formData.location)
  }, [formData.ward, formData.location])
  const pollingOptions = useMemo(() => {
    if (formData.ward === '' || formData.location === null || formData.subLocation === null) return []
    return getPollingStationsFor(formData.ward, formData.location, formData.subLocation)
  }, [formData.ward, formData.location, formData.subLocation])

  const reinitRecaptcha = () => {
    if (!recaptchaContainerRef.current) return
    recaptchaContainerRef.current.innerHTML = ''
    try {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
      }
      recaptchaVerifierRef.current = setupRecaptcha(VOLUNTEER_RECAPTCHA_ID, {
        onVerified: () => setRecaptchaVerified(true),
        onExpired: () => setRecaptchaVerified(false),
      })
      recaptchaVerifierRef.current.render().then(() => {
        console.log('Volunteer reCAPTCHA rendered')
      })
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error)
    }
  }

  useEffect(() => {
    reinitRecaptcha()
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
      }
    }
  }, [])

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {}
    let isValid = true

    if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
      isValid = false
    }
    if (!formData.ward.trim() || !WARD_OPTIONS.includes(formData.ward)) {
      errors.ward = 'Select a valid ward'
      isValid = false
    }
    const locs = getLocationsForWard(formData.ward)
    if (formData.location === null || !locs.includes(formData.location)) {
      errors.location = 'Select a valid location'
      isValid = false
    }
    const subs = getSubLocationsFor(formData.ward, formData.location ?? '')
    if (formData.subLocation === null || !subs.includes(formData.subLocation)) {
      errors.subLocation = 'Select a valid sub location'
      isValid = false
    }
    const polls = getPollingStationsFor(
      formData.ward,
      formData.location ?? '',
      formData.subLocation ?? ''
    )
    if (
      formData.pollingStation === null ||
      !polls.includes(formData.pollingStation)
    ) {
      errors.pollingStation = 'Select a valid polling station'
      isValid = false
    }

    const phoneRegex = /^[0-9+\-\s()]+$/
    if (!phoneRegex.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
      isValid = false
    } else {
      const e164 = formatPhoneToE164(formData.phone)
      const national = e164.replace(/^\+254/, '')
      if (national.length < 9 || national.length > 10) {
        errors.phone = 'Enter 9–10 digits after +254'
        isValid = false
      }
    }
    if (!formData.privacyPolicy) {
      errors.privacyPolicy = 'You must agree to the privacy policy'
      isValid = false
    }

    setFieldErrors(errors)
    return isValid
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    const newValue = type === 'checkbox' ? checked : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const postVolunteer = async (firebaseIdToken: string | null) => {
    const phoneE164 = formatPhoneToE164(formData.phone)
    return axios.post(`${BACKEND_URL}/api/volunteer/submit`, {
      fullName: formData.fullName.trim(),
      role: formData.role,
      gender: formData.gender,
      ward: formData.ward.trim(),
      location: (formData.location ?? '').trim(),
      subLocation: (formData.subLocation ?? '').trim(),
      pollingStation: (formData.pollingStation ?? '').trim(),
      phone: phoneE164,
      privacyPolicy: formData.privacyPolicy,
      ...(firebaseIdToken ? { firebaseIdToken } : {}),
    })
  }

  const resetAfterSuccess = () => {
    setFormData({
      fullName: '',
      role: 'POLLING_AGENT',
      gender: 'MALE',
      ward: '',
      location: null,
      subLocation: null,
      pollingStation: null,
      phone: '',
      privacyPolicy: false,
    })
    setPhoneStep('idle')
    setConfirmationResult(null)
    setOtpCode('')
    setE164Phone('')
    setRecaptchaVerified(false)
    reinitRecaptcha()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isSubmitting || phoneStep === 'awaiting_otp') return

    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})

    if (!validateAllFields()) {
      setErrorMessage('Please fill in all required fields correctly')
      return
    }

    if (!recaptchaVerified) {
      setErrorMessage('Please complete the reCAPTCHA verification')
      return
    }

    const phoneE164 = formatPhoneToE164(formData.phone)
    setIsSubmitting(true)

    try {
      const checkResp = await axios.post<{ exists: boolean; checkUnavailable?: boolean }>(
        `${BACKEND_URL}/api/volunteer/check-firebase-phone`,
        { phone: phoneE164 }
      )

      if (checkResp.data.exists) {
        const sendVolunteerResponse = await postVolunteer(null)
        setSuccessMessage(sendVolunteerResponse.data.message)
        resetAfterSuccess()
        return
      }

      if (!recaptchaVerifierRef.current) {
        setErrorMessage('Verification not ready. Please refresh and try again.')
        return
      }

      const confirmation = await sendVerificationCode(phoneE164, recaptchaVerifierRef.current, {
        skipRender: true,
      })
      setConfirmationResult(confirmation)
      setE164Phone(phoneE164)
      setPhoneStep('awaiting_otp')
      setOtpCode('')
      setSuccessMessage(`Verification code sent to ${phoneE164}. Enter it below to complete registration.`)
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'An error occurred, please try again later'
      setErrorMessage(msg)
      console.error(error)
      try {
        reinitRecaptcha()
      } catch {
        /* ignore */
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtpAndSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (isSubmitting || phoneStep !== 'awaiting_otp') return
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      if (!confirmationResult) {
        setErrorMessage('Verification session expired. Go back and submit again.')
        return
      }
      const cred = await verifyCode(confirmationResult, otpCode.trim())
      const idToken = await cred.user.getIdToken()
      const sendVolunteerResponse = await postVolunteer(idToken)
      setSuccessMessage(sendVolunteerResponse.data.message)
      resetAfterSuccess()
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Invalid code or submission failed. Try again.'
      setErrorMessage(msg)
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelOtp = () => {
    setPhoneStep('idle')
    setConfirmationResult(null)
    setOtpCode('')
    setE164Phone('')
    setSuccessMessage(null)
    setErrorMessage(null)
    reinitRecaptcha()
  }

  return (
    <div className="font-['Montserrat',sans-serif] text-gray-800">
      {/* Hero section with background */}
      <div className="relative">
        <div
          className="relative h-[300px] w-full bg-cover bg-center sm:h-[400px]"
          style={{
            backgroundImage: `url(https://dubaianalytica.com/wp-content/uploads/2025/03/get_involved.jpg)`,
          }}
        >
          <div className="absolute left-0 right-0 top-[230px] mx-auto w-11/12 bg-[#d61936] px-4 py-4 text-center text-white sm:top-80 sm:w-3/5 sm:py-8">
            <h2 className="mb-2 text-2xl font-bold sm:text-4xl">SIGN UP TO JOIN VOLUNTEERS LIKE YOU!</h2>
            <h3 className="text-xl font-bold sm:text-2xl">HELP HON. MUGENYA RESTORE THE LOST GLORY OF SAMIA!</h3>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-24 sm:pt-32">
        <p className="mb-8 mt-16 text-sm sm:mt-0 sm:text-base">
          The forgotten people of Samia are the heart and soul of our great community. The only force strong enough to
          revive our struggling economy, restore dignity to our schools and hospitals, and secure a better future is you,
          the people of this land. To reclaim what we have lost and restore the fabric of our glorious Samia, and build a
          thriving, self-reliant Funyula constituency, we need every farmer, every youth, every family to stand together,
          demand change, and make their voices heard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {successMessage ? (
            <div className="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">{successMessage}</div>
          ) : null}
          {errorMessage ? (
            <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{errorMessage}</div>
          ) : null}

          <div>
            <label htmlFor="fullName" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Full name *
            </label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              placeholder="FULL NAME *"
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                fieldErrors.fullName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-300'
              } ${isSubmitting ? 'cursor-not-allowed bg-gray-100' : ''}`}
            />
            {fieldErrors.fullName ? <p className="mt-1 text-sm text-red-500">{fieldErrors.fullName}</p> : null}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
            <div className="min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">Role</span>
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-2">
                {VOLUNTEER_ROLES.map((r) => (
                  <label key={r} className={`flex items-center gap-2 text-sm ${isSubmitting ? 'text-gray-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.role === r}
                      onChange={(e) => {
                        if (!e.target.checked) return
                        setFormData((prev) => ({ ...prev, role: r }))
                      }}
                      disabled={isSubmitting}
                      className={isSubmitting ? 'cursor-not-allowed' : ''}
                    />
                    <span>{ROLE_LABELS[r]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">Gender</span>
              <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-2">
                {VOLUNTEER_GENDERS.map((g) => (
                  <label key={g} className={`flex items-center gap-2 text-sm ${isSubmitting ? 'text-gray-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.gender === g}
                      onChange={(e) => {
                        if (!e.target.checked) return
                        setFormData((prev) => ({ ...prev, gender: g }))
                      }}
                      disabled={isSubmitting}
                      className={isSubmitting ? 'cursor-not-allowed' : ''}
                    />
                    <span>{GENDER_LABELS[g]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Ward *"
              value={formData.ward || null}
              formatLabel={(v) => v}
              onChange={(v) => {
                setFormData((prev) => ({
                  ...prev,
                  ward: v,
                  location: null,
                  subLocation: null,
                  pollingStation: null,
                }))
                setFieldErrors((prev) => {
                  const next = { ...prev, ward: '', location: '', subLocation: '', pollingStation: '' }
                  return next
                })
              }}
              options={WARD_OPTIONS}
              placeholder="Search or select ward…"
              disabled={isSubmitting}
              error={fieldErrors.ward}
            />
            <SearchableSelect
              label="Location *"
              value={formData.location}
              formatLabel={geoOptionLabel}
              onChange={(v) => {
                setFormData((prev) => ({
                  ...prev,
                  location: v,
                  subLocation: null,
                  pollingStation: null,
                }))
                setFieldErrors((prev) => {
                  const next = { ...prev, location: '', subLocation: '', pollingStation: '' }
                  return next
                })
              }}
              options={locationOptions}
              placeholder={formData.ward ? 'Search or select location…' : 'Select a ward first'}
              disabled={isSubmitting || !formData.ward}
              error={fieldErrors.location}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Sub location *"
              value={formData.subLocation}
              formatLabel={geoOptionLabel}
              onChange={(v) => {
                setFormData((prev) => ({
                  ...prev,
                  subLocation: v,
                  pollingStation: null,
                }))
                setFieldErrors((prev) => {
                  const next = { ...prev, subLocation: '', pollingStation: '' }
                  return next
                })
              }}
              options={subLocationOptions}
              placeholder={
                formData.location !== null ? 'Search or select sub location…' : 'Select a location first'
              }
              disabled={isSubmitting || formData.location === null}
              error={fieldErrors.subLocation}
            />
            <SearchableSelect
              label="Polling station *"
              value={formData.pollingStation}
              formatLabel={(v) => v}
              onChange={(v) => {
                setFormData((prev) => ({ ...prev, pollingStation: v }))
                if (fieldErrors.pollingStation) {
                  setFieldErrors((prev) => ({ ...prev, pollingStation: '' }))
                }
              }}
              options={pollingOptions}
              placeholder={
                formData.subLocation !== null && pollingOptions.length
                  ? 'Search or select polling station…'
                  : 'Complete ward, location, and sub location'
              }
              disabled={isSubmitting || formData.subLocation === null || pollingOptions.length === 0}
              error={fieldErrors.pollingStation}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Phone *
            </label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder="+254 7XX XXX XXX"
              value={formData.phone}
              onChange={handleChange}
              required
              disabled={isSubmitting || phoneStep === 'awaiting_otp'}
              autoComplete="tel"
              className={`w-full border p-2 sm:p-3 focus:outline-none focus:ring-1 ${
                fieldErrors.phone ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-gray-300'
              } ${isSubmitting || phoneStep === 'awaiting_otp' ? 'cursor-not-allowed bg-gray-100' : ''}`}
            />
            <p className="mt-1 text-xs text-gray-500">Country code +254 is added automatically. Enter your number only.</p>
            {fieldErrors.phone ? <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p> : null}
          </div>

          {phoneStep === 'awaiting_otp' ? (
            <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-800">SMS verification</p>
              <p className="text-xs text-gray-600">
                Code sent to {e164Phone || formatPhoneToE164(formData.phone)}. Enter the 6-digit code.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label htmlFor="volunteer-otp" className="sr-only">
                    Verification code
                  </label>
                  <input
                    id="volunteer-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 p-2 sm:p-3 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleVerifyOtpAndSubmit()}
                  disabled={isSubmitting || otpCode.length < 6}
                  className="bg-[#d61936] px-4 py-3 text-sm font-bold text-white hover:bg-[#b01529] disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Saving…' : 'Verify & register'}
                </button>
              </div>
              <button
                type="button"
                onClick={cancelOtp}
                disabled={isSubmitting}
                className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900"
              >
                Use a different number
              </button>
            </div>
          ) : null}

          <div>
            <label className="flex items-start space-x-2">
              <input
                type="checkbox"
                name="privacyPolicy"
                checked={formData.privacyPolicy}
                onChange={handleChange}
                required
                disabled={isSubmitting}
                className={`mt-1 ${isSubmitting ? 'cursor-not-allowed' : ''}`}
              />
              <span className={`text-sm sm:text-base ${isSubmitting ? 'text-gray-500' : ''}`}>
                By providing this information you are acknowledging and agreeing to the{' '}
                <a href="#" className="font-bold text-[#d61936]">
                  PRIVACY POLICY
                </a>
              </span>
            </label>
            {fieldErrors.privacyPolicy ? (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.privacyPolicy}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-start">
            <div id={VOLUNTEER_RECAPTCHA_ID} ref={recaptchaContainerRef} className="mb-4"></div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !recaptchaVerified || phoneStep === 'awaiting_otp'}
            className={`flex w-full items-center justify-center py-3 text-sm font-bold text-white transition-all sm:py-4 sm:text-base ${
              isSubmitting || !recaptchaVerified || phoneStep === 'awaiting_otp'
                ? 'cursor-not-allowed bg-gray-400'
                : 'bg-[#d61936] hover:bg-[#b01529]'
            }`}
          >
            {isSubmitting && phoneStep !== 'awaiting_otp' ? (
              <>
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                PROCESSING...
              </>
            ) : (
              <>
                <span className="mr-2">SUBMIT</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M5 12H19M19 12L12 5M19 12L12 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-600 sm:text-sm">
          By providing your phone number, you are consenting to receive calls and recurring SMS messages or texts, to
          that number from each of the participating committees in Mugenya&apos;s 2027 Committee. Msg &amp; data rates may
          apply. Terms &amp; conditions/privacy policy apply
        </p>
      </div>

      {/* Donate Section */}
      <div className="bg-[#263a66] py-12 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-4xl">
          <Link href="/contribute" className="font-bold text-[#d61936]">
            Donate
          </Link>
        </h2>
        <div className="mx-auto mt-4 h-1 w-12 bg-[#d61936]"></div>
      </div>
    </div>
  )
}

export default VolunteerPage
