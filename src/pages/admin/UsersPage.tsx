import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import type { LineUser } from '@/types/database'
import { Users, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function UsersPage() {
  const { adminUser } = useAdminUser()
  const [users, setUsers] = useState<LineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (adminUser?.brand_id) loadUsers(adminUser.brand_id)
  }, [adminUser?.brand_id])

  async function loadUsers(brandId: string) {
    // Step 1: 取得品牌所有活動 ID
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('brand_id', brandId)

    const eventIds = (events || []).map(e => e.id)
    if (eventIds.length === 0) { setLoading(false); return }

    // Step 2: 取得這些活動的不重複 line_user_id
    const { data: tickets } = await supabase
      .from('queue_tickets')
      .select('line_user_id')
      .in('event_id', eventIds)

    const userIds = [...new Set((tickets || []).map(t => t.line_user_id))]
    if (userIds.length === 0) { setLoading(false); return }

    // Step 3: 取得 line_users 資料
    const { data: lineUsers } = await supabase
      .from('line_users')
      .select('*')
      .in('id', userIds)
      .order('created_at', { ascending: false })

    setUsers(lineUsers || [])
    setLoading(false)
  }

  const filtered = users.filter(u =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.line_user_id.includes(search)
  )

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">LINE 使用者</h1>
        <p className="text-sm text-gray-500 mt-0.5">累計 {users.length} 位參與者</p>
      </div>

      <Input
        placeholder="搜尋姓名或 LINE ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="暫無使用者資料" />
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <Card key={user.id} padding="sm">
              <div className="flex items-center gap-3">
                {user.picture_url ? (
                  <img src={user.picture_url} alt={user.display_name || ''} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-brand-600">{user.display_name?.[0] || '?'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name || '未知使用者'}</p>
                  <p className="text-xs text-gray-400 truncate">{user.line_user_id}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(user.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
