import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '../lib/utils'
import { apiUrl } from '@/lib/api'

interface TimeSlotsProps {
  selectedDate: Date
  selectedTime: string | null
  onTimeSelect: (slot: { startTime: string; availabilityId: string }) => void
}

type SlotUtc = { availabilityId: string; startTime: string; endTime: string }

function toUtcMidnightIso(date: Date): string {
  // Use the user's selected calendar date (local Y/M/D) but express it as UTC midnight.
  // This avoids day-shifts when the local timezone is not UTC.
  const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0))
  return utcMidnight.toISOString()
}

function formatSlotLabelLocal(startTimeUtcIso: string): string {
  const d = new Date(startTimeUtcIso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function TimeSlots({ selectedDate, selectedTime, onTimeSelect }: TimeSlotsProps) {
  const [slots, setSlots] = useState<SlotUtc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const dateIso = toUtcMidnightIso(selectedDate)
        const nowIso = new Date().toISOString()

        const resp = await fetch(
          apiUrl(
            `/api/scheduling/get-availability?date=${encodeURIComponent(dateIso)}&now=${encodeURIComponent(nowIso)}`
          ),
          { signal: controller.signal }
        )
        if (!resp.ok) {
          const text = await resp.text()
          throw new Error(text || `Request failed (${resp.status})`)
        }
        const json: { slots?: SlotUtc[] } = await resp.json()
        setSlots(Array.isArray(json.slots) ? json.slots : [])
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return
        setError((e as Error).message || 'Failed to load availability')
        setSlots([])
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [selectedDate])

  const slotButtons = useMemo(() => {
    return slots.map((s) => ({
      key: s.startTime,
      value: s.startTime, // keep UTC startTime as selected value
      availabilityId: s.availabilityId,
      label: formatSlotLabelLocal(s.startTime),
    }))
  }, [slots])

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <h3 className="text-sm font-medium text-foreground mb-3">
        {format(selectedDate, 'EEE, MMM d')}
      </h3>
      
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : slotButtons.length === 0 ? (
          <div className="text-sm text-muted-foreground">No times available</div>
        ) : (
          slotButtons.map((slot) => (
            <button
              key={slot.key}
              onClick={() => onTimeSelect({ startTime: slot.value, availabilityId: slot.availabilityId })}
              className={cn(
                "w-full py-2.5 px-4 text-sm font-medium rounded-lg border transition-all",
                selectedTime === slot.value
                  ? "bg-foreground text-primary-foreground border-foreground"
                  : "bg-card text-foreground border-border hover:border-foreground"
              )}
            >
              {slot.label}
            </button>
          ))
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        Times shown in your local timezone
      </p>
    </div>
  )
}
