create table if not exists public.matching_insights_v2 (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('candidate', 'employer')),
  entity_id uuid not null,
  target_id uuid not null,
  compatibility_score numeric(5,2) not null check (compatibility_score >= 0 and compatibility_score <= 100),
  confidence_score numeric(5,2) not null check (confidence_score >= 0 and confidence_score <= 100),
  strengths text[] not null default '{}',
  risks text[] not null default '{}',
  recommendations text[] not null default '{}',
  explanation jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default timezone('utc', now()),
  unique (entity_type, entity_id, target_id)
);

create index if not exists matching_insights_v2_entity_idx
  on public.matching_insights_v2 (entity_type, entity_id, compatibility_score desc, computed_at desc);
create index if not exists matching_insights_v2_target_idx
  on public.matching_insights_v2 (target_id, compatibility_score desc, computed_at desc);

alter table public.matching_insights_v2 enable row level security;

drop policy if exists "matching_insights_v2_visibility" on public.matching_insights_v2;
create policy "matching_insights_v2_visibility"
on public.matching_insights_v2
for select
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  or (entity_type = 'candidate' and exists (select 1 from public.candidate_profiles c where c.id = entity_id and c.auth_user_id = auth.uid()))
  or (entity_type = 'employer' and exists (select 1 from public.employers e where e.id = entity_id and e.auth_user_id = auth.uid()))
);
