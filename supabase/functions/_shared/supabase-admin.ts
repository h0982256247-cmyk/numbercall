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

/** 從 request 取得已驗證的使用者，失敗則 throw */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.error('[getAuthUser] Missing Authorization header')
    throw new Error('Missing Authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  // Use user client (anon key) with explicit JWT — recommended pattern for Edge Functions
  const userClient = createUserClient(authHeader)
  const { data: { user }, error } = await userClient.auth.getUser(token)

  if (error) {
    console.error('[getAuthUser] auth.getUser error:', error.message, error.status)
    throw new Error('Unauthorized')
  }
  if (!user) {
    console.error('[getAuthUser] No user returned, authHeader prefix:', authHeader.substring(0, 30))
    throw new Error('Unauthorized')
  }
  return { user }
}
