create table if not exists public.pgems_enterprise_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_type text not null check (identity_type in ('employee', 'employer', 'candidate', 'partner', 'service_account', 'machine_identity')),
  subject_reference text not null check (char_length(trim(subject_reference)) between 2 and 200),
  auth_user_id uuid,
  email text,
  phone_e164 text,
  display_name text,
  status text not null check (status in ('active', 'suspended', 'locked', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, identity_type, subject_reference)
);

create table if not exists public.pgems_identity_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  provider_kind text not null check (provider_kind in ('oidc', 'oauth2_1', 'saml', 'internal', 'future')),
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_identity_provider_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  provider_id uuid not null references public.pgems_identity_providers(id) on delete cascade,
  issuer text,
  audience text,
  client_id text,
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider_id)
);

create table if not exists public.pgems_identity_auth_methods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  auth_method text not null check (auth_method in ('password', 'oauth', 'oidc', 'magic_link', 'passkey', 'api_key')),
  provider_code text,
  subject text,
  status text not null check (status in ('active', 'disabled', 'compromised')),
  passwordless_ready boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_identity_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  factor_type text not null check (factor_type in ('totp', 'sms', 'email_otp', 'backup_code')),
  label text,
  phone_e164 text,
  email text,
  secret_ref text,
  status text not null check (status in ('active', 'pending', 'disabled', 'revoked')),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_identity_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  code_hash text not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (identity_id, code_hash)
);

create table if not exists public.pgems_identity_passkeys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  credential_id text not null,
  public_key text not null,
  aaguid text,
  attestation_format text,
  transports jsonb not null default '[]'::jsonb,
  sign_count bigint not null default 0,
  device_bound boolean not null default true,
  status text not null check (status in ('active', 'revoked', 'compromised')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, credential_id)
);

