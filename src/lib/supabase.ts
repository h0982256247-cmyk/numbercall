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
 * 自動帶入 apikey + Authorization header
 * - 已登入：Bearer <user_jwt>
 * - 未登入：Bearer <anon_key>（適用 line-auth）
 */
export async function callFunction(
  name: string,
  body?: unknown,
  options?: { method?: string },
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token ?? supabaseAnonKey

  return fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: options?.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
