import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/toast'
import { Ticket } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('帳號或密碼錯誤')
      setLoading(false)
      return
    }

    // Check onboarding status
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('brand_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser?.brand_id) {
      navigate('/admin/onboarding')
    } else {
      navigate('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg shadow-brand-500/30">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">QueueFlow</h1>
          <p className="text-sm text-gray-500 mt-1">品牌後台管理系統</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">登入後台</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="電子郵件"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              label="密碼"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              登入
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          後台帳號由系統管理員建立
        </p>
      </div>
    </div>
  )
}
