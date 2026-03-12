-- ============================================================
-- 公開取得品牌 LIFF ID（供前台 LIFF 初始化使用，不含敏感欄位）
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_liff_id(p_brand_slug TEXT)
RETURNS TEXT AS $$
  SELECT blc.liff_id
  FROM public.brands b
  JOIN public.brand_line_configs blc ON blc.brand_id = b.id
  WHERE b.slug = p_brand_slug AND b.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 允許未登入（anon）及已登入用戶呼叫此函數
GRANT EXECUTE ON FUNCTION public.get_liff_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_liff_id(TEXT) TO authenticated;
