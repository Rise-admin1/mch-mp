import { Clock, Video } from 'lucide-react'
import type { SessionType } from '@/types/session'
import { getSessionCopy } from '@/types/session'

interface ClientInfoProps {
  sessionType: SessionType | null
}

export function ClientInfo({ sessionType }: ClientInfoProps) {
  const copy = sessionType ? getSessionCopy(sessionType) : null

  return (
    <div className="space-y-6">
      {/* Avatar and name */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-foreground text-primary-foreground flex items-center justify-center text-lg font-semibold">
          MH
        </div>
        <div>
          <p className="text-sm text-muted-foreground">RISE Ltd.</p>
        </div>
      </div>

      {/* Meeting title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground text-pretty">
          {copy ? copy.title : 'Choose a session'}
        </h1>
      </div>

      {/* Meeting details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="text-sm"> 60 minute meeting</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Video className="w-4 h-4 shrink-0" />
          <span className="text-sm">Google Meet</span>
        </div>
      </div>

      {/* Description */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {copy ? copy.description : 'Select a session type to continue booking.'}
        </p>
      </div>
    </div>
  )
}
