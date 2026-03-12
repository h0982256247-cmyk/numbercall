import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callFunction } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Ticket, ChevronRight, Building2, Plug } from 'lucide-react'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    brandName: '',
    brandSlug: '',
    channelId: '',
    channelAccessToken: '',
    liffId: '',
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function handleBrandNameChange(name: string) {
    setForm(f => ({
      ...f,
      brandName: name,
      brandSlug: f.brandSlug || slugify(name),
    }))
  }

  function validate() {
    const errs: Partial<typeof form> = {}
    if (!form.brandName.trim())          errs.brandName = '請填寫品牌名稱'
    if (!form.brandSlug.trim())          errs.brandSlug = '請填寫品牌 Slug'
    if (!/^[a-z0-9-]+$/.test(form.brandSlug)) errs.brandSlug = '只允許小寫英文、數字、連字號'
    if (!form.channelId.trim())          errs.channelId = '請填寫 Channel ID'
    if (!form.channelAccessToken.trim()) errs.channelAccessToken = '請填寫 Channel Access Token'
    if (!form.liffId.trim())             errs.liffId = '請填寫 LIFF ID'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const res = await callFunction('onboarding', form)

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
          {/* Brand info */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">品牌基本資訊</h2>
            </div>
            <div className="space-y-4">
              <Input
                label="品牌名稱 *"
                placeholder="例：咖波展覽"
                value={form.brandName}
                onChange={e => handleBrandNameChange(e.target.value)}
                error={errors.brandName}
              />
              <Input
                label="品牌 Slug *"
                placeholder="例：capoo"
                value={form.brandSlug}
                onChange={e => setForm(f => ({ ...f, brandSlug: e.target.value }))}
                error={errors.brandSlug}
                helper="只允許小寫英文、數字、連字號（用於活動網址）"
              />
            </div>
          </div>

          {/* LINE config */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plug className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">LINE 串接設定</h2>
            </div>
            <div className="space-y-4">
              <Input
                label="LINE Channel ID *"
                placeholder="例：2006123456"
                value={form.channelId}
                onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}
                error={errors.channelId}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">LINE Channel Access Token *</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                  rows={3}
                  placeholder="貼上 Channel Access Token"
                  value={form.channelAccessToken}
                  onChange={e => setForm(f => ({ ...f, channelAccessToken: e.target.value }))}
                />
                {errors.channelAccessToken && <p className="text-xs text-red-500">{errors.channelAccessToken}</p>}
              </div>
              <Input
                label="LIFF ID *"
                placeholder="例：1234567890-xxxxxxxx"
                value={form.liffId}
                onChange={e => setForm(f => ({ ...f, liffId: e.target.value }))}
                error={errors.liffId}
                helper="在 LINE Developers Console > LIFF 頁籤取得"
              />
            </div>
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
