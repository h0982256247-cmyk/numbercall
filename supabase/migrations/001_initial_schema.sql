-- ============================================================
-- QueueFlow Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE public.brands (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_brand_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE TABLE public.admin_users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id     UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  display_name TEXT,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_admin_status CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE TABLE public.brand_line_configs (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id              UUID NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  channel_id            TEXT NOT NULL,
  channel_access_token  TEXT NOT NULL,
  liff_id               TEXT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.events (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id            UUID    NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name                TEXT    NOT NULL,
  slug                TEXT    NOT NULL UNIQUE,
  description         TEXT,
  start_date          DATE    NOT NULL,
  end_date            DATE    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'draft',
  last_queue_number   INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_event_status CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE TABLE public.line_users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id  TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  picture_url   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.queue_tickets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  line_user_id  UUID NOT NULL REFERENCES public.line_users(id),
  queue_number  INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'waiting',
  called_at     TIMESTAMPTZ,
  entered_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_ticket_status CHECK (status IN ('waiting', 'called', 'entered', 'skipped', 'cancelled'))
);

CREATE UNIQUE INDEX unique_active_ticket_per_user_event
  ON public.queue_tickets (event_id, line_user_id)
  WHERE status NOT IN ('cancelled', 'skipped');

CREATE TABLE public.queue_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   UUID NOT NULL REFERENCES public.queue_tickets(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  actor_type  TEXT NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT valid_action CHECK (action IN ('created', 'called', 'recalled', 'entered', 'skipped', 'cancelled')),
  CONSTRAINT valid_actor_type CHECK (actor_type IN ('user', 'admin', 'system'))
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_brands_slug              ON public.brands(slug);
CREATE INDEX idx_admin_users_auth         ON public.admin_users(auth_user_id);
CREATE INDEX idx_admin_users_brand        ON public.admin_users(brand_id);
CREATE INDEX idx_events_brand_id          ON public.events(brand_id);
CREATE INDEX idx_events_slug              ON public.events(slug);
CREATE INDEX idx_events_brand_status      ON public.events(brand_id, status);
CREATE INDEX idx_line_users_line_user_id  ON public.line_users(line_user_id);
CREATE INDEX idx_tickets_event_id         ON public.queue_tickets(event_id);
CREATE INDEX idx_tickets_line_user_id     ON public.queue_tickets(line_user_id);
CREATE INDEX idx_tickets_event_status     ON public.queue_tickets(event_id, status);
CREATE INDEX idx_tickets_event_created    ON public.queue_tickets(event_id, created_at);
CREATE INDEX idx_logs_ticket_id           ON public.queue_logs(ticket_id);

-- ── updated_at Triggers ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brands_updated_at             BEFORE UPDATE ON public.brands             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_admin_users_updated_at        BEFORE UPDATE ON public.admin_users        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brand_line_configs_updated_at BEFORE UPDATE ON public.brand_line_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_events_updated_at             BEFORE UPDATE ON public.events             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_line_users_updated_at         BEFORE UPDATE ON public.line_users         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_queue_tickets_updated_at      BEFORE UPDATE ON public.queue_tickets      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Auto queue_number ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_assign_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  UPDATE public.events
  SET last_queue_number = last_queue_number + 1
  WHERE id = NEW.event_id
  RETURNING last_queue_number INTO next_num;
  NEW.queue_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_queue_number
  BEFORE INSERT ON public.queue_tickets
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_queue_number();

-- ── Auth user trigger ─────────────────────────────────────────
-- Auto-creates admin_users skeleton for non-LINE users

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE 'line\_%@queueflow.local' THEN
    INSERT INTO public.admin_users (auth_user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── RLS Helper Functions ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_brand_id()
RETURNS UUID AS $$
  SELECT brand_id FROM public.admin_users
  WHERE auth_user_id = auth.uid() AND status = 'active' LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid() AND status = 'active' AND brand_id IS NOT NULL
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_line_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_logs          ENABLE ROW LEVEL SECURITY;

-- brands
CREATE POLICY "brands__admin_read_own" ON public.brands FOR SELECT USING (id = public.get_my_brand_id());

-- admin_users
CREATE POLICY "admin_users__read_own"   ON public.admin_users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "admin_users__update_own" ON public.admin_users FOR UPDATE USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- brand_line_configs
CREATE POLICY "line_configs__admin_read_own"   ON public.brand_line_configs FOR SELECT USING (brand_id = public.get_my_brand_id());
CREATE POLICY "line_configs__admin_update_own" ON public.brand_line_configs FOR UPDATE USING (brand_id = public.get_my_brand_id()) WITH CHECK (brand_id = public.get_my_brand_id());

-- events
CREATE POLICY "events__public_read_active"     ON public.events FOR SELECT USING (status IN ('active', 'paused'));
CREATE POLICY "events__admin_crud_own_brand"   ON public.events FOR ALL USING (brand_id = public.get_my_brand_id()) WITH CHECK (brand_id = public.get_my_brand_id());

-- line_users
CREATE POLICY "line_users__read_own"    ON public.line_users FOR SELECT USING (id = auth.uid());
CREATE POLICY "line_users__update_own"  ON public.line_users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "line_users__admin_read"  ON public.line_users FOR SELECT
  USING (public.is_admin() AND id IN (
    SELECT qt.line_user_id FROM public.queue_tickets qt
    JOIN public.events e ON e.id = qt.event_id
    WHERE e.brand_id = public.get_my_brand_id()
  ));

-- queue_tickets
CREATE POLICY "tickets__line_user_read_own"   ON public.queue_tickets FOR SELECT USING (line_user_id = auth.uid());
CREATE POLICY "tickets__admin_read_own_brand" ON public.queue_tickets FOR SELECT
  USING (public.is_admin() AND event_id IN (SELECT id FROM public.events WHERE brand_id = public.get_my_brand_id()));
CREATE POLICY "tickets__admin_update_own_brand" ON public.queue_tickets FOR UPDATE
  USING (public.is_admin() AND event_id IN (SELECT id FROM public.events WHERE brand_id = public.get_my_brand_id()));

-- queue_logs
CREATE POLICY "logs__line_user_read_own"   ON public.queue_logs FOR SELECT
  USING (ticket_id IN (SELECT id FROM public.queue_tickets WHERE line_user_id = auth.uid()));
CREATE POLICY "logs__admin_read_own_brand" ON public.queue_logs FOR SELECT
  USING (public.is_admin() AND ticket_id IN (
    SELECT qt.id FROM public.queue_tickets qt
    JOIN public.events e ON e.id = qt.event_id
    WHERE e.brand_id = public.get_my_brand_id()
  ));

-- ── Realtime ─────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
