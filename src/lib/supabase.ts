import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * 呼叫 Supabase Edge Function
 * 自動處理 token 過期：若 access_token 即將過期則先 refresh
 */
export async function callFunction(
  name: string,
  body?: unknown,
  options?: { method?: string },
): Promise<Response> {
  const method = options?.method ?? 'POST'

  const token = await getFreshToken()

  return fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: method !== 'GET' && body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/**
 * 取得有效的 access token
 * 若 session 存在但 token 已過期，自動 refresh
 */
async function getFreshToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return supabaseAnonKey

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at ?? 0

  // token 已過期或 30 秒內即將到期 → 先 refresh
  if (expiresAt < now + 30) {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? supabaseAnonKey
  }

  return session.access_token
}
