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
 * 使用直接 fetch，避免 SDK invoke 的自動 retry 干擾 Authorization header
 */
export async function callFunction(
  name: string,
  body?: unknown,
  options?: { method?: string },
): Promise<Response> {
  const method = options?.method ?? 'POST'

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? supabaseAnonKey

  // DEBUG: 暫時日誌，確認 token 狀態（稍後移除）
  console.log('[callFunction]', name, {
    hasSession: !!session,
    tokenType: session?.access_token ? 'user_jwt' : 'anon_key',
    tokenStart: token?.substring(0, 30),
  })

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
