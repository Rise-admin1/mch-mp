import { CheckCircle2, X } from 'lucide-react'

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
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 shadow-lg">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="flex-1 text-sm font-medium text-green-800">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-green-600 hover:text-green-800 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
