create table if not exists public.employer_saved_candidates (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (employer_id, candidate_id)
);

create index if not exists employer_saved_candidates_employer_idx
  on public.employer_saved_candidates (employer_id, created_at desc);

alter table public.employer_saved_candidates enable row level security;

drop policy if exists "employer_saved_candidates_owner_admin" on public.employer_saved_candidates;
create policy "employer_saved_candidates_owner_admin"
on public.employer_saved_candidates
for all
to authenticated
using (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
)
with check (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
);
