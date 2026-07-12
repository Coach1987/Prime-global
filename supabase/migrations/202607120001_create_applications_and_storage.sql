create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (char_length(trim(email)) between 5 and 320),
  phone text not null check (char_length(trim(phone)) between 6 and 32),
  country text not null check (char_length(trim(country)) between 2 and 100),
  city text not null check (char_length(trim(city)) between 2 and 120),
  position text not null check (char_length(trim(position)) between 2 and 160),
  experience text not null check (char_length(trim(experience)) between 1 and 80),
  cover_letter text,
  cv_url text not null,
  cv_filename text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_created_at_idx on public.applications (created_at desc);
create index if not exists applications_email_idx on public.applications (lower(email));

alter table public.applications enable row level security;

create policy "applications_anon_insert_pending"
on public.applications
for insert
to anon
with check (
  status = 'pending'
);

create policy "applications_admin_all"
on public.applications
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prime-global-cv',
  'prime-global-cv',
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

create policy "cv_anon_upload_only"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'prime-global-cv'
  and (storage.foldername(name))[1] = 'applications'
  and lower(storage.extension(name)) in ('pdf', 'doc', 'docx')
);

create policy "cv_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'prime-global-cv'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

create policy "cv_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'prime-global-cv'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

create policy "cv_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'prime-global-cv'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
)
with check (
  bucket_id = 'prime-global-cv'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);

create policy "cv_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'prime-global-cv'
  and coalesce(auth.jwt() ->> 'role', '') = 'admin'
);
