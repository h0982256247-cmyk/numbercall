import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callFunction } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Ticket, ChevronRight, Plug, Eye, EyeOff } from 'lucide-react'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [channelAccessToken, setChannelAccessToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!channelAccessToken.trim()) {
      setError('請填寫 Channel Access Token')
      return
    }
    setError('')
    setLoading(true)

    const res = await callFunction('onboarding', { channelAccessToken })
    const json = await res.json()

    if (!res.ok) {
      toast.error(json.error || '初始化失敗，請再試一次')
      setLoading(false)
      return
    }

    toast.success('品牌初始化完成！')
    navigate('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">QueueFlow</p>
            <h1 className="text-lg font-bold text-gray-900">品牌初始化設定</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plug className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">LINE 串接設定</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">LINE Channel Access Token *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="貼上 Channel Access Token"
                  value={channelAccessToken}
                  onChange={e => setChannelAccessToken(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <p className="text-xs text-gray-400">在 LINE Developers Console &gt; Messaging API &gt; Channel access token 取得</p>
            </div>
            <p className="mt-4 text-xs text-gray-400">品牌名稱、Channel ID、LIFF ID 等資訊可在進入工作台後的「設定」頁面補填</p>
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading} className="shadow-lg shadow-brand-500/30">
            完成設定，進入工作台
            <ChevronRight className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
