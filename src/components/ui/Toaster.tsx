import { useEffect, useState } from 'react'
import { subscribeToasts, type Toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
}

function ToastItem({ toast }: { toast: Toast }) {
  const Icon = icons[toast.type]
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border shadow-soft animate-slide-up', colors[toast.type])}>
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconColors[toast.type])} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
