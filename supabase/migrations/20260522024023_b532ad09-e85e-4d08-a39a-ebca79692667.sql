
-- Posts (community/journal)
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- group id (treasurer's auth uid)
  member_id uuid NOT NULL, -- author member id
  category text NOT NULL DEFAULT 'idea', -- idea | journal | question | announcement
  title text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_group_created ON public.posts(user_id, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read posts"
ON public.posts FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members create own posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  member_id IN (SELECT my_member_ids())
  AND user_id IN (SELECT my_group_ids())
);

CREATE POLICY "author updates own post"
ON public.posts FOR UPDATE TO authenticated
USING (member_id IN (SELECT my_member_ids()))
WITH CHECK (member_id IN (SELECT my_member_ids()));

CREATE POLICY "author or treasurer deletes post"
ON public.posts FOR DELETE TO authenticated
USING (
  member_id IN (SELECT my_member_ids())
  OR auth.uid() = user_id
);

CREATE TRIGGER posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- group id
  member_id uuid NOT NULL, -- author member id
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_comments_post_created ON public.post_comments(post_id, created_at);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read comments"
ON public.post_comments FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members create own comments"
ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (
  member_id IN (SELECT my_member_ids())
  AND user_id IN (SELECT my_group_ids())
);

CREATE POLICY "author or treasurer deletes comment"
ON public.post_comments FOR DELETE TO authenticated
USING (
  member_id IN (SELECT my_member_ids())
  OR auth.uid() = user_id
);

-- Realtime
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
