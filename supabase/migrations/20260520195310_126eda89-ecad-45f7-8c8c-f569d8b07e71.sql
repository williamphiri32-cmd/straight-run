
CREATE TABLE public.savings_inactivity_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  months_without_saving integer NOT NULL,
  action text NOT NULL,
  outcome text,
  penalty_amount numeric NOT NULL DEFAULT 0,
  suspends_borrowing boolean NOT NULL DEFAULT false,
  expels_member boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_inactivity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages own inactivity rules"
ON public.savings_inactivity_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group members read inactivity rules"
ON public.savings_inactivity_rules FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE INDEX idx_savings_inactivity_rules_user_sort
  ON public.savings_inactivity_rules(user_id, sort_order);

CREATE TRIGGER update_savings_inactivity_rules_updated_at
BEFORE UPDATE ON public.savings_inactivity_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
