create table if not exists public.pgems_corporate_mail_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  employee_id uuid references public.pgems_employees(id) on delete set null,
  identity_type text not null check (identity_type in ('individual', 'shared', 'department', 'role', 'system')),
  local_part text not null check (char_length(trim(local_part)) between 1 and 120),
  domain text not null check (char_length(trim(domain)) between 3 and 190),
  display_name text not null check (char_length(trim(display_name)) between 2 and 180),
  status text not null check (status in ('active', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, lower(local_part), lower(domain))
);

create table if not exists public.pgems_mailboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  mailbox_code text not null check (char_length(trim(mailbox_code)) between 2 and 80),
  mailbox_type text not null check (mailbox_type in ('shared', 'department', 'role', 'system')),
  name text not null check (char_length(trim(name)) between 2 and 180),
  identity_id uuid not null references public.pgems_corporate_mail_identities(id) on delete cascade,
  department_id uuid references public.pgems_departments(id) on delete set null,
  role_id uuid references public.pgems_roles(id) on delete set null,
  retention_policy_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, mailbox_code)
);

create table if not exists public.pgems_mailbox_members (
  mailbox_id uuid not null references public.pgems_mailboxes(id) on delete cascade,
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  member_role text not null check (member_role in ('owner', 'manager', 'sender', 'viewer', 'auditor')),
  can_send boolean not null default false,
  can_manage boolean not null default false,
  added_by_auth_user_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (mailbox_id, employee_id)
);

create table if not exists public.pgems_communication_retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  channel_scope text not null check (channel_scope in ('email', 'in_app', 'sms', 'whatsapp', 'push', 'all')),
  retention_days integer not null check (retention_days between 1 and 3650),
  legal_hold_supported boolean not null default true,
  auto_archive boolean not null default true,
  auto_delete boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

alter table public.pgems_mailboxes
  add constraint if not exists pgems_mailboxes_retention_policy_fk
  foreign key (retention_policy_id) references public.pgems_communication_retention_policies(id) on delete set null;

create table if not exists public.pgems_communication_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  template_type text not null check (template_type in ('email', 'sms', 'whatsapp', 'notification', 'announcement')),
  category text not null check (char_length(trim(category)) between 2 and 80),
  current_version integer not null default 1,
  status text not null check (status in ('draft', 'in_review', 'approved', 'rejected', 'retired')),
  created_by_auth_user_id uuid,
  approved_by_auth_user_id uuid,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_communication_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pgems_communication_templates(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  approval_status text not null check (approval_status in ('draft', 'in_review', 'approved', 'rejected')),
  change_summary text,
  content jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid,
  approved_by_auth_user_id uuid,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_id, version_number)
);

create table if not exists public.pgems_communication_template_localizations (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.pgems_communication_template_versions(id) on delete cascade,
  locale text not null check (char_length(trim(locale)) between 2 and 16),
  title text,
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  fallback_locale text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_version_id, locale)
);

create table if not exists public.pgems_template_approval_requests (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.pgems_communication_template_versions(id) on delete cascade,
  requested_by_auth_user_id uuid,
  reviewer_role_code text,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_by_auth_user_id uuid,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_internal_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  message_type text not null check (message_type in ('department', 'management', 'employee_announcement', 'system_broadcast')),
  department_id uuid references public.pgems_departments(id) on delete set null,
  sender_employee_id uuid references public.pgems_employees(id) on delete set null,
  sender_role_code text,
  title text not null,
  body text not null,
  sensitivity text not null default 'normal' check (sensitivity in ('normal', 'sensitive', 'restricted')),
  pinned boolean not null default false,
  pinned_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_internal_message_recipients (
  message_id uuid not null references public.pgems_internal_messages(id) on delete cascade,
  recipient_employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  recipient_scope text not null check (recipient_scope in ('direct', 'department', 'organization', 'role')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, recipient_employee_id)
);

create table if not exists public.pgems_internal_message_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.pgems_internal_messages(id) on delete cascade,
  recipient_employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  read_at timestamptz,
  acknowledged_at timestamptz,
  acknowledgement_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (message_id, recipient_employee_id)
);

