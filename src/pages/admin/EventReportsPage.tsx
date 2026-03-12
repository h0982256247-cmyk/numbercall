import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, callFunction } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import type { QueueTicket } from '@/types/database'
import { toast } from '@/lib/toast'
import { Download, TrendingUp, Users, Ticket, PercentSquare, ChevronLeft, Loader2 } from 'lucide-react'

interface DailyData { date: string; tickets: number; entered: number }
interface HourlyData { hour: string; entered: number }

export default function EventReportsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<QueueTicket[]>([])
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'participants' | 'daily-kpi' | null>(null)

  useEffect(() => {
    if (eventId) loadData(eventId)
  }, [eventId])

  async function loadData(id: string) {
    const [evRes, ticketsRes] = await Promise.all([
      supabase.from('events').select('name').eq('id', id).single(),
      supabase.from('queue_tickets').select('*').eq('event_id', id).order('created_at'),
    ])
    setEventName(evRes.data?.name || '')
    setTickets(ticketsRes.data || [])
    setLoading(false)
  }

  // Compute stats
  const totalTickets = tickets.length
  const totalEntered = tickets.filter(t => t.status === 'entered').length
  const entryRate = totalTickets > 0 ? Math.round((totalEntered / totalTickets) * 100) : 0
  const uniqueUsers = new Set(tickets.map(t => t.line_user_id)).size

  // Daily data
  const dailyMap = new Map<string, DailyData>()
  tickets.forEach(t => {
    const date = t.created_at.split('T')[0]
    const existing = dailyMap.get(date) || { date, tickets: 0, entered: 0 }
    existing.tickets++
    if (t.status === 'entered') existing.entered++
    dailyMap.set(date, existing)
  })
  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Hourly data
  const hourlyMap = new Map<number, number>()
  tickets.filter(t => t.entered_at).forEach(t => {
    const hour = new Date(t.entered_at!).getHours()
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
  })
  const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    entered: hourlyMap.get(i) || 0,
  })).filter(d => d.entered > 0)

  async function exportServerCsv(type: 'participants' | 'daily-kpi') {
    if (!eventId) return
    setExporting(type)
    try {
      const res = await callFunction(`export-csv?eventId=${eventId}&type=${type}`, undefined, { method: 'GET' })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message || 'Export failed')
      }

      const blob = await res.blob()
      const filename = type === 'daily-kpi'
        ? `${eventName}-daily-kpi.csv`
        : `${eventName}-participants.csv`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '匯出失敗')
    } finally {
      setExporting(null)
    }
  }

  if (loading) return <PageLoader />

  const kpis = [
    { label: 'LINE 使用者', value: uniqueUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '領號人數', value: totalTickets, icon: Ticket, color: 'text-brand-600 bg-brand-50' },
    { label: '入場人數', value: totalEntered, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: '入場率', value: `${entryRate}%`, icon: PercentSquare, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <button onClick={() => navigate(`/admin/events/${eventId}`)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ChevronLeft className="w-4 h-4" /> {eventName}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">活動報表</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Daily chart */}
      {dailyData.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">每日趨勢</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="tickets" name="領號" stroke="#6172f5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="entered" name="入場" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Hourly chart */}
      {hourlyData.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-4">每小時入場熱度</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="entered" name="入場人數" fill="#6172f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Export */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">匯出資料</h3>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportServerCsv('participants')}
            disabled={!!exporting}
          >
            {exporting === 'participants'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            參與名單 CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportServerCsv('daily-kpi')}
            disabled={!!exporting}
          >
            {exporting === 'daily-kpi'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            每日 KPI CSV
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">由伺服器產生，支援大量資料匯出</p>
      </Card>
    </div>
  )
}
