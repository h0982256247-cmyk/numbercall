import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Service-role client — 可繞過 RLS，僅限 Edge Function 內部使用 */
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/** Anon client，帶使用者 JWT — 用於驗證使用者身份 */
export function createUserClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}

/** 從 request 取得已驗證的使用者，失敗則 throw（附診斷訊息）*/
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[getAuthUser] Missing or malformed Authorization header')
    throw new Error('DIAG:no_auth_header')
  }

  const token = authHeader.slice(7)

  // ── 本地 JWT 解析（快速診斷）────────────────────────
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('malformed_jwt')

    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as {
      sub?: string; role?: string; exp?: number; aud?: string
    }

    console.log('[getAuthUser] JWT payload:', JSON.stringify({
      role: payload.role,
      sub: payload.sub?.substring(0, 8) + '...',
      exp: payload.exp,
      expired: payload.exp ? payload.exp < Date.now() / 1000 : 'no exp',
    }))

    // 如果 role 是 anon，代表前端送出了 anon key 而非使用者 JWT
    if (payload.role === 'anon') {
      throw new Error('DIAG:sent_anon_key_not_user_jwt')
    }

    if (!payload.sub) {
      throw new Error('DIAG:no_sub_in_jwt')
    }

    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('DIAG:jwt_expired')
    }

    // ── 用 service role client 驗證 JWT ─────────────
    const adminClient = createAdminClient()
    const { data: { user }, error } = await adminClient.auth.getUser(token)

    if (error) {
      console.error('[getAuthUser] adminClient.getUser error:', error.message)
      throw new Error(`DIAG:getUser_failed:${error.message}`)
    }
    if (!user) {
      throw new Error('DIAG:getUser_no_user')
    }

    return { user }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[getAuthUser] failed:', msg)
    throw new Error(msg.startsWith('DIAG:') ? msg : `DIAG:exception:${msg}`)
  }
}