create table if not exists public.pgems_communication_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  provider_type text not null check (provider_type in ('smtp', 'microsoft_365', 'google_workspace', 'twilio', 'whatsapp_business', 'firebase_push', 'future')),
  channel_type text not null check (channel_type in ('email', 'sms', 'whatsapp', 'push', 'in_app', 'future')),
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_communication_provider_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  provider_id uuid not null references public.pgems_communication_providers(id) on delete cascade,
  mode text not null default 'test' check (mode in ('test', 'live')),
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  is_fallback boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider_id, mode)
);

create table if not exists public.pgems_communication_event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  source_domain text not null check (source_domain in ('recruitment', 'payments', 'billing', 'interviews', 'documents', 'ai', 'security', 'system')),
  source_event_code text not null,
  template_id uuid references public.pgems_communication_templates(id) on delete set null,
  notification_rule_id uuid references public.pgems_notification_rules(id) on delete set null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, source_domain, source_event_code)
);

create table if not exists public.pgems_communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  message_ref text not null,
  channel_type text not null check (channel_type in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  provider_config_id uuid references public.pgems_communication_provider_configs(id) on delete set null,
  recipient_ref text not null,
  status text not null check (status in ('queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  priority text not null check (priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  error_code text,
  error_message text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_communication_retry_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.pgems_communication_deliveries(id) on delete cascade,
  retry_number integer not null,
  reason text,
  status text not null check (status in ('scheduled', 'executed', 'failed', 'cancelled')),
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_communication_compliance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  action_code text not null,
  actor_auth_user_id uuid,
  actor_role text,
  subject_type text,
  subject_id text,
  outcome text not null check (outcome in ('success', 'failure', 'manual_review')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_communication_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  source_domain text not null,
  source_reference text,
  actor_auth_user_id uuid,
  actor_role text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create or replace function public.pgems_record_communication_event(
  p_organization_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_source_domain text,
  p_source_reference text,
  p_actor_auth_user_id uuid,
  p_actor_role text,
  p_idempotency_key text,
  p_payload jsonb,
  p_metadata jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
as $$
declare
  inserted_id uuid;
begin
  insert into public.pgems_communication_events (
    organization_id,
    event_type,
    aggregate_type,
    aggregate_id,
    source_domain,
    source_reference,
    actor_auth_user_id,
    actor_role,
    idempotency_key,
    payload,
    metadata,
    occurred_at
  ) values (
    p_organization_id,
    p_event_type,
    p_aggregate_type,
    p_aggregate_id,
    p_source_domain,
    p_source_reference,
    p_actor_auth_user_id,
    p_actor_role,
    p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, timezone('utc', now()))
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.pgems_prevent_communication_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pgems_communication_events is immutable';
end;
$$;

drop trigger if exists pgems_communication_events_no_update on public.pgems_communication_events;
create trigger pgems_communication_events_no_update
before update on public.pgems_communication_events
for each row execute function public.pgems_prevent_communication_event_mutation();

drop trigger if exists pgems_communication_events_no_delete on public.pgems_communication_events;
create trigger pgems_communication_events_no_delete
before delete on public.pgems_communication_events
for each row execute function public.pgems_prevent_communication_event_mutation();

create index if not exists pgems_mail_identities_org_idx on public.pgems_corporate_mail_identities (organization_id, identity_type, status);
create index if not exists pgems_mailboxes_org_idx on public.pgems_mailboxes (organization_id, mailbox_type, is_active);
create index if not exists pgems_messages_org_idx on public.pgems_internal_messages (organization_id, message_type, created_at desc);
create index if not exists pgems_message_receipts_lookup_idx on public.pgems_internal_message_receipts (message_id, recipient_employee_id);
create index if not exists pgems_comm_delivery_org_idx on public.pgems_communication_deliveries (organization_id, channel_type, status, next_retry_at);
create index if not exists pgems_comm_events_org_idx on public.pgems_communication_events (organization_id, occurred_at desc);

alter table public.pgems_corporate_mail_identities enable row level security;
alter table public.pgems_mailboxes enable row level security;
alter table public.pgems_mailbox_members enable row level security;
alter table public.pgems_communication_retention_policies enable row level security;
alter table public.pgems_communication_templates enable row level security;
alter table public.pgems_communication_template_versions enable row level security;
alter table public.pgems_communication_template_localizations enable row level security;
alter table public.pgems_template_approval_requests enable row level security;
alter table public.pgems_internal_messages enable row level security;
alter table public.pgems_internal_message_recipients enable row level security;
alter table public.pgems_internal_message_receipts enable row level security;
alter table public.pgems_communication_providers enable row level security;
alter table public.pgems_communication_provider_configs enable row level security;
alter table public.pgems_communication_event_subscriptions enable row level security;
alter table public.pgems_communication_deliveries enable row level security;
alter table public.pgems_communication_retry_history enable row level security;
alter table public.pgems_communication_compliance_logs enable row level security;
alter table public.pgems_communication_events enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_corporate_mail_identities;
create policy "pgems_internal_read_write" on public.pgems_corporate_mail_identities
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_mailboxes;
create policy "pgems_internal_read_write" on public.pgems_mailboxes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_mailbox_members;
create policy "pgems_internal_read_write" on public.pgems_mailbox_members
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_retention_policies;
create policy "pgems_internal_read_write" on public.pgems_communication_retention_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_templates;
create policy "pgems_internal_read_write" on public.pgems_communication_templates
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_template_versions;
create policy "pgems_internal_read_write" on public.pgems_communication_template_versions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_template_localizations;
create policy "pgems_internal_read_write" on public.pgems_communication_template_localizations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_template_approval_requests;
create policy "pgems_internal_read_write" on public.pgems_template_approval_requests
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_internal_messages;
create policy "pgems_internal_read_write" on public.pgems_internal_messages
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_internal_message_recipients;
create policy "pgems_internal_read_write" on public.pgems_internal_message_recipients
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_internal_message_receipts;
create policy "pgems_internal_read_write" on public.pgems_internal_message_receipts
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_providers;
create policy "pgems_internal_read_write" on public.pgems_communication_providers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_provider_configs;
create policy "pgems_internal_read_write" on public.pgems_communication_provider_configs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_event_subscriptions;
create policy "pgems_internal_read_write" on public.pgems_communication_event_subscriptions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_deliveries;
create policy "pgems_internal_read_write" on public.pgems_communication_deliveries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_retry_history;
create policy "pgems_internal_read_write" on public.pgems_communication_retry_history
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_compliance_logs;
create policy "pgems_internal_read_write" on public.pgems_communication_compliance_logs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_communication_events;
create policy "pgems_internal_read_write" on public.pgems_communication_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

insert into public.pgems_communication_providers (code, name, provider_type, channel_type, capabilities, is_active)
values
  ('smtp_generic', 'SMTP Generic', 'smtp', 'email', '{"supports": ["email", "attachments", "delivery_status"]}'::jsonb, true),
  ('microsoft_365', 'Microsoft 365', 'microsoft_365', 'email', '{"supports": ["email", "shared_mailboxes"]}'::jsonb, true),
  ('google_workspace', 'Google Workspace', 'google_workspace', 'email', '{"supports": ["email", "shared_mailboxes"]}'::jsonb, true),
  ('twilio_sms', 'Twilio SMS', 'twilio', 'sms', '{"supports": ["sms", "delivery_receipts"]}'::jsonb, true),
  ('whatsapp_business', 'WhatsApp Business', 'whatsapp_business', 'whatsapp', '{"supports": ["whatsapp", "template_messages"]}'::jsonb, true),
  ('firebase_push', 'Firebase Push', 'firebase_push', 'push', '{"supports": ["push", "topic_broadcast"]}'::jsonb, true)
on conflict (code) do update
set
  name = excluded.name,
  provider_type = excluded.provider_type,
  channel_type = excluded.channel_type,
  capabilities = excluded.capabilities,
  is_active = excluded.is_active;
