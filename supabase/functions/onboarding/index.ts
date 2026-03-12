/**
 * onboarding Edge Function
 *
 * 流程（Transaction 保證）：
 * 1. 驗證 Admin JWT
 * 2. 確認 admin_users.brand_id IS NULL（防止重複 onboarding）
 * 3. 確認 brand slug 唯一
 * 4. INSERT brands
 * 5. INSERT brand_line_configs
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
      .select('id, brand_id')
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
    const { brandName, brandSlug, channelId, channelAccessToken, liffId } = body

    if (!brandName?.trim())          return errorResponse('brandName is required')
    if (!brandSlug?.trim())          return errorResponse('brandSlug is required')
    if (!/^[a-z0-9-]+$/.test(brandSlug)) return errorResponse('brandSlug must be lowercase letters, numbers, and hyphens only')
    if (!channelId?.trim())          return errorResponse('channelId is required')
    if (!channelAccessToken?.trim()) return errorResponse('channelAccessToken is required')
    if (!liffId?.trim())             return errorResponse('liffId is required')

    // ── 4. 確認 slug 唯一 ────────────────────────────────────
    const { data: existing } = await adminClient
      .from('brands')
      .select('id')
      .eq('slug', brandSlug.trim())
      .maybeSingle()

    if (existing) {
      return errorResponse(`Slug "${brandSlug}" is already taken`, 409)
    }

    // ── 5. INSERT brands ─────────────────────────────────────
    const { data: brand, error: brandError } = await adminClient
      .from('brands')
      .insert({ name: brandName.trim(), slug: brandSlug.trim(), status: 'active' })
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
        channel_id: channelId.trim(),
        channel_access_token: channelAccessToken.trim(),
        liff_id: liffId.trim(),
      })

    if (configError) {
      // Rollback: delete the brand we just created
      await adminClient.from('brands').delete().eq('id', brand.id)
      throw new Error(`Failed to create LINE config: ${configError.message}`)
    }

    // ── 7. UPDATE admin_users.brand_id ───────────────────────
    const { error: updateError } = await adminClient
      .from('admin_users')
      .update({ brand_id: brand.id })
      .eq('id', adminUser.id)

    if (updateError) {
      // Rollback
      await adminClient.from('brand_line_configs').delete().eq('brand_id', brand.id)
      await adminClient.from('brands').delete().eq('id', brand.id)
      throw new Error(`Failed to link brand: ${updateError.message}`)
    }

    // ── 8. 回傳 ──────────────────────────────────────────────
    return jsonResponse({ success: true, brand })
  } catch (err) {
    console.error('onboarding error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    // DIAG: 診斷訊息 — 回傳詳細原因以便排查 401
    if (message.startsWith('DIAG:') || message === 'Unauthorized') {
      return errorResponse(message, 401)
    }
    return errorResponse(message, 500)
  }
})