create table if not exists public.pgems_identity_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  auth_method text not null check (auth_method in ('password', 'oauth', 'oidc', 'magic_link', 'passkey', 'api_key')),
  session_token_hash text not null,
  refresh_token_hash text,
  session_version integer not null default 1,
  rotation_counter integer not null default 0,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  ip_address text,
  user_agent text,
  idle_timeout_at timestamptz,
  absolute_timeout_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  last_activity_at timestamptz,
  status text not null check (status in ('active', 'revoked', 'expired', 'rotated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_identity_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  device_fingerprint text not null,
  device_name text,
  platform text,
  verification_method text not null check (verification_method in ('email_otp', 'sms_otp', 'passkey', 'admin_override')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  trust_score integer not null default 50 check (trust_score between 0 and 100),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  status text not null check (status in ('trusted', 'pending', 'blocked', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, identity_id, device_fingerprint)
);

create table if not exists public.pgems_enterprise_authorization_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  policy_type text not null check (policy_type in ('rbac', 'abac', 'policy_based', 'zero_trust')),
  effect text not null check (effect in ('allow', 'deny')),
  priority integer not null default 100,
  conditions jsonb not null default '{}'::jsonb,
  resource_scope jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft', 'active', 'disabled', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_identity_delegated_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  granter_identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  grantee_identity_id uuid not null references public.pgems_enterprise_identities(id) on delete cascade,
  permission_code text not null,
  scope jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz,
  reason text,
  status text not null check (status in ('active', 'revoked', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_security_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  secret_code text not null,
  secret_kind text not null check (secret_kind in ('api_key', 'internal_token', 'encryption_key', 'signing_key')),
  algorithm text,
  key_ref text not null,
  version_number integer not null default 1,
  rotation_period_days integer not null default 90,
  last_rotated_at timestamptz,
  next_rotation_due_at timestamptz,
  status text not null check (status in ('active', 'rotating', 'retired', 'compromised')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, secret_code)
);

create table if not exists public.pgems_security_secret_versions (
  id uuid primary key default gen_random_uuid(),
  secret_id uuid not null references public.pgems_security_secrets(id) on delete cascade,
  version_number integer not null,
  key_ref text not null,
  rotated_by_auth_user_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (secret_id, version_number)
);

create table if not exists public.pgems_security_policy_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  policy_domain text not null check (policy_domain in ('authentication', 'authorization', 'session', 'device', 'secret', 'zero_trust')),
  rule_expression text not null,
  action_on_match text not null check (action_on_match in ('allow', 'deny', 'step_up_auth', 'manual_review', 'revoke_session')),
  risk_weight integer not null default 10,
  metadata jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_zero_trust_trust_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  identity_id uuid references public.pgems_enterprise_identities(id) on delete set null,
  session_id uuid references public.pgems_identity_sessions(id) on delete set null,
  policy_rule_id uuid references public.pgems_security_policy_rules(id) on delete set null,
  evaluation_action text not null check (evaluation_action in ('allow', 'deny', 'step_up_auth', 'manual_review', 'revoke_session')),
  trust_score integer not null check (trust_score between 0 and 100),
  risk_score integer not null check (risk_score between 0 and 100),
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_security_monitoring_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  signal_type text not null check (signal_type in ('suspicious_login', 'impossible_travel', 'brute_force', 'anomalous_access', 'policy_violation')),
  severity text not null check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  identity_id uuid references public.pgems_enterprise_identities(id) on delete set null,
  session_id uuid references public.pgems_identity_sessions(id) on delete set null,
  source_ip text,
  country_code text,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  details jsonb not null default '{}'::jsonb,
  status text not null check (status in ('open', 'investigating', 'mitigated', 'false_positive', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_identity_security_events (
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
  risk_score integer check (risk_score between 0 and 100),
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create or replace function public.pgems_record_identity_security_event(
  p_organization_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_source_domain text,
  p_source_reference text,
  p_actor_auth_user_id uuid,
  p_actor_role text,
  p_severity text,
  p_risk_score integer,
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
  insert into public.pgems_identity_security_events (
    organization_id,
    event_type,
    aggregate_type,
    aggregate_id,
    source_domain,
    source_reference,
    actor_auth_user_id,
    actor_role,
    severity,
    risk_score,
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
    p_risk_score,
    p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, timezone('utc', now()))
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.pgems_prevent_identity_security_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pgems_identity_security_events is immutable';
end;
$$;

drop trigger if exists pgems_identity_security_events_no_update on public.pgems_identity_security_events;
create trigger pgems_identity_security_events_no_update
before update on public.pgems_identity_security_events
for each row execute function public.pgems_prevent_identity_security_event_mutation();

drop trigger if exists pgems_identity_security_events_no_delete on public.pgems_identity_security_events;
create trigger pgems_identity_security_events_no_delete
before delete on public.pgems_identity_security_events
for each row execute function public.pgems_prevent_identity_security_event_mutation();

create index if not exists pgems_identity_core_org_idx on public.pgems_enterprise_identities (organization_id, identity_type, status);
create index if not exists pgems_auth_methods_org_idx on public.pgems_identity_auth_methods (organization_id, identity_id, auth_method, status);
create index if not exists pgems_mfa_factors_org_idx on public.pgems_identity_mfa_factors (organization_id, identity_id, factor_type, status);
create index if not exists pgems_passkeys_org_idx on public.pgems_identity_passkeys (organization_id, identity_id, status);
create index if not exists pgems_sessions_org_idx on public.pgems_identity_sessions (organization_id, identity_id, status, risk_level, updated_at desc);
create index if not exists pgems_trusted_devices_org_idx on public.pgems_identity_trusted_devices (organization_id, identity_id, status, trust_score);
create index if not exists pgems_authz_policies_org_idx on public.pgems_enterprise_authorization_policies (organization_id, policy_type, status, priority);
create index if not exists pgems_secrets_org_idx on public.pgems_security_secrets (organization_id, secret_kind, status, next_rotation_due_at);
create index if not exists pgems_policy_rules_org_idx on public.pgems_security_policy_rules (organization_id, policy_domain, enabled);
create index if not exists pgems_monitoring_signals_org_idx on public.pgems_security_monitoring_signals (organization_id, signal_type, severity, status, created_at desc);
create index if not exists pgems_identity_security_events_org_idx on public.pgems_identity_security_events (organization_id, occurred_at desc, severity);

alter table public.pgems_enterprise_identities enable row level security;
alter table public.pgems_identity_providers enable row level security;
alter table public.pgems_identity_provider_configs enable row level security;
alter table public.pgems_identity_auth_methods enable row level security;
alter table public.pgems_identity_mfa_factors enable row level security;
alter table public.pgems_identity_mfa_recovery_codes enable row level security;
alter table public.pgems_identity_passkeys enable row level security;
alter table public.pgems_identity_sessions enable row level security;
alter table public.pgems_identity_trusted_devices enable row level security;
alter table public.pgems_enterprise_authorization_policies enable row level security;
alter table public.pgems_identity_delegated_permissions enable row level security;
alter table public.pgems_security_secrets enable row level security;
alter table public.pgems_security_secret_versions enable row level security;
alter table public.pgems_security_policy_rules enable row level security;
alter table public.pgems_zero_trust_trust_evaluations enable row level security;
alter table public.pgems_security_monitoring_signals enable row level security;
alter table public.pgems_identity_security_events enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_enterprise_identities;
create policy "pgems_internal_read_write" on public.pgems_enterprise_identities
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_providers;
create policy "pgems_internal_read_write" on public.pgems_identity_providers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_provider_configs;
create policy "pgems_internal_read_write" on public.pgems_identity_provider_configs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_auth_methods;
create policy "pgems_internal_read_write" on public.pgems_identity_auth_methods
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_mfa_factors;
create policy "pgems_internal_read_write" on public.pgems_identity_mfa_factors
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_mfa_recovery_codes;
create policy "pgems_internal_read_write" on public.pgems_identity_mfa_recovery_codes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_passkeys;
create policy "pgems_internal_read_write" on public.pgems_identity_passkeys
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_sessions;
create policy "pgems_internal_read_write" on public.pgems_identity_sessions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_trusted_devices;
create policy "pgems_internal_read_write" on public.pgems_identity_trusted_devices
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_enterprise_authorization_policies;
create policy "pgems_internal_read_write" on public.pgems_enterprise_authorization_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_delegated_permissions;
create policy "pgems_internal_read_write" on public.pgems_identity_delegated_permissions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_security_secrets;
create policy "pgems_internal_read_write" on public.pgems_security_secrets
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_security_secret_versions;
create policy "pgems_internal_read_write" on public.pgems_security_secret_versions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_security_policy_rules;
create policy "pgems_internal_read_write" on public.pgems_security_policy_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_zero_trust_trust_evaluations;
create policy "pgems_internal_read_write" on public.pgems_zero_trust_trust_evaluations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_security_monitoring_signals;
create policy "pgems_internal_read_write" on public.pgems_security_monitoring_signals
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_identity_security_events;
create policy "pgems_internal_read_write" on public.pgems_identity_security_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

insert into public.pgems_identity_providers (code, name, provider_kind, capabilities, is_active)
values
  ('internal_pgems', 'Prime Global Identity', 'internal', '{"oauth2_1": true, "oidc": true, "passwordless": true}'::jsonb, true),
  ('google_oidc', 'Google OIDC', 'oidc', '{"oidc": true, "oauth2_1": true}'::jsonb, true),
  ('microsoft_entra', 'Microsoft Entra ID', 'oidc', '{"oidc": true, "oauth2_1": true}'::jsonb, true),
  ('github_oauth', 'GitHub OAuth', 'oauth2_1', '{"oauth2_1": true}'::jsonb, true)
on conflict (code) do nothing;
