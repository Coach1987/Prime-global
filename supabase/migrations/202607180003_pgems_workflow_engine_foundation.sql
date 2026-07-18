create table if not exists public.pgems_workflow_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflows (
  id uuid primary key default gen_random_uuid(),
  workflow_type_id uuid not null references public.pgems_workflow_types(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  description text,
  definition jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_type_id, code)
);

create table if not exists public.pgems_workflow_state_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_type_id uuid not null references public.pgems_workflow_types(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  state_name text not null check (state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_terminal boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_type_id, code)
);

create table if not exists public.pgems_workflow_transition_definitions (
  id uuid primary key default gen_random_uuid(),
  workflow_type_id uuid not null references public.pgems_workflow_types(id) on delete cascade,
  from_state_name text not null check (from_state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  to_state_name text not null check (to_state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  transition_code text not null check (char_length(trim(transition_code)) between 2 and 80),
  reversible boolean not null default false,
  terminal boolean not null default false,
  condition jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_type_id, transition_code)
);

create table if not exists public.pgems_workflow_stages (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.pgems_workflows(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  stage_order integer not null default 0 check (stage_order >= 0),
  approval_mode text not null check (approval_mode in ('single', 'sequential', 'parallel', 'conditional', 'owner_final', 'authority_level', 'financial', 'minimum_authority', 'ai_advisory')),
  state_name text not null check (state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  rule_expression jsonb,
  is_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_id, code)
);

create table if not exists public.pgems_workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_stage_id uuid not null references public.pgems_workflow_stages(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  action_code text not null check (char_length(trim(action_code)) between 2 and 80),
  result_state_name text check (result_state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  terminal boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_stage_id, code)
);

create table if not exists public.pgems_workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.pgems_workflows(id) on delete cascade,
  workflow_type_id uuid not null references public.pgems_workflow_types(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  external_subject_type text,
  external_subject_id text,
  current_state text not null check (current_state in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  status text not null check (status in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  version integer not null default 0 check (version >= 0),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_id, code)
);

create table if not exists public.pgems_workflow_participants (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  participant_type text not null check (participant_type in ('user', 'role', 'group', 'system')),
  participant_key text not null check (char_length(trim(participant_key)) between 1 and 160),
  participation_mode text not null check (participation_mode in ('required', 'optional', 'observer', 'approver', 'owner')),
  is_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_instance_id, participant_type, participant_key, participation_mode)
);

create table if not exists public.pgems_workflow_decisions (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  workflow_stage_id uuid references public.pgems_workflow_stages(id) on delete set null,
  workflow_action_id uuid references public.pgems_workflow_actions(id) on delete set null,
  participant_id uuid references public.pgems_workflow_participants(id) on delete set null,
  decision_kind text not null check (decision_kind in ('approve', 'reject', 'return', 'cancel', 'delegate', 'escalate')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_rules (
  id uuid primary key default gen_random_uuid(),
  workflow_type_id uuid references public.pgems_workflow_types(id) on delete cascade,
  workflow_id uuid references public.pgems_workflows(id) on delete cascade,
  workflow_stage_id uuid references public.pgems_workflow_stages(id) on delete cascade,
  workflow_instance_id uuid references public.pgems_workflow_instances(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  priority integer not null default 100 check (priority >= 0),
  condition jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_escalations (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  workflow_stage_id uuid references public.pgems_workflow_stages(id) on delete set null,
  escalation_kind text not null check (escalation_kind in ('automatic', 'timeout', 'manager', 'owner', 'delegation', 'temporary_reassignment', 'reminder')),
  timeout_minutes integer check (timeout_minutes is null or timeout_minutes > 0),
  reminder_minutes integer check (reminder_minutes is null or reminder_minutes > 0),
  target_type text not null check (target_type in ('user', 'role', 'group', 'manager', 'owner', 'delegate', 'system')),
  target_key text,
  status text not null check (status in ('pending', 'scheduled', 'triggered', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) between 2 and 80),
  occurred_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb,
  immutable boolean not null default true check (immutable),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_history (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  entry_type text not null check (char_length(trim(entry_type)) between 2 and 80),
  from_state_name text check (from_state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  to_state_name text check (to_state_name in ('draft', 'pending', 'in_review', 'waiting_higher_approval', 'approved', 'rejected', 'returned', 'cancelled', 'expired', 'executed', 'archived')),
  description text not null check (char_length(trim(description)) between 1 and 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_attachments (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_key text not null check (char_length(trim(storage_key)) between 1 and 255),
  mime_type text not null check (char_length(trim(mime_type)) between 2 and 120),
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_comments (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  author_type text not null check (author_type in ('user', 'system')),
  author_key text not null check (char_length(trim(author_key)) between 1 and 160),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  is_internal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_workflow_audit (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.pgems_workflow_instances(id) on delete cascade,
  action_code text not null check (char_length(trim(action_code)) between 2 and 80),
  actor_type text not null check (actor_type in ('user', 'system')),
  actor_key text not null check (char_length(trim(actor_key)) between 1 and 160),
  outcome text not null check (outcome in ('success', 'failure', 'manual_review')),
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  record_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pgems_workflow_types_code_idx on public.pgems_workflow_types (code);
create index if not exists pgems_workflows_type_idx on public.pgems_workflows (workflow_type_id, created_at);
create index if not exists pgems_workflow_states_type_idx on public.pgems_workflow_state_definitions (workflow_type_id, sort_order);
create index if not exists pgems_workflow_transitions_type_idx on public.pgems_workflow_transition_definitions (workflow_type_id, from_state_name, to_state_name);
create index if not exists pgems_workflow_stages_workflow_idx on public.pgems_workflow_stages (workflow_id, stage_order);
create index if not exists pgems_workflow_actions_stage_idx on public.pgems_workflow_actions (workflow_stage_id, created_at);
create index if not exists pgems_workflow_instances_workflow_idx on public.pgems_workflow_instances (workflow_id, workflow_type_id, created_at);
create index if not exists pgems_workflow_participants_instance_idx on public.pgems_workflow_participants (workflow_instance_id, created_at);
create index if not exists pgems_workflow_decisions_instance_idx on public.pgems_workflow_decisions (workflow_instance_id, created_at);
create index if not exists pgems_workflow_rules_scope_idx on public.pgems_workflow_rules (workflow_type_id, workflow_id, workflow_stage_id, workflow_instance_id, priority);
create index if not exists pgems_workflow_escalations_instance_idx on public.pgems_workflow_escalations (workflow_instance_id, status, created_at);
create index if not exists pgems_workflow_events_instance_idx on public.pgems_workflow_events (workflow_instance_id, occurred_at);
create index if not exists pgems_workflow_history_instance_idx on public.pgems_workflow_history (workflow_instance_id, created_at);
create index if not exists pgems_workflow_attachments_instance_idx on public.pgems_workflow_attachments (workflow_instance_id, created_at);
create index if not exists pgems_workflow_comments_instance_idx on public.pgems_workflow_comments (workflow_instance_id, created_at);
create index if not exists pgems_workflow_audit_instance_idx on public.pgems_workflow_audit (workflow_instance_id, created_at);

alter table public.pgems_workflow_types enable row level security;
alter table public.pgems_workflows enable row level security;
alter table public.pgems_workflow_state_definitions enable row level security;
alter table public.pgems_workflow_transition_definitions enable row level security;
alter table public.pgems_workflow_stages enable row level security;
alter table public.pgems_workflow_actions enable row level security;
alter table public.pgems_workflow_instances enable row level security;
alter table public.pgems_workflow_participants enable row level security;
alter table public.pgems_workflow_decisions enable row level security;
alter table public.pgems_workflow_rules enable row level security;
alter table public.pgems_workflow_escalations enable row level security;
alter table public.pgems_workflow_events enable row level security;
alter table public.pgems_workflow_history enable row level security;
alter table public.pgems_workflow_attachments enable row level security;
alter table public.pgems_workflow_comments enable row level security;
alter table public.pgems_workflow_audit enable row level security;

-- Workflow engine data remains internal-only and additive.
drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_types;
create policy "pgems_internal_read_write" on public.pgems_workflow_types
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflows;
create policy "pgems_internal_read_write" on public.pgems_workflows
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_state_definitions;
create policy "pgems_internal_read_write" on public.pgems_workflow_state_definitions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_transition_definitions;
create policy "pgems_internal_read_write" on public.pgems_workflow_transition_definitions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_stages;
create policy "pgems_internal_read_write" on public.pgems_workflow_stages
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_actions;
create policy "pgems_internal_read_write" on public.pgems_workflow_actions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_instances;
create policy "pgems_internal_read_write" on public.pgems_workflow_instances
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_participants;
create policy "pgems_internal_read_write" on public.pgems_workflow_participants
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_decisions;
create policy "pgems_internal_read_write" on public.pgems_workflow_decisions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_rules;
create policy "pgems_internal_read_write" on public.pgems_workflow_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_escalations;
create policy "pgems_internal_read_write" on public.pgems_workflow_escalations
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_events;
create policy "pgems_internal_read_write" on public.pgems_workflow_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_history;
create policy "pgems_internal_read_write" on public.pgems_workflow_history
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_attachments;
create policy "pgems_internal_read_write" on public.pgems_workflow_attachments
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_comments;
create policy "pgems_internal_read_write" on public.pgems_workflow_comments
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_workflow_audit;
create policy "pgems_internal_read_write" on public.pgems_workflow_audit
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
