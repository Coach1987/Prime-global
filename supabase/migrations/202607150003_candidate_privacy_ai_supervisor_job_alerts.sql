create extension if not exists pgcrypto;

create table if not exists public.candidate_private_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid,
  actor_role text,
  attempt_channel text not null check (attempt_channel in ('api', 'ui', 'storage', 'email', 'other')),
  target_type text not null check (target_type in ('original_cv', 'private_document', 'private_profile')),
  target_id text,
  blocked boolean not null default true,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_private_access_audit_created_idx
  on public.candidate_private_access_audit (created_at desc);

create or replace view public.candidate_public_profiles_employer_view as
select
  candidate_id,
  candidate_reference,
  professional_title,
  professional_summary,
  years_of_experience,
  skills,
  employment_history,
  education,
  certifications,
  languages,
  general_location,
  availability,
  desired_role,
  ai_summary,
  case when profile_status = 'approved' then 'verified' else 'pending_review' end as prime_global_verification_status,
  generated_at,
  updated_at
from public.candidate_public_profiles
where profile_status = 'approved';

alter table public.recruitment_conversations
  add column if not exists conversation_mode text
    check (conversation_mode in ('staff_active', 'ai_supervised', 'awaiting_staff', 'closed'))
    default 'staff_active',
  add column if not exists staff_last_active_at timestamptz,
  add column if not exists ai_activated_at timestamptz,
  add column if not exists ai_deactivated_at timestamptz,
  add column if not exists supervisor_sla_minutes integer not null default 30 check (supervisor_sla_minutes between 5 and 1440);

alter table public.recruitment_messages
  add column if not exists actor_type text
    check (actor_type in ('human', 'prime_global_ai', 'system'))
    default 'human',
  add column if not exists ai_task_type text
    check (ai_task_type in ('process_qna', 'candidate_job_summary', 'availability_collection', 'interview_suggestion', 'reminder', 'escalation', 'handover_summary', 'follow_up_task'));

do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'recruitment_messages'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%sender_role%';

  if constraint_name is not null then
    execute format('alter table public.recruitment_messages drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.recruitment_messages
  add constraint recruitment_messages_sender_role_chk
  check (sender_role in ('employer', 'candidate', 'prime_global_staff', 'prime_global_ai', 'system'));

create table if not exists public.recruitment_ai_handover_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  generated_by_auth_user_id uuid,
  unanswered_questions jsonb not null default '[]'::jsonb,
  blocked_contact_attempts jsonb not null default '[]'::jsonb,
  proposed_interview_times jsonb not null default '[]'::jsonb,
  follow_up_tasks jsonb not null default '[]'::jsonb,
  summary_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_ai_handover_summaries_conversation_idx
  on public.recruitment_ai_handover_summaries (conversation_id, created_at desc);

alter table public.recruitment_ai_handover_summaries enable row level security;

drop policy if exists "recruitment_ai_handover_staff_only" on public.recruitment_ai_handover_summaries;
create policy "recruitment_ai_handover_staff_only"
on public.recruitment_ai_handover_summaries
for all
to authenticated
using (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  and public.recruitment_can_access_conversation(conversation_id)
)
with check (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  and public.recruitment_can_access_conversation(conversation_id)
);

create table if not exists public.candidate_job_alert_preferences (
  candidate_id uuid primary key references public.candidate_profiles(id) on delete cascade,
  desired_job_titles text[] not null default '{}',
  related_job_titles text[] not null default '{}',
  skills text[] not null default '{}',
  experience_level text,
  industry text,
  country text,
  city text,
  work_mode_preference text check (work_mode_preference in ('remote', 'hybrid', 'onsite', 'any')) default 'any',
  languages text[] not null default '{}',
  availability text,
  email_notification_frequency text not null default 'instant'
    check (email_notification_frequency in ('instant', 'daily', 'weekly', 'disabled')),
  notification_threshold numeric(5, 2) not null default 70 check (notification_threshold between 0 and 100),
  unsubscribed boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.candidate_job_alert_events (
  id uuid primary key default gen_random_uuid(),
  matched_job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  match_score numeric(5, 2) not null check (match_score between 0 and 100),
  match_reasons jsonb not null default '[]'::jsonb,
  notification_status text not null default 'pending'
    check (notification_status in ('pending', 'sent', 'failed', 'read')),
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'suppressed', 'unsubscribed')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (matched_job_id, candidate_id)
);

create index if not exists candidate_job_alert_events_candidate_idx
  on public.candidate_job_alert_events (candidate_id, created_at desc);

create table if not exists public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  auth_user_id uuid,
  recipient_email text not null,
  template_key text not null,
  provider_name text not null,
  provider_message_id text,
  status text not null
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed')),
  retries integer not null default 0,
  max_retries integer not null default 3,
  next_retry_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_delivery_events_status_idx
  on public.email_delivery_events (status, next_retry_at asc nulls first);

create table if not exists public.email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text not null,
  token text not null unique,
  scope text not null default 'job_alerts' check (scope in ('job_alerts', 'all_marketing')),
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists email_unsubscribe_tokens_email_idx
  on public.email_unsubscribe_tokens (email, scope, expires_at desc);

alter table public.candidate_job_alert_preferences enable row level security;
alter table public.candidate_job_alert_events enable row level security;
alter table public.email_delivery_events enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;

drop policy if exists "candidate_job_alert_preferences_owner_admin" on public.candidate_job_alert_preferences;
create policy "candidate_job_alert_preferences_owner_admin"
on public.candidate_job_alert_preferences
for all
to authenticated
using (
  exists (
    select 1 from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  exists (
    select 1 from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "candidate_job_alert_events_owner_admin" on public.candidate_job_alert_events;
create policy "candidate_job_alert_events_owner_admin"
on public.candidate_job_alert_events
for all
to authenticated
using (
  exists (
    select 1 from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  exists (
    select 1 from public.candidate_profiles cp
    where cp.id = candidate_id and cp.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "email_delivery_events_admin_only" on public.email_delivery_events;
create policy "email_delivery_events_admin_only"
on public.email_delivery_events
for all
to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "email_unsubscribe_tokens_owner_admin" on public.email_unsubscribe_tokens;
create policy "email_unsubscribe_tokens_owner_admin"
on public.email_unsubscribe_tokens
for all
to authenticated
using (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop trigger if exists trg_candidate_job_alert_preferences_updated_at on public.candidate_job_alert_preferences;
create trigger trg_candidate_job_alert_preferences_updated_at
before update on public.candidate_job_alert_preferences
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_email_delivery_events_updated_at on public.email_delivery_events;
create trigger trg_email_delivery_events_updated_at
before update on public.email_delivery_events
for each row
execute function public.set_updated_at_column();
