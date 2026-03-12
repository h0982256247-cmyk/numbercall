import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/Spinner'
import type { Session } from '@supabase/supabase-js'

export default function AdminRoute() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <PageLoader />
  if (!session) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
