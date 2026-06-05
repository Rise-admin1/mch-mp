import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface CalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
}

// Generate available dates (weekdays only, excluding past dates)
function getAvailableDates(): Set<string> {
  const available = new Set<string>()
  const today = startOfDay(new Date())
  
  // Make dates available for the next 60 days (weekdays only)
  for (let i = 0; i < 60; i++) {
    const date = addDays(today, i)
    const dayOfWeek = date.getDay()
    // Only weekdays (Monday = 1 to Friday = 5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      available.add(format(date, 'yyyy-MM-dd'))
    }
  }
  
  return available
}

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const availableDates = useMemo(() => getAvailableDates(), [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = addDays(day, 1)
  }

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const goToPrevMonth = () => {
    const prevMonth = subMonths(currentMonth, 1)
    // Don't go before current month
    if (!isBefore(prevMonth, startOfMonth(new Date()))) {
      setCurrentMonth(prevMonth)
    }
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const isDateAvailable = (date: Date) => {
    return availableDates.has(format(date, 'yyyy-MM-dd'))
  }

  const isPastMonth = isBefore(subMonths(currentMonth, 1), startOfMonth(new Date()))

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            disabled={isPastMonth}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isPastMonth
                ? "text-muted-foreground/30 cursor-not-allowed"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div
            key={dayName}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((date, dateIndex) => {
              const isCurrentMonth = isSameMonth(date, currentMonth)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isAvailable = isDateAvailable(date)
              const isTodayDate = isToday(date)

              return (
                <button
                  key={dateIndex}
                  onClick={() => isAvailable && onDateSelect(date)}
                  disabled={!isAvailable}
                  className={cn(
                    "relative aspect-square flex items-center justify-center text-sm rounded-lg transition-all",
                    !isCurrentMonth && "text-muted-foreground/30",
                    isCurrentMonth && !isAvailable && "text-muted-foreground/40 cursor-not-allowed",
                    isCurrentMonth && isAvailable && !isSelected && "text-foreground hover:bg-muted cursor-pointer",
                    isSelected && "bg-foreground text-primary-foreground font-medium",
                    isTodayDate && !isSelected && isAvailable && "font-semibold"
                  )}
                >
                  {format(date, 'd')}
                  {isTodayDate && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
