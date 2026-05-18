
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.group_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  saving_duration_months integer NOT NULL DEFAULT 12,
  default_interest_rate numeric NOT NULL DEFAULT 0,
  default_penalty_rate numeric NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages own settings"
ON public.group_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group members read settings"
ON public.group_settings FOR SELECT
USING (user_id IN (SELECT public.my_group_ids()));

CREATE TRIGGER update_group_settings_updated_at
BEFORE UPDATE ON public.group_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
