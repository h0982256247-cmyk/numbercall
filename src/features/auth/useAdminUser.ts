import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminUser, Brand } from '@/types/database'

interface AdminUserState {
  adminUser: AdminUser | null
  brand: Brand | null
  loading: boolean
  isOnboarded: boolean
}

export function useAdminUser(): AdminUserState {
  const [state, setState] = useState<AdminUserState>({
    adminUser: null,
    brand: null,
    loading: true,
    isOnboarded: false,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setState({ adminUser: null, brand: null, loading: false, isOnboarded: false })
        return
      }

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (!adminUser || cancelled) {
        if (!cancelled) setState({ adminUser: null, brand: null, loading: false, isOnboarded: false })
        return
      }

      let brand: Brand | null = null
      if (adminUser.brand_id) {
        const { data } = await supabase
          .from('brands')
          .select('*')
          .eq('id', adminUser.brand_id)
          .single()
        brand = data
      }

      if (!cancelled) {
        setState({
          adminUser,
          brand,
          loading: false,
          isOnboarded: !!adminUser.brand_id,
        })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
