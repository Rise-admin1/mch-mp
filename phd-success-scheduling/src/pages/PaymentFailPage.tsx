import { format } from 'date-fns'
import { Link } from 'react-router-dom'

type StoredBooking = {
  name: string
  email: string
  notes: string
  availabilityId: string
  dateISOString: string
  time: string
  createdAt: string
  source: 'stripe-checkout'
}

const LAST_BOOKING_KEY = 'phd_success:lastBooking'

function safeParseBooking(raw: string | null): StoredBooking | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredBooking
  } catch {
    return null
  }
}

function formatUtcIsoToLocalTime(utcIso: string): string {
  const d = new Date(utcIso)
  if (Number.isNaN(d.getTime())) return utcIso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function PaymentFailPage() {
  const booking = safeParseBooking(sessionStorage.getItem(LAST_BOOKING_KEY))
  const date = booking ? new Date(booking.dateISOString) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Payment failed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment didn’t complete. You can try again.
          </p>

          {!booking || !date || Number.isNaN(date.getTime()) ? (
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
              No booking data found.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-sm font-medium">Booking</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <div>{format(date, 'EEEE, MMMM d, yyyy')}</div>
                  <div>{formatUtcIsoToLocalTime(booking.time)}</div>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="text-sm font-medium">Client</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <div>{booking.name}</div>
                  <div>{booking.email}</div>
                </div>
              </div>

              {booking.notes ? (
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="text-sm font-medium">Notes</div>
                  <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {booking.notes}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-8">
            <Link
              to="/"
              className="text-sm font-medium underline underline-offset-4 hover:opacity-80"
            >
              Back to booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

