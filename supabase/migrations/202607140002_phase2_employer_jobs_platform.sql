create extension if not exists pgcrypto;

-- ============================================================================
-- PHASE 2: Employer Portal + Jobs Platform (additive, no breaking changes)
-- ============================================================================

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  company_name text not null check (char_length(trim(company_name)) between 2 and 180),
  commercial_registration_number text not null check (char_length(trim(commercial_registration_number)) between 2 and 80),
  tax_number text not null check (char_length(trim(tax_number)) between 2 and 80),
  country text not null check (char_length(trim(country)) between 2 and 120),
  city text not null check (char_length(trim(city)) between 2 and 120),
  address text not null check (char_length(trim(address)) between 5 and 300),
  website text,
  company_email text not null check (char_length(trim(company_email)) between 5 and 320),
  hr_contact text not null check (char_length(trim(hr_contact)) between 2 and 120),
  phone_number text not null check (char_length(trim(phone_number)) between 6 and 32),
  logo_storage_path text,
  industry text not null check (char_length(trim(industry)) between 2 and 120),
  company_size text not null check (char_length(trim(company_size)) between 1 and 50),
  company_description text not null check (char_length(trim(company_description)) between 20 and 4000),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'documents_submitted', 'admin_review', 'verified', 'rejected', 'suspended')),
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists employers_commercial_registration_uq
  on public.employers (lower(commercial_registration_number));
create unique index if not exists employers_tax_number_uq
  on public.employers (lower(tax_number));
create unique index if not exists employers_company_email_uq
  on public.employers (lower(company_email));
create index if not exists employers_status_idx
  on public.employers (verification_status);
create index if not exists employers_created_at_idx
  on public.employers (created_at desc);

create table if not exists public.employer_verification_documents (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  document_type text not null
    check (document_type in (
      'commercial_registration',
      'tax_certificate',
      'legal_representative_id',
      'address_proof',
      'recruitment_license'
    )),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by uuid,
  uploaded_at timestamptz not null default timezone('utc', now())
);

create index if not exists employer_docs_employer_idx
  on public.employer_verification_documents (employer_id, uploaded_at desc);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 180),
  department text not null check (char_length(trim(department)) between 2 and 120),
  employment_type text not null
    check (employment_type in ('full_time', 'part_time', 'contract', 'internship')),
  work_mode text not null check (work_mode in ('remote', 'hybrid', 'onsite')),
  country text not null check (char_length(trim(country)) between 2 and 120),
  city text not null check (char_length(trim(city)) between 2 and 120),
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  salary_currency text not null default 'USD' check (char_length(trim(salary_currency)) between 3 and 8),
  experience text not null check (char_length(trim(experience)) between 2 and 120),
  education text not null check (char_length(trim(education)) between 2 and 120),
  required_skills text[] not null default '{}',
  responsibilities text not null check (char_length(trim(responsibilities)) between 10 and 6000),
  requirements text not null check (char_length(trim(requirements)) between 10 and 6000),
  benefits text,
  application_deadline timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'closed')),
  publish_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint jobs_salary_range_chk
    check (
      (salary_min is null and salary_max is null)
      or (salary_min is not null and salary_max is not null and salary_max >= salary_min)
    )
);

create index if not exists jobs_employer_idx
  on public.jobs (employer_id, created_at desc);
create index if not exists jobs_status_idx
  on public.jobs (status, publish_date desc nulls last);
create index if not exists jobs_search_idx
  on public.jobs (country, city, employment_type, work_mode);
create index if not exists jobs_salary_idx
  on public.jobs (salary_max desc nulls last);

create table if not exists public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 320),
  phone_number text check (phone_number is null or char_length(trim(phone_number)) between 6 and 32),
  country text,
  city text,
  professional_title text,
  bio text,
  avatar_storage_path text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists candidate_profiles_email_uq
  on public.candidate_profiles (lower(email));

create table if not exists public.candidate_resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists candidate_primary_resume_uq
  on public.candidate_resumes (candidate_id)
  where is_primary = true;

create table if not exists public.job_applications_v2 (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  resume_id uuid references public.candidate_resumes(id) on delete set null,
  cover_letter text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'interview', 'shortlisted', 'accepted', 'rejected')),
  applied_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (job_id, candidate_id)
);

create index if not exists job_applications_v2_status_idx
  on public.job_applications_v2 (status, applied_at desc);
create index if not exists job_applications_v2_job_idx
  on public.job_applications_v2 (job_id, applied_at desc);
create index if not exists job_applications_v2_candidate_idx
  on public.job_applications_v2 (candidate_id, applied_at desc);

