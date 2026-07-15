create extension if not exists pgcrypto;

create table if not exists public.candidate_private_profiles (
  candidate_id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (char_length(trim(email)) between 5 and 320),
  phone text not null check (char_length(trim(phone)) between 6 and 32),
  address text,
  original_cv_path text not null,
  original_documents_paths jsonb not null default '[]'::jsonb,
  restricted_to_prime_global boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists candidate_private_profiles_email_uq
  on public.candidate_private_profiles (lower(email));

create index if not exists candidate_private_profiles_created_at_idx
  on public.candidate_private_profiles (created_at desc);

create sequence if not exists public.candidate_reference_sequence;

create or replace function public.next_candidate_reference()
returns text
language plpgsql
as $$
declare
  next_value bigint;
begin
  next_value := nextval('public.candidate_reference_sequence');
  return 'PG-CAND-' || to_char(timezone('utc', now()), 'YYYY') || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create table if not exists public.candidate_public_profiles (
  candidate_id uuid primary key references public.candidate_private_profiles(candidate_id) on delete cascade,
  candidate_reference text not null unique default public.next_candidate_reference(),
  professional_title text,
  professional_summary text,
  years_of_experience numeric(5, 1),
  skills jsonb not null default '[]'::jsonb,
  employment_history jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  general_location text,
  availability text,
  desired_role text,
  expected_salary numeric(12, 2),
  ai_summary text,
  profile_status text not null default 'pending_review'
    check (profile_status in ('draft', 'pending_review', 'needs_changes', 'approved', 'rejected')),
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_public_profiles_status_idx
  on public.candidate_public_profiles (profile_status, generated_at desc);

create index if not exists candidate_public_profiles_reference_idx
  on public.candidate_public_profiles (candidate_reference);

create table if not exists public.candidate_profile_versions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_public_profiles(candidate_id) on delete cascade,
  version_number integer not null check (version_number > 0),
  generated_content jsonb not null,
  generated_by text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (candidate_id, version_number)
);

create index if not exists candidate_profile_versions_candidate_idx
  on public.candidate_profile_versions (candidate_id, version_number desc);

create table if not exists public.candidate_profile_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_public_profiles(candidate_id) on delete cascade,
  reviewed_by_prime_global_user_id uuid,
  status text not null check (status in ('pending', 'approved', 'rejected', 'needs_changes')),
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_profile_reviews_candidate_idx
  on public.candidate_profile_reviews (candidate_id, created_at desc);

alter table public.candidate_private_profiles enable row level security;
alter table public.candidate_public_profiles enable row level security;
alter table public.candidate_profile_versions enable row level security;
alter table public.candidate_profile_reviews enable row level security;

drop policy if exists "candidate_private_profiles_self_prime_staff" on public.candidate_private_profiles;
create policy "candidate_private_profiles_self_prime_staff"
on public.candidate_private_profiles
for all
to authenticated
using (
  auth.uid() = candidate_id
  or coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
)
with check (
  auth.uid() = candidate_id
  or coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop policy if exists "candidate_public_profiles_visibility" on public.candidate_public_profiles;
create policy "candidate_public_profiles_visibility"
on public.candidate_public_profiles
for select
to anon, authenticated
using (
  profile_status = 'approved'
  or coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop policy if exists "candidate_public_profiles_manage" on public.candidate_public_profiles;
create policy "candidate_public_profiles_manage"
on public.candidate_public_profiles
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop policy if exists "candidate_profile_versions_manage" on public.candidate_profile_versions;
create policy "candidate_profile_versions_manage"
on public.candidate_profile_versions
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop policy if exists "candidate_profile_reviews_manage" on public.candidate_profile_reviews;
create policy "candidate_profile_reviews_manage"
on public.candidate_profile_reviews
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in (
    'prime_global_recruiter',
    'prime_global_admin',
    'admin',
    'super_admin'
  )
);

drop trigger if exists trg_candidate_private_profiles_updated_at on public.candidate_private_profiles;
create trigger trg_candidate_private_profiles_updated_at
before update on public.candidate_private_profiles
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_candidate_public_profiles_updated_at on public.candidate_public_profiles;
create trigger trg_candidate_public_profiles_updated_at
before update on public.candidate_public_profiles
for each row
execute function public.set_updated_at_column();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-private-documents',
  'candidate-private-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "candidate_private_documents_access" on storage.objects;
create policy "candidate_private_documents_access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'candidate-private-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in (
      'prime_global_recruiter',
      'prime_global_admin',
      'admin',
      'super_admin'
    )
  )
)
with check (
  bucket_id = 'candidate-private-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in (
      'prime_global_recruiter',
      'prime_global_admin',
      'admin',
      'super_admin'
    )
  )
);