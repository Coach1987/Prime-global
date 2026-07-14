create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications_v2(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  interview_type text not null check (interview_type in ('online', 'phone', 'in_person')),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 10 and 240),
  location_or_link text,
  status text not null default 'scheduled' check (status in ('scheduled', 'rescheduled', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists interviews_employer_idx on public.interviews (employer_id, scheduled_at desc);
create index if not exists interviews_candidate_idx on public.interviews (candidate_id, scheduled_at desc);

alter table public.interviews enable row level security;

drop policy if exists "interviews_owner_access" on public.interviews;
create policy "interviews_owner_access"
on public.interviews
for all
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or exists (select 1 from public.candidate_profiles c where c.id = candidate_id and c.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);
