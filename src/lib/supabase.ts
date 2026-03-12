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
 * 若 session 存在且 expires_at 已知且即將到期，自動 refresh
 *
 * 注意：不使用 `?? 0` 作為 expires_at 的預設值
 * 當 expires_at 為 undefined 時（某些 SDK 版本或 setSession 情境），
 * 應直接回傳 access_token，讓 SDK 的 autoRefreshToken 在背景處理，
 * 避免每次都觸發 refreshSession() 進而 fallback 至 anon key。
 */
async function getFreshToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return supabaseAnonKey

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = session.expires_at  // 不加 ?? 0，undefined 視為「未知」

  // 只有在明確知道 expires_at 且即將到期時才主動 refresh
  if (expiresAt !== undefined && expiresAt < now + 30) {
    const { data } = await supabase.auth.refreshSession()
    // refresh 成功 → 用新 token；失敗 → 仍用舊 token（讓 server 回傳正確錯誤）
    if (data.session?.access_token) return data.session.access_token
  }

  return session.access_token
}
