
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
