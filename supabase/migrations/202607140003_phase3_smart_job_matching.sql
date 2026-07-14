create table if not exists public.candidate_job_match_scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_score numeric(5, 2) not null check (match_score >= 0 and match_score <= 100),
  match_reasons text[] not null default '{}',
  computed_at timestamptz not null default timezone('utc', now()),
  unique (candidate_id, job_id)
);

create index if not exists candidate_job_match_scores_candidate_idx
  on public.candidate_job_match_scores (candidate_id, match_score desc, computed_at desc);
create index if not exists candidate_job_match_scores_job_idx
  on public.candidate_job_match_scores (job_id, match_score desc, computed_at desc);

alter table public.candidate_job_match_scores enable row level security;

drop policy if exists "candidate_match_scores_visibility" on public.candidate_job_match_scores;
create policy "candidate_match_scores_visibility"
on public.candidate_job_match_scores
for select
to authenticated
using (
  exists (
    select 1 from public.candidate_profiles c
    where c.id = candidate_id
    and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
    and e.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "candidate_match_scores_admin_write" on public.candidate_job_match_scores;
create policy "candidate_match_scores_admin_write"
on public.candidate_job_match_scores
for all
to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'));
