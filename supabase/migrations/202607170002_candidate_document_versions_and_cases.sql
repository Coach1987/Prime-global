create extension if not exists pgcrypto;

alter table public.candidate_document_identity_verifications
  add column if not exists verification_provider text,
  add column if not exists verification_model text,
  add column if not exists identity_confidence_score numeric(5, 2)
    check (identity_confidence_score is null or identity_confidence_score between 0 and 100),
  add column if not exists fraud_risk_score numeric(5, 2)
    check (fraud_risk_score is null or fraud_risk_score between 0 and 100),
  add column if not exists fraud_risk_band text
    check (fraud_risk_band is null or fraud_risk_band in ('low', 'review_recommended', 'mandatory_manual_review', 'escalated')),
  add column if not exists high_fraud_override_applied boolean not null default false,
  add column if not exists identity_reasoning_summary text,
  add column if not exists fraud_reasoning_summary text,
  add column if not exists detected_fraud_signals jsonb not null default '[]'::jsonb,
  add column if not exists strong_evidence_signals jsonb not null default '[]'::jsonb,
  add column if not exists extracted_verification_references jsonb not null default '{}'::jsonb,
  add column if not exists has_external_verification_reference boolean not null default false,
  add column if not exists external_verification_status text not null default 'not_available'
    check (external_verification_status in ('not_available', 'detected', 'pending', 'verified', 'failed', 'unsafe'));

create index if not exists candidate_document_identity_verifications_provider_idx
  on public.candidate_document_identity_verifications (verification_provider, created_at desc);

create index if not exists candidate_document_identity_verifications_fraud_idx
  on public.candidate_document_identity_verifications (fraud_risk_score desc, created_at desc);

alter table public.candidate_private_profiles
  add column if not exists fraud_risk_score numeric(5, 2)
    check (fraud_risk_score is null or fraud_risk_score between 0 and 100),
  add column if not exists fraud_risk_band text
    check (fraud_risk_band is null or fraud_risk_band in ('low', 'review_recommended', 'mandatory_manual_review', 'escalated')),
  add column if not exists external_verification_status text
    check (external_verification_status is null or external_verification_status in ('not_available', 'detected', 'pending', 'verified', 'failed', 'unsafe'));

create table if not exists public.candidate_document_versions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_private_profiles(candidate_id) on delete cascade,
  document_type text not null
    check (document_type in ('cv', 'diploma', 'certificate', 'supporting_document', 'additional_evidence')),
  version_number integer not null check (version_number > 0),
  original_filename text not null,
  storage_path text not null,
  source_bucket text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  content_hash text not null,
  uploaded_by_auth_user_id uuid,
  verification_id uuid references public.candidate_document_identity_verifications(id) on delete set null,
  verification_status text not null default 'pending_ai_analysis'
    check (
      verification_status in (
        'pending_ai_analysis',
        'auto_approved',
        'pending_manual_review',
        'additional_evidence_requested',
        'replacement_requested',
        'live_verification_required',
        'escalated',
        'verified',
        'rejected',
        'superseded'
      )
    ),
  reviewer_decision text,
  identity_confidence_score numeric(5, 2)
    check (identity_confidence_score is null or identity_confidence_score between 0 and 100),
  fraud_risk_score numeric(5, 2)
    check (fraud_risk_score is null or fraud_risk_score between 0 and 100),
  verification_provider text,
  verification_model text,
  external_verification_status text
    check (external_verification_status is null or external_verification_status in ('not_available', 'detected', 'pending', 'verified', 'failed', 'unsafe')),
  is_active boolean not null default false,
  is_primary boolean not null default false,
  superseded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (candidate_id, document_type, version_number)
);

create index if not exists candidate_document_versions_candidate_idx
  on public.candidate_document_versions (candidate_id, document_type, version_number desc);

create index if not exists candidate_document_versions_hash_idx
  on public.candidate_document_versions (content_hash, created_at desc);

create unique index if not exists candidate_document_versions_single_active_primary_cv_uq
  on public.candidate_document_versions (candidate_id)
  where document_type = 'cv' and is_active = true and is_primary = true;

