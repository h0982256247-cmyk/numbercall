import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminUser } from '@/features/auth/useAdminUser'
import { slugify } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'
import type { BrandLineConfig } from '@/types/database'
import { Building2, Plug, Save } from 'lucide-react'

export default function SettingsPage() {
  const { brand, adminUser, loading: userLoading, reload } = useAdminUser()
  const [config, setConfig] = useState<Partial<BrandLineConfig>>({})
  const [brandName, setBrandName] = useState('')
  const [brandSlug, setBrandSlug] = useState('')
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (brand) {
      setBrandName(brand.name)
      setBrandSlug(brand.slug)
    }
    if (adminUser?.brand_id) loadConfig(adminUser.brand_id)
  }, [brand, adminUser?.brand_id])

  async function loadConfig(brandId: string) {
    const { data } = await supabase.from('brand_line_configs').select('*').eq('brand_id', brandId).single()
    if (data) setConfig(data)
    setConfigLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!adminUser?.brand_id) return
    if (!brandName.trim()) { toast.error('請填寫品牌名稱'); return }
    if (!brandSlug.trim() || !/^[a-z0-9-]+$/.test(brandSlug)) {
      toast.error('品牌 Slug 只允許小寫英文、數字、連字號')
      return
    }
    setSaving(true)

    const [brandResult, configResult] = await Promise.all([
      supabase
        .from('brands')
        .update({ name: brandName.trim(), slug: brandSlug.trim() })
        .eq('id', adminUser.brand_id),
      supabase
        .from('brand_line_configs')
        .update({
          channel_id: config.channel_id || null,
          channel_access_token: config.channel_access_token,
          liff_id: config.liff_id || null,
        })
        .eq('brand_id', adminUser.brand_id),
    ])

    if (brandResult.error || configResult.error) {
      toast.error('儲存失敗')
    } else {
      toast.success('設定已儲存')
      reload() // refresh brand name in sidebar
    }
    setSaving(false)
  }

  if (userLoading || configLoading) return <PageLoader />

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
            <Input
              label="品牌名稱"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              onBlur={() => { if (!brandSlug) setBrandSlug(slugify(brandName)) }}
            />
            <Input
              label="品牌 Slug"
              value={brandSlug}
              onChange={e => setBrandSlug(e.target.value)}
              helper="用於活動網址，只允許小寫英文、數字、連字號"
            />
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Channel Access Token</label>
              <textarea
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                rows={3}
                value={config.channel_access_token || ''}
                onChange={e => setConfig(c => ({ ...c, channel_access_token: e.target.value }))}
              />
            </div>
            <Input
              label="LIFF ID"
              placeholder="例：1234567890-xxxxxxxx"
              value={config.liff_id || ''}
              onChange={e => setConfig(c => ({ ...c, liff_id: e.target.value }))}
              helper="在 LINE Developers Console > LIFF 頁籤取得"
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
