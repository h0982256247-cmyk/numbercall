/**
 * export-csv Edge Function
 *
 * 伺服器端 CSV 匯出（適合大量資料）
 *
 * 支援類型：
 * - type=participants：活動參與名單
 * - type=daily-kpi：每日 KPI
 *
 * 安全：
 * - 驗證 Admin JWT
 * - 驗證活動屬於 admin 的品牌（brand 隔離）
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'
import { corsHeaders, handleCors, errorResponse } from '../_shared/cors.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    // ── 1. 驗證 Admin JWT ────────────────────────────────────
    const { user } = await getAuthUser(req)
    const adminClient = createAdminClient()

    const { data: adminUser } = await adminClient
      .from('admin_users')
      .select('brand_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!adminUser?.brand_id) {
      return errorResponse('Admin not found or not onboarded', 403)
    }

    // ── 2. 解析參數 ──────────────────────────────────────────
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')
    const type = url.searchParams.get('type') || 'participants'

    if (!eventId) return errorResponse('eventId is required')

    // ── 3. 確認活動屬於此品牌 ────────────────────────────────
    const { data: event } = await adminClient
      .from('events')
      .select('id, name, brand_id')
      .eq('id', eventId)
      .single()

    if (!event) return errorResponse('Event not found', 404)
    if (event.brand_id !== adminUser.brand_id) {
      return errorResponse('Access denied', 403)
    }

    // ── 4. 查詢資料 ──────────────────────────────────────────
    let csvContent = ''
    const filename = type === 'daily-kpi'
      ? `${event.name}-daily-kpi.csv`
      : `${event.name}-participants.csv`

    if (type === 'daily-kpi') {
      csvContent = await buildDailyKpiCsv(adminClient, eventId)
    } else {
      csvContent = await buildParticipantsCsv(adminClient, eventId)
    }

    // ── 5. 回傳 CSV ──────────────────────────────────────────
    return new Response('\ufeff' + csvContent, {   // \ufeff = BOM for Excel UTF-8
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    console.error('export-csv error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse(message, 500)
  }
})

async function buildParticipantsCsv(
  adminClient: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<string> {
  // 分頁查詢，避免超時（每次 1000 筆）
  let allTickets: Record<string, unknown>[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await adminClient
      .from('queue_tickets')
      .select('queue_number, status, created_at, entered_at, line_user:line_users(line_user_id, display_name)')
      .eq('event_id', eventId)
      .order('queue_number', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allTickets = allTickets.concat(data as Record<string, unknown>[])
    if (data.length < pageSize) break
    from += pageSize
  }

  const rows = [
    ['號碼', 'LINE User ID', '顯示名稱', '狀態', '領號時間', '入場時間'],
    ...allTickets.map(t => {
      const lineUser = t.line_user as { line_user_id?: string; display_name?: string } | null
      return [
        String(t.queue_number),
        lineUser?.line_user_id || '',
        lineUser?.display_name || '',
        String(t.status),
        formatTw(String(t.created_at)),
        t.entered_at ? formatTw(String(t.entered_at)) : '',
      ]
    }),
  ]

  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
}

async function buildDailyKpiCsv(
  adminClient: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<string> {
  const { data: tickets } = await adminClient
    .from('queue_tickets')
    .select('status, created_at')
    .eq('event_id', eventId)
    .order('created_at')

  const dailyMap = new Map<string, { tickets: number; entered: number }>()
  for (const t of tickets || []) {
    const date = String(t.created_at).split('T')[0]
    const existing = dailyMap.get(date) || { tickets: 0, entered: 0 }
    existing.tickets++
    if (t.status === 'entered') existing.entered++
    dailyMap.set(date, existing)
  }

  const rows = [
    ['日期', '領號人數', '入場人數', '入場率'],
    ...Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { tickets, entered }]) => [
        date,
        String(tickets),
        String(entered),
        tickets > 0 ? `${Math.round((entered / tickets) * 100)}%` : '0%',
      ]),
  ]

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
}

function formatTw(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
