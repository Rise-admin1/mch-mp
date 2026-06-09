import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClientInfo } from './ClientInfo'
import { Calendar } from './Calendar'
import { TimeSlots } from './TimeSlots'
import { BookingForm } from './BookingForm'
import { Toast } from './Toast'
import type { SessionType } from '@/types/session'

export interface BookingData {
  date: Date | null
  time: string | null
  name: string
  email: string
  notes: string
}

type InviteInfo = {
  id: string
  email: string
  type: 'paid' | 'free' | 'package'
  expiresAt: string | null
  status: string
  remainingSessions?: number
}

export function BookingPage() {
  const [searchParams] = useSearchParams()
  const formType = searchParams.get('formType')
  const inviteParam = searchParams.get('invite') ?? ''
  const emailFromUrl = searchParams.get('email') ?? ''
  const showSuccessToast = searchParams.get('success') === 'true'

  const showConsultative = formType !== 'dri'
  const showDri = formType !== 'consultation'

  const [sessionType, setSessionType] = useState<SessionType | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toastVisible, setToastVisible] = useState(showSuccessToast)
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteParam))
  const [inviteError, setInviteError] = useState<string | null>(null)

  const API_BASE_URL = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || '').replace(
    /\/$/,
    ''
  )

  useEffect(() => {
    if (!showSuccessToast) return

    setToastVisible(true)
    const timer = setTimeout(() => setToastVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [showSuccessToast])

  useEffect(() => {
    if (!inviteParam) return

    let cancelled = false

    async function loadInvite() {
      setInviteLoading(true)
      setInviteError(null)
      try {
        if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL')
        const resp = await fetch(`${API_BASE_URL}/api/scheduling/invites/${encodeURIComponent(inviteParam)}`)
        const json = await resp.json().catch(() => ({}))
        if (!resp.ok) {
          throw new Error(json?.message || `Failed to load invite (${resp.status})`)
        }
        const loaded = json?.invite as InviteInfo
        if (!loaded?.id) throw new Error('Invalid invite response')
        if (loaded.status !== 'active') {
          if (loaded.status === 'expired') {
            throw new Error('This complimentary invite link has expired.')
          }
          if (loaded.status === 'used') {
            throw new Error('This invite link has already been used.')
          }
          throw new Error('This invite link is no longer valid.')
        }
        if (!cancelled) {
          setInvite(loaded)
          setSessionType('consultative')
        }
      } catch (e) {
        if (!cancelled) {
          setInvite(null)
          setInviteError((e as Error).message || 'Failed to load invite')
        }
      } finally {
        if (!cancelled) setInviteLoading(false)
      }
    }

    loadInvite()
    return () => {
      cancelled = true
    }
  }, [inviteParam, API_BASE_URL])

  const handleSessionSelect = (type: SessionType) => {
    setSessionType(type)
  }

  const handleTimeSelect = (slot: { startTime: string; availabilityId: string }) => {
    setSelectedTime(slot.startTime)
    setSelectedAvailabilityId(slot.availabilityId)
    setShowForm(true)
  }

  const handleBack = () => {
    setShowForm(false)
  }

  const effectiveEmail = invite?.email || emailFromUrl

  if (inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading your appointment link…</p>
      </div>
    )
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Link unavailable</h1>
          <p className="text-sm text-muted-foreground mt-2">{inviteError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {toastVisible && (
        <Toast
          message="Your submission has been sent successfully"
          onDismiss={() => setToastVisible(false)}
        />
      )}
      <div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-80 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
            <ClientInfo sessionType={sessionType} />
          </div>

          <div className="flex-1 p-6 lg:p-8">
            {invite && (
              <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                {invite.type === 'package' ? (
                  <>
                    <p className="font-medium text-foreground">Session package</p>
                    <p className="text-muted-foreground mt-1">
                      {typeof invite.remainingSessions === 'number'
                        ? `You have ${invite.remainingSessions} complimentary session${invite.remainingSessions === 1 ? '' : 's'} remaining.`
                        : 'You have complimentary sessions available on this link.'}{' '}
                      A 100% discount is applied at Stripe checkout.
                    </p>
                  </>
                ) : invite.type === 'free' ? (
                  <>
                    <p className="font-medium text-foreground">Complimentary session</p>
                    <p className="text-muted-foreground mt-1">
                      A 100% discount is applied at Stripe checkout.
                      {invite.expiresAt
                        ? ` Link expires ${new Date(invite.expiresAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}.`
                        : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Personal booking link</p>
                    <p className="text-muted-foreground mt-1">
                      Your email is pre-filled. Complete payment at checkout when you confirm.
                    </p>
                  </>
                )}
              </div>
            )}

            {!sessionType ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Book a Consultative session</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the type of session you’d like to book.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {showConsultative && (
                    <button
                      type="button"
                      onClick={() => handleSessionSelect('consultative')}
                      className="text-left p-4 rounded-xl border border-border bg-card hover:border-foreground transition-colors"
                    >
                      <div className="text-sm font-semibold text-foreground">Consultative Sessions</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        PhD, Business and select postgraduate clients.
                      </div>
                    </button>
                  )}

                  {showDri && (
                    <button
                      type="button"
                      onClick={() => handleSessionSelect('consult-dri')}
                      className="text-left p-4 rounded-xl border border-border bg-card hover:border-foreground transition-colors"
                    >
                      <div className="text-sm font-semibold text-foreground">Consult DRI Services</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        DRI services for PhD, Business and select postgraduate clients.
                      </div>
                    </button>
                  )}
                </div>
              </div>
            ) : showForm && selectedDate && selectedTime && selectedAvailabilityId ? (
              <BookingForm
                date={selectedDate}
                time={selectedTime}
                availabilityId={selectedAvailabilityId}
                initialEmail={effectiveEmail}
                inviteId={invite?.id}
                inviteType={invite?.type}
                emailLocked={Boolean(invite)}
                onBack={handleBack}
              />
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1">
                  <Calendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>
                {selectedDate && (
                  <div className="lg:w-48">
                    <TimeSlots
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      onTimeSelect={handleTimeSelect}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
