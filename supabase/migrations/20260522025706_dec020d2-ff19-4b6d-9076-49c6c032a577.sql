
-- Likes
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, member_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read likes" ON public.post_likes
  FOR SELECT USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members like own" ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT my_member_ids()) AND user_id IN (SELECT my_group_ids()));

CREATE POLICY "members unlike own" ON public.post_likes
  FOR DELETE TO authenticated
  USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);

-- Attachments
CREATE TABLE public.post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_name text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'file', -- image | video | file
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read attachments" ON public.post_attachments
  FOR SELECT USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members add own attachments" ON public.post_attachments
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT my_member_ids()) AND user_id IN (SELECT my_group_ids()));

CREATE POLICY "author or treasurer deletes attachment" ON public.post_attachments
  FOR DELETE TO authenticated
  USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_attachments;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('community', 'community', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "community read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community');

CREATE POLICY "community auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "community owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);
