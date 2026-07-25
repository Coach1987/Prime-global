create table if not exists public.pgems_ai_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  provider_kind text not null check (provider_kind in ('openai', 'anthropic', 'google_gemini', 'azure_openai', 'deepseek', 'local_llm', 'future')),
  region text not null default 'global' check (char_length(trim(region)) between 2 and 80),
  compliance_tags text[] not null default '{}',
  health_score numeric(5,2) not null default 100 check (health_score >= 0 and health_score <= 100),
  supports_streaming boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.pgems_ai_providers(id) on delete cascade,
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  model_family text not null check (char_length(trim(model_family)) between 1 and 80),
  version text not null check (char_length(trim(version)) between 1 and 80),
  context_window integer not null default 8192 check (context_window > 0),
  max_output_tokens integer not null default 1024 check (max_output_tokens > 0),
  latency_tier text not null check (latency_tier in ('low', 'standard', 'high')),
  estimated_cost_input_per_1k numeric(12,6) not null default 0 check (estimated_cost_input_per_1k >= 0),
  estimated_cost_output_per_1k numeric(12,6) not null default 0 check (estimated_cost_output_per_1k >= 0),
  capabilities text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_prompts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  task_type text not null check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.pgems_ai_prompts(id) on delete cascade,
  version_label text not null check (char_length(trim(version_label)) between 1 and 80),
  system_prompt text not null,
  developer_prompt text not null default '',
  user_prompt_template text not null,
  variables text[] not null default '{}',
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  metadata jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (prompt_id, version_label)
);