create table if not exists public.candidate_document_verification_cases (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_private_profiles(candidate_id) on delete cascade,
  document_version_id uuid references public.candidate_document_versions(id) on delete set null,
  verification_id uuid references public.candidate_document_identity_verifications(id) on delete set null,
  status text not null default 'pending_ai_analysis'
    check (
      status in (
        'pending_ai_analysis',
        'auto_approved',
        'pending_manual_review',
        'additional_evidence_requested',
        'replacement_requested',
        'live_verification_required',
        'escalated',
        'verified',
        'rejected',
        'superseded'
      )
    ),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  assigned_reviewer_id uuid,
  assigned_supervisor_id uuid,
  requested_evidence jsonb,
  candidate_message text,
  internal_notes text,
  resolution text,
  escalation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists candidate_document_verification_cases_candidate_idx
  on public.candidate_document_verification_cases (candidate_id, created_at desc);

create index if not exists candidate_document_verification_cases_status_idx
  on public.candidate_document_verification_cases (status, priority, updated_at desc);

create table if not exists public.candidate_document_verification_case_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.candidate_document_verification_cases(id) on delete cascade,
  verification_id uuid references public.candidate_document_identity_verifications(id) on delete set null,
  document_version_id uuid references public.candidate_document_versions(id) on delete set null,
  action text not null
    check (action in ('verified', 'rejected', 'request_new_document', 'schedule_live_verification', 'request_additional_evidence', 'escalate_to_supervisor')),
  actor_auth_user_id uuid not null,
  previous_status text not null,
  new_status text not null,
  note text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_document_verification_case_actions_case_idx
  on public.candidate_document_verification_case_actions (case_id, created_at desc);

create or replace function public.candidate_document_verification_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_candidate_document_versions_updated_at on public.candidate_document_versions;
create trigger trg_candidate_document_versions_updated_at
before update on public.candidate_document_versions
for each row
execute function public.candidate_document_verification_set_updated_at();

drop trigger if exists trg_candidate_document_verification_cases_updated_at on public.candidate_document_verification_cases;
create trigger trg_candidate_document_verification_cases_updated_at
before update on public.candidate_document_verification_cases
for each row
execute function public.candidate_document_verification_set_updated_at();

create or replace function public.candidate_document_verification_append_only_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'candidate document verification records are append-only';
end;
$$;

drop trigger if exists trg_candidate_document_identity_verifications_append_only_update on public.candidate_document_identity_verifications;
create trigger trg_candidate_document_identity_verifications_append_only_update
before update on public.candidate_document_identity_verifications
for each row
execute function public.candidate_document_verification_append_only_guard();

drop trigger if exists trg_candidate_document_identity_verifications_append_only_delete on public.candidate_document_identity_verifications;
create trigger trg_candidate_document_identity_verifications_append_only_delete
before delete on public.candidate_document_identity_verifications
for each row
execute function public.candidate_document_verification_append_only_guard();

create or replace function public.candidate_document_case_actions_append_only_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'candidate document verification case actions are append-only';
end;
$$;

drop trigger if exists trg_candidate_document_case_actions_append_only_update on public.candidate_document_verification_case_actions;
create trigger trg_candidate_document_case_actions_append_only_update
before update on public.candidate_document_verification_case_actions
for each row
execute function public.candidate_document_case_actions_append_only_guard();

drop trigger if exists trg_candidate_document_case_actions_append_only_delete on public.candidate_document_verification_case_actions;
create trigger trg_candidate_document_case_actions_append_only_delete
before delete on public.candidate_document_verification_case_actions
for each row
execute function public.candidate_document_case_actions_append_only_guard();

alter table public.candidate_document_versions enable row level security;
alter table public.candidate_document_verification_cases enable row level security;
alter table public.candidate_document_verification_case_actions enable row level security;

drop policy if exists "candidate_document_versions_owner_staff_select" on public.candidate_document_versions;
create policy "candidate_document_versions_owner_staff_select"
on public.candidate_document_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_document_versions_staff_write" on public.candidate_document_versions;
create policy "candidate_document_versions_staff_write"
on public.candidate_document_versions
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_document_verification_cases_owner_staff_select" on public.candidate_document_verification_cases;
create policy "candidate_document_verification_cases_owner_staff_select"
on public.candidate_document_verification_cases
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_document_verification_cases_staff_write" on public.candidate_document_verification_cases;
create policy "candidate_document_verification_cases_staff_write"
on public.candidate_document_verification_cases
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_document_verification_case_actions_owner_staff_select" on public.candidate_document_verification_case_actions;
create policy "candidate_document_verification_case_actions_owner_staff_select"
on public.candidate_document_verification_case_actions
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_document_verification_cases c
    join public.candidate_profiles cp on cp.id = c.candidate_id
    where c.id = case_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_document_verification_case_actions_staff_insert" on public.candidate_document_verification_case_actions;
create policy "candidate_document_verification_case_actions_staff_insert"
on public.candidate_document_verification_case_actions
for insert
to authenticated
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);
