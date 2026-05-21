
CREATE TABLE public.offence_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offence TEXT NOT NULL,
  penalty_amount NUMERIC NOT NULL DEFAULT 0,
  penalty_is_percent BOOLEAN NOT NULL DEFAULT false,
  penalty_note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages own offence rules"
ON public.offence_rules FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group members read offence rules"
ON public.offence_rules FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE INDEX idx_offence_rules_user_sort ON public.offence_rules(user_id, sort_order);

CREATE TRIGGER update_offence_rules_updated_at
BEFORE UPDATE ON public.offence_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
