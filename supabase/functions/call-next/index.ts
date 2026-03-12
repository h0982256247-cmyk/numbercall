/**
 * call-next Edge Function
 *
 * 後台叫號（支援叫下一號 & 重叫指定號）
 *
 * 流程：
 * 1. 驗證 Admin JWT
 * 2. 確認 admin 有權操作此活動（brand 隔離）
 * 3a. 若無 ticketId → 自動取 waiting 最小 queue_number
 * 3b. 若有 ticketId → 重叫指定 ticket（狀態須為 called/skipped）
 * 4. 將目前 called 的 ticket → 設為 skipped（avoid 多張同時 called）
 * 5. 目標 ticket → 'called'，記錄 called_at
 * 6. 讀取 brand_line_configs，發 LINE push 通知
 * 7. INSERT queue_log
 * 8. 回傳 ticket
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'
import { sendLinePushMessage, buildCalledMessage } from '../_shared/line-api.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    // ── 1. 驗證 Admin JWT ────────────────────────────────────
    const { user } = await getAuthUser(req)
    const adminClient = createAdminClient()

    // 取得 admin 的 brand_id
    const { data: adminUser } = await adminClient
      .from('admin_users')
      .select('brand_id')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!adminUser?.brand_id) {
      return errorResponse('Admin not found or not onboarded', 403)
    }

    // ── 2. 解析 Body ────────────────────────────────────────
    const { eventId, ticketId } = await req.json()
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

    // ── 4. 決定目標 ticket ───────────────────────────────────
    let targetTicket: { id: string; queue_number: number; line_user_id: string; status: string } | null = null

    if (ticketId) {
      // 重叫指定 ticket
      const { data } = await adminClient
        .from('queue_tickets')
        .select('id, queue_number, line_user_id, status')
        .eq('id', ticketId)
        .eq('event_id', eventId)
        .single()

      if (!data) return errorResponse('Ticket not found', 404)
      if (!['waiting', 'called', 'skipped'].includes(data.status)) {
        return errorResponse(`無法重叫，票券狀態為 ${data.status}`, 400)
      }
      targetTicket = data
    } else {
      // 叫下一個等待中的號碼
      const { data } = await adminClient
        .from('queue_tickets')
        .select('id, queue_number, line_user_id, status')
        .eq('event_id', eventId)
        .eq('status', 'waiting')
        .order('queue_number', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!data) return errorResponse('沒有等待中的號碼', 400)
      targetTicket = data
    }

    const now = new Date().toISOString()

    // ── 5. 將其他 called ticket → skipped（同時只能一張 called）
    //    若是重叫同一張，跳過此步驟
    if (targetTicket.status !== 'called') {
      await adminClient
        .from('queue_tickets')
        .update({ status: 'skipped' })
        .eq('event_id', eventId)
        .eq('status', 'called')
        .neq('id', targetTicket.id)
    }

    // ── 6. UPDATE target → 'called' ─────────────────────────
    const { data: updatedTicket, error: updateError } = await adminClient
      .from('queue_tickets')
      .update({ status: 'called', called_at: now })
      .eq('id', targetTicket.id)
      .select('*, line_user:line_users(line_user_id, display_name)')
      .single()

    if (updateError || !updatedTicket) {
      throw new Error(`Failed to update ticket: ${updateError?.message}`)
    }

    // ── 7. INSERT queue_log ──────────────────────────────────
    const action = ticketId ? 'recalled' : 'called'
    await adminClient.from('queue_logs').insert({
      ticket_id: targetTicket.id,
      action,
      actor_type: 'admin',
    })

    // ── 8. 發 LINE push 通知（non-blocking，失敗不影響主流程）
    sendLinePushNotification(adminClient, event, updatedTicket).catch(err =>
      console.error('Push notification failed (non-fatal):', err),
    )

    return jsonResponse({ success: true, ticket: updatedTicket })
  } catch (err) {
    console.error('call-next error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message === 'Unauthorized') return errorResponse('Unauthorized', 401)
    return errorResponse(message, 500)
  }
})

/**
 * 非同步發送 LINE 通知
 * 從 brand_line_configs 讀取 channel_access_token
 */
async function sendLinePushNotification(
  adminClient: ReturnType<typeof createAdminClient>,
  event: { id: string; name: string; brand_id: string },
  ticket: { queue_number: number; line_user: { line_user_id: string } | null } | null,
) {
  if (!ticket?.line_user?.line_user_id) return

  const { data: config } = await adminClient
    .from('brand_line_configs')
    .select('channel_access_token')
    .eq('brand_id', event.brand_id)
    .single()

  if (!config?.channel_access_token) {
    console.warn('No LINE config found for brand:', event.brand_id)
    return
  }

  await sendLinePushMessage(
    config.channel_access_token,
    ticket.line_user.line_user_id,
    [buildCalledMessage(event.name, ticket.queue_number)],
  )
}
