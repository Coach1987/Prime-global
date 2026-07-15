create extension if not exists pgcrypto;

create table if not exists public.shield_evidence_events (
  id uuid primary key default gen_random_uuid(),
  evidence_case_id uuid not null,
  organization_id text not null default 'prime-global',
  tenant_id text,
  actor_auth_user_id uuid,
  actor_role text not null,
  event_type text not null
    check (event_type in (
      'captured',
      'correction',
      'accessed',
      'export_requested',
      'export_authorized',
      'legal_hold_activated',
      'legal_hold_released',
      'chain_verified',
      'staff_decision_recorded',
      'appeal_submitted',
      'appeal_resolved'
    )),
  subject_type text not null,
  subject_id text,
  conversation_id uuid references public.recruitment_conversations(id) on delete set null,
  interview_id uuid references public.recruitment_interviews(id) on delete set null,
  message_id uuid references public.recruitment_messages(id) on delete set null,
  attachment_id uuid references public.recruitment_message_attachments(id) on delete set null,
  payment_reference text,
  contract_reference text,
  detection_source text not null,
  content_hash text not null,
  evidence_hash text not null,
  previous_event_hash text,
  secure_object_ref text,
  redacted_excerpt text,
  normalized_summary text,
  privacy_classification text not null default 'restricted'
    check (privacy_classification in ('public', 'internal', 'restricted', 'confidential', 'prime_global_only', 'legal_hold')),
  jurisdiction_tag text not null default 'unspecified',
  retention_status text not null default 'active'
    check (retention_status in ('active', 'retained', 'scheduled_for_deletion', 'archived', 'expired')),
  legal_hold_state text not null default 'none'
    check (legal_hold_state in ('none', 'active', 'released')),
  export_authorization_state text not null default 'not_requested'
    check (export_authorization_state in ('not_requested', 'requested', 'authorized', 'rejected', 'exported')),
  staff_decision_reference text,
  appeal_reference text,
  appeal_history jsonb not null default '[]'::jsonb,
  override_history jsonb not null default '[]'::jsonb,
  correction_of_event_id uuid references public.shield_evidence_events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists shield_evidence_events_case_idx
  on public.shield_evidence_events (evidence_case_id, created_at asc);

create index if not exists shield_evidence_events_org_idx
  on public.shield_evidence_events (organization_id, tenant_id, created_at desc);

create index if not exists shield_evidence_events_chain_idx
  on public.shield_evidence_events (evidence_case_id, previous_event_hash, evidence_hash);

create index if not exists shield_evidence_events_privacy_idx
  on public.shield_evidence_events (privacy_classification, legal_hold_state, retention_status, created_at desc);

create index if not exists shield_evidence_events_subject_idx
  on public.shield_evidence_events (subject_type, subject_id, created_at desc);

create index if not exists shield_evidence_events_conversation_idx
  on public.shield_evidence_events (conversation_id, created_at desc);

create table if not exists public.shield_evidence_access_audit (
  id uuid primary key default gen_random_uuid(),
  evidence_event_id uuid references public.shield_evidence_events(id) on delete set null,
  evidence_case_id uuid not null,
  actor_auth_user_id uuid,
  actor_role text not null,
  organization_id text not null default 'prime-global',
  tenant_id text,
  access_action text not null,
  access_decision text not null check (access_decision in ('allowed', 'blocked', 'review')),
  reason text not null,
  policy_name text,
  policy_version text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists shield_evidence_access_audit_case_idx
  on public.shield_evidence_access_audit (evidence_case_id, created_at desc);

create index if not exists shield_evidence_access_audit_actor_idx
  on public.shield_evidence_access_audit (actor_auth_user_id, created_at desc);

create index if not exists shield_evidence_access_audit_org_idx
  on public.shield_evidence_access_audit (organization_id, tenant_id, created_at desc);

create or replace function public.shield_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.shield_evidence_append_only_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'shield_evidence_events are append-only; create a correction event instead';
end;
$$;

create or replace function public.shield_is_prime_staff()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin');
$$;

drop trigger if exists trg_shield_evidence_events_updated_at on public.shield_evidence_events;
create trigger trg_shield_evidence_events_updated_at
before update on public.shield_evidence_events
for each row
execute function public.shield_set_updated_at();

drop trigger if exists trg_shield_evidence_events_append_only_update on public.shield_evidence_events;
create trigger trg_shield_evidence_events_append_only_update
before update on public.shield_evidence_events
for each row
execute function public.shield_evidence_append_only_guard();

drop trigger if exists trg_shield_evidence_events_append_only_delete on public.shield_evidence_events;
create trigger trg_shield_evidence_events_append_only_delete
before delete on public.shield_evidence_events
for each row
execute function public.shield_evidence_append_only_guard();

alter table public.shield_evidence_events enable row level security;
alter table public.shield_evidence_access_audit enable row level security;

drop policy if exists "shield_evidence_events_staff_read" on public.shield_evidence_events;
create policy "shield_evidence_events_staff_read"
on public.shield_evidence_events
for select
to authenticated
using (
  public.shield_is_prime_staff()
  and organization_id = 'prime-global'
);

drop policy if exists "shield_evidence_events_service_insert" on public.shield_evidence_events;
create policy "shield_evidence_events_service_insert"
on public.shield_evidence_events
for insert
to service_role
with check (organization_id = 'prime-global');

drop policy if exists "shield_evidence_access_audit_staff_read" on public.shield_evidence_access_audit;
create policy "shield_evidence_access_audit_staff_read"
on public.shield_evidence_access_audit
for select
to authenticated
using (
  public.shield_is_prime_staff()
  and organization_id = 'prime-global'
);

drop policy if exists "shield_evidence_access_audit_service_insert" on public.shield_evidence_access_audit;
create policy "shield_evidence_access_audit_service_insert"
on public.shield_evidence_access_audit
for insert
to service_role
with check (organization_id = 'prime-global');
