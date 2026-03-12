import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, callFunction } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TicketStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'
import type { QueueTicket, LineUser } from '@/types/database'
import { ChevronLeft, Users, SkipForward, RefreshCw, X, ChevronRight } from 'lucide-react'

interface TicketWithUser extends QueueTicket {
  line_user: LineUser
}

export default function EventQueuePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketWithUser[]>([])
  const [currentCalled, setCurrentCalled] = useState<TicketWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [eventName, setEventName] = useState('')

  useEffect(() => {
    if (!eventId) return
    loadQueue(eventId)

    const channel = supabase
      .channel(`queue-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: `event_id=eq.${eventId}` },
        () => loadQueue(eventId))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function loadQueue(id: string) {
    const [evRes, ticketsRes, calledRes] = await Promise.all([
      supabase.from('events').select('name').eq('id', id).single(),
      supabase.from('queue_tickets')
        .select('*, line_user:line_users(*)').eq('event_id', id).eq('status', 'waiting')
        .order('queue_number', { ascending: true }),
      supabase.from('queue_tickets')
        .select('*, line_user:line_users(*)').eq('event_id', id).eq('status', 'called')
        .order('called_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    setEventName(evRes.data?.name || '')
    setTickets((ticketsRes.data as TicketWithUser[]) || [])
    setCurrentCalled(calledRes.data as TicketWithUser | null)
    setLoading(false)
  }

  /** 呼叫 call-next Edge Function（叫號 + LINE 通知）*/
  async function callViaEdge(payload: { eventId: string; ticketId?: string }) {
    return callFunction('call-next', payload)
  }

  async function callNext() {
    if (!eventId) return
    setActionLoading(true)
    const res = await callViaEdge({ eventId })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || '叫號失敗'); setActionLoading(false); return }
    toast.success(`已叫 #${json.ticket.queue_number} 號`)
    setActionLoading(false)
  }

  async function recallTicket(ticketId: string) {
    if (!eventId) return
    setActionLoading(true)
    const res = await callViaEdge({ eventId, ticketId })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error || '重叫失敗'); setActionLoading(false); return }
    toast.success(`已重叫 #${json.ticket.queue_number} 號，通知已發送`)
    setActionLoading(false)
  }

  async function updateStatus(ticketId: string, status: 'skipped' | 'cancelled') {
    setActionLoading(true)
    const { error } = await supabase
      .from('queue_tickets')
      .update({ status })
      .eq('id', ticketId)
    if (error) { toast.error('操作失敗'); setActionLoading(false); return }
    const labels = { skipped: '已略過', cancelled: '已取消' }
    toast.success(labels[status])
    setActionLoading(false)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <button onClick={() => navigate(`/admin/events/${eventId}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ChevronLeft className="w-4 h-4" /> {eventName}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">叫號管理</h1>
      </div>

      {/* Current called */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <p className="text-xs font-medium text-amber-600 mb-2">目前叫號</p>
        {currentCalled ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold text-amber-700">#{currentCalled.queue_number}</p>
              <p className="text-sm text-amber-600 mt-0.5">{currentCalled.line_user?.display_name}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" loading={actionLoading}
                onClick={() => recallTicket(currentCalled.id)}>
                <RefreshCw className="w-4 h-4" /> 重叫
              </Button>
              <Button size="sm" variant="secondary" loading={actionLoading}
                onClick={() => updateStatus(currentCalled.id, 'skipped')}>
                <SkipForward className="w-4 h-4" /> 略過
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-amber-600 text-sm">目前無叫號</p>
        )}
      </Card>

      {/* Call next button */}
      <Button fullWidth size="xl" loading={actionLoading} onClick={callNext} disabled={tickets.length === 0}>
        <ChevronRight className="w-5 h-5" />
        叫下一號 {tickets.length > 0 ? `(#${tickets[0]?.queue_number})` : ''}
      </Button>

      {/* Waiting list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">等待名單</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tickets.length} 人</span>
        </div>

        {tickets.length === 0 ? (
          <EmptyState icon={Users} title="目前無等待名單" />
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket, index) => (
              <Card key={ticket.id} padding="sm">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold w-10 text-center ${index === 0 ? 'text-brand-600' : 'text-gray-600'}`}>
                    #{ticket.queue_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ticket.line_user?.display_name || 'LINE 使用者'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(ticket.created_at)}</p>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                  <button onClick={() => updateStatus(ticket.id, 'cancelled')}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
