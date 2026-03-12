/**
 * take-ticket Edge Function
 *
 * 前台 LINE 使用者領號
 *
 * 流程：
 * 1. 驗證 Supabase JWT（LINE 使用者，由 line-auth 產生）
 * 2. 驗證活動存在且狀態為 active
 * 3. 確認使用者在此活動尚無 active ticket（部分唯一索引也會擋，但先給友好錯誤）
 * 4. INSERT queue_tickets（trigger 自動指派 queue_number）
 * 5. INSERT queue_logs
 * 6. 回傳 ticket
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    // ── 1. 驗證 JWT，取得 LINE 使用者 ──────────────────────
    const { user } = await getAuthUser(req)
    const adminClient = createAdminClient()

    // 確認這是 LINE 使用者（非後台 admin）
    const { data: lineUser } = await adminClient
      .from('line_users')
      .select('id, line_user_id')
      .eq('id', user.id)
      .single()

    if (!lineUser) {
      return errorResponse('Only LINE users can take tickets', 403)
    }

    // ── 2. 解析 Body ────────────────────────────────────────
    const { eventId } = await req.json()
    if (!eventId) return errorResponse('eventId is required')

    // ── 3. 驗證活動 ─────────────────────────────────────────
    const { data: event } = await adminClient
      .from('events')
      .select('id, name, status, brand_id')
      .eq('id', eventId)
      .single()

    if (!event) return errorResponse('Event not found', 404)

    if (event.status !== 'active') {
      const messages: Record<string, string> = {
        draft:  '活動尚未開放領號',
        paused: '活動目前暫停領號',
        ended:  '活動已結束',
      }
      return errorResponse(messages[event.status] ?? '活動不可領號', 400)
    }

    // ── 4. 確認無重複 active ticket ─────────────────────────
    const { data: existing } = await adminClient
      .from('queue_tickets')
      .select('id, queue_number, status')
      .eq('event_id', eventId)
      .eq('line_user_id', user.id)
      .not('status', 'in', '("cancelled","skipped")')
      .maybeSingle()

    if (existing) {
      return errorResponse(
        `你已持有 #${existing.queue_number} 號（狀態：${existing.status}）`,
        409,
      )
    }

    // ── 5. INSERT ticket（trigger 自動指派 queue_number）──────
    const { data: ticket, error: insertError } = await adminClient
      .from('queue_tickets')
      .insert({
        event_id: eventId,
        line_user_id: user.id,
        status: 'waiting',
      })
      .select()
      .single()

    if (insertError || !ticket) {
      // 可能是 partial unique index 衝突（race condition）
      if (insertError?.code === '23505') {
        return errorResponse('你已持有此活動的號碼牌', 409)
      }
      throw new Error(`Failed to create ticket: ${insertError?.message}`)
    }

    // ── 6. INSERT queue_log ──────────────────────────────────
    await adminClient.from('queue_logs').insert({
      ticket_id: ticket.id,
      action: 'created',
      actor_type: 'user',
    })

    return jsonResponse({ success: true, ticket })
  } catch (err) {
    console.error('take-ticket error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse(message, 500)
  }
})
