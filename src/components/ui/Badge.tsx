import { cn } from '@/lib/utils'
import type { TicketStatus, EventStatus } from '@/types/database'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger:  'bg-red-50 text-red-600',
    info:    'bg-blue-50 text-blue-700',
    purple:  'bg-brand-50 text-brand-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
    waiting:   { label: '等待中', variant: 'info' },
    called:    { label: '請入場', variant: 'warning' },
    entered:   { label: '已入場', variant: 'success' },
    skipped:   { label: '已過號', variant: 'danger' },
    cancelled: { label: '已取消', variant: 'default' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const map: Record<EventStatus, { label: string; variant: BadgeVariant }> = {
    draft:  { label: '草稿', variant: 'default' },
    active: { label: '進行中', variant: 'success' },
    paused: { label: '暫停中', variant: 'warning' },
    ended:  { label: '已結束', variant: 'danger' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}
