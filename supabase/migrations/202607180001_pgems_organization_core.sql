create table if not exists public.pgems_organizations (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete set null,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 180),
  display_name text not null check (char_length(trim(display_name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (code)
);

create table if not exists public.pgems_divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  division_id uuid not null references public.pgems_divisions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  department_id uuid not null references public.pgems_departments(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  department_id uuid not null references public.pgems_departments(id) on delete cascade,
  team_id uuid references public.pgems_teams(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  employee_number text not null check (char_length(trim(employee_number)) between 2 and 80),
  full_name text not null check (char_length(trim(full_name)) between 2 and 180),
  email text not null check (char_length(trim(email)) between 5 and 320),
  position_id uuid not null references public.pgems_positions(id) on delete restrict,
  manager_employee_id uuid references public.pgems_employees(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, employee_number),
  unique (organization_id, lower(email))
);

create table if not exists public.pgems_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 180),
  code text not null check (char_length(trim(code)) between 2 and 80),
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 160),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_role_permissions (
  role_id uuid not null references public.pgems_roles(id) on delete cascade,
  permission_id uuid not null references public.pgems_permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);

create table if not exists public.pgems_employee_roles (
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  role_id uuid not null references public.pgems_roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (employee_id, role_id)
);

create table if not exists public.pgems_employee_extra_permissions (
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  permission_id uuid not null references public.pgems_permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (employee_id, permission_id)
);

create table if not exists public.pgems_employee_denied_permissions (
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  permission_id uuid not null references public.pgems_permissions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (employee_id, permission_id)
);

create index if not exists pgems_divisions_org_idx on public.pgems_divisions (organization_id);
create index if not exists pgems_departments_org_idx on public.pgems_departments (organization_id, division_id);
create index if not exists pgems_teams_org_idx on public.pgems_teams (organization_id, department_id);
create index if not exists pgems_positions_org_idx on public.pgems_positions (organization_id, department_id);
create index if not exists pgems_employees_org_idx on public.pgems_employees (organization_id, manager_employee_id);
create index if not exists pgems_roles_org_idx on public.pgems_roles (organization_id);

alter table public.pgems_organizations enable row level security;
alter table public.pgems_divisions enable row level security;
alter table public.pgems_departments enable row level security;
alter table public.pgems_teams enable row level security;
alter table public.pgems_positions enable row level security;
alter table public.pgems_employees enable row level security;
alter table public.pgems_roles enable row level security;
alter table public.pgems_permissions enable row level security;
alter table public.pgems_role_permissions enable row level security;
alter table public.pgems_employee_roles enable row level security;
alter table public.pgems_employee_extra_permissions enable row level security;
alter table public.pgems_employee_denied_permissions enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_organizations;
create policy "pgems_internal_read_write" on public.pgems_organizations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_divisions;
create policy "pgems_internal_read_write" on public.pgems_divisions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_departments;
create policy "pgems_internal_read_write" on public.pgems_departments
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_teams;
create policy "pgems_internal_read_write" on public.pgems_teams
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_positions;
create policy "pgems_internal_read_write" on public.pgems_positions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employees;
create policy "pgems_internal_read_write" on public.pgems_employees
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_roles;
create policy "pgems_internal_read_write" on public.pgems_roles
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_permissions;
create policy "pgems_internal_read_write" on public.pgems_permissions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_role_permissions;
create policy "pgems_internal_read_write" on public.pgems_role_permissions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_roles;
create policy "pgems_internal_read_write" on public.pgems_employee_roles
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_extra_permissions;
create policy "pgems_internal_read_write" on public.pgems_employee_extra_permissions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_denied_permissions;
create policy "pgems_internal_read_write" on public.pgems_employee_denied_permissions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
