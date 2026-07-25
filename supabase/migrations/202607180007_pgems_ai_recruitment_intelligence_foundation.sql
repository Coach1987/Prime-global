create table if not exists public.pgems_ai_candidate_document_analyses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  document_type text not null check (document_type in ('cv_resume', 'diploma', 'certificate', 'training_certificate', 'language_certificate', 'identity_document', 'portfolio', 'future')),
  storage_path text not null check (char_length(trim(storage_path)) between 1 and 300),
  document_hash text not null check (char_length(trim(document_hash)) between 1 and 200),
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  analysis_summary text not null default '',
  extracted_payload jsonb not null default '{}'::jsonb,
  immutable boolean not null default true check (immutable),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (candidate_id, document_hash)
);

create table if not exists public.pgems_ai_candidate_professional_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  headline text,
  summary text not null default '',
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  source_document_analysis_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_skill_taxonomy (
  id uuid primary key default gen_random_uuid(),
  canonical_code text not null unique check (char_length(trim(canonical_code)) between 2 and 80),
  canonical_name text not null check (char_length(trim(canonical_name)) between 2 and 160),
  category text not null check (char_length(trim(category)) between 1 and 120),
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  normalized_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_skill_aliases (
  id uuid primary key default gen_random_uuid(),
  taxonomy_id uuid not null references public.pgems_ai_candidate_skill_taxonomy(id) on delete cascade,
  alias_text text not null check (char_length(trim(alias_text)) between 1 and 160),
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  normalized_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (taxonomy_id, normalized_key, locale)
);

create table if not exists public.pgems_ai_candidate_skill_extractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  raw_skill text not null check (char_length(trim(raw_skill)) between 1 and 160),
  normalized_taxonomy_id uuid references public.pgems_ai_candidate_skill_taxonomy(id) on delete set null,
  normalized_skill_name text not null check (char_length(trim(normalized_skill_name)) between 1 and 160),
  proficiency_level text not null check (proficiency_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  extraction_source text not null check (char_length(trim(extraction_source)) between 1 and 120),
  document_reference text not null check (char_length(trim(document_reference)) between 1 and 200),
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  extraction_timestamp timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_experience_extractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  role_title text not null check (char_length(trim(role_title)) between 1 and 200),
  organization_name text not null check (char_length(trim(organization_name)) between 1 and 200),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text not null default '',
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  extraction_source text not null check (char_length(trim(extraction_source)) between 1 and 120),
  document_reference text not null check (char_length(trim(document_reference)) between 1 and 200),
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  extraction_timestamp timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_education_extractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  institution_name text not null check (char_length(trim(institution_name)) between 1 and 200),
  degree_title text not null check (char_length(trim(degree_title)) between 1 and 200),
  field_of_study text,
  start_date date,
  end_date date,
  grade text,
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  extraction_source text not null check (char_length(trim(extraction_source)) between 1 and 120),
  document_reference text not null check (char_length(trim(document_reference)) between 1 and 200),
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  extraction_timestamp timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_certification_extractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  certification_name text not null check (char_length(trim(certification_name)) between 1 and 200),
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_id text,
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  extraction_source text not null check (char_length(trim(extraction_source)) between 1 and 120),
  document_reference text not null check (char_length(trim(document_reference)) between 1 and 200),
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  extraction_timestamp timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_language_extractions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  language_name text not null check (char_length(trim(language_name)) between 1 and 120),
  normalized_code text,
  proficiency_level text not null check (proficiency_level in ('basic', 'conversational', 'professional', 'native')),
  confidence_score numeric(5,4) not null check (confidence_score >= 0 and confidence_score <= 1),
  extraction_source text not null check (char_length(trim(extraction_source)) between 1 and 120),
  document_reference text not null check (char_length(trim(document_reference)) between 1 and 200),
  ai_model_used text not null check (char_length(trim(ai_model_used)) between 1 and 120),
  extraction_timestamp timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  entry_type text not null check (entry_type in ('experience', 'education', 'certification', 'language', 'skill', 'milestone')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '',
  start_date date,
  end_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_confidence_scores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  overall_confidence numeric(5,4) not null check (overall_confidence >= 0 and overall_confidence <= 1),
  skills_confidence numeric(5,4) not null default 0 check (skills_confidence >= 0 and skills_confidence <= 1),
  experience_confidence numeric(5,4) not null default 0 check (experience_confidence >= 0 and experience_confidence <= 1),
  education_confidence numeric(5,4) not null default 0 check (education_confidence >= 0 and education_confidence <= 1),
  certification_confidence numeric(5,4) not null default 0 check (certification_confidence >= 0 and certification_confidence <= 1),
  language_confidence numeric(5,4) not null default 0 check (language_confidence >= 0 and language_confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_review_statuses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  status text not null check (status in ('pending_review', 'approved_by_staff', 'rejected_by_staff', 'needs_manual_review')),
  reviewer_staff_id uuid,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_recommendations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  candidate_id uuid not null,
  recommendation text not null check (recommendation in ('advisory_fit', 'advisory_partial_fit', 'advisory_low_confidence', 'advisory_needs_manual_review')),
  recommendation_summary text not null default '',
  advisory_only boolean not null default true check (advisory_only),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_ai_candidate_document_analyses_candidate_idx on public.pgems_ai_candidate_document_analyses (candidate_id, document_type, created_at);
create index if not exists pgems_ai_candidate_profiles_candidate_idx on public.pgems_ai_candidate_professional_profiles (candidate_id, created_at);
create index if not exists pgems_ai_skill_taxonomy_norm_idx on public.pgems_ai_candidate_skill_taxonomy (normalized_key, is_active);
create index if not exists pgems_ai_skill_aliases_norm_idx on public.pgems_ai_candidate_skill_aliases (normalized_key, locale, is_active);
create index if not exists pgems_ai_skill_extractions_profile_idx on public.pgems_ai_candidate_skill_extractions (profile_id, candidate_id, confidence_score);
create index if not exists pgems_ai_experience_extractions_profile_idx on public.pgems_ai_candidate_experience_extractions (profile_id, candidate_id, confidence_score);
create index if not exists pgems_ai_education_extractions_profile_idx on public.pgems_ai_candidate_education_extractions (profile_id, candidate_id, confidence_score);
create index if not exists pgems_ai_certification_extractions_profile_idx on public.pgems_ai_candidate_certification_extractions (profile_id, candidate_id, confidence_score);
create index if not exists pgems_ai_language_extractions_profile_idx on public.pgems_ai_candidate_language_extractions (profile_id, candidate_id, confidence_score);
create index if not exists pgems_ai_timeline_entries_profile_idx on public.pgems_ai_candidate_timeline_entries (profile_id, candidate_id, start_date, end_date);
create index if not exists pgems_ai_confidence_scores_profile_idx on public.pgems_ai_candidate_confidence_scores (profile_id, candidate_id, overall_confidence);
create index if not exists pgems_ai_review_statuses_profile_idx on public.pgems_ai_candidate_review_statuses (profile_id, candidate_id, status, updated_at);
create index if not exists pgems_ai_recommendations_profile_idx on public.pgems_ai_candidate_recommendations (profile_id, candidate_id, recommendation, created_at);

alter table public.pgems_ai_candidate_document_analyses enable row level security;
alter table public.pgems_ai_candidate_professional_profiles enable row level security;
alter table public.pgems_ai_candidate_skill_taxonomy enable row level security;
alter table public.pgems_ai_candidate_skill_aliases enable row level security;
alter table public.pgems_ai_candidate_skill_extractions enable row level security;
alter table public.pgems_ai_candidate_experience_extractions enable row level security;
alter table public.pgems_ai_candidate_education_extractions enable row level security;
alter table public.pgems_ai_candidate_certification_extractions enable row level security;
alter table public.pgems_ai_candidate_language_extractions enable row level security;
alter table public.pgems_ai_candidate_timeline_entries enable row level security;
alter table public.pgems_ai_candidate_confidence_scores enable row level security;
alter table public.pgems_ai_candidate_review_statuses enable row level security;
alter table public.pgems_ai_candidate_recommendations enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_document_analyses;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_document_analyses
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_professional_profiles;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_professional_profiles
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_skill_taxonomy;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_skill_taxonomy
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_skill_aliases;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_skill_aliases
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_skill_extractions;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_skill_extractions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_experience_extractions;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_experience_extractions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_education_extractions;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_education_extractions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_certification_extractions;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_certification_extractions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_language_extractions;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_language_extractions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_timeline_entries;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_timeline_entries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_confidence_scores;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_confidence_scores
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_review_statuses;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_review_statuses
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_recommendations;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_recommendations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
