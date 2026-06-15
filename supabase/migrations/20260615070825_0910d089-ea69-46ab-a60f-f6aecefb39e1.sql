
-- 1) Restrict hospitals & hubs SELECT to authenticated users (hides contact_phone from public)
DROP POLICY IF EXISTS hospitals_read_all ON public.hospitals;
CREATE POLICY hospitals_read_auth ON public.hospitals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS hubs_read_all ON public.hubs;
CREATE POLICY hubs_read_auth ON public.hubs FOR SELECT TO authenticated USING (true);

-- 2) Audit log: explicit deny for client INSERT/UPDATE/DELETE; service_role bypasses RLS
DROP POLICY IF EXISTS audit_no_client_insert ON public.audit_log;
CREATE POLICY audit_no_client_insert ON public.audit_log FOR INSERT TO authenticated, anon WITH CHECK (false);

DROP POLICY IF EXISTS audit_no_client_update ON public.audit_log;
CREATE POLICY audit_no_client_update ON public.audit_log FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS audit_no_client_delete ON public.audit_log;
CREATE POLICY audit_no_client_delete ON public.audit_log FOR DELETE TO authenticated, anon USING (false);

-- 3) Match alerts: only admins/hub_staff can INSERT from clients; service_role bypasses RLS
DROP POLICY IF EXISTS alerts_insert_admin_staff ON public.match_alerts;
CREATE POLICY alerts_insert_admin_staff ON public.match_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hub_staff'::app_role));

DROP POLICY IF EXISTS alerts_no_client_update ON public.match_alerts;
CREATE POLICY alerts_no_client_update ON public.match_alerts FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS alerts_no_client_delete ON public.match_alerts;
CREATE POLICY alerts_no_client_delete ON public.match_alerts FOR DELETE TO authenticated, anon USING (false);
