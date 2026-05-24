
-- 1. Backfill: link existing members whose invited email matches an auth user
UPDATE public.members m
SET auth_user_id = u.id
FROM auth.users u
WHERE m.auth_user_id IS NULL
  AND m.email IS NOT NULL
  AND lower(u.email) = lower(m.email);

-- 2. Strengthen the auth.users trigger so it also re-links on email changes
--    (e.g. user signs up with one email, treasurer later invites that email)
CREATE OR REPLACE FUNCTION public.link_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.members
       SET auth_user_id = NEW.id
     WHERE auth_user_id IS NULL
       AND email IS NOT NULL
       AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_member ON auth.users;
CREATE TRIGGER on_auth_user_link_member
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_member_on_signup();

-- 3. Treasurer-callable helper to re-run linking on demand
CREATE OR REPLACE FUNCTION public.relink_pending_members()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  linked integer;
BEGIN
  WITH updated AS (
    UPDATE public.members m
       SET auth_user_id = u.id
      FROM auth.users u
     WHERE m.user_id = auth.uid()
       AND m.auth_user_id IS NULL
       AND m.email IS NOT NULL
       AND lower(u.email) = lower(m.email)
    RETURNING m.id
  )
  SELECT count(*) INTO linked FROM updated;
  RETURN linked;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.relink_pending_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_pending_members() TO authenticated;
