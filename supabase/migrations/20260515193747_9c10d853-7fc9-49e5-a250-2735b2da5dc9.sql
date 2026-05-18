CREATE TABLE public.share_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  share_out_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.share_out_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  share_out_id UUID NOT NULL REFERENCES public.share_outs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_out_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_outs all" ON public.share_outs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "share_out_allocations all" ON public.share_out_allocations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_share_out_allocations_share_out ON public.share_out_allocations(share_out_id);
CREATE INDEX idx_share_out_allocations_member ON public.share_out_allocations(member_id);