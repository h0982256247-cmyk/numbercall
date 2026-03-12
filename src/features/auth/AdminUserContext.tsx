import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminUser, Brand } from '@/types/database'

interface AdminUserState {
  adminUser: AdminUser | null
  brand: Brand | null
  loading: boolean
  isOnboarded: boolean
  reload: () => void
}

const AdminUserContext = createContext<AdminUserState>({
  adminUser: null,
  brand: null,
  loading: true,
  isOnboarded: false,
  reload: () => {},
})

export function useAdminUser() {
  return useContext(AdminUserContext)
}

export function AdminUserProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Omit<AdminUserState, 'reload'>>({
    adminUser: null,
    brand: null,
    loading: true,
    isOnboarded: false,
  })
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setData(s => ({ ...s, loading: true }))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setData({ adminUser: null, brand: null, loading: false, isOnboarded: false })
        return
      }

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!adminUser || cancelled) {
        if (!cancelled) setData({ adminUser: null, brand: null, loading: false, isOnboarded: false })
        return
      }

      let brand: Brand | null = null
      if (adminUser.brand_id) {
        const { data: b } = await supabase
          .from('brands')
          .select('*')
          .eq('id', adminUser.brand_id)
          .single()
        brand = b
      }

      if (!cancelled) {
        setData({ adminUser, brand, loading: false, isOnboarded: !!adminUser.brand_id })
      }
    }

    load()
    return () => { cancelled = true }
  }, [tick])

  return (
    <AdminUserContext.Provider value={{ ...data, reload }}>
      {children}
    </AdminUserContext.Provider>
  )
}
