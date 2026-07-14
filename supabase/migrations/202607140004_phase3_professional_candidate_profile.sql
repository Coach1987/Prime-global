create table if not exists public.candidate_professional_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.candidate_profiles(id) on delete cascade,
  photo_storage_path text,
  headline text,
  biography text,
  experiences jsonb not null default '[]'::jsonb,
  education_entries jsonb not null default '[]'::jsonb,
  certificates jsonb not null default '[]'::jsonb,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  portfolio_url text,
  linkedin_url text,
  website_url text,
  availability text,
  salary_expectation numeric(12, 2),
  visa_status text,
  driving_license boolean,
  nationality text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists candidate_professional_profiles_nationality_idx
  on public.candidate_professional_profiles (nationality);
create index if not exists candidate_professional_profiles_salary_idx
  on public.candidate_professional_profiles (salary_expectation desc nulls last);

alter table public.candidate_professional_profiles enable row level security;

drop policy if exists "candidate_professional_profiles_self_admin" on public.candidate_professional_profiles;
create policy "candidate_professional_profiles_self_admin"
on public.candidate_professional_profiles
for all
to authenticated
using (
  exists (
    select 1 from public.candidate_profiles c
    where c.id = candidate_id
    and (
      c.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
)
with check (
  exists (
    select 1 from public.candidate_profiles c
    where c.id = candidate_id
    and (
      c.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-avatars',
  'candidate-avatars',
  false,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "candidate_avatars_owner_all" on storage.objects;
create policy "candidate_avatars_owner_all"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'candidate-avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'candidate-avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);
