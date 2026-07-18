create table if not exists public.pgems_notification_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  channel_kind text not null check (channel_kind in ('in_app', 'email', 'sms', 'push', 'webhook', 'future')),
  description text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  channel_id uuid not null references public.pgems_notification_channels(id) on delete cascade,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  title_template text not null check (char_length(trim(title_template)) > 0),
  body_template text not null check (char_length(trim(body_template)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  event_type_id uuid references public.pgems_event_types(id) on delete cascade,
  event_category_id uuid references public.pgems_event_categories(id) on delete cascade,
  channel_id uuid not null references public.pgems_notification_channels(id) on delete cascade,
  template_id uuid not null references public.pgems_notification_templates(id) on delete cascade,
  default_priority text not null check (default_priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  recipient_strategy text not null check (recipient_strategy in ('event_metadata', 'fixed', 'broadcast')),
  fixed_recipient_key text,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  recipient_key text not null check (char_length(trim(recipient_key)) between 1 and 160),
  channel_id uuid not null references public.pgems_notification_channels(id) on delete cascade,
  rule_code text,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  mute_until timestamptz,
  quiet_hours jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipient_key, channel_id, rule_code)
);

create table if not exists public.pgems_notification_queues (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pgems_notification_channels(id) on delete cascade,
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  ordering_mode text not null check (ordering_mode in ('fifo', 'priority', 'partitioned')),
  duplicate_window_seconds integer not null default 300 check (duplicate_window_seconds > 0),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_code text not null check (char_length(trim(notification_code)) between 2 and 80),
  recipient_key text not null check (char_length(trim(recipient_key)) between 1 and 160),
  channel_id uuid not null references public.pgems_notification_channels(id) on delete restrict,
  template_id uuid references public.pgems_notification_templates(id) on delete set null,
  queue_id uuid references public.pgems_notification_queues(id) on delete set null,
  source_event_id uuid references public.pgems_events(id) on delete set null,
  source_event_type_id uuid references public.pgems_event_types(id) on delete set null,
  source_event_category_id uuid references public.pgems_event_categories(id) on delete set null,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  priority text not null check (priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  status text not null check (status in ('created', 'queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'read', 'unread', 'archived', 'deleted')),
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  delete_reason text,
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retry_count integer not null default 5 check (max_retry_count >= 0),
  scheduled_at timestamptz,
  available_at timestamptz not null default timezone('utc', now()),
  immutable boolean not null default true check (immutable),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.pgems_notifications(id) on delete cascade,
  channel_id uuid not null references public.pgems_notification_channels(id) on delete restrict,
  target_address text not null check (char_length(trim(target_address)) between 1 and 320),
  status text not null check (status in ('created', 'queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'read', 'unread', 'archived', 'deleted')),
  attempts integer not null default 0 check (attempts >= 0),
  response_metadata jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_retries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.pgems_notifications(id) on delete cascade,
  delivery_id uuid references public.pgems_notification_deliveries(id) on delete set null,
  retry_number integer not null check (retry_number >= 0),
  status text not null check (status in ('created', 'queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'read', 'unread', 'archived', 'deleted')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_history (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.pgems_notifications(id) on delete cascade,
  entry_type text not null check (char_length(trim(entry_type)) between 2 and 80),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_notification_audit (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.pgems_notifications(id) on delete set null,
  action_code text not null check (char_length(trim(action_code)) between 2 and 80),
  actor_type text not null check (actor_type in ('user', 'system', 'service')),
  actor_key text not null check (char_length(trim(actor_key)) between 1 and 160),
  outcome text not null check (outcome in ('success', 'failure', 'manual_review')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_notification_templates_channel_idx on public.pgems_notification_templates (channel_id, locale, is_active);
create index if not exists pgems_notification_rules_event_idx on public.pgems_notification_rules (event_type_id, event_category_id, is_active);
create index if not exists pgems_notification_preferences_lookup_idx on public.pgems_notification_preferences (recipient_key, channel_id, enabled);
create index if not exists pgems_notification_queues_channel_idx on public.pgems_notification_queues (channel_id, ordering_mode);
create index if not exists pgems_notifications_lookup_idx on public.pgems_notifications (recipient_key, status, priority, available_at, created_at);
create index if not exists pgems_notifications_event_idx on public.pgems_notifications (source_event_id, source_event_type_id, source_event_category_id);
create index if not exists pgems_notification_deliveries_notification_idx on public.pgems_notification_deliveries (notification_id, status, next_retry_at);
create index if not exists pgems_notification_retries_notification_idx on public.pgems_notification_retries (notification_id, retry_number, scheduled_at);
create index if not exists pgems_notification_history_notification_idx on public.pgems_notification_history (notification_id, created_at);
create index if not exists pgems_notification_audit_notification_idx on public.pgems_notification_audit (notification_id, created_at);

alter table public.pgems_notification_channels enable row level security;
alter table public.pgems_notification_templates enable row level security;
alter table public.pgems_notification_rules enable row level security;
alter table public.pgems_notification_preferences enable row level security;
alter table public.pgems_notification_queues enable row level security;
alter table public.pgems_notifications enable row level security;
alter table public.pgems_notification_deliveries enable row level security;
alter table public.pgems_notification_retries enable row level security;
alter table public.pgems_notification_history enable row level security;
alter table public.pgems_notification_audit enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_channels;
create policy "pgems_internal_read_write" on public.pgems_notification_channels
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_templates;
create policy "pgems_internal_read_write" on public.pgems_notification_templates
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_rules;
create policy "pgems_internal_read_write" on public.pgems_notification_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_preferences;
create policy "pgems_internal_read_write" on public.pgems_notification_preferences
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_queues;
create policy "pgems_internal_read_write" on public.pgems_notification_queues
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notifications;
create policy "pgems_internal_read_write" on public.pgems_notifications
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_deliveries;
create policy "pgems_internal_read_write" on public.pgems_notification_deliveries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_retries;
create policy "pgems_internal_read_write" on public.pgems_notification_retries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_history;
create policy "pgems_internal_read_write" on public.pgems_notification_history
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_notification_audit;
create policy "pgems_internal_read_write" on public.pgems_notification_audit
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
