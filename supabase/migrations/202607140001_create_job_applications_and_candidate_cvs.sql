create extension if not exists pgcrypto;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 320),
  phone text not null check (char_length(trim(phone)) between 6 and 24),
  country_city text,
  desired_position text not null check (char_length(trim(desired_position)) between 2 and 120),
  years_of_experience integer check (years_of_experience is null or years_of_experience between 0 and 80),
  professional_message text,
  cv_storage_path text not null,
  original_cv_filename text,
  cv_mime_type text,
  cv_size_bytes bigint check (cv_size_bytes is null or cv_size_bytes >= 0),
  consent_accepted boolean not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'interview', 'accepted', 'rejected')),
  locale text check (locale is null or locale in ('en', 'ar')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists job_applications_status_idx on public.job_applications (status);
create index if not exists job_applications_created_at_idx on public.job_applications (created_at desc);
create index if not exists job_applications_email_idx on public.job_applications (lower(email));
create index if not exists job_applications_desired_position_idx on public.job_applications (desired_position);

create or replace function public.set_job_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_job_applications_updated_at on public.job_applications;
create trigger trg_job_applications_updated_at
before update on public.job_applications
for each row
execute function public.set_job_applications_updated_at();

alter table public.job_applications enable row level security;

drop policy if exists "job_applications_admin_select" on public.job_applications;
create policy "job_applications_admin_select"
on public.job_applications
for select
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') = 'admin');

drop policy if exists "job_applications_admin_update" on public.job_applications;
create policy "job_applications_admin_update"
on public.job_applications
for update
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() ->> 'role', '') = 'admin');

drop policy if exists "job_applications_admin_insert" on public.job_applications;
create policy "job_applications_admin_insert"
on public.job_applications
for insert
to authenticated
with check (coalesce(auth.jwt() ->> 'role', '') = 'admin');

drop policy if exists "job_applications_admin_delete" on public.job_applications;
create policy "job_applications_admin_delete"
on public.job_applications
for delete
to authenticated
using (coalesce(auth.jwt() ->> 'role', '') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-cvs',
  'candidate-cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "candidate_cvs_admin_select" on storage.objects;
create policy "candidate_cvs_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'candidate-cvs'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists "candidate_cvs_admin_insert" on storage.objects;
create policy "candidate_cvs_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'candidate-cvs'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists "candidate_cvs_admin_update" on storage.objects;
create policy "candidate_cvs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'candidate-cvs'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
)
with check (
  bucket_id = 'candidate-cvs'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists "candidate_cvs_admin_delete" on storage.objects;
create policy "candidate_cvs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'candidate-cvs'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

drop policy if exists "cv_anon_upload_only" on storage.objects;
