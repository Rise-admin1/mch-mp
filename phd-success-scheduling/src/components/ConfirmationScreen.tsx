import { format } from 'date-fns'
import { Calendar, Clock, Video, CheckCircle2, Mail } from 'lucide-react'
import type { BookingData } from './BookingPage'

interface ConfirmationScreenProps {
  booking: BookingData
}

export function ConfirmationScreen({ booking }: ConfirmationScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          You're booked!
        </h1>
        <p className="text-muted-foreground mb-8">
          A calendar invite has been sent to your email.
        </p>

        {/* Booking details card */}
        <div className="bg-card rounded-xl border border-border p-6 text-left">
          <h2 className="font-semibold text-foreground mb-4">
            1 Hour Meeting with RISE Ltd.
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">
                {booking.date ? format(booking.date, 'EEEE, MMMM d, yyyy') : ''}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{booking.time}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Video className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">Google Meet</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{booking.email}</span>
            </div>
          </div>

          {booking.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm text-foreground">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-foreground text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Schedule Another Meeting
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-muted-foreground">
          Need to make changes?{' '}
          <button className="text-foreground underline underline-offset-2 hover:no-underline">
            Reschedule or cancel
          </button>
        </p>
      </div>
    </div>
  )
}
