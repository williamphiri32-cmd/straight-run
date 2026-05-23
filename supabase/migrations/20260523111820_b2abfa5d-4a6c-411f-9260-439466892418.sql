CREATE POLICY "member inserts own repayment"
ON public.repayments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (SELECT public.my_group_ids())
  AND loan_id IN (
    SELECT id FROM public.loans
    WHERE member_id IN (SELECT public.my_member_ids())
  )
);