create table if not exists public.pgems_ai_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  task_type text check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  min_authority_level integer not null default 0 check (min_authority_level >= 0 and min_authority_level <= 100),
  requires_human_review boolean not null default false,
  safety_profile text not null check (safety_profile in ('standard', 'strict', 'sensitive')),
  rate_limit_tier text not null check (rate_limit_tier in ('default', 'elevated', 'critical')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_routing_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  task_type text not null check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  preferred_provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  preferred_model_id uuid references public.pgems_ai_models(id) on delete set null,
  max_latency_ms integer check (max_latency_ms > 0),
  max_estimated_cost numeric(12,6) check (max_estimated_cost >= 0),
  required_region text,
  required_compliance_tags text[] not null default '{}',
  priority text not null check (priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_fallback_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  task_type text not null check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  primary_provider_id uuid not null references public.pgems_ai_providers(id) on delete cascade,
  fallback_provider_id uuid not null references public.pgems_ai_providers(id) on delete cascade,
  fallback_model_id uuid references public.pgems_ai_models(id) on delete set null,
  trigger_reason text not null check (trigger_reason in ('provider_down', 'timeout', 'cost_limit', 'rate_limited', 'safety_block', 'manual')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  task_type text not null check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  prompt_id uuid references public.pgems_ai_prompts(id) on delete set null,
  policy_id uuid references public.pgems_ai_policies(id) on delete set null,
  routing_rule_id uuid references public.pgems_ai_routing_rules(id) on delete set null,
  fallback_rule_id uuid references public.pgems_ai_fallback_rules(id) on delete set null,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.pgems_ai_tasks(id) on delete cascade,
  prompt_version_id uuid references public.pgems_ai_prompt_versions(id) on delete set null,
  provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  model_id uuid references public.pgems_ai_models(id) on delete set null,
  source_event_id uuid references public.pgems_events(id) on delete set null,
  correlation_id text not null,
  trace_id text not null,
  input_payload jsonb not null default '{}'::jsonb,
  input_hash text not null,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  status text not null check (status in ('created', 'routed', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority text not null check (priority in ('low', 'normal', 'high', 'critical', 'emergency')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.pgems_ai_requests(id) on delete cascade,
  provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  model_id uuid references public.pgems_ai_models(id) on delete set null,
  response_payload jsonb not null default '{}'::jsonb,
  output_text text not null default '',
  output_embedding double precision[] not null default '{}',
  token_input integer not null default 0 check (token_input >= 0),
  token_output integer not null default 0 check (token_output >= 0),
  estimated_cost numeric(12,6) not null default 0 check (estimated_cost >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  status text not null check (status in ('success', 'partial', 'failed', 'blocked', 'cached')),
  safety_status text not null check (safety_status in ('pending', 'passed', 'blocked', 'needs_review')),
  cached boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_usage (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.pgems_ai_requests(id) on delete set null,
  response_id uuid references public.pgems_ai_responses(id) on delete set null,
  provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  model_id uuid references public.pgems_ai_models(id) on delete set null,
  task_type text not null check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  usage_date date not null,
  token_input integer not null default 0 check (token_input >= 0),
  token_output integer not null default 0 check (token_output >= 0),
  estimated_cost numeric(12,6) not null default 0 check (estimated_cost >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_cost_tracking (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  model_id uuid references public.pgems_ai_models(id) on delete set null,
  task_type text check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  period_start date not null,
  period_end date not null,
  total_requests integer not null default 0 check (total_requests >= 0),
  total_token_input bigint not null default 0 check (total_token_input >= 0),
  total_token_output bigint not null default 0 check (total_token_output >= 0),
  total_estimated_cost numeric(14,6) not null default 0 check (total_estimated_cost >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  request_hash text not null,
  response_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_telemetry (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.pgems_ai_requests(id) on delete set null,
  response_id uuid references public.pgems_ai_responses(id) on delete set null,
  metric_name text not null check (char_length(trim(metric_name)) between 2 and 80),
  metric_value numeric(20,6) not null,
  metric_unit text not null default 'count' check (char_length(trim(metric_unit)) between 1 and 40),
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.pgems_ai_requests(id) on delete set null,
  response_id uuid references public.pgems_ai_responses(id) on delete set null,
  action_code text not null check (char_length(trim(action_code)) between 2 and 80),
  actor_type text not null check (actor_type in ('user', 'system', 'service')),
  actor_key text not null check (char_length(trim(actor_key)) between 1 and 160),
  outcome text not null check (outcome in ('success', 'failure', 'manual_review')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_safety_checks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.pgems_ai_requests(id) on delete set null,
  response_id uuid references public.pgems_ai_responses(id) on delete set null,
  policy_id uuid references public.pgems_ai_policies(id) on delete set null,
  status text not null check (status in ('pending', 'passed', 'blocked', 'needs_review')),
  risk_score numeric(5,2) not null default 0 check (risk_score >= 0 and risk_score <= 100),
  flags text[] not null default '{}',
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null check (char_length(trim(scope_key)) between 1 and 160),
  task_type text check (task_type in ('classification', 'extraction', 'summarization', 'matching', 'recommendation', 'translation', 'reasoning', 'scoring', 'ranking', 'moderation', 'embeddings', 'custom')),
  provider_id uuid references public.pgems_ai_providers(id) on delete set null,
  window_seconds integer not null default 60 check (window_seconds > 0),
  max_requests integer not null default 60 check (max_requests > 0),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_ai_models_provider_idx on public.pgems_ai_models (provider_id, is_active);
create index if not exists pgems_ai_prompts_task_idx on public.pgems_ai_prompts (task_type, locale, is_active);
create index if not exists pgems_ai_prompt_versions_prompt_idx on public.pgems_ai_prompt_versions (prompt_id, is_default, is_active);
create index if not exists pgems_ai_routing_rules_task_idx on public.pgems_ai_routing_rules (task_type, priority, is_active);
create index if not exists pgems_ai_fallback_rules_task_idx on public.pgems_ai_fallback_rules (task_type, trigger_reason, is_active);
create index if not exists pgems_ai_tasks_task_idx on public.pgems_ai_tasks (task_type, is_active);
create index if not exists pgems_ai_requests_lookup_idx on public.pgems_ai_requests (task_id, status, priority, created_at);
create index if not exists pgems_ai_responses_request_idx on public.pgems_ai_responses (request_id, status, created_at);
create index if not exists pgems_ai_usage_date_idx on public.pgems_ai_usage (usage_date, task_type, provider_id, model_id);
create index if not exists pgems_ai_cost_tracking_period_idx on public.pgems_ai_cost_tracking (period_start, period_end, provider_id, model_id);
create index if not exists pgems_ai_cache_expiry_idx on public.pgems_ai_cache (expires_at);
create index if not exists pgems_ai_telemetry_metric_idx on public.pgems_ai_telemetry (metric_name, created_at);
create index if not exists pgems_ai_audit_action_idx on public.pgems_ai_audit (action_code, outcome, created_at);
create index if not exists pgems_ai_safety_status_idx on public.pgems_ai_safety_checks (status, risk_score, created_at);
create index if not exists pgems_ai_rate_limits_scope_idx on public.pgems_ai_rate_limits (scope_key, task_type, provider_id, is_active);

alter table public.pgems_ai_providers enable row level security;
alter table public.pgems_ai_models enable row level security;
alter table public.pgems_ai_prompts enable row level security;
alter table public.pgems_ai_prompt_versions enable row level security;
alter table public.pgems_ai_policies enable row level security;
alter table public.pgems_ai_routing_rules enable row level security;
alter table public.pgems_ai_fallback_rules enable row level security;
alter table public.pgems_ai_tasks enable row level security;
alter table public.pgems_ai_requests enable row level security;
alter table public.pgems_ai_responses enable row level security;
alter table public.pgems_ai_usage enable row level security;
alter table public.pgems_ai_cost_tracking enable row level security;
alter table public.pgems_ai_cache enable row level security;
alter table public.pgems_ai_telemetry enable row level security;
alter table public.pgems_ai_audit enable row level security;
alter table public.pgems_ai_safety_checks enable row level security;
alter table public.pgems_ai_rate_limits enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_providers;
create policy "pgems_internal_read_write" on public.pgems_ai_providers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_models;
create policy "pgems_internal_read_write" on public.pgems_ai_models
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_prompts;
create policy "pgems_internal_read_write" on public.pgems_ai_prompts
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_prompt_versions;
create policy "pgems_internal_read_write" on public.pgems_ai_prompt_versions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_policies;
create policy "pgems_internal_read_write" on public.pgems_ai_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_routing_rules;
create policy "pgems_internal_read_write" on public.pgems_ai_routing_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_fallback_rules;
create policy "pgems_internal_read_write" on public.pgems_ai_fallback_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_tasks;
create policy "pgems_internal_read_write" on public.pgems_ai_tasks
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_requests;
create policy "pgems_internal_read_write" on public.pgems_ai_requests
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_responses;
create policy "pgems_internal_read_write" on public.pgems_ai_responses
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_usage;
create policy "pgems_internal_read_write" on public.pgems_ai_usage
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_cost_tracking;
create policy "pgems_internal_read_write" on public.pgems_ai_cost_tracking
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_cache;
create policy "pgems_internal_read_write" on public.pgems_ai_cache
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_telemetry;
create policy "pgems_internal_read_write" on public.pgems_ai_telemetry
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_audit;
create policy "pgems_internal_read_write" on public.pgems_ai_audit
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_safety_checks;
create policy "pgems_internal_read_write" on public.pgems_ai_safety_checks
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_rate_limits;
create policy "pgems_internal_read_write" on public.pgems_ai_rate_limits
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
