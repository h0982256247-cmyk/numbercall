import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/Spinner'
import { AdminUserProvider } from '@/features/auth/useAdminUser'
import type { Session } from '@supabase/supabase-js'

export default function AdminRoute() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading')

  useEffect(() => {
    // getUser() validates the token server-side, ensuring expired tokens redirect to login
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setSession(null)
        return
      }
      supabase.auth.getSession().then(({ data: s }) => setSession(s.session))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <PageLoader />
  if (!session) return <Navigate to="/admin/login" replace />
  return (
    <AdminUserProvider>
      <Outlet />
    </AdminUserProvider>
  )
}
