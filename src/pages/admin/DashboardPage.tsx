import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { Card } from '@/components/ui/Card'
import { EventStatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateRange } from '@/lib/utils'
import type { Event } from '@/types/database'
import { CalendarDays, Ticket, Users, TrendingUp, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DashboardStats {
  activeEvents: number
  todayTickets: number
  todayEntered: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { brand, adminUser } = useAdminUser()
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<DashboardStats>({ activeEvents: 0, todayTickets: 0, todayEntered: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (adminUser?.brand_id) loadData(adminUser.brand_id)
  }, [adminUser?.brand_id])

  async function loadData(brandId: string) {
    // Step 1: 取得品牌活動（最近 6 筆）
    const { data: evs } = await supabase
      .from('events')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(6)

    const allEvents = evs || []
    setEvents(allEvents)

    const eventIds = allEvents.map(e => e.id)
    if (eventIds.length === 0) {
      setStats({ activeEvents: 0, todayTickets: 0, todayEntered: 0 })
      setLoading(false)
      return
    }

    // Step 2: 查今日 tickets（兩步驟避免 join filter 問題）
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('queue_tickets')
      .select('status')
      .in('event_id', eventIds)
      .gte('created_at', `${today}T00:00:00.000Z`)

    const todayTickets = todayData || []
    setStats({
      activeEvents: allEvents.filter(e => e.status === 'active').length,
      todayTickets: todayTickets.length,
      todayEntered: todayTickets.filter(t => t.status === 'entered').length,
    })
    setLoading(false)
  }

  if (loading) return <PageLoader />

  const entryRate = stats.todayTickets > 0
    ? Math.round((stats.todayEntered / stats.todayTickets) * 100)
    : 0

  const kpiCards = [
    { label: '進行中活動', value: stats.activeEvents, icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
    { label: '今日領號',   value: stats.todayTickets, icon: Ticket,       color: 'bg-brand-50 text-brand-600' },
    { label: '今日入場',   value: stats.todayEntered, icon: Users,        color: 'bg-green-50 text-green-600' },
    { label: '入場率',     value: `${entryRate}%`,     icon: TrendingUp,   color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brand?.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">今日工作台</p>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/events')}>
          <Plus className="w-4 h-4" /> 新增活動
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Recent Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">活動列表</h2>
          <button
            onClick={() => navigate('/admin/events')}
            className="text-sm text-brand-600 font-medium hover:underline"
          >
            全部 →
          </button>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="尚無活動"
            description="新增第一個活動開始使用"
            action={
              <Button size="sm" onClick={() => navigate('/admin/events')}>
                <Plus className="w-4 h-4" /> 新增活動
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {events.map(event => (
              <Card
                key={event.id}
                className="cursor-pointer hover:border-brand-200 transition-colors"
                onClick={() => navigate(`/admin/events/${event.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EventStatusBadge status={event.status} />
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateRange(event.start_date, event.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">累計</p>
                      <p className="text-base font-bold text-gray-800">{event.last_queue_number}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
