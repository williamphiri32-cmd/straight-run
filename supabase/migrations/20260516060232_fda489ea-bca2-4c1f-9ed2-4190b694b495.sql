REVOKE ALL ON FUNCTION public.my_group_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_member_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_group_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_member_ids() TO authenticated;

REVOKE ALL ON FUNCTION public.link_member_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_member_on_email_change() FROM PUBLIC, anon, authenticated;