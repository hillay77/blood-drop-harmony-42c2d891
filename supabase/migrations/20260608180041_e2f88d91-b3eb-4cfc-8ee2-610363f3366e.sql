
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'hub_staff', 'hospital_requester', 'donor');
CREATE TYPE public.blood_group AS ENUM ('A','B','AB','O');
CREATE TYPE public.rh_factor AS ENUM ('positive','negative');
CREATE TYPE public.urgency AS ENUM ('routine','urgent','critical');
CREATE TYPE public.unit_status AS ENUM ('available','reserved','dispatched','expired','discarded');
CREATE TYPE public.request_status AS ENUM ('pending','matched','dispatched','fulfilled','cancelled');
CREATE TYPE public.dispatch_status AS ENUM ('pending','in_transit','delivered','cancelled');
CREATE TYPE public.alert_status AS ENUM ('queued','sent','failed','delivered');

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- HUBS
-- =========================================================
CREATE TABLE public.hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  capacity_units INT NOT NULL DEFAULT 500,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hubs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hubs TO authenticated;
GRANT ALL ON public.hubs TO service_role;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_hubs_updated BEFORE UPDATE ON public.hubs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- HOSPITALS
-- =========================================================
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_hospitals_updated BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PROFILES (1:1 with auth.users)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  blood_group public.blood_group,
  rh public.rh_factor,
  phenotype_tags TEXT[] DEFAULT '{}',
  hub_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  donor_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- USER ROLES + has_role()
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Profile auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'donor');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- BLOOD UNITS
-- =========================================================
CREATE TABLE public.blood_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  blood_group public.blood_group NOT NULL,
  rh public.rh_factor NOT NULL,
  phenotype_tags TEXT[] DEFAULT '{}',
  volume_ml INT NOT NULL DEFAULT 450,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status public.unit_status NOT NULL DEFAULT 'available',
  storage_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blood_units_hub ON public.blood_units(hub_id, blood_group, rh, status);
CREATE INDEX idx_blood_units_expires ON public.blood_units(expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_units TO authenticated;
GRANT ALL ON public.blood_units TO service_role;
ALTER TABLE public.blood_units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_blood_units_updated BEFORE UPDATE ON public.blood_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- INVENTORY SNAPSHOTS (daily rollups)
-- =========================================================
CREATE TABLE public.inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  blood_group public.blood_group NOT NULL,
  rh public.rh_factor NOT NULL,
  snapshot_date DATE NOT NULL,
  units_available INT NOT NULL DEFAULT 0,
  units_consumed INT NOT NULL DEFAULT 0,
  UNIQUE (hub_id, blood_group, rh, snapshot_date)
);
GRANT SELECT ON public.inventory_snapshots TO authenticated, anon;
GRANT ALL ON public.inventory_snapshots TO service_role;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- COLD-CHAIN READINGS
-- =========================================================
CREATE TABLE public.cold_chain_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  storage_unit TEXT NOT NULL,
  temp_c NUMERIC(4,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_alert BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_cold_chain_hub_time ON public.cold_chain_readings(hub_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.cold_chain_readings TO authenticated;
GRANT ALL ON public.cold_chain_readings TO service_role;
ALTER TABLE public.cold_chain_readings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SHORTAGE FORECASTS
-- =========================================================
CREATE TABLE public.shortage_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  blood_group public.blood_group NOT NULL,
  rh public.rh_factor NOT NULL,
  current_units INT NOT NULL,
  avg_daily_consumption NUMERIC(8,2) NOT NULL,
  projected_days_remaining NUMERIC(8,2) NOT NULL,
  shortage_risk TEXT NOT NULL, -- 'low' | 'medium' | 'high' | 'critical'
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hub_id, blood_group, rh)
);
GRANT SELECT ON public.shortage_forecasts TO authenticated, anon;
GRANT ALL ON public.shortage_forecasts TO service_role;
ALTER TABLE public.shortage_forecasts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- BLOOD REQUESTS
-- =========================================================
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  blood_group public.blood_group NOT NULL,
  rh public.rh_factor NOT NULL,
  phenotype_required TEXT[] DEFAULT '{}',
  units_needed INT NOT NULL CHECK (units_needed > 0),
  urgency public.urgency NOT NULL DEFAULT 'urgent',
  patient_reference TEXT,
  notes TEXT,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.blood_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- DISPATCHES
