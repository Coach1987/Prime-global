create extension if not exists pgcrypto;

create table if not exists public.candidate_document_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_private_profiles(candidate_id) on delete cascade,
  source text not null check (source in ('resume_upload', 'private_document_upload', 'manual_review')),
  verification_decision text not null
    check (verification_decision in ('automatic_approval', 'accepted', 'pending_verification', 'rejected')),
  confidence_score numeric(5, 2) not null check (confidence_score between 0 and 100),
  ai_reasoning_summary text not null,
  extracted_identity_fields jsonb not null default '{}'::jsonb,
  candidate_identity_snapshot jsonb not null default '{}'::jsonb,
  document_paths jsonb not null default '[]'::jsonb,
  document_metadata jsonb not null default '[]'::jsonb,
  staff_review_status text not null default 'not_required'
    check (staff_review_status in ('not_required', 'pending', 'approved', 'rejected')),
  reviewed_by_auth_user_id uuid,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_document_identity_verifications_candidate_idx
  on public.candidate_document_identity_verifications (candidate_id, created_at desc);

create index if not exists candidate_document_identity_verifications_decision_idx
  on public.candidate_document_identity_verifications (verification_decision, created_at desc);

alter table public.candidate_private_profiles
  add column if not exists identity_verification_status text not null default 'pending_verification'
    check (identity_verification_status in ('approved', 'pending_verification', 'rejected')),
  add column if not exists identity_verification_confidence numeric(5, 2)
    check (identity_verification_confidence is null or identity_verification_confidence between 0 and 100),
  add column if not exists identity_verification_reasoning text,
  add column if not exists identity_verification_updated_at timestamptz,
  add column if not exists identity_staff_review_status text not null default 'pending'
    check (identity_staff_review_status in ('not_required', 'pending', 'approved', 'rejected')),
  add column if not exists identity_last_verification_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'candidate_private_profiles_identity_last_verification_id_fkey'
      and conrelid = 'public.candidate_private_profiles'::regclass
  ) then
    alter table public.candidate_private_profiles
      add constraint candidate_private_profiles_identity_last_verification_id_fkey
      foreign key (identity_last_verification_id)
      references public.candidate_document_identity_verifications(id)
      on delete set null;
  end if;
end $$;

alter table public.candidate_document_identity_verifications enable row level security;

drop policy if exists "candidate_document_identity_verifications_owner_staff" on public.candidate_document_identity_verifications;
create policy "candidate_document_identity_verifications_owner_staff"
on public.candidate_document_identity_verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_profiles cp
    where cp.id = candidate_id
      and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop policy if exists "candidate_document_identity_verifications_staff_manage" on public.candidate_document_identity_verifications;
create policy "candidate_document_identity_verifications_staff_manage"
on public.candidate_document_identity_verifications
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop trigger if exists trg_candidate_document_identity_verifications_updated_at on public.candidate_document_identity_verifications;
create trigger trg_candidate_document_identity_verifications_updated_at
before update on public.candidate_document_identity_verifications
for each row
execute function public.set_updated_at_column();
