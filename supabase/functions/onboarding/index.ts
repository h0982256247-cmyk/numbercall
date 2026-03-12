/**
 * onboarding Edge Function
 *
 * 流程（Transaction 保證）：
 * 1. 驗證 Admin JWT
 * 2. 確認 admin_users.brand_id IS NULL（防止重複 onboarding）
 * 3. 從 email 自動產生 brand name / slug
 * 4. INSERT brands
 * 5. INSERT brand_line_configs（channelId / liffId 暫為 null，待設定頁補填）
 * 6. UPDATE admin_users SET brand_id
 * 7. 回傳 brand
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult

  try {
    // ── 1. 驗證 Admin JWT ────────────────────────────────────
    const { user } = await getAuthUser(req)
    const adminClient = createAdminClient()

    // ── 2. 查詢 admin_users，確認未完成 onboarding ──────────
    const { data: adminUser, error: adminError } = await adminClient
      .from('admin_users')
      .select('id, brand_id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (adminError || !adminUser) {
      return errorResponse('Admin user not found', 404)
    }
    if (adminUser.brand_id) {
      return errorResponse('Brand already initialized. Onboarding already completed.', 409)
    }

    // ── 3. 解析 Body ─────────────────────────────────────────
    const body = await req.json()
    const { channelAccessToken } = body

    if (!channelAccessToken?.trim()) return errorResponse('channelAccessToken is required')

    // ── 4. 從 email 自動產生 brand name / slug ───────────────
    const emailPrefix = (adminUser.email.split('@')[0] || 'brand')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'brand'

    const brandName = adminUser.email.split('@')[0] || 'My Brand'

    // 找唯一 slug
    let brandSlug = emailPrefix
    for (let i = 1; i <= 99; i++) {
      const { data: existing } = await adminClient
        .from('brands')
        .select('id')
        .eq('slug', brandSlug)
        .maybeSingle()
      if (!existing) break
      brandSlug = `${emailPrefix}${i}`
    }

    // ── 5. INSERT brands ─────────────────────────────────────
    const { data: brand, error: brandError } = await adminClient
      .from('brands')
      .insert({ name: brandName, slug: brandSlug, status: 'active' })
      .select()
      .single()

    if (brandError || !brand) {
      throw new Error(`Failed to create brand: ${brandError?.message}`)
    }

    // ── 6. INSERT brand_line_configs ─────────────────────────
    const { error: configError } = await adminClient
      .from('brand_line_configs')
      .insert({
        brand_id: brand.id,
        channel_id: null,
        channel_access_token: channelAccessToken.trim(),
        liff_id: null,
      })

    if (configError) {
      await adminClient.from('brands').delete().eq('id', brand.id)
      throw new Error(`Failed to create LINE config: ${configError.message}`)
    }

    // ── 7. UPDATE admin_users.brand_id ───────────────────────
    const { error: updateError } = await adminClient
      .from('admin_users')
      .update({ brand_id: brand.id })
      .eq('id', adminUser.id)

    if (updateError) {
      await adminClient.from('brand_line_configs').delete().eq('brand_id', brand.id)
      await adminClient.from('brands').delete().eq('id', brand.id)
      throw new Error(`Failed to link brand: ${updateError.message}`)
    }

    // ── 8. 回傳 ──────────────────────────────────────────────
    return jsonResponse({ success: true, brand })
  } catch (err) {
    console.error('onboarding error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    if (message.startsWith('DIAG:') || message === 'Unauthorized') {
      return errorResponse(message, 401)
    }
    return errorResponse(message, 500)
  }
})
