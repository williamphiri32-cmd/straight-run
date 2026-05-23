
-- 1) Drop overly-broad SELECT policy on community storage bucket (prevents listing; public URLs still work)
DROP POLICY IF EXISTS "community read" ON storage.objects;

-- 2) Restrict EXECUTE on helper functions to authenticated users only (revoke from anon/public)
REVOKE EXECUTE ON FUNCTION public.my_group_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_member_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_group_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_member_ids() TO authenticated;

-- 3) Tighten member_kyc UPDATE so submitter can only edit while pending, treasurer can update anytime
DROP POLICY IF EXISTS "member updates own kyc" ON public.member_kyc;

CREATE POLICY "submitter updates own pending kyc"
  ON public.member_kyc
  FOR UPDATE
  TO authenticated
  USING (member_id IN (SELECT public.my_member_ids()) AND status = 'pending')
  WITH CHECK (member_id IN (SELECT public.my_member_ids()) AND status = 'pending');

CREATE POLICY "treasurer updates kyc"
  ON public.member_kyc
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Hide members.email and members.phone from non-treasurer reads using column-level privileges.
--    Treasurer reads contacts via a SECURITY DEFINER RPC.
REVOKE SELECT (email, phone) ON public.members FROM authenticated, anon, PUBLIC;
GRANT SELECT (id, name, user_id, auth_user_id, joined_at, created_at) ON public.members TO authenticated;

CREATE OR REPLACE FUNCTION public.treasurer_list_members()
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  auth_user_id uuid,
  joined_at date,
  created_at timestamptz,
  total_contributions numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id, m.name, m.phone, m.email, m.auth_user_id, m.joined_at, m.created_at,
    COALESCE((SELECT SUM(c.amount) FROM public.contributions c WHERE c.member_id = m.id), 0)
  FROM public.members m
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.treasurer_list_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treasurer_list_members() TO authenticated;

-- 5) Realtime: enable RLS on realtime.messages and add a restrictive policy.
--    The app only uses postgres_changes (which does not go through realtime.messages auth),
--    so broadcast/presence subscriptions are denied entirely.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all realtime broadcast and presence" ON realtime.messages;
CREATE POLICY "deny all realtime broadcast and presence"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (false);
