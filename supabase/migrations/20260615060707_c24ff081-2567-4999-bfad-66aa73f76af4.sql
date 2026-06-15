
DROP POLICY IF EXISTS req_insert_hospital ON public.blood_requests;
CREATE POLICY req_insert_any_auth ON public.blood_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS req_delete_owner_or_admin ON public.blood_requests;
CREATE POLICY req_delete_owner_or_admin ON public.blood_requests
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'hub_staff'));

DROP POLICY IF EXISTS hospitals_insert_auth ON public.hospitals;
CREATE POLICY hospitals_insert_auth ON public.hospitals
  FOR INSERT TO authenticated WITH CHECK (true);
