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
}

export function LiffProvider({ children }: LiffProviderProps) {
  const [state, setState] = useState<LiffContextValue>({
    ready: false,
    loggedIn: false,
    profile: null,
    supabaseSession: null,
  })

  useEffect(() => {
    const liffId = import.meta.env.VITE_LIFF_ID as string
    if (!liffId) {
      console.error('VITE_LIFF_ID is not set')
      setState(s => ({ ...s, ready: true }))
      return
    }

    initLiff(liffId)
      .then(async () => {
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
        const { supabase } = await import('@/lib/supabase')
        await supabase.auth.setSession(session)

        setState({ ready: true, loggedIn: true, profile, supabaseSession: session })
      })
      .catch(err => {
        console.error('LIFF init error', err)
        setState(s => ({ ...s, ready: true }))
      })
  }, [])

  if (!state.ready) return <PageLoader />
  return <LiffContext.Provider value={state}>{children}</LiffContext.Provider>
}
