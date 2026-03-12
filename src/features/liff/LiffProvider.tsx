import { createContext, useContext, useEffect, useState } from 'react'
import { initLiff, isLiffLoggedIn, liffLogin } from '@/lib/liff'
type Profile = { userId: string; displayName: string; pictureUrl?: string; statusMessage?: string }
import { PageLoader } from '@/components/ui/Spinner'

interface LiffContextValue {
  ready: boolean
  loggedIn: boolean
  profile: Profile | null
  supabaseSession: { access_token: string; refresh_token: string } | null
}

const LiffContext = createContext<LiffContextValue>({
  ready: false,
  loggedIn: false,
  profile: null,
  supabaseSession: null,
})

export function useLiff() {
  return useContext(LiffContext)
}

interface LiffProviderProps {
  children: React.ReactNode
  brandSlug: string
}

export function LiffProvider({ children, brandSlug }: LiffProviderProps) {
  const [state, setState] = useState<LiffContextValue>({
    ready: false,
    loggedIn: false,
    profile: null,
    supabaseSession: null,
  })

  useEffect(() => {
    if (!brandSlug) {
      console.error('LiffProvider: brandSlug is required')
      setState(s => ({ ...s, ready: true }))
      return
    }

    async function init() {
      // 從 DB 讀取此品牌的 LIFF ID（RPC 函數允許 anon 呼叫）
      const { supabase } = await import('@/lib/supabase')
      const { data: liffId, error } = await supabase.rpc('get_liff_id', { p_brand_slug: brandSlug })

      if (error || !liffId) {
        console.error('Failed to fetch LIFF ID for brand:', brandSlug, error)
        setState(s => ({ ...s, ready: true }))
        return
      }

      await initLiff(liffId)

      if (!isLiffLoggedIn()) {
        liffLogin(window.location.href)
        return
      }

      const { liff } = await import('@/lib/liff')
      const profile = await liff.getProfile()
      const accessToken = liff.getAccessToken()

      // Authenticate with our backend
      const { callFunction } = await import('@/lib/supabase')
      const res = await callFunction('line-auth', { accessToken })

      if (!res.ok) {
        console.error('line-auth failed')
        setState({ ready: true, loggedIn: false, profile, supabaseSession: null })
        return
      }

      const { session } = await res.json()

      // Set Supabase session
      await supabase.auth.setSession(session)

      setState({ ready: true, loggedIn: true, profile, supabaseSession: session })
    }

    init().catch(err => {
      console.error('LIFF init error', err)
      setState(s => ({ ...s, ready: true }))
    })
  }, [brandSlug])

  if (!state.ready) return <PageLoader />
  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>
}
