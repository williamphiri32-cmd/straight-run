
CREATE TABLE public.post_poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.post_poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, member_id)
);

CREATE INDEX idx_poll_options_post ON public.post_poll_options(post_id);
CREATE INDEX idx_poll_votes_post ON public.post_poll_votes(post_id);

ALTER TABLE public.post_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_poll_votes ENABLE ROW LEVEL SECURITY;

-- Options
CREATE POLICY "group members read poll options"
ON public.post_poll_options FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members create own poll options"
ON public.post_poll_options FOR INSERT TO authenticated
WITH CHECK (member_id IN (SELECT my_member_ids()) AND user_id IN (SELECT my_group_ids()));

CREATE POLICY "author or treasurer deletes poll option"
ON public.post_poll_options FOR DELETE TO authenticated
USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);

-- Votes
CREATE POLICY "group members read poll votes"
ON public.post_poll_votes FOR SELECT
USING (user_id IN (SELECT my_group_ids()));

CREATE POLICY "members cast own vote"
ON public.post_poll_votes FOR INSERT TO authenticated
WITH CHECK (member_id IN (SELECT my_member_ids()) AND user_id IN (SELECT my_group_ids()));

CREATE POLICY "members change own vote"
ON public.post_poll_votes FOR UPDATE TO authenticated
USING (member_id IN (SELECT my_member_ids()))
WITH CHECK (member_id IN (SELECT my_member_ids()));

CREATE POLICY "members remove own vote or treasurer"
ON public.post_poll_votes FOR DELETE TO authenticated
USING (member_id IN (SELECT my_member_ids()) OR auth.uid() = user_id);
