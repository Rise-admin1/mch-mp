import { X } from 'lucide-react'

interface ToastProps {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
        <p className="flex-1 text-sm text-foreground">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
