
CREATE TABLE public.member_kyc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  full_legal_name TEXT,
  id_type TEXT,
  id_number TEXT,
  date_of_birth DATE,
  address TEXT,
  id_document_path TEXT,
  selfie_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member reads own kyc" ON public.member_kyc
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);

CREATE POLICY "member inserts own kyc" ON public.member_kyc
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT my_member_ids()) AND user_id IN (SELECT my_group_ids()));

CREATE POLICY "member updates own kyc" ON public.member_kyc
  FOR UPDATE TO authenticated
  USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id)
  WITH CHECK (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);

CREATE TRIGGER member_kyc_updated_at
  BEFORE UPDATE ON public.member_kyc
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage path convention: {group_user_id}/{member_id}/{filename}
CREATE POLICY "kyc read own or treasurer" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] IN (SELECT my_group_ids()::text)
    )
  );

CREATE POLICY "kyc write own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc' AND (storage.foldername(name))[1] IN (SELECT my_group_ids()::text)
  );

CREATE POLICY "kyc update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] IN (SELECT my_group_ids()::text)
    )
  );

CREATE POLICY "kyc delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] IN (SELECT my_group_ids()::text)
    )
  );
