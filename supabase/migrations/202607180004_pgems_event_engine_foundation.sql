create table if not exists public.pgems_event_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.pgems_event_categories(id) on delete cascade,
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  kind text not null check (kind in ('domain', 'system', 'business')),
  payload_schema jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  routing_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_publishers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  publisher_type text not null check (publisher_type in ('service', 'module', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_subscribers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  subscriber_type text not null check (subscriber_type in ('service', 'module', 'system', 'external')),
  target text not null check (target in ('workflow_engine', 'notification_engine', 'dashboard_engine', 'ai_engine', 'analytics_engine', 'audit_engine', 'email', 'sms', 'push', 'webhook', 'external_integration')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_queues (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.pgems_event_channels(id) on delete cascade,
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  ordering_mode text not null check (ordering_mode in ('fifo', 'priority', 'partitioned')),
  duplicate_window_seconds integer not null default 300 check (duplicate_window_seconds > 0),
  metadata jsonb not null default '{}'::jsonb,
  dead_letter_queue_id uuid references public.pgems_event_queues(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_handlers (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.pgems_event_subscribers(id) on delete cascade,
  event_type_id uuid not null references public.pgems_event_types(id) on delete cascade,
  channel_id uuid not null references public.pgems_event_channels(id) on delete cascade,
  queue_id uuid not null references public.pgems_event_queues(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  retry_limit integer not null default 5 check (retry_limit >= 0),
  retry_backoff_seconds integer not null default 30 check (retry_backoff_seconds > 0),
  idempotent boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subscriber_id, event_type_id, code)
);

create table if not exists public.pgems_event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.pgems_event_subscribers(id) on delete cascade,
  event_type_id uuid references public.pgems_event_types(id) on delete cascade,
  category_id uuid references public.pgems_event_categories(id) on delete cascade,
  channel_id uuid references public.pgems_event_channels(id) on delete cascade,
  priority_filter text[] not null default '{}',
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  branch_code text,
  country_code text,
  workflow_ref text,
  routing_rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_events (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.pgems_event_types(id) on delete restrict,
  category_id uuid not null references public.pgems_event_categories(id) on delete restrict,
  channel_id uuid not null references public.pgems_event_channels(id) on delete restrict,
  publisher_id uuid not null references public.pgems_event_publishers(id) on delete restrict,
  queue_id uuid not null references public.pgems_event_queues(id) on delete restrict,
  kind text not null check (kind in ('domain', 'system', 'business')),
  status text not null check (status in ('created', 'queued', 'processing', 'delivered', 'failed', 'cancelled', 'retried', 'archived')),
  priority text not null check (priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  branch_code text,
  country_code text,
  workflow_ref text,
  correlation_id text not null,
  trace_id text not null,
  idempotency_key text not null,
  ordering_key text,
  sequence_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0 check (retry_count >= 0),
  max_retry_count integer not null default 5 check (max_retry_count >= 0),
  scheduled_at timestamptz,
  delayed_until timestamptz,
  next_retry_at timestamptz,
  available_at timestamptz not null default timezone('utc', now()),
  dead_lettered_at timestamptz,
  immutable boolean not null default true check (immutable),
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create table if not exists public.pgems_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pgems_events(id) on delete cascade,
  subscriber_id uuid not null references public.pgems_event_subscribers(id) on delete cascade,
  handler_id uuid references public.pgems_event_handlers(id) on delete set null,
  target text not null check (target in ('workflow_engine', 'notification_engine', 'dashboard_engine', 'ai_engine', 'analytics_engine', 'audit_engine', 'email', 'sms', 'push', 'webhook', 'external_integration')),
  status text not null check (status in ('created', 'queued', 'processing', 'delivered', 'failed', 'cancelled', 'retried', 'archived')),
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

create table if not exists public.pgems_event_retries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pgems_events(id) on delete cascade,
  delivery_id uuid references public.pgems_event_deliveries(id) on delete set null,
  retry_number integer not null check (retry_number >= 0),
  status text not null check (status in ('created', 'queued', 'processing', 'delivered', 'failed', 'cancelled', 'retried', 'archived')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_event_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pgems_events(id) on delete cascade,
  delivery_id uuid references public.pgems_event_deliveries(id) on delete set null,
  log_type text not null check (char_length(trim(log_type)) between 2 and 80),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_event_types_category_idx on public.pgems_event_types (category_id, created_at);
create index if not exists pgems_event_queues_channel_idx on public.pgems_event_queues (channel_id, ordering_mode);
create index if not exists pgems_event_handlers_lookup_idx on public.pgems_event_handlers (subscriber_id, event_type_id, channel_id, queue_id);
create index if not exists pgems_event_subscriptions_lookup_idx on public.pgems_event_subscriptions (subscriber_id, event_type_id, category_id, channel_id);
create index if not exists pgems_events_lifecycle_idx on public.pgems_events (status, priority, available_at, created_at);
create index if not exists pgems_events_routing_idx on public.pgems_events (organization_id, branch_code, country_code, workflow_ref);
create index if not exists pgems_events_trace_idx on public.pgems_events (correlation_id, trace_id);
create index if not exists pgems_event_deliveries_event_idx on public.pgems_event_deliveries (event_id, status, next_retry_at);
create index if not exists pgems_event_retries_event_idx on public.pgems_event_retries (event_id, retry_number, scheduled_at);
create index if not exists pgems_event_logs_event_idx on public.pgems_event_logs (event_id, created_at);

alter table public.pgems_event_categories enable row level security;
alter table public.pgems_event_types enable row level security;
alter table public.pgems_event_channels enable row level security;
alter table public.pgems_event_publishers enable row level security;
alter table public.pgems_event_subscribers enable row level security;
alter table public.pgems_event_queues enable row level security;
alter table public.pgems_event_handlers enable row level security;
alter table public.pgems_event_subscriptions enable row level security;
alter table public.pgems_events enable row level security;
alter table public.pgems_event_deliveries enable row level security;
alter table public.pgems_event_retries enable row level security;
alter table public.pgems_event_logs enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_event_categories;
create policy "pgems_internal_read_write" on public.pgems_event_categories
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_types;
create policy "pgems_internal_read_write" on public.pgems_event_types
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_channels;
create policy "pgems_internal_read_write" on public.pgems_event_channels
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_publishers;
create policy "pgems_internal_read_write" on public.pgems_event_publishers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_subscribers;
create policy "pgems_internal_read_write" on public.pgems_event_subscribers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_queues;
create policy "pgems_internal_read_write" on public.pgems_event_queues
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_handlers;
create policy "pgems_internal_read_write" on public.pgems_event_handlers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_subscriptions;
create policy "pgems_internal_read_write" on public.pgems_event_subscriptions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_events;
create policy "pgems_internal_read_write" on public.pgems_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_deliveries;
create policy "pgems_internal_read_write" on public.pgems_event_deliveries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_retries;
create policy "pgems_internal_read_write" on public.pgems_event_retries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_event_logs;
create policy "pgems_internal_read_write" on public.pgems_event_logs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
