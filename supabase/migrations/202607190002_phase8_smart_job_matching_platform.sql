create table if not exists public.pgems_ai_smart_job_matches (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  job_id uuid not null,
  job_payload jsonb not null default '{}'::jsonb,
  overall_match_score numeric(5,2) not null check (overall_match_score >= 0 and overall_match_score <= 100),
  skills_score numeric(5,2) not null check (skills_score >= 0 and skills_score <= 100),
  experience_score numeric(5,2) not null check (experience_score >= 0 and experience_score <= 100),
  education_score numeric(5,2) not null check (education_score >= 0 and education_score <= 100),
  certification_score numeric(5,2) not null check (certification_score >= 0 and certification_score <= 100),
  language_score numeric(5,2) not null check (language_score >= 0 and language_score <= 100),
  location_score numeric(5,2) not null check (location_score >= 0 and location_score <= 100),
  availability_score numeric(5,2) not null check (availability_score >= 0 and availability_score <= 100),
  confidence_score numeric(5,2) not null check (confidence_score >= 0 and confidence_score <= 100),
  match_category text not null check (match_category in ('excellent_match', 'strong_match', 'good_match', 'possible_match', 'weak_match', 'no_match')),
  score_explanations jsonb not null default '{}'::jsonb,
  why_candidate_matches text[] not null default '{}',
  missing_skills text[] not null default '{}',
  missing_experience text[] not null default '{}',
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  recommended_improvements text[] not null default '{}',
  evidence jsonb not null default '[]'::jsonb,
  source_fields text[] not null default '{}',
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  matching_timestamp timestamptz not null,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved_by_staff', 'rejected_by_staff', 'needs_manual_review')),
  reviewer_staff_id uuid,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_smart_job_match_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pgems_ai_smart_job_matches(id) on delete cascade,
  candidate_id uuid not null,
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  job_id uuid not null,
  status text not null check (status in ('pending_review', 'approved_by_staff', 'rejected_by_staff', 'needs_manual_review')),
  reviewer_staff_id uuid,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_ai_smart_job_matches_candidate_idx
  on public.pgems_ai_smart_job_matches (candidate_id, review_status, overall_match_score desc, created_at desc);
create index if not exists pgems_ai_smart_job_matches_job_idx
  on public.pgems_ai_smart_job_matches (job_id, match_category, confidence_score desc, created_at desc);
create index if not exists pgems_ai_smart_job_matches_canonical_idx
  on public.pgems_ai_smart_job_matches (canonical_profile_id, matching_timestamp desc);
create index if not exists pgems_ai_smart_job_match_reviews_match_idx
  on public.pgems_ai_smart_job_match_reviews (match_id, created_at desc);

alter table public.pgems_ai_smart_job_matches enable row level security;
alter table public.pgems_ai_smart_job_match_reviews enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_smart_job_matches;
create policy "pgems_internal_read_write" on public.pgems_ai_smart_job_matches
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_smart_job_match_reviews;
create policy "pgems_internal_read_write" on public.pgems_ai_smart_job_match_reviews
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
