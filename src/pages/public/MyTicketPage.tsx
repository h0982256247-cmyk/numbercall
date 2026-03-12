import { useEffect, useState } from 'react'
import { supabase, callFunction } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner, PageLoader } from '@/components/ui/Spinner'
import type { QueueTicket, Event } from '@/types/database'
import { CheckCircle2, Clock, XCircle, SkipForward, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketWithEvent extends QueueTicket {
  event: Event
}

export default function MyTicketPage() {
  const [ticket, setTicket] = useState<TicketWithEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    loadTicket()
    // Realtime subscription
    const channel = supabase
      .channel('my-ticket')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'queue_tickets',
      }, (payload) => {
        setTicket(prev => {
          if (!prev || prev.id !== payload.new.id) return prev
          return { ...prev, ...(payload.new as QueueTicket) }
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadTicket() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('queue_tickets')
      .select('*, event:events(*)')
      .eq('line_user_id', user.id)
      .not('status', 'in', '("cancelled","skipped")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setTicket(data as TicketWithEvent | null)
    setLoading(false)
  }

  async function handleCheckin() {
    if (!ticket) return
    setCheckingIn(true)

    const res = await callFunction('checkin', { ticketId: ticket.id })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || '核銷失敗')
      setCheckingIn(false)
      return
    }

    setTicket(prev => prev ? { ...prev, status: 'entered' } : prev)
    setCheckingIn(false)
  }

  if (loading) return <PageLoader />

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">尚無號碼牌</h2>
        <p className="text-sm text-gray-500">請先掃描活動 QR Code 領號</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      {/* Status header */}
      <div className={cn(
        'px-6 pt-14 pb-10 transition-all duration-500',
        ticket.status === 'called'  ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
        ticket.status === 'entered' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
        ticket.status === 'waiting' ? 'bg-gradient-to-br from-brand-600 to-brand-700' :
        'bg-gray-600'
      )}>
        <p className="text-white/70 text-sm font-medium mb-2">{ticket.event?.name}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-white/80 text-lg font-medium">號碼</p>
          <p className="text-white text-7xl font-bold tracking-tight">
            {ticket.queue_number}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3 pb-10">
        {/* Status card */}
        <Card>
          <StatusContent ticket={ticket} onCheckin={handleCheckin} checkingIn={checkingIn} />
        </Card>

        {/* Timestamp */}
        <p className="text-xs text-center text-gray-400">
          領號時間：{new Date(ticket.created_at).toLocaleString('zh-TW')}
        </p>
      </div>
    </div>
  )
}

function StatusContent({
  ticket, onCheckin, checkingIn
}: {
  ticket: TicketWithEvent
  onCheckin: () => void
  checkingIn: boolean
}) {
  switch (ticket.status) {
    case 'waiting':
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-brand-500 animate-pulse-slow" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">等待叫號中</p>
            <p className="text-sm text-gray-500 mt-0.5">叫到你的號碼時會通知你</p>
          </div>
        </div>
      )

    case 'called':
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <LogIn className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">輪到你了！</p>
              <p className="text-sm text-gray-500 mt-0.5">請前往入口，讓工作人員核銷</p>
            </div>
          </div>
          <Button
            fullWidth
            size="xl"
            variant="primary"
            loading={checkingIn}
            onClick={onCheckin}
            className="bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-400/40 rounded-2xl"
          >
            前往入場
          </Button>
        </div>
      )

    case 'entered':
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">已完成入場</p>
            <p className="text-sm text-gray-500 mt-0.5">歡迎參加活動！</p>
          </div>
        </div>
      )

    case 'skipped':
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <SkipForward className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">已過號</p>
            <p className="text-sm text-gray-500 mt-0.5">請洽詢現場工作人員</p>
          </div>
        </div>
      )

    case 'cancelled':
      return (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">已取消</p>
            <p className="text-sm text-gray-500 mt-0.5">此號碼已取消</p>
          </div>
        </div>
      )
  }
}
