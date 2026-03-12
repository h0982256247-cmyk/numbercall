import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { slugify, formatDateRange } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EventStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import type { Event } from '@/types/database'
import { Plus, CalendarDays, ChevronRight } from 'lucide-react'

interface EventForm {
  name: string; slug: string; description: string; start_date: string; end_date: string
}

const defaultForm: EventForm = { name: '', slug: '', description: '', start_date: '', end_date: '' }

export default function EventsPage() {
  const navigate = useNavigate()
  const { adminUser } = useAdminUser()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<EventForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (adminUser?.brand_id) loadEvents(adminUser.brand_id)
  }, [adminUser?.brand_id])

  async function loadEvents(brandId: string) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, slug: f.slug || slugify(name) }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!adminUser?.brand_id) return
    setSaving(true)

    const { data, error } = await supabase
      .from('events')
      .insert({ ...form, brand_id: adminUser.brand_id, status: 'draft' })
      .select()
      .single()

    if (error) {
      toast.error(error.message.includes('unique') ? 'Slug 已被使用，請修改' : '建立失敗')
      setSaving(false)
      return
    }

    setEvents(prev => [data, ...prev])
    setShowModal(false)
    setForm(defaultForm)
    toast.success('活動已建立')
    navigate(`/admin/events/${data.id}`)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活動管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} 個活動</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> 新增活動
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="尚無活動"
          description="建立第一個活動，開始使用 QueueFlow"
          action={<Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" />新增活動</Button>}
        />
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <Card
              key={event.id}
              className="cursor-pointer hover:border-brand-200 transition-colors"
              onClick={() => navigate(`/admin/events/${event.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <EventStatusBadge status={event.status} />
                    <span className="text-xs text-gray-400">/{event.slug}</span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDateRange(event.start_date, event.end_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">累計領號</p>
                  <p className="text-lg font-bold text-gray-800">{event.last_queue_number}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="新增活動">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="活動名稱 *" placeholder="例：咖波台北快閃 2026" value={form.name} onChange={e => handleNameChange(e.target.value)} required />
          <Input label="Slug *" placeholder="例：capoo-taipei-2026" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} helper="活動網址：/queue/[slug]" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="開始日期 *" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            <Input label="結束日期 *" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">活動說明</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
              rows={3}
              placeholder="活動簡介..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>取消</Button>
            <Button type="submit" fullWidth loading={saving}>建立</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
