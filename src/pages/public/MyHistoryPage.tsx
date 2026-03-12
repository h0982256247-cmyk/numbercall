import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { TicketStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils'
import type { QueueTicket, Event } from '@/types/database'
import { History } from 'lucide-react'

interface TicketWithEvent extends QueueTicket {
  event: Event
}

export default function MyHistoryPage() {
  const [tickets, setTickets] = useState<TicketWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('queue_tickets')
        .select('*, event:events(name, start_date, end_date)')
        .eq('line_user_id', user.id)
        .order('created_at', { ascending: false })

      setTickets((data as unknown as TicketWithEvent[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen pb-8 animate-fade-in">
      <div className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">參與紀錄</h1>
        <p className="text-sm text-gray-500 mt-1">{tickets.length} 場活動</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {tickets.length === 0 ? (
          <EmptyState icon={History} title="尚無參與紀錄" description="參加活動後，紀錄將顯示於此" />
        ) : (
          tickets.map(ticket => (
            <Card key={ticket.id}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{ticket.event?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(ticket.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  <span className="text-lg font-bold text-gray-800">#{ticket.queue_number}</span>
                  <TicketStatusBadge status={ticket.status} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
