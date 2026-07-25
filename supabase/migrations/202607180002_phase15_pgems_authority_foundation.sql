create table if not exists public.pgems_authority_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  level_value integer not null check (level_value between 0 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_employee_authorities (
  employee_id uuid primary key references public.pgems_employees(id) on delete cascade,
  authority_level_id uuid not null references public.pgems_authority_levels(id) on delete restrict,
  custom_level_value integer check (custom_level_value between 0 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_approval_operations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 160),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_approval_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  operation_id uuid not null references public.pgems_approval_operations(id) on delete cascade,
  min_authority_level integer not null check (min_authority_level between 0 and 1000),
  required_permission_id uuid references public.pgems_permissions(id) on delete set null,
  scope_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_employee_monetary_authorities (
  employee_id uuid primary key references public.pgems_employees(id) on delete cascade,
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  maximum_approval_amount numeric(18,2),
  is_unlimited boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (maximum_approval_amount is null or maximum_approval_amount >= 0),
  check (is_unlimited or maximum_approval_amount is not null)
);

create table if not exists public.pgems_scope_dimensions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_scope_nodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  dimension_id uuid not null references public.pgems_scope_dimensions(id) on delete restrict,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  parent_scope_node_id uuid references public.pgems_scope_nodes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, dimension_id, code)
);

create table if not exists public.pgems_employee_scope_assignments (
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  scope_node_id uuid not null references public.pgems_scope_nodes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (employee_id, scope_node_id)
);

create table if not exists public.pgems_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  delegator_employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  delegate_employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('draft', 'active', 'expired', 'revoked')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at),
  check (delegator_employee_id <> delegate_employee_id)
);

create table if not exists public.pgems_delegation_operations (
  delegation_id uuid not null references public.pgems_delegations(id) on delete cascade,
  operation_id uuid not null references public.pgems_approval_operations(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (delegation_id, operation_id)
);

create index if not exists pgems_authority_levels_org_idx on public.pgems_authority_levels (organization_id, level_value);
create index if not exists pgems_employee_authorities_level_idx on public.pgems_employee_authorities (authority_level_id);
create index if not exists pgems_approval_policies_org_op_idx on public.pgems_approval_policies (organization_id, operation_id);
create index if not exists pgems_scope_nodes_org_dim_idx on public.pgems_scope_nodes (organization_id, dimension_id, parent_scope_node_id);
create index if not exists pgems_employee_scopes_employee_idx on public.pgems_employee_scope_assignments (employee_id);
create index if not exists pgems_delegations_org_delegate_idx on public.pgems_delegations (organization_id, delegate_employee_id, status, starts_at, ends_at);

alter table public.pgems_authority_levels enable row level security;
alter table public.pgems_employee_authorities enable row level security;
alter table public.pgems_approval_operations enable row level security;
alter table public.pgems_approval_policies enable row level security;
alter table public.pgems_employee_monetary_authorities enable row level security;
alter table public.pgems_scope_dimensions enable row level security;
alter table public.pgems_scope_nodes enable row level security;
alter table public.pgems_employee_scope_assignments enable row level security;
alter table public.pgems_delegations enable row level security;
alter table public.pgems_delegation_operations enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_authority_levels;
create policy "pgems_internal_read_write" on public.pgems_authority_levels
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_authorities;
create policy "pgems_internal_read_write" on public.pgems_employee_authorities
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_approval_operations;
create policy "pgems_internal_read_write" on public.pgems_approval_operations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_approval_policies;
create policy "pgems_internal_read_write" on public.pgems_approval_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_monetary_authorities;
create policy "pgems_internal_read_write" on public.pgems_employee_monetary_authorities
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_scope_dimensions;
create policy "pgems_internal_read_write" on public.pgems_scope_dimensions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_scope_nodes;
create policy "pgems_internal_read_write" on public.pgems_scope_nodes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_scope_assignments;
create policy "pgems_internal_read_write" on public.pgems_employee_scope_assignments
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_delegations;
create policy "pgems_internal_read_write" on public.pgems_delegations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_delegation_operations;
create policy "pgems_internal_read_write" on public.pgems_delegation_operations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
