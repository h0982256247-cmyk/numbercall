type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners: Set<Listener> = new Set()

function notify() {
  listeners.forEach(l => l([...toasts]))
}

export const toast = {
  success: (message: string) => addToast('success', message),
  error: (message: string) => addToast('error', message),
  info: (message: string) => addToast('info', message),
  warning: (message: string) => addToast('warning', message),
}

function addToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, type, message }]
  notify()
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 3500)
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export type { Toast }
