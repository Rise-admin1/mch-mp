import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Clock, Paperclip, X } from 'lucide-react'

interface BookingFormProps {
  date: Date
  time: string
  availabilityId: string
  initialEmail?: string
  inviteId?: string
  inviteType?: 'paid' | 'free'
  emailLocked?: boolean
  onBack: () => void
}

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const LAST_BOOKING_KEY = 'phd_success:lastBooking'

function formatUtcIsoToLocalTime(utcIso: string): string {
  const d = new Date(utcIso)
  if (Number.isNaN(d.getTime())) return utcIso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

async function parseApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text()
  if (!text) return fallback
  try {
    const parsed = JSON.parse(text) as { message?: string }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message
    }
  } catch {
    // response was not JSON
  }
  return text
}

export function BookingForm({
  date,
  time,
  availabilityId,
  initialEmail = '',
  inviteId,
  inviteType,
  emailLocked = false,
  onBack,
}: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || '').replace(
    /\/$/,
    ''
  )

  const MAX_FILE_BYTES = 10 * 1024 * 1024

  const validate = () => {
    const newErrors: { name?: string; email?: string } = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateSelectedFile = (file: File): string | null => {
    if (file.size <= 0) {
      return 'The selected file is empty.'
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'File must be 10 MB or smaller.'
    }
    if (file.type && !ALLOWED_FILE_TYPES.has(file.type)) {
      return 'Unsupported file type. Allowed: PDF, Word, text, and images.'
    }
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFileError(null)
    setSubmitError(null)
    if (!file) {
      setSelectedFile(null)
      return
    }
    const validationError = validateSelectedFile(file)
    if (validationError) {
      setFileError(validationError)
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    if (!API_BASE_URL) {
      setSubmitError('Booking is unavailable (missing API configuration).')
      return
    }

    if (selectedFile) {
      const validationError = validateSelectedFile(selectedFile)
      if (validationError) {
        setFileError(validationError)
        return
      }
    }

    setSubmitting(true)
    try {
      let uploadToken: string | undefined

      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        let uploadResp: Response
        try {
          uploadResp = await fetch(`${API_BASE_URL}/api/scheduling/booking-uploads`, {
            method: 'POST',
            body: formData,
          })
        } catch {
          throw new Error('Could not upload file. Check your connection and try again.')
        }

        if (!uploadResp.ok) {
          const uploadMessage = await parseApiErrorMessage(
            uploadResp,
            `File upload failed (${uploadResp.status})`
          )
          throw new Error(uploadMessage)
        }

        let uploadJson: { uploadToken?: string }
        try {
          uploadJson = await uploadResp.json()
        } catch {
          throw new Error('Invalid response from file upload.')
        }
        if (!uploadJson.uploadToken) {
          throw new Error('Missing upload token from server.')
        }
        uploadToken = uploadJson.uploadToken
      }

      let resp: Response
      try {
        resp = await fetch(`${API_BASE_URL}/api/scheduling/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            notes: notes.trim(),
            startTime: time,
            availabilityId,
            appSource: 'phd-success',
            ...(inviteId ? { inviteId } : {}),
            ...(uploadToken ? { uploadToken } : {}),
          }),
        })
      } catch {
        throw new Error('Could not start checkout. Check your connection and try again.')
      }

      if (!resp.ok) {
        const checkoutMessage = await parseApiErrorMessage(
          resp,
          `Checkout failed (${resp.status})`
        )
        throw new Error(checkoutMessage)
      }

      let json: { url?: string }
      try {
        json = await resp.json()
      } catch {
        throw new Error('Invalid response from checkout.')
      }
      if (!json.url || typeof json.url !== 'string') {
        throw new Error('Missing Stripe checkout URL.')
      }

      sessionStorage.setItem(
        LAST_BOOKING_KEY,
        JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
          availabilityId,
          dateISOString: date.toISOString(),
          time,
          createdAt: new Date().toISOString(),
          source: inviteId ? 'invite-checkout' : 'stripe-checkout',
          inviteId: inviteId ?? null,
          inviteType: inviteType ?? null,
        })
      )

      window.location.href = json.url
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again.'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <button
        onClick={onBack}
        disabled={submitting}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="p-4 rounded-lg bg-muted/50 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm mt-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{formatUtcIsoToLocalTime(time)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
            Your name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            disabled={submitting}
            className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-60 ${
              errors.name ? 'border-destructive' : 'border-input'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email address <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={emailLocked}
            placeholder="john@example.com"
            disabled={submitting}
            className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-60 ${
              errors.email ? 'border-destructive' : 'border-input'
            } ${emailLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1.5">
            Additional notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share anything that will help prepare for our meeting..."
            rows={3}
            disabled={submitting}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="booking-file" className="block text-sm font-medium text-foreground mb-1.5">
            Upload file <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            PDF, Word, text, or image up to 10 MB. Sent to the team after payment is complete.
          </p>
          <input
            ref={fileInputRef}
            id="booking-file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={handleFileChange}
            disabled={submitting}
            className="hidden"
          />
          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg border border-dashed border-input bg-card text-foreground hover:bg-muted/50 transition-all disabled:opacity-60"
            >
              <Paperclip className="w-4 h-4" />
              Choose file
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-input bg-card">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-foreground truncate">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  setFileError(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={submitting}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {fileError && (
            <p className="text-xs text-destructive mt-1">{fileError}</p>
          )}
        </div>

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 bg-foreground text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting
            ? 'Redirecting…'
            : inviteType === 'free'
              ? 'Continue to checkout (100% off)'
              : inviteId
                ? 'Continue to checkout'
                : 'Confirm Booking'}
        </button>
      </form>
    </div>
  )
}
