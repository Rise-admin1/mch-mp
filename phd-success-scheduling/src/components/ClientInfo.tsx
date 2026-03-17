import { Clock, Video } from 'lucide-react'

export function ClientInfo() {
  return (
    <div className="space-y-6">
      {/* Avatar and name */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-foreground text-primary-foreground flex items-center justify-center text-lg font-semibold">
          MH
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Michael Harun Mugenya</p>
        </div>
      </div>

      {/* Meeting title */}
      <div>
        <h1 className="text-xl font-semibold text-foreground text-pretty">
          1 Hour Meeting
        </h1>
      </div>

      {/* Meeting details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="text-sm"> 1 hour meeting</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Video className="w-4 h-4 shrink-0" />
          <span className="text-sm">Google Meet</span>
        </div>
      </div>

      {/* Description */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Schedule a quick call to discuss your DRI scores and how it can be improved.
        </p>
      </div>
    </div>
  )
}
