/**
 * checkin Edge Function
 *
 * 入場核銷（安全關鍵）
 *
 * 流程：
 * 1. 驗證 Supabase JWT（LINE 使用者）
 * 2. 查詢 ticket，確認存在且屬於此使用者
 * 3. 確認 ticket.status === 'called'（只有叫號後才能核銷）
 * 4. UPDATE status → 'entered'，記錄 entered_at
 * 5. INSERT queue_log
 * 6. 回傳更新後的 ticket
 *
 * 安全要求：
 * - 只能操作自己的 ticket（server-side 強制驗證）
 * - 僅 called 狀態可核銷
 * - 不可重複提交（entered 後再打會得到 400）
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    // ── 1. 驗證 JWT ─────────────────────────────────────────
    const { user } = await getAuthUser(req)
    const adminClient = createAdminClient()

    // 確認是 LINE 使用者
    const { data: lineUser } = await adminClient
      .from('line_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!lineUser) {
      return errorResponse('Only LINE users can check in', 403)
    }

    // ── 2. 解析 Body ────────────────────────────────────────
    const { ticketId } = await req.json()
    if (!ticketId) return errorResponse('ticketId is required')

    // ── 3. 查詢 ticket ───────────────────────────────────────
    const { data: ticket } = await adminClient
      .from('queue_tickets')
      .select('id, event_id, line_user_id, queue_number, status')
      .eq('id', ticketId)
      .single()

    if (!ticket) return errorResponse('Ticket not found', 404)

    // ── 4. 確認 ticket 屬於此使用者（Server-side 強制驗證）──
    if (ticket.line_user_id !== user.id) {
      return errorResponse('This ticket does not belong to you', 403)
    }

    // ── 5. 確認狀態為 'called' ───────────────────────────────
    if (ticket.status === 'entered') {
      return errorResponse('已完成入場，請勿重複提交', 400)
    }
    if (ticket.status !== 'called') {
      const messages: Record<string, string> = {
        waiting:   '尚未叫號，請繼續等待',
        skipped:   '號碼已過號',
        cancelled: '號碼已取消',
      }
      return errorResponse(messages[ticket.status] ?? '狀態不允許核銷', 400)
    }

    // ── 6. UPDATE → 'entered' ────────────────────────────────
    const now = new Date().toISOString()
    const { data: updated, error: updateError } = await adminClient
      .from('queue_tickets')
      .update({ status: 'entered', entered_at: now })
      .eq('id', ticketId)
      .eq('status', 'called')       // 二次確認（防止 race condition）
      .select()
      .single()

    if (updateError || !updated) {
      // status 已不是 called（並發場景）
      return errorResponse('核銷失敗，請重新確認狀態', 409)
    }

    // ── 7. INSERT queue_log ──────────────────────────────────
    await adminClient.from('queue_logs').insert({
      ticket_id: ticketId,
      action: 'entered',
      actor_type: 'user',
    })

    return jsonResponse({ success: true, ticket: updated })
  } catch (err) {
    console.error('checkin error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse(message, 500)
  }
})
