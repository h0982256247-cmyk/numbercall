import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, callFunction } from '@/lib/supabase'
import { useLiff } from '@/features/liff/LiffProvider'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EventStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDateRange } from '@/lib/utils'
import type { Event } from '@/types/database'
import { CalendarDays, Users, Ticket, ChevronRight } from 'lucide-react'

export default function QueuePage() {
  const { slug, brandSlug } = useParams<{ slug: string; brandSlug: string }>()
  const navigate = useNavigate()
  useLiff()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasTicket, setHasTicket] = useState(false)
  const [taking, setTaking] = useState(false)

  useEffect(() => {
    if (!slug) return
    loadEvent(slug)
  }, [slug])

  async function loadEvent(slug: string) {
    setLoading(true)

    const [{ data: ev }, { data: { user } }] = await Promise.all([
      supabase.from('events').select('*').eq('slug', slug).single(),
      supabase.auth.getUser(),
    ])

    if (!ev) { setLoading(false); return }
    setEvent(ev)

    if (user) {
      const { data: ticket } = await supabase
        .from('queue_tickets')
        .select('id')
        .eq('event_id', ev.id)
        .eq('line_user_id', user.id)
        .not('status', 'in', '("cancelled","skipped")')
        .maybeSingle()

      setHasTicket(!!ticket)
    }

    setLoading(false)
  }

  async function handleTakeTicket() {
    if (!event) return
    setTaking(true)

    const res = await callFunction('take-ticket', { eventId: event.id })

    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || '領號失敗，請再試一次')
      setTaking(false)
      return
    }

    toast.success(`成功領取 #${json.ticket.queue_number} 號！`)
    navigate(`/b/${brandSlug}/my-ticket`)
  }

  if (loading) return <PageLoader />

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-gray-500">找不到此活動</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-6 pt-14 pb-10">
        <div className="flex items-start justify-between mb-3">
          <EventStatusBadge status={event.status} />
        </div>
        <h1 className="text-2xl font-bold text-white leading-tight mb-2">{event.name}</h1>
        <div className="flex items-center gap-2 text-brand-200">
          <CalendarDays className="w-4 h-4" />
          <span className="text-sm">{formatDateRange(event.start_date, event.end_date)}</span>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3 pb-8">
        {/* Info card */}
        <Card>
          {event.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{event.description}</p>
          )}
          <div className="flex items-center gap-3 py-3 border-t border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">目前叫號進度</p>
              <p className="text-sm font-semibold text-gray-900">第 {event.last_queue_number} 號</p>
            </div>
          </div>
        </Card>

        {/* CTA */}
        {hasTicket ? (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">你已持有號碼牌</p>
                <p className="text-xs text-gray-500 mt-0.5">查看你的入場狀態</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/b/${brandSlug}/my-ticket`)}>
                查看 <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <div className="pt-2">
            {event.status === 'active' ? (
              <Button
                fullWidth
                size="xl"
                loading={taking}
                onClick={handleTakeTicket}
                className="rounded-2xl shadow-lg shadow-brand-500/30"
              >
                <Ticket className="w-5 h-5" />
                立即領號
              </Button>
            ) : (
              <Card>
                <p className="text-center text-sm text-gray-500">
                  {event.status === 'paused' ? '活動暫停領號中' :
                   event.status === 'ended'  ? '活動已結束' :
                   '活動尚未開始'}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">入場說明</h3>
          <ol className="space-y-2">
            {['領號後請保持手機通知開啟', '叫到你的號碼時，畫面會顯示「前往入場」', '前往入口，由工作人員確認後完成入場'].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