-- =========================================================
CREATE TABLE public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  unit_ids UUID[] NOT NULL DEFAULT '{}',
  distance_km NUMERIC(8,2),
  eta_minutes INT,
  status public.dispatch_status NOT NULL DEFAULT 'pending',
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatches TO authenticated;
GRANT ALL ON public.dispatches TO service_role;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_dispatches_updated BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- MATCH ALERTS (SMS log)
-- =========================================================
CREATE TABLE public.match_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.alert_status NOT NULL DEFAULT 'queued',
  twilio_sid TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.match_alerts TO authenticated;
GRANT ALL ON public.match_alerts TO service_role;
ALTER TABLE public.match_alerts ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- hubs: public read; admins manage
CREATE POLICY "hubs_read_all" ON public.hubs FOR SELECT USING (true);
CREATE POLICY "hubs_admin_write" ON public.hubs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- hospitals: public read; admins manage
CREATE POLICY "hospitals_read_all" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "hospitals_admin_write" ON public.hospitals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- profiles: user reads/updates own; admin reads all
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles: user sees own; admin manages
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- blood_units: hub_staff for their hub, admin all
CREATE POLICY "units_read_staff_admin" ON public.blood_units FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff') OR public.has_role(auth.uid(),'hospital_requester'));
CREATE POLICY "units_write_hub_staff" ON public.blood_units FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    (public.has_role(auth.uid(),'hub_staff') AND hub_id = (SELECT hub_id FROM public.profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    (public.has_role(auth.uid(),'hub_staff') AND hub_id = (SELECT hub_id FROM public.profiles WHERE id = auth.uid()))
  );

-- inventory_snapshots: public read
CREATE POLICY "snapshots_read_all" ON public.inventory_snapshots FOR SELECT USING (true);
CREATE POLICY "snapshots_admin_write" ON public.inventory_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- cold_chain: staff for own hub, admin all
CREATE POLICY "cc_read_staff_admin" ON public.cold_chain_readings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'));
CREATE POLICY "cc_insert_hub_staff" ON public.cold_chain_readings FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin') OR
    (public.has_role(auth.uid(),'hub_staff') AND hub_id = (SELECT hub_id FROM public.profiles WHERE id = auth.uid()))
  );

-- shortage_forecasts: public read
CREATE POLICY "forecasts_read_all" ON public.shortage_forecasts FOR SELECT USING (true);
CREATE POLICY "forecasts_admin_write" ON public.shortage_forecasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- blood_requests: requester sees own + admin/hub_staff see all
CREATE POLICY "req_read" ON public.blood_requests FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid() OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'hub_staff')
  );
CREATE POLICY "req_insert_hospital" ON public.blood_requests FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid() AND
    (public.has_role(auth.uid(),'hospital_requester') OR public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "req_update_owner_or_admin" ON public.blood_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'))
  WITH CHECK (true);

-- dispatches: admin + hub_staff + requester (read)
CREATE POLICY "disp_read" ON public.dispatches FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'hub_staff') OR
    EXISTS (SELECT 1 FROM public.blood_requests r WHERE r.id = dispatches.request_id AND r.requester_id = auth.uid())
  );
CREATE POLICY "disp_write_admin_staff" ON public.dispatches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'));

-- match_alerts: admin + hub_staff read; donor sees own
CREATE POLICY "alerts_read" ON public.match_alerts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'hub_staff') OR
    donor_id = auth.uid()
  );

-- audit_log: admin only
CREATE POLICY "audit_admin_read" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
