import { useState } from 'react'
import { ClientInfo } from './ClientInfo'
import { Calendar } from './Calendar'
import { TimeSlots } from './TimeSlots'
import { BookingForm } from './BookingForm'
import { ConfirmationScreen } from './ConfirmationScreen'

export interface BookingData {
  date: Date | null
  time: string | null
  name: string
  email: string
  notes: string
}

export function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [bookingData, setBookingData] = useState<BookingData | null>(null)

  const handleTimeSelect = (slot: { startTime: string; availabilityId: string }) => {
    setSelectedTime(slot.startTime)
    setSelectedAvailabilityId(slot.availabilityId)
    setShowForm(true)
  }

  const handleBack = () => {
    setShowForm(false)
  }

  const handleConfirm = (data: BookingData) => {
    setBookingData(data)
    setConfirmed(true)
  }

  if (confirmed && bookingData) {
    return <ConfirmationScreen booking={bookingData} />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left sidebar - Client info */}
          <div className="lg:w-80 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-border bg-muted/30">
            <ClientInfo />
          </div>

          {/* Right content - Calendar and time slots */}
          <div className="flex-1 p-6 lg:p-8">
            {showForm && selectedDate && selectedTime && selectedAvailabilityId ? (
              <BookingForm
                date={selectedDate}
                time={selectedTime}
                availabilityId={selectedAvailabilityId}
                onBack={handleBack}
                onConfirm={handleConfirm}
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
