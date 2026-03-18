import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import type { BookingData } from './BookingPage'
import { apiUrl } from '@/lib/api'

interface BookingFormProps {
  date: Date
  time: string
  availabilityId: string
  onBack: () => void
  onConfirm: (data: BookingData) => void
}

function formatUtcIsoToLocalTime(utcIso: string): string {
  const d = new Date(utcIso)
  if (Number.isNaN(d.getTime())) return utcIso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function BookingForm({ date, time, availabilityId, onBack, onConfirm }: BookingFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      setSubmitting(true)
      try {
        sessionStorage.setItem(
          'phd_success:lastBooking',
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            notes: notes.trim(),
            availabilityId,
            dateISOString: date.toISOString(),
            time,
            createdAt: new Date().toISOString(),
            source: 'stripe-checkout',
          })
        )
        // This will create a 10-minute hold and return a Stripe Checkout URL.
        const startTime = time
        const resp = await fetch(apiUrl('/api/scheduling/checkout'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            notes: notes.trim(),
            startTime,
            availabilityId,
          }),
        })
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || `Checkout failed (${resp.status})`)
        }
        const json: { url?: string } = await resp.json()
        if (!json.url) throw new Error('Missing Stripe checkout URL')
        window.location.href = json.url
      } catch (err) {
        console.error(err)
        // Fallback to existing confirmation flow if needed
        onConfirm({
          date,
          time,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
        })
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Selected date/time summary */}
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

      {/* Form */}
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
            className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all ${
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
            placeholder="john@example.com"
            className={`w-full px-3 py-2.5 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all ${
              errors.email ? 'border-destructive' : 'border-input'
            }`}
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
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 bg-foreground text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Redirecting…' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  )
}
