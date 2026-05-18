-- 1. Members: add email + auth link
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS members_email_idx ON public.members (lower(email));
CREATE INDEX IF NOT EXISTS members_auth_user_id_idx ON public.members (auth_user_id);

-- 2. Loans: penalty config + application link
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS penalty_rate numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS penalty_period_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS application_id uuid;

-- 3. Loan applications table
CREATE TYPE public.loan_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,            -- treasurer / group owner
  member_id uuid NOT NULL,
  amount numeric NOT NULL,
  purpose text,
  term_months integer NOT NULL DEFAULT 3,
  status public.loan_application_status NOT NULL DEFAULT 'pending',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- 4. Security definer: which group (treasurer user_id) does the signed-in user belong to as a member?
CREATE OR REPLACE FUNCTION public.my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.members WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.members WHERE auth_user_id = auth.uid();
$$;

-- 5. Group transparency: members can read everything in their group(s)
CREATE POLICY "group members can read members"
  ON public.members FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "group members can read contributions"
  ON public.contributions FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "group members can read loans"
  ON public.loans FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "group members can read repayments"
  ON public.repayments FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "group members can read share_outs"
  ON public.share_outs FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "group members can read share_out_allocations"
  ON public.share_out_allocations FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

-- 6. Loan applications RLS
-- Treasurer (group owner) full access
CREATE POLICY "treasurer manages applications"
  ON public.loan_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Members can read all applications in their group (transparency)
CREATE POLICY "group members read applications"
  ON public.loan_applications FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

-- Members can create applications for themselves (pending only)
CREATE POLICY "member submits own application"
  ON public.loan_applications FOR INSERT
  WITH CHECK (
    member_id IN (SELECT public.my_member_ids())
    AND user_id IN (SELECT public.my_group_ids())
    AND status = 'pending'
  );

-- 7. Auto-link member on signup by email
CREATE OR REPLACE FUNCTION public.link_member_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.members
     SET auth_user_id = NEW.id
   WHERE auth_user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_member ON auth.users;
CREATE TRIGGER on_auth_user_link_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_member_on_signup();

-- 8. Also link existing member when treasurer adds/updates email later
CREATE OR REPLACE FUNCTION public.link_member_on_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.auth_user_id IS NULL THEN
    SELECT id INTO NEW.auth_user_id
      FROM auth.users
     WHERE lower(email) = lower(NEW.email)
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_link_email ON public.members;
CREATE TRIGGER members_link_email
  BEFORE INSERT OR UPDATE OF email ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.link_member_on_email_change();