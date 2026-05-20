
CREATE TABLE public.loan_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  min_amount numeric NOT NULL,
  max_amount numeric,
  repayment_months integer NOT NULL,
  interest_rate numeric NOT NULL,
  installments integer NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages own loan tiers"
  ON public.loan_tiers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group members read loan tiers"
  ON public.loan_tiers FOR SELECT
  USING (user_id IN (SELECT my_group_ids()));

CREATE TRIGGER update_loan_tiers_updated_at
  BEFORE UPDATE ON public.loan_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_loan_tiers_user ON public.loan_tiers(user_id, sort_order);
