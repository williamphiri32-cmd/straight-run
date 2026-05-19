ALTER TABLE public.group_settings
  ADD COLUMN IF NOT EXISTS default_max_tenure_months integer NOT NULL DEFAULT 12;

CREATE TABLE IF NOT EXISTS public.member_loan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  max_tenure_months integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id)
);

ALTER TABLE public.member_loan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages member loan limits"
  ON public.member_loan_limits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group members read member loan limits"
  ON public.member_loan_limits FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE TRIGGER trg_member_loan_limits_updated_at
  BEFORE UPDATE ON public.member_loan_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();