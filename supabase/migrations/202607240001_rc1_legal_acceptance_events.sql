create extension if not exists pgcrypto;

create table if not exists public.legal_acceptance_events (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  actor_role text not null check (actor_role in ('candidate', 'employer', 'staff', 'system', 'other')),
  document_name text not null check (char_length(trim(document_name)) between 2 and 120),
  document_version text not null check (char_length(trim(document_version)) between 1 and 120),
  accepted_at timestamptz not null default timezone('utc', now()),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists legal_acceptance_events_auth_user_idx
  on public.legal_acceptance_events (auth_user_id, accepted_at desc);

create index if not exists legal_acceptance_events_document_idx
  on public.legal_acceptance_events (document_name, document_version, accepted_at desc);
