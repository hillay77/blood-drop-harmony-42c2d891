
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "req_update_owner_or_admin" ON public.blood_requests;
CREATE POLICY "req_update_owner_or_admin" ON public.blood_requests FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'))
  WITH CHECK (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hub_staff'));
