-- Migration 003: Make channel_id and liff_id nullable (filled in Settings after onboarding)
-- Also add UPDATE policy for brands so admins can edit brand name/slug in Settings

ALTER TABLE public.brand_line_configs
  ALTER COLUMN channel_id DROP NOT NULL,
  ALTER COLUMN liff_id    DROP NOT NULL;

CREATE POLICY "brands__admin_update_own"
  ON public.brands
  FOR UPDATE
  USING (id = public.get_my_brand_id())
  WITH CHECK (id = public.get_my_brand_id());
