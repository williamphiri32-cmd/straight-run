CREATE POLICY "member inserts own contribution"
ON public.contributions
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (SELECT public.my_member_ids())
  AND user_id IN (SELECT public.my_group_ids())
);