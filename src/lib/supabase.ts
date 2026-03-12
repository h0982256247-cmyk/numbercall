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
 * 使用官方 SDK invoke，自動帶入正確的 apikey + 使用者 JWT
 */
export async function callFunction(
  name: string,
  body?: unknown,
  options?: { method?: string },
): Promise<Response> {
  const method = options?.method ?? 'POST'

  const { data, error } = await supabase.functions.invoke(name, {
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: method === 'GET' ? undefined : (body as Record<string, unknown> | undefined),
  })

  if (error) {
    // FunctionsHttpError: error.context 是 gateway/function 回傳的原始 Response（body 尚未被讀取）
    const ctx = (error as any).context
    if (ctx instanceof Response) {
      return ctx
    }
    // 網路錯誤或其他 relay 錯誤
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
