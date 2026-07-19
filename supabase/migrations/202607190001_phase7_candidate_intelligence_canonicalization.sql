create table if not exists public.pgems_ai_candidate_canonical_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  source_profile_id uuid not null references public.pgems_ai_candidate_professional_profiles(id) on delete cascade,
  locale text not null default 'en' check (char_length(trim(locale)) between 2 and 16),
  source_document_analysis_ids uuid[] not null default '{}',
  canonical_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_profile_id)
);

create table if not exists public.pgems_ai_candidate_canonical_profile_fields (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  field_path text not null check (char_length(trim(field_path)) between 1 and 240),
  canonical_value jsonb,
  field_status text not null check (field_status in ('verified', 'conflict', 'low_confidence', 'missing')),
  confidence_score numeric(5,4) not null default 0 check (confidence_score >= 0 and confidence_score <= 1),
  evidence jsonb not null default '[]'::jsonb,
  source_count integer not null default 0 check (source_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (canonical_profile_id, field_path)
);

create table if not exists public.pgems_ai_candidate_conflicts (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  field_path text not null check (char_length(trim(field_path)) between 1 and 240),
  conflict_kind text not null check (conflict_kind in ('value_mismatch', 'source_disagreement', 'low_confidence')),
  conflict_payload jsonb not null default '{}'::jsonb,
  status text not null default 'needs_staff_review' check (status in ('needs_staff_review', 'in_review', 'resolved_by_staff', 'dismissed_by_staff')),
  reviewer_staff_id uuid,
  resolution_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.pgems_ai_candidate_review_items (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  item_type text not null check (item_type in ('conflict', 'low_confidence', 'missing_information')),
  severity text not null check (severity in ('high', 'medium', 'low')),
  field_path text,
  reason_code text not null check (char_length(trim(reason_code)) between 2 and 120),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'needs_staff_review' check (status in ('needs_staff_review', 'in_review', 'resolved')),
  reviewer_staff_id uuid,
  review_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_canonical_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  entry_type text not null check (entry_type in ('experience', 'education', 'certification', 'language', 'skill', 'milestone')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '',
  start_date date,
  end_date date,
  verified boolean not null default true,
  source_evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_ai_candidate_knowledge_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  node_type text not null check (node_type in ('skill', 'experience', 'education', 'certificate', 'language', 'project', 'employer', 'country')),
  node_key text not null check (char_length(trim(node_key)) between 1 and 240),
  node_label text not null check (char_length(trim(node_label)) between 1 and 240),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (canonical_profile_id, node_type, node_key)
);

create table if not exists public.pgems_ai_candidate_knowledge_graph_edges (
  id uuid primary key default gen_random_uuid(),
  canonical_profile_id uuid not null references public.pgems_ai_candidate_canonical_profiles(id) on delete cascade,
  candidate_id uuid not null,
  from_node_id uuid not null references public.pgems_ai_candidate_knowledge_graph_nodes(id) on delete cascade,
  to_node_id uuid not null references public.pgems_ai_candidate_knowledge_graph_nodes(id) on delete cascade,
  relation_type text not null check (char_length(trim(relation_type)) between 2 and 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (canonical_profile_id, from_node_id, to_node_id, relation_type)
);

create index if not exists pgems_ai_candidate_canonical_profiles_candidate_idx on public.pgems_ai_candidate_canonical_profiles (candidate_id, source_profile_id, created_at);
create index if not exists pgems_ai_candidate_canonical_fields_profile_idx on public.pgems_ai_candidate_canonical_profile_fields (canonical_profile_id, candidate_id, field_status, field_path);
create index if not exists pgems_ai_candidate_conflicts_profile_idx on public.pgems_ai_candidate_conflicts (canonical_profile_id, candidate_id, status, created_at);
create index if not exists pgems_ai_candidate_review_items_profile_idx on public.pgems_ai_candidate_review_items (canonical_profile_id, candidate_id, status, item_type, created_at);
create index if not exists pgems_ai_candidate_canonical_timeline_profile_idx on public.pgems_ai_candidate_canonical_timeline_entries (canonical_profile_id, candidate_id, verified, start_date, end_date);
create index if not exists pgems_ai_candidate_graph_nodes_profile_idx on public.pgems_ai_candidate_knowledge_graph_nodes (canonical_profile_id, candidate_id, node_type, node_key);
create index if not exists pgems_ai_candidate_graph_edges_profile_idx on public.pgems_ai_candidate_knowledge_graph_edges (canonical_profile_id, candidate_id, relation_type, created_at);

alter table public.pgems_ai_candidate_canonical_profiles enable row level security;
alter table public.pgems_ai_candidate_canonical_profile_fields enable row level security;
alter table public.pgems_ai_candidate_conflicts enable row level security;
alter table public.pgems_ai_candidate_review_items enable row level security;
alter table public.pgems_ai_candidate_canonical_timeline_entries enable row level security;
alter table public.pgems_ai_candidate_knowledge_graph_nodes enable row level security;
alter table public.pgems_ai_candidate_knowledge_graph_edges enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_profiles;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_profiles
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_profile_fields;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_profile_fields
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_conflicts;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_conflicts
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_review_items;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_review_items
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_timeline_entries;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_canonical_timeline_entries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_knowledge_graph_nodes;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_knowledge_graph_nodes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_ai_candidate_knowledge_graph_edges;
create policy "pgems_internal_read_write" on public.pgems_ai_candidate_knowledge_graph_edges
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));
