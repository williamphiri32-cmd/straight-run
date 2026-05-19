ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.repayments ADD COLUMN IF NOT EXISTS payment_method text;