create table if not exists public.pgems_role_inheritance (
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  parent_role_id uuid not null references public.pgems_roles(id) on delete cascade,
  child_role_id uuid not null references public.pgems_roles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (parent_role_id, child_role_id),
  check (parent_role_id <> child_role_id)
);

create table if not exists public.pgems_department_owners (
  department_id uuid not null references public.pgems_departments(id) on delete cascade,
  employee_id uuid not null references public.pgems_employees(id) on delete cascade,
  is_primary boolean not null default true,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by_auth_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  primary key (department_id, employee_id)
);

create unique index if not exists pgems_department_primary_owner_idx
  on public.pgems_department_owners (department_id)
  where is_primary;

create table if not exists public.pgems_corporate_email_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  domain text not null check (char_length(trim(domain)) between 3 and 190),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, lower(domain))
);

create unique index if not exists pgems_corporate_email_primary_domain_idx
  on public.pgems_corporate_email_domains (organization_id)
  where is_primary and is_active;

create table if not exists public.pgems_employee_identities (
  employee_id uuid primary key references public.pgems_employees(id) on delete cascade,
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  auth_user_id uuid unique,
  corporate_email text not null check (char_length(trim(corporate_email)) between 6 and 320),
  status text not null default 'provisioned' check (status in ('provisioned', 'active', 'suspended', 'terminated')),
  is_immutable boolean not null default false,
  email_verified_at timestamptz,
  recovery_contact_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, lower(corporate_email))
);

