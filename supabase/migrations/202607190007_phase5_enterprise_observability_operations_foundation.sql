create table if not exists public.pgems_ops_monitoring_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  check_code text not null,
  scope text not null check (scope in ('system', 'application', 'database', 'api', 'queue', 'job', 'worker')),
  target_ref text not null,
  status text not null check (status in ('healthy', 'degraded', 'critical', 'unknown')),
  latency_ms numeric(12,2),
  error_rate numeric(8,4) not null default 0,
  availability_percent numeric(8,4) not null default 100,
  details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, check_code, target_ref)
);

create table if not exists public.pgems_ops_log_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  domain text not null check (domain in ('security', 'financial', 'communication', 'ai', 'audit', 'application', 'operations')),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  message text not null,
  correlation_id text not null,
  trace_id text,
  actor_ref text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_metric_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  metric_code text not null,
  metric_domain text not null check (metric_domain in ('business', 'technical', 'performance', 'financial', 'security', 'ai', 'usage')),
  value numeric not null,
  unit text,
  tags jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_trace_spans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  trace_id text not null,
  span_id text not null,
  parent_span_id text,
  correlation_id text,
  service_name text not null,
  operation_name text not null,
  status text not null check (status in ('ok', 'error')),
  latency_ms numeric(12,2) not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  attributes jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, trace_id, span_id)
);

create table if not exists public.pgems_ops_health_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  dependency_type text not null check (dependency_type in ('application', 'database', 'queue', 'storage', 'ai_provider', 'external_service', 'internal_service')),
  dependency_ref text not null,
  status text not null check (status in ('healthy', 'degraded', 'critical', 'unknown')),
  response_time_ms numeric(12,2),
  message text,
  details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  incident_code text not null,
  title text not null,
  severity text not null check (severity in ('sev0', 'sev1', 'sev2', 'sev3', 'sev4')),
  status text not null check (status in ('open', 'investigating', 'mitigating', 'resolved', 'postmortem', 'closed')),
  impacted_services jsonb not null default '[]'::jsonb,
  detected_at timestamptz not null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  owner_team text,
  escalation_policy_ref text,
  details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, incident_code)
);

create table if not exists public.pgems_ops_incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.pgems_ops_incidents(id) on delete cascade,
  event_type text not null,
  message text not null,
  actor_auth_user_id uuid,
  actor_role text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  flag_key text not null,
  description text,
  scope text not null check (scope in ('global', 'country', 'department', 'beta')),
  country_code text,
  department_id uuid references public.pgems_departments(id) on delete set null,
  rollout_percent numeric(5,2) not null default 100 check (rollout_percent between 0 and 100),
  enabled boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, flag_key, scope, coalesce(country_code, ''), coalesce(department_id::text, ''))
);

create table if not exists public.pgems_ops_config_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  config_code text not null,
  scope text not null check (scope in ('global', 'region', 'country', 'department', 'service')),
  scope_ref text,
  version_number integer not null check (version_number >= 1),
  runtime_config jsonb not null default '{}'::jsonb,
  secrets_refs jsonb not null default '{}'::jsonb,
  safe_mode boolean not null default true,
  status text not null check (status in ('draft', 'active', 'deprecated', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, config_code, scope, coalesce(scope_ref, ''), version_number)
);

create table if not exists public.pgems_ops_backup_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  policy_code text not null,
  resource_type text not null check (resource_type in ('database', 'storage', 'logs', 'metrics', 'config', 'events')),
  schedule_cron text not null,
  retention_days integer not null check (retention_days between 1 and 3650),
  backup_tier text not null check (backup_tier in ('hot', 'warm', 'cold')),
  encrypted boolean not null default true,
  rpo_minutes integer not null check (rpo_minutes between 1 and 10080),
  rto_minutes integer not null check (rto_minutes between 1 and 10080),
  dr_plan_ref text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, policy_code)
);

create table if not exists public.pgems_ops_restore_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  policy_id uuid not null references public.pgems_ops_backup_policies(id) on delete cascade,
  restore_ref text not null,
  status text not null check (status in ('queued', 'running', 'failed', 'completed', 'cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  outcome jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_performance_baselines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  service_name text not null,
  endpoint_ref text,
  p50_ms numeric(12,2),
  p95_ms numeric(12,2),
  p99_ms numeric(12,2),
  error_rate_target numeric(8,4),
  cpu_percent_target numeric(8,4),
  memory_percent_target numeric(8,4),
  throughput_target numeric(14,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ops_reliability_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  objective_code text not null,
  objective_kind text not null check (objective_kind in ('sla', 'slo', 'error_budget', 'availability')),
  service_name text not null,
  target_value numeric(8,4) not null,
  window_minutes integer not null,
  warning_threshold numeric(8,4),
  critical_threshold numeric(8,4),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, objective_code)
);

create table if not exists public.pgems_ops_security_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  alert_code text not null,
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  title text not null,
  signal_type text not null check (signal_type in ('threat_detection', 'suspicious_activity', 'compliance_event', 'policy_violation', 'anomaly')),
  status text not null check (status in ('open', 'investigating', 'mitigated', 'false_positive', 'closed')),
  source_ref text,
  correlation_id text,
  trace_id text,
  details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, alert_code)
);