create table if not exists public.job_application_status_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications_v2(id) on delete cascade,
  previous_status text,
  next_status text not null,
  changed_by_auth_user_id uuid,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists job_application_status_events_application_idx
  on public.job_application_status_events (application_id, created_at desc);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (candidate_id, job_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  category text not null check (char_length(trim(category)) between 2 and 80),
  title text not null check (char_length(trim(title)) between 2 and 180),
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_idx
  on public.notifications (auth_user_id, is_read, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid,
  actor_role text,
  action text not null check (char_length(trim(action)) between 2 and 120),
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx
  on public.audit_logs (action, created_at desc);

create or replace function public.set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_employers_updated_at on public.employers;
create trigger trg_employers_updated_at
before update on public.employers
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_candidate_profiles_updated_at on public.candidate_profiles;
create trigger trg_candidate_profiles_updated_at
before update on public.candidate_profiles
for each row
execute function public.set_updated_at_column();

drop trigger if exists trg_job_applications_v2_updated_at on public.job_applications_v2;
create trigger trg_job_applications_v2_updated_at
before update on public.job_applications_v2
for each row
execute function public.set_updated_at_column();

create or replace function public.log_application_status_change()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status then
    insert into public.job_application_status_events (
      application_id,
      previous_status,
      next_status,
      changed_by_auth_user_id,
      created_at
    )
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      timezone('utc', now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_job_applications_v2_status_log on public.job_applications_v2;
create trigger trg_job_applications_v2_status_log
after update on public.job_applications_v2
for each row
execute function public.log_application_status_change();

create or replace function public.sync_employer_documents_status()
returns trigger
language plpgsql
as $$
declare
  doc_count integer;
begin
  select count(*) into doc_count
  from public.employer_verification_documents
  where employer_id = new.employer_id;

  if doc_count > 0 then
    update public.employers
    set verification_status = case
      when verification_status = 'pending' then 'documents_submitted'
      else verification_status
    end
    where id = new.employer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employer_documents_status on public.employer_verification_documents;
create trigger trg_employer_documents_status
after insert on public.employer_verification_documents
for each row
execute function public.sync_employer_documents_status();

-- RLS and access model.
alter table public.employers enable row level security;
alter table public.employer_verification_documents enable row level security;
alter table public.jobs enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.candidate_resumes enable row level security;
alter table public.job_applications_v2 enable row level security;
alter table public.job_application_status_events enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Employers can view/update their own profile; admins can do all.
drop policy if exists "employers_self_select" on public.employers;
create policy "employers_self_select"
on public.employers
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "employers_self_update" on public.employers;
create policy "employers_self_update"
on public.employers
for update
to authenticated
using (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "employers_self_insert" on public.employers;
create policy "employers_self_insert"
on public.employers
for insert
to authenticated
with check (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

-- Employer docs.
drop policy if exists "employer_docs_owner_and_admin" on public.employer_verification_documents;
create policy "employer_docs_owner_and_admin"
on public.employer_verification_documents
for all
to authenticated
using (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
)
with check (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
);

-- Jobs are publicly readable only when published and employer verified.
drop policy if exists "jobs_public_select_published" on public.jobs;
create policy "jobs_public_select_published"
on public.jobs
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.employers e
    where e.id = employer_id
    and e.verification_status = 'verified'
  )
);

drop policy if exists "jobs_owner_and_admin_all" on public.jobs;
create policy "jobs_owner_and_admin_all"
on public.jobs
for all
to authenticated
using (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
)
with check (
  exists (
    select 1 from public.employers e
    where e.id = employer_id
    and (
      e.auth_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
    )
  )
);

-- Candidate profile and resumes.
drop policy if exists "candidate_profiles_self_and_admin" on public.candidate_profiles;
create policy "candidate_profiles_self_and_admin"
on public.candidate_profiles
for all
to authenticated
using (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "candidate_resumes_self_and_admin" on public.candidate_resumes;
create policy "candidate_resumes_self_and_admin"
on public.candidate_resumes
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

-- Job applications and status events.
drop policy if exists "applications_owner_employer_admin" on public.job_applications_v2;
create policy "applications_owner_employer_admin"
on public.job_applications_v2
for all
to authenticated
using (
  exists (
    select 1 from public.candidate_profiles c
    where c.id = candidate_id
    and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
    and e.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (
    select 1 from public.candidate_profiles c
    where c.id = candidate_id
    and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
    and e.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "application_events_visibility" on public.job_application_status_events;
create policy "application_events_visibility"
on public.job_application_status_events
for select
to authenticated
using (
  exists (
    select 1 from public.job_applications_v2 a
    join public.candidate_profiles c on c.id = a.candidate_id
    where a.id = application_id
    and c.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.job_applications_v2 a
    join public.jobs j on j.id = a.job_id
    join public.employers e on e.id = j.employer_id
    where a.id = application_id
    and e.auth_user_id = auth.uid()
  )
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

-- Saved jobs.
drop policy if exists "saved_jobs_self_and_admin" on public.saved_jobs;
create policy "saved_jobs_self_and_admin"
on public.saved_jobs
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

-- Notifications and audit logs are restricted.
drop policy if exists "notifications_user_or_admin" on public.notifications;
create policy "notifications_user_or_admin"
on public.notifications
for all
to authenticated
using (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  auth.uid() = auth_user_id
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "audit_logs_admin_only" on public.audit_logs;
create policy "audit_logs_admin_only"
on public.audit_logs
for all
to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'));

-- Storage buckets for secure document handling.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'company-documents',
    'company-documents',
    false,
    10485760,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
  ),
  (
    'company-logos',
    'company-logos',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'candidate-resumes',
    'candidate-resumes',
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

-- Storage policies scoped by authenticated user folder prefix.
drop policy if exists "company_documents_owner_upload" on storage.objects;
create policy "company_documents_owner_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "company_documents_owner_select" on storage.objects;
create policy "company_documents_owner_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);

drop policy if exists "company_documents_owner_update_delete" on storage.objects;
create policy "company_documents_owner_update_delete"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'company-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);

drop policy if exists "company_logos_owner_all" on storage.objects;
create policy "company_logos_owner_all"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'company-logos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'company-logos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);

drop policy if exists "candidate_resumes_owner_all" on storage.objects;
create policy "candidate_resumes_owner_all"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'candidate-resumes'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'candidate-resumes'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);