create table if not exists public.pgems_governance_controls (
  organization_id uuid primary key references public.pgems_organizations(id) on delete cascade,
  owner_employee_id uuid not null references public.pgems_employees(id) on delete restrict,
  ceo_employee_id uuid references public.pgems_employees(id) on delete set null,
  owner_role_id uuid references public.pgems_roles(id) on delete set null,
  ceo_role_id uuid references public.pgems_roles(id) on delete set null,
  immutable_owner_account boolean not null default true,
  protect_ceo_account boolean not null default true,
  emergency_recovery_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists pgems_governance_controls_owner_employee_idx
  on public.pgems_governance_controls (owner_employee_id);

create unique index if not exists pgems_governance_controls_ceo_employee_idx
  on public.pgems_governance_controls (ceo_employee_id)
  where ceo_employee_id is not null;

create table if not exists public.pgems_emergency_recovery_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 120),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  requires_owner_approval boolean not null default true,
  allows_ceo_override boolean not null default false,
  minimum_recovery_approvers integer not null default 2 check (minimum_recovery_approvers between 1 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_governance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  actor_auth_user_id uuid,
  actor_employee_id uuid references public.pgems_employees(id) on delete set null,
  actor_role text,
  event_type text not null check (char_length(trim(event_type)) between 2 and 180),
  target_type text,
  target_id text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_role_inheritance_org_idx
  on public.pgems_role_inheritance (organization_id, child_role_id);
create index if not exists pgems_employee_identities_org_idx
  on public.pgems_employee_identities (organization_id, status);
create index if not exists pgems_governance_audit_logs_org_created_idx
  on public.pgems_governance_audit_logs (organization_id, created_at desc);
create index if not exists pgems_governance_audit_logs_event_idx
  on public.pgems_governance_audit_logs (event_type, created_at desc);
create index if not exists pgems_recovery_rules_org_idx
  on public.pgems_emergency_recovery_rules (organization_id, is_active);

create or replace function public.pgems_validate_role_inheritance_org()
returns trigger
language plpgsql
as $$
declare
  parent_org uuid;
  child_org uuid;
begin
  select organization_id into parent_org from public.pgems_roles where id = new.parent_role_id;
  select organization_id into child_org from public.pgems_roles where id = new.child_role_id;

  if parent_org is null or child_org is null then
    raise exception 'invalid role reference for inheritance';
  end if;

  if parent_org <> child_org then
    raise exception 'role inheritance requires roles from same organization';
  end if;

  if new.organization_id <> parent_org then
    raise exception 'organization_id must match role organization';
  end if;

  return new;
end;
$$;

create or replace function public.pgems_validate_department_owner_alignment()
returns trigger
language plpgsql
as $$
declare
  department_org uuid;
  employee_org uuid;
  employee_position_department uuid;
begin
  select organization_id into department_org
  from public.pgems_departments
  where id = new.department_id;

  select e.organization_id, p.department_id
    into employee_org, employee_position_department
  from public.pgems_employees e
  join public.pgems_positions p on p.id = e.position_id
  where e.id = new.employee_id;

  if department_org is null or employee_org is null then
    raise exception 'invalid department owner reference';
  end if;

  if department_org <> employee_org then
    raise exception 'department owner must belong to same organization';
  end if;

  if employee_position_department <> new.department_id then
    raise exception 'department owner employee must hold a position in the target department';
  end if;

  return new;
end;
$$;

create or replace function public.pgems_validate_employee_identity_alignment()
returns trigger
language plpgsql
as $$
declare
  employee_org uuid;
  email_domain text;
  domain_exists boolean;
begin
  select organization_id into employee_org
  from public.pgems_employees
  where id = new.employee_id;

  if employee_org is null then
    raise exception 'invalid employee identity reference';
  end if;

  if new.organization_id <> employee_org then
    raise exception 'employee identity organization must match employee organization';
  end if;

  email_domain := split_part(lower(trim(new.corporate_email)), '@', 2);
  if email_domain is null or email_domain = '' then
    raise exception 'invalid corporate email domain';
  end if;

  select exists (
    select 1
    from public.pgems_corporate_email_domains d
    where d.organization_id = new.organization_id
      and lower(d.domain) = email_domain
      and d.is_active = true
  ) into domain_exists;

  if domain_exists = false then
    raise exception 'corporate email domain is not active for this organization';
  end if;

  return new;
end;
$$;

create or replace function public.pgems_validate_governance_controls_alignment()
returns trigger
language plpgsql
as $$
declare
  owner_org uuid;
  ceo_org uuid;
  owner_role_org uuid;
  ceo_role_org uuid;
begin
  select organization_id into owner_org from public.pgems_employees where id = new.owner_employee_id;
  if owner_org is null or owner_org <> new.organization_id then
    raise exception 'owner_employee_id must belong to organization';
  end if;

  if new.ceo_employee_id is not null then
    select organization_id into ceo_org from public.pgems_employees where id = new.ceo_employee_id;
    if ceo_org is null or ceo_org <> new.organization_id then
      raise exception 'ceo_employee_id must belong to organization';
    end if;
  end if;

  if new.owner_role_id is not null then
    select organization_id into owner_role_org from public.pgems_roles where id = new.owner_role_id;
    if owner_role_org is null or owner_role_org <> new.organization_id then
      raise exception 'owner_role_id must belong to organization';
    end if;
  end if;

  if new.ceo_role_id is not null then
    select organization_id into ceo_role_org from public.pgems_roles where id = new.ceo_role_id;
    if ceo_role_org is null or ceo_role_org <> new.organization_id then
      raise exception 'ceo_role_id must belong to organization';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.pgems_enforce_protected_accounts()
returns trigger
language plpgsql
as $$
declare
  controls record;
begin
  select *
    into controls
  from public.pgems_governance_controls g
  where g.owner_employee_id = old.id
     or g.ceo_employee_id = old.id
  limit 1;

  if controls is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if controls.owner_employee_id = old.id and controls.immutable_owner_account then
      raise exception 'owner account is immutable';
    end if;

    if controls.ceo_employee_id = old.id and controls.protect_ceo_account then
      raise exception 'ceo account is protected';
    end if;

    return old;
  end if;

  if controls.owner_employee_id = old.id and controls.immutable_owner_account then
    if coalesce(new.is_active, true) = false then
      raise exception 'owner account cannot be deactivated';
    end if;

    if lower(coalesce(new.email, '')) <> lower(coalesce(old.email, '')) then
      raise exception 'owner primary email is immutable';
    end if;

    if coalesce(new.position_id::text, '') <> coalesce(old.position_id::text, '') then
      raise exception 'owner position is immutable while account is protected';
    end if;
  end if;

  if controls.ceo_employee_id = old.id and controls.protect_ceo_account then
    if coalesce(new.is_active, true) = false then
      raise exception 'ceo account cannot be deactivated';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.pgems_enforce_owner_role_integrity()
returns trigger
language plpgsql
as $$
declare
  controls record;
  affected_role_id uuid;
begin
  affected_role_id := old.role_id;

  select *
    into controls
  from public.pgems_governance_controls g
  where g.owner_employee_id = old.employee_id
     or g.ceo_employee_id = old.employee_id
  limit 1;

  if controls is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if controls.owner_employee_id = old.employee_id
     and controls.owner_role_id is not null
     and controls.owner_role_id = affected_role_id
     and controls.immutable_owner_account then
    raise exception 'owner role assignment is immutable';
  end if;

  if controls.ceo_employee_id = old.employee_id
     and controls.ceo_role_id is not null
     and controls.ceo_role_id = affected_role_id
     and controls.protect_ceo_account then
    raise exception 'ceo role assignment is protected';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.pgems_enforce_identity_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.is_immutable then
    if tg_op = 'DELETE' then
      raise exception 'immutable employee identity cannot be deleted';
    end if;

    if lower(coalesce(new.corporate_email, '')) <> lower(coalesce(old.corporate_email, '')) then
      raise exception 'immutable employee identity corporate email cannot be changed';
    end if;

    if coalesce(new.auth_user_id::text, '') <> coalesce(old.auth_user_id::text, '') then
      raise exception 'immutable employee identity auth user cannot be changed';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.pgems_resolve_employee_permission_codes(p_employee_id uuid)
returns table (permission_code text, source text, role_id uuid)
language sql
stable
as $$
  with recursive effective_roles as (
    select er.role_id, 'direct'::text as source
    from public.pgems_employee_roles er
    where er.employee_id = p_employee_id

    union

    select ri.parent_role_id, 'inherited'::text as source
    from effective_roles r
    join public.pgems_role_inheritance ri
      on ri.child_role_id = r.role_id
  )
  select distinct p.code as permission_code, r.source, r.role_id
  from effective_roles r
  join public.pgems_role_permissions rp on rp.role_id = r.role_id
  join public.pgems_permissions p on p.id = rp.permission_id;
$$;

create or replace function public.pgems_log_governance_event(
  p_organization_id uuid,
  p_event_type text,
  p_actor_auth_user_id uuid default null,
  p_actor_employee_id uuid default null,
  p_actor_role text default null,
  p_target_type text default null,
  p_target_id text default null,
  p_severity text default 'info',
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
as $$
declare
  inserted_id uuid;
begin
  insert into public.pgems_governance_audit_logs (
    organization_id,
    actor_auth_user_id,
    actor_employee_id,
    actor_role,
    event_type,
    target_type,
    target_id,
    severity,
    metadata,
    ip_address,
    user_agent
  ) values (
    p_organization_id,
    p_actor_auth_user_id,
    p_actor_employee_id,
    p_actor_role,
    p_event_type,
    p_target_type,
    p_target_id,
    p_severity,
    coalesce(p_metadata, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.pgems_seed_corporate_governance(p_organization_id uuid)
returns void
language plpgsql
as $$
declare
  owner_role_id uuid;
  ceo_role_id uuid;
begin
  insert into public.pgems_permissions (code, name, description)
  values
    ('governance.*', 'Governance Full Access', 'Full governance access'),
    ('organization.*', 'Organization Full Access', 'Full organization management access'),
    ('employees.*', 'Employee Full Access', 'Full employee lifecycle and assignment access'),
    ('departments.*', 'Department Full Access', 'Full department and ownership management access'),
    ('identity.*', 'Identity Full Access', 'Full corporate identity lifecycle access'),
    ('audit.*', 'Audit Full Access', 'Full audit visibility'),
    ('recovery.*', 'Recovery Full Access', 'Full emergency recovery controls access'),
    ('governance.roles.read', 'Read Roles', 'View enterprise roles'),
    ('governance.roles.create', 'Create Roles', 'Create enterprise roles'),
    ('governance.roles.assign', 'Assign Roles', 'Assign roles to employees'),
    ('governance.permissions.read', 'Read Permissions', 'View permissions'),
    ('governance.permissions.assign', 'Assign Permissions', 'Assign direct permissions'),
    ('governance.permissions.evaluate', 'Evaluate Permissions', 'Evaluate effective permission state'),
    ('organization.read', 'Read Organization', 'View organization core data'),
    ('organization.update', 'Update Organization', 'Update organization profile and controls'),
    ('employees.read', 'Read Employees', 'View employee model data'),
    ('employees.create', 'Create Employees', 'Create employee records'),
    ('employees.update', 'Update Employees', 'Update employee records'),
    ('employees.deactivate', 'Deactivate Employees', 'Deactivate employee access'),
    ('departments.read', 'Read Departments', 'View departments'),
    ('departments.ownership.assign', 'Assign Department Ownership', 'Assign department ownership'),
    ('identity.read', 'Read Employee Identity', 'View employee identity and corporate email records'),
    ('identity.write', 'Manage Employee Identity', 'Create and update employee identity records'),
    ('identity.verify', 'Verify Corporate Identity', 'Verify employee corporate identity'),
    ('audit.read', 'Read Governance Audit', 'View governance audit logs'),
    ('recovery.rules.manage', 'Manage Recovery Rules', 'Configure emergency recovery rules'),
    ('recovery.execute', 'Execute Recovery', 'Execute emergency recovery actions'),
    ('owner.protection.manage', 'Manage Owner Protection', 'Manage immutable owner account settings'),
    ('ceo.protection.manage', 'Manage CEO Protection', 'Manage CEO account protection settings')
  on conflict (code) do update
    set name = excluded.name,
        description = excluded.description,
        updated_at = timezone('utc', now());

  insert into public.pgems_roles (organization_id, name, code, description, is_system)
  values
    (p_organization_id, 'Owner', 'owner', 'Corporate owner account', true),
    (p_organization_id, 'Chief Executive Officer (CEO)', 'ceo', 'Executive leader', true),
    (p_organization_id, 'Chief Operating Officer (COO)', 'coo', 'Operations executive', true),
    (p_organization_id, 'Chief Technology Officer (CTO)', 'cto', 'Technology executive', true),
    (p_organization_id, 'Chief Financial Officer (CFO)', 'cfo', 'Finance executive', true),
    (p_organization_id, 'Chief Marketing Officer (CMO)', 'cmo', 'Marketing executive', true),
    (p_organization_id, 'Chief Legal Officer (CLO)', 'clo', 'Legal executive', true),
    (p_organization_id, 'Chief AI Officer (CAIO)', 'caio', 'AI executive', true),
    (p_organization_id, 'Chief Security Officer (CSO)', 'cso', 'Security executive', true),
    (p_organization_id, 'Super Admin', 'super_admin', 'System super administrator', true),
    (p_organization_id, 'Department Manager', 'department_manager', 'Department owner/manager role', true),
    (p_organization_id, 'Team Leader', 'team_leader', 'Team leadership role', true),
    (p_organization_id, 'Senior Staff', 'senior_staff', 'Senior employee role', true),
    (p_organization_id, 'Staff', 'staff', 'Standard staff role', true),
    (p_organization_id, 'Support', 'support', 'Support operations role', true),
    (p_organization_id, 'Read Only Auditor', 'read_only_auditor', 'Read-only auditing role', true)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        is_system = true,
        updated_at = timezone('utc', now());

  delete from public.pgems_role_inheritance ri
  using public.pgems_roles r
  where (ri.parent_role_id = r.id or ri.child_role_id = r.id)
    and r.organization_id = p_organization_id;

  insert into public.pgems_role_inheritance (organization_id, parent_role_id, child_role_id)
  select
    p_organization_id,
    parent_role.id,
    child_role.id
  from (
    values
      ('read_only_auditor', 'support'),
      ('support', 'staff'),
      ('staff', 'senior_staff'),
      ('senior_staff', 'team_leader'),
      ('team_leader', 'department_manager'),
      ('department_manager', 'super_admin'),
      ('super_admin', 'coo'),
      ('super_admin', 'cto'),
      ('super_admin', 'cfo'),
      ('super_admin', 'cmo'),
      ('super_admin', 'clo'),
      ('super_admin', 'caio'),
      ('super_admin', 'cso'),
      ('super_admin', 'ceo'),
      ('ceo', 'owner')
  ) as mapping(parent_code, child_code)
  join public.pgems_roles parent_role
    on parent_role.organization_id = p_organization_id
   and parent_role.code = mapping.parent_code
  join public.pgems_roles child_role
    on child_role.organization_id = p_organization_id
   and child_role.code = mapping.child_code
  on conflict do nothing;

  delete from public.pgems_role_permissions rp
  using public.pgems_roles r
  where rp.role_id = r.id
    and r.organization_id = p_organization_id;

  insert into public.pgems_role_permissions (role_id, permission_id)
  select
    r.id,
    p.id
  from (
    values
      ('owner', 'governance.*'),
      ('owner', 'organization.*'),
      ('owner', 'employees.*'),
      ('owner', 'departments.*'),
      ('owner', 'identity.*'),
      ('owner', 'audit.*'),
      ('owner', 'recovery.*'),
      ('owner', 'owner.protection.manage'),
      ('owner', 'ceo.protection.manage'),
      ('ceo', 'governance.*'),
      ('ceo', 'organization.*'),
      ('ceo', 'employees.*'),
      ('ceo', 'departments.*'),
      ('ceo', 'identity.*'),
      ('ceo', 'audit.*'),
      ('ceo', 'recovery.rules.manage'),
      ('coo', 'organization.read'),
      ('coo', 'organization.update'),
      ('coo', 'employees.read'),
      ('coo', 'employees.update'),
      ('coo', 'departments.read'),
      ('coo', 'departments.ownership.assign'),
      ('cto', 'organization.read'),
      ('cto', 'employees.read'),
      ('cto', 'identity.read'),
      ('cfo', 'organization.read'),
      ('cfo', 'employees.read'),
      ('cfo', 'recovery.rules.manage'),
      ('cfo', 'audit.read'),
      ('cmo', 'organization.read'),
      ('clo', 'audit.read'),
      ('clo', 'recovery.rules.manage'),
      ('caio', 'organization.read'),
      ('caio', 'employees.read'),
      ('cso', 'audit.read'),
      ('cso', 'identity.read'),
      ('cso', 'identity.verify'),
      ('super_admin', 'governance.roles.read'),
      ('super_admin', 'governance.roles.create'),
      ('super_admin', 'governance.roles.assign'),
      ('super_admin', 'governance.permissions.read'),
      ('super_admin', 'governance.permissions.assign'),
      ('super_admin', 'governance.permissions.evaluate'),
      ('super_admin', 'employees.read'),
      ('super_admin', 'employees.create'),
      ('super_admin', 'employees.update'),
      ('super_admin', 'departments.read'),
      ('super_admin', 'departments.ownership.assign'),
      ('department_manager', 'departments.read'),
      ('department_manager', 'departments.ownership.assign'),
      ('department_manager', 'employees.read'),
      ('team_leader', 'employees.read'),
      ('senior_staff', 'employees.read'),
      ('staff', 'organization.read'),
      ('support', 'identity.read'),
      ('read_only_auditor', 'audit.read')
  ) as mapping(role_code, permission_code)
  join public.pgems_roles r
    on r.organization_id = p_organization_id
   and r.code = mapping.role_code
  join public.pgems_permissions p
    on p.code = mapping.permission_code
  on conflict do nothing;

  insert into public.pgems_emergency_recovery_rules (
    organization_id,
    code,
    name,
    description,
    requires_owner_approval,
    allows_ceo_override,
    minimum_recovery_approvers,
    is_active
  )
  values
    (p_organization_id, 'owner_account_recovery', 'Owner Account Recovery', 'Recover owner account access with strict owner-first governance.', true, false, 2, true),
    (p_organization_id, 'ceo_account_recovery', 'CEO Account Recovery', 'Recover CEO account access with owner supervision.', true, true, 2, true),
    (p_organization_id, 'immutable_identity_break_glass', 'Immutable Identity Break Glass', 'Controlled break-glass path for immutable identity incidents.', true, false, 3, true)
  on conflict (organization_id, code) do update
    set name = excluded.name,
        description = excluded.description,
        requires_owner_approval = excluded.requires_owner_approval,
        allows_ceo_override = excluded.allows_ceo_override,
        minimum_recovery_approvers = excluded.minimum_recovery_approvers,
        is_active = excluded.is_active,
        updated_at = timezone('utc', now());

  select id into owner_role_id
  from public.pgems_roles
  where organization_id = p_organization_id and code = 'owner'
  limit 1;

  select id into ceo_role_id
  from public.pgems_roles
  where organization_id = p_organization_id and code = 'ceo'
  limit 1;

  insert into public.pgems_governance_audit_logs (
    organization_id,
    actor_role,
    event_type,
    target_type,
    target_id,
    severity,
    metadata
  ) values (
    p_organization_id,
    'system',
    'governance.bootstrap.completed',
    'organization',
    p_organization_id::text,
    'info',
    jsonb_build_object(
      'ownerRoleId', owner_role_id,
      'ceoRoleId', ceo_role_id,
      'seededAt', timezone('utc', now())
    )
  );
end;
$$;

drop trigger if exists pgems_role_inheritance_validate on public.pgems_role_inheritance;
create trigger pgems_role_inheritance_validate
before insert or update on public.pgems_role_inheritance
for each row execute function public.pgems_validate_role_inheritance_org();

drop trigger if exists pgems_department_owner_validate on public.pgems_department_owners;
create trigger pgems_department_owner_validate
before insert or update on public.pgems_department_owners
for each row execute function public.pgems_validate_department_owner_alignment();

drop trigger if exists pgems_employee_identity_validate on public.pgems_employee_identities;
create trigger pgems_employee_identity_validate
before insert or update on public.pgems_employee_identities
for each row execute function public.pgems_validate_employee_identity_alignment();

drop trigger if exists pgems_governance_controls_validate on public.pgems_governance_controls;
create trigger pgems_governance_controls_validate
before insert or update on public.pgems_governance_controls
for each row execute function public.pgems_validate_governance_controls_alignment();

drop trigger if exists pgems_employee_protection_guard on public.pgems_employees;
create trigger pgems_employee_protection_guard
before update or delete on public.pgems_employees
for each row execute function public.pgems_enforce_protected_accounts();

drop trigger if exists pgems_owner_role_guard on public.pgems_employee_roles;
create trigger pgems_owner_role_guard
before update or delete on public.pgems_employee_roles
for each row execute function public.pgems_enforce_owner_role_integrity();

drop trigger if exists pgems_identity_immutability_guard on public.pgems_employee_identities;
create trigger pgems_identity_immutability_guard
before update or delete on public.pgems_employee_identities
for each row execute function public.pgems_enforce_identity_immutability();

alter table public.pgems_role_inheritance enable row level security;
alter table public.pgems_department_owners enable row level security;
alter table public.pgems_corporate_email_domains enable row level security;
alter table public.pgems_employee_identities enable row level security;
alter table public.pgems_governance_controls enable row level security;
alter table public.pgems_emergency_recovery_rules enable row level security;
alter table public.pgems_governance_audit_logs enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_role_inheritance;
create policy "pgems_internal_read_write" on public.pgems_role_inheritance
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_department_owners;
create policy "pgems_internal_read_write" on public.pgems_department_owners
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_corporate_email_domains;
create policy "pgems_internal_read_write" on public.pgems_corporate_email_domains
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_employee_identities;
create policy "pgems_internal_read_write" on public.pgems_employee_identities
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_governance_controls;
create policy "pgems_internal_read_write" on public.pgems_governance_controls
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_emergency_recovery_rules;
create policy "pgems_internal_read_write" on public.pgems_emergency_recovery_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_governance_audit_logs;
create policy "pgems_internal_read_write" on public.pgems_governance_audit_logs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
