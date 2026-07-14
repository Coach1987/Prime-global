create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications_v2(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  title text not null,
  compensation numeric(12, 2),
  currency text default 'USD',
  start_date date,
  terms text,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'rejected', 'changes_requested', 'withdrawn')),
  candidate_response text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists job_offers_employer_idx on public.job_offers (employer_id, created_at desc);
create index if not exists job_offers_candidate_idx on public.job_offers (candidate_id, created_at desc);

alter table public.job_offers enable row level security;

drop policy if exists "job_offers_visibility" on public.job_offers;
create policy "job_offers_visibility"
on public.job_offers
for all
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or exists (select 1 from public.candidate_profiles c where c.id = candidate_id and c.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or exists (select 1 from public.candidate_profiles c where c.id = candidate_id and c.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);
