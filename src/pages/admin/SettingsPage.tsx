import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import type { BrandLineConfig } from '@/types/database'
import { Building2, Plug, Save } from 'lucide-react'

export default function SettingsPage() {
  const { brand, adminUser } = useAdminUser()
  const [config, setConfig] = useState<Partial<BrandLineConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (adminUser?.brand_id) loadConfig(adminUser.brand_id)
  }, [adminUser?.brand_id])

  async function loadConfig(brandId: string) {
    const { data } = await supabase.from('brand_line_configs').select('*').eq('brand_id', brandId).single()
    if (data) setConfig(data)
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!adminUser?.brand_id) return
    setSaving(true)

    const { error } = await supabase
      .from('brand_line_configs')
      .update({ channel_id: config.channel_id, liff_id: config.liff_id })
      .eq('brand_id', adminUser.brand_id)

    if (error) { toast.error('儲存失敗'); setSaving(false); return }
    toast.success('設定已儲存')
    setSaving(false)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">品牌設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理品牌與 LINE 串接設定</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Brand info */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">品牌資訊</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">品牌名稱</label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-xl px-3.5 py-2.5">{brand?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">品牌 Slug</label>
              <p className="mt-1 text-sm text-gray-500 bg-gray-50 rounded-xl px-3.5 py-2.5">{brand?.slug}</p>
            </div>
          </div>
        </Card>

        {/* LINE config */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Plug className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">LINE 串接設定</h2>
          </div>
          <div className="space-y-3">
            <Input
              label="LINE Channel ID"
              value={config.channel_id || ''}
              onChange={e => setConfig(c => ({ ...c, channel_id: e.target.value }))}
            />
            <div>
              <label className="text-sm font-medium text-gray-700">Channel Access Token</label>
              <p className="mt-1 text-xs text-gray-400 bg-gray-50 rounded-xl px-3.5 py-2.5">
                ••••••••••••••••（已設定）
              </p>
              <p className="text-xs text-gray-400 mt-1">如需更新 Token，請聯絡系統管理員</p>
            </div>
            <Input
              label="LIFF ID"
              value={config.liff_id || ''}
              onChange={e => setConfig(c => ({ ...c, liff_id: e.target.value }))}
            />
          </div>
        </Card>

        <Button type="submit" loading={saving} size="lg" fullWidth>
          <Save className="w-4 h-4" /> 儲存設定
        </Button>
      </form>
    </div>
  )
}