create table if not exists public.pgems_ops_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  source_domain text not null,
  source_reference text,
  actor_auth_user_id uuid,
  actor_role text,
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  correlation_id text,
  trace_id text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create or replace function public.pgems_record_observability_event(
  p_organization_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_source_domain text,
  p_source_reference text,
  p_actor_auth_user_id uuid,
  p_actor_role text,
  p_severity text,
  p_correlation_id text,
  p_trace_id text,
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
  insert into public.pgems_ops_events (
    organization_id,
    event_type,
    aggregate_type,
    aggregate_id,
    source_domain,
    source_reference,
    actor_auth_user_id,
    actor_role,
    severity,
    correlation_id,
    trace_id,
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
    p_severity,
    p_correlation_id,
    p_trace_id,
    p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, timezone('utc', now()))
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.pgems_prevent_ops_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pgems_ops_events is immutable';
end;
$$;

drop trigger if exists pgems_ops_events_no_update on public.pgems_ops_events;
create trigger pgems_ops_events_no_update
before update on public.pgems_ops_events
for each row execute function public.pgems_prevent_ops_event_mutation();

drop trigger if exists pgems_ops_events_no_delete on public.pgems_ops_events;
create trigger pgems_ops_events_no_delete
before delete on public.pgems_ops_events
for each row execute function public.pgems_prevent_ops_event_mutation();

create index if not exists pgems_ops_checks_org_idx on public.pgems_ops_monitoring_checks (organization_id, scope, status, updated_at desc);
create index if not exists pgems_ops_logs_org_idx on public.pgems_ops_log_entries (organization_id, domain, level, created_at desc);
create index if not exists pgems_ops_metrics_org_idx on public.pgems_ops_metric_points (organization_id, metric_domain, observed_at desc);
create index if not exists pgems_ops_traces_org_idx on public.pgems_ops_trace_spans (organization_id, trace_id, service_name, started_at desc);
create index if not exists pgems_ops_health_org_idx on public.pgems_ops_health_checks (organization_id, dependency_type, status, updated_at desc);
create index if not exists pgems_ops_incidents_org_idx on public.pgems_ops_incidents (organization_id, severity, status, updated_at desc);
create index if not exists pgems_ops_flags_org_idx on public.pgems_ops_feature_flags (organization_id, scope, enabled, flag_key);
create index if not exists pgems_ops_config_org_idx on public.pgems_ops_config_profiles (organization_id, config_code, scope, status, version_number desc);
create index if not exists pgems_ops_backup_org_idx on public.pgems_ops_backup_policies (organization_id, resource_type, is_active, rpo_minutes, rto_minutes);
create index if not exists pgems_ops_perf_org_idx on public.pgems_ops_performance_baselines (organization_id, service_name, updated_at desc);
create index if not exists pgems_ops_rel_org_idx on public.pgems_ops_reliability_objectives (organization_id, objective_kind, is_active, target_value);
create index if not exists pgems_ops_secalerts_org_idx on public.pgems_ops_security_alerts (organization_id, severity, status, updated_at desc);
create index if not exists pgems_ops_events_org_idx on public.pgems_ops_events (organization_id, occurred_at desc, severity);

alter table public.pgems_ops_monitoring_checks enable row level security;
alter table public.pgems_ops_log_entries enable row level security;
alter table public.pgems_ops_metric_points enable row level security;
alter table public.pgems_ops_trace_spans enable row level security;
alter table public.pgems_ops_health_checks enable row level security;
alter table public.pgems_ops_incidents enable row level security;
alter table public.pgems_ops_incident_timeline enable row level security;
alter table public.pgems_ops_feature_flags enable row level security;
alter table public.pgems_ops_config_profiles enable row level security;
alter table public.pgems_ops_backup_policies enable row level security;
alter table public.pgems_ops_restore_runs enable row level security;
alter table public.pgems_ops_performance_baselines enable row level security;
alter table public.pgems_ops_reliability_objectives enable row level security;
alter table public.pgems_ops_security_alerts enable row level security;
alter table public.pgems_ops_events enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_monitoring_checks;
create policy "pgems_internal_read_write" on public.pgems_ops_monitoring_checks
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_log_entries;
create policy "pgems_internal_read_write" on public.pgems_ops_log_entries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_metric_points;
create policy "pgems_internal_read_write" on public.pgems_ops_metric_points
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_trace_spans;
create policy "pgems_internal_read_write" on public.pgems_ops_trace_spans
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_health_checks;
create policy "pgems_internal_read_write" on public.pgems_ops_health_checks
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_incidents;
create policy "pgems_internal_read_write" on public.pgems_ops_incidents
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_incident_timeline;
create policy "pgems_internal_read_write" on public.pgems_ops_incident_timeline
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_feature_flags;
create policy "pgems_internal_read_write" on public.pgems_ops_feature_flags
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_config_profiles;
create policy "pgems_internal_read_write" on public.pgems_ops_config_profiles
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_backup_policies;
create policy "pgems_internal_read_write" on public.pgems_ops_backup_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_restore_runs;
create policy "pgems_internal_read_write" on public.pgems_ops_restore_runs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_performance_baselines;
create policy "pgems_internal_read_write" on public.pgems_ops_performance_baselines
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_reliability_objectives;
create policy "pgems_internal_read_write" on public.pgems_ops_reliability_objectives
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_security_alerts;
create policy "pgems_internal_read_write" on public.pgems_ops_security_alerts
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ops_events;
create policy "pgems_internal_read_write" on public.pgems_ops_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
