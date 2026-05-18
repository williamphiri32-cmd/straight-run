-- Profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Members
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  phone text,
  joined_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
create policy "members all" on public.members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index members_user_idx on public.members(user_id);

-- Contributions
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  contribution_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.contributions enable row level security;
create policy "contributions all" on public.contributions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index contributions_user_idx on public.contributions(user_id);
create index contributions_member_idx on public.contributions(member_id);

-- Loans
create type public.loan_status as enum ('active','paid','overdue');
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  principal numeric(12,2) not null check (principal > 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate >= 0),
  issued_date date not null default current_date,
  due_date date,
  status public.loan_status not null default 'active',
  note text,
  created_at timestamptz not null default now()
);
alter table public.loans enable row level security;
create policy "loans all" on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index loans_user_idx on public.loans(user_id);
create index loans_member_idx on public.loans(member_id);

-- Repayments
create table public.repayments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  loan_id uuid not null references public.loans on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.repayments enable row level security;
create policy "repayments all" on public.repayments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index repayments_user_idx on public.repayments(user_id);
create index repayments_loan_idx on public.repayments(loan_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Share outs
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

-- Members email + auth link
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS members_email_idx ON public.members (lower(email));
CREATE INDEX IF NOT EXISTS members_auth_user_id_idx ON public.members (auth_user_id);

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS penalty_rate numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS penalty_period_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS application_id uuid;

CREATE TYPE public.loan_application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  amount numeric NOT NULL,
  purpose text,
  term_months integer NOT NULL DEFAULT 3,
  status public.loan_application_status NOT NULL DEFAULT 'pending',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_group_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.members WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_member_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.members WHERE auth_user_id = auth.uid();
$$;

CREATE POLICY "group members can read members" ON public.members FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "group members can read contributions" ON public.contributions FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "group members can read loans" ON public.loans FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "group members can read repayments" ON public.repayments FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "group members can read share_outs" ON public.share_outs FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "group members can read share_out_allocations" ON public.share_out_allocations FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));

CREATE POLICY "treasurer manages applications" ON public.loan_applications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group members read applications" ON public.loan_applications FOR SELECT
  USING (user_id IN (SELECT public.my_group_ids()));
CREATE POLICY "member submits own application" ON public.loan_applications FOR INSERT
  WITH CHECK (
    member_id IN (SELECT public.my_member_ids())
    AND user_id IN (SELECT public.my_group_ids())
    AND status = 'pending'
  );

CREATE OR REPLACE FUNCTION public.link_member_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.members SET auth_user_id = NEW.id
   WHERE auth_user_id IS NULL AND email IS NOT NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_link_member ON auth.users;
CREATE TRIGGER on_auth_user_link_member AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_member_on_signup();

CREATE OR REPLACE FUNCTION public.link_member_on_email_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.auth_user_id IS NULL THEN
    SELECT id INTO NEW.auth_user_id FROM auth.users
     WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS members_link_email ON public.members;
CREATE TRIGGER members_link_email BEFORE INSERT OR UPDATE OF email ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.link_member_on_email_change();

REVOKE ALL ON FUNCTION public.my_group_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_member_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_group_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_member_ids() TO authenticated;

-- Group settings
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasurer manages own settings" ON public.group_settings FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group members read settings" ON public.group_settings FOR SELECT
USING (user_id IN (SELECT public.my_group_ids()));

CREATE TRIGGER update_group_settings_updated_at
BEFORE UPDATE ON public.group_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();