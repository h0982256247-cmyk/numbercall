/**
 * line-auth Edge Function
 *
 * 流程：
 * 1. 接收 LIFF access token
 * 2. 向 LINE API 驗證並取得 profile
 * 3. 用確定性密碼建立 / 找到 Supabase auth user
 * 4. Upsert line_users 資料表
 * 5. 回傳 Supabase session（供前端呼叫 setSession）
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'
import { getLineProfile } from '../_shared/line-api.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    const { accessToken } = await req.json()
    if (!accessToken) return errorResponse('accessToken is required')

    // ── 1. 向 LINE 驗證 token，取得 profile ──────────────────
    const profile = await getLineProfile(accessToken)

    // ── 2. 產生確定性密碼（HMAC-SHA256）──────────────────────
    const secret = Deno.env.get('LINE_AUTH_SECRET')
    if (!secret) throw new Error('LINE_AUTH_SECRET not configured')
    const password = await derivePassword(profile.userId, secret)

    const email = `line_${profile.userId}@queueflow.local`

    // ── 3. 建立 Supabase auth user（若已存在則忽略錯誤）────────
    const adminClient = createAdminClient()
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'line_user', line_user_id: profile.userId },
    })

    // 只允許「user already exists」錯誤通過，其他錯誤 throw
    if (createError && !createError.message.toLowerCase().includes('already')) {
      throw createError
    }

    // ── 4. 登入取得 session ──────────────────────────────────
    //    用 anon client 登入（service_role client 不支援 signInWithPassword）
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      throw new Error(`Sign in failed: ${signInError?.message}`)
    }

    const { session, user } = signInData

    // ── 5. Upsert line_users ─────────────────────────────────
    const { error: upsertError } = await adminClient
      .from('line_users')
      .upsert(
        {
          id: user.id,
          line_user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl ?? null,
        },
        { onConflict: 'id' },
      )

    if (upsertError) {
      console.error('line_users upsert error:', upsertError)
      // 不 throw：user 存在即可，profile 更新失敗不致命
    }

    // ── 6. 回傳 session ──────────────────────────────────────
    return jsonResponse({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
      },
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
      },
    })
  } catch (err) {
    console.error('line-auth error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'

    // 區分使用者錯誤 vs 系統錯誤
    if (message.includes('Invalid LINE access token')) {
      return errorResponse('LINE token 無效或已過期', 401)
    }
    return errorResponse(message, 500)
  }
})

/**
 * HMAC-SHA256 確定性密碼
 * 同一 lineUserId + secret → 永遠產生相同密碼
 * 密碼 40 個十六進位字元，足夠強度
 */
async function derivePassword(lineUserId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(lineUserId))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40)
}
