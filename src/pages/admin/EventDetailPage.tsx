import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { toast } from '@/lib/toast'
import { formatDateRange } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EventStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import type { Event } from '@/types/database'
import { BarChart3, ListOrdered, Settings, ExternalLink, ChevronLeft } from 'lucide-react'

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { brand } = useAdminUser()
  const [event, setEvent] = useState<Event | null>(null)
  const [stats, setStats] = useState({ waiting: 0, entered: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (eventId) loadEvent(eventId)
  }, [eventId])

  async function loadEvent(id: string) {
    const [evRes, statsRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('queue_tickets').select('status').eq('event_id', id),
    ])

    setEvent(evRes.data)
    const tickets = statsRes.data || []
    setStats({
      waiting: tickets.filter(t => t.status === 'waiting').length,
      entered: tickets.filter(t => t.status === 'entered').length,
      total: tickets.length,
    })
    setLoading(false)
  }

  async function toggleStatus(newStatus: Event['status']) {
    if (!event) return
    setUpdatingStatus(true)
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', event.id)
    if (error) { toast.error('更新失敗'); setUpdatingStatus(false); return }
    setEvent(prev => prev ? { ...prev, status: newStatus } : prev)
    toast.success(`活動已${newStatus === 'active' ? '開放' : newStatus === 'paused' ? '暫停' : '結束'}`)
    setUpdatingStatus(false)
  }

  if (loading) return <PageLoader />
  if (!event) return <div className="text-center py-20 text-gray-500">活動不存在</div>

  const queueUrl = `${window.location.origin}/b/${brand?.slug}/queue/${event.slug}`

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <button onClick={() => navigate('/admin/events')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ChevronLeft className="w-4 h-4" /> 活動列表
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <EventStatusBadge status={event.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formatDateRange(event.start_date, event.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '等待中', value: stats.waiting, color: 'text-blue-600' },
          { label: '已入場', value: stats.entered, color: 'text-green-600' },
          { label: '總領號', value: stats.total, color: 'text-gray-800' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-2">
        <Link to={`/admin/events/${event.id}/queue`}>
          <Card className="hover:border-brand-200 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <ListOrdered className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">叫號管理</p>
                <p className="text-xs text-gray-500">目前 {stats.waiting} 人等待中</p>
              </div>
              <span className="text-brand-600 text-sm font-medium">進入 →</span>
            </div>
          </Card>
        </Link>

        <Link to={`/admin/events/${event.id}/reports`}>
          <Card className="hover:border-brand-200 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">活動報表</p>
                <p className="text-xs text-gray-500">數據分析與 CSV 匯出</p>
              </div>
              <span className="text-green-600 text-sm font-medium">查看 →</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Status controls */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">活動狀態控制</h3>
        <div className="flex gap-2 flex-wrap">
          {event.status !== 'active' && (
            <Button size="sm" variant="primary" loading={updatingStatus} onClick={() => toggleStatus('active')}>開放領號</Button>
          )}
          {event.status === 'active' && (
            <Button size="sm" variant="secondary" loading={updatingStatus} onClick={() => toggleStatus('paused')}>暫停領號</Button>
          )}
          {event.status !== 'ended' && (
            <Button size="sm" variant="danger" loading={updatingStatus} onClick={() => toggleStatus('ended')}>結束活動</Button>
          )}
        </div>
      </Card>

      {/* Queue URL */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">前台領號連結</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600 truncate">{queueUrl}</code>
          <a href={queueUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
          </a>
        </div>
      </Card>
    </div>
  )
}
