create table if not exists public.company_verification_requests (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  company_name text not null,
  commercial_registration_number text not null,
  tax_number text not null,
  country text not null,
  address text not null,
  official_email text not null,
  website text,
  phone_number text not null,
  responsible_person text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists company_verification_requests_employer_idx
  on public.company_verification_requests (employer_id, created_at desc);
create index if not exists company_verification_requests_status_idx
  on public.company_verification_requests (status, created_at desc);

create table if not exists public.company_verification_documents_v2 (
  id uuid primary key default gen_random_uuid(),
  verification_request_id uuid not null references public.company_verification_requests(id) on delete cascade,
  document_type text not null check (document_type in ('commercial_registration', 'tax_certificate', 'government_document')),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  expires_at date,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists company_verification_documents_request_idx
  on public.company_verification_documents_v2 (verification_request_id, created_at desc);

create table if not exists public.prime_trust_scores (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null unique references public.employers(id) on delete cascade,
  verification_score numeric(5,2) not null default 0 check (verification_score >= 0 and verification_score <= 100),
  hiring_history jsonb not null default '{}'::jsonb,
  response_time_hours numeric(8,2),
  completion_rate numeric(5,2) not null default 0 check (completion_rate >= 0 and completion_rate <= 100),
  trust_badge text not null default 'bronze' check (trust_badge in ('bronze', 'silver', 'gold', 'platinum')),
  computed_at timestamptz not null default timezone('utc', now())
);

create index if not exists prime_trust_scores_badge_idx
  on public.prime_trust_scores (trust_badge, verification_score desc);

alter table public.company_verification_requests enable row level security;
alter table public.company_verification_documents_v2 enable row level security;
alter table public.prime_trust_scores enable row level security;

drop policy if exists "company_verification_requests_owner_admin" on public.company_verification_requests;
create policy "company_verification_requests_owner_admin"
on public.company_verification_requests
for all
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

drop policy if exists "company_verification_documents_owner_admin" on public.company_verification_documents_v2;
create policy "company_verification_documents_owner_admin"
on public.company_verification_documents_v2
for all
to authenticated
using (
  exists (
    select 1 from public.company_verification_requests r
    join public.employers e on e.id = r.employer_id
    where r.id = verification_request_id
    and (e.auth_user_id = auth.uid() or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'))
  )
)
with check (
  exists (
    select 1 from public.company_verification_requests r
    join public.employers e on e.id = r.employer_id
    where r.id = verification_request_id
    and (e.auth_user_id = auth.uid() or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'))
  )
);

drop policy if exists "prime_trust_scores_owner_admin" on public.prime_trust_scores;
create policy "prime_trust_scores_owner_admin"
on public.prime_trust_scores
for select
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_company_verification_requests_updated_at on public.company_verification_requests;
create trigger trg_company_verification_requests_updated_at
before update on public.company_verification_requests
for each row
execute function public.set_updated_at_timestamp();

create or replace function public.refresh_prime_trust_score()
returns trigger
language plpgsql
as $$
begin
  insert into public.prime_trust_scores (employer_id, verification_score, hiring_history, response_time_hours, completion_rate, trust_badge, computed_at)
  values (
    new.employer_id,
    case
      when new.status = 'approved' then 92.5
      when new.status = 'pending' then 30.0
      when new.status = 'rejected' then 12.5
      when new.status = 'suspended' then 4.0
      else 0
    end,
    coalesce((select jsonb_build_object('approved', count(*)) from public.company_verification_requests where employer_id = new.employer_id and status = 'approved'), '{}'::jsonb),
    24,
    100,
    case
      when new.status = 'approved' then 'silver'
      when new.status = 'suspended' then 'bronze'
      else 'bronze'
    end,
    timezone('utc', now())
  )
  on conflict (employer_id) do update
  set verification_score = excluded.verification_score,
      hiring_history = excluded.hiring_history,
      response_time_hours = excluded.response_time_hours,
      completion_rate = excluded.completion_rate,
      trust_badge = excluded.trust_badge,
      computed_at = excluded.computed_at;

  return new;
end;
$$;

drop trigger if exists trg_prime_trust_score_refresh on public.company_verification_requests;
create trigger trg_prime_trust_score_refresh
after insert or update on public.company_verification_requests
for each row
execute function public.refresh_prime_trust_score();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-verification-documents',
  'company-verification-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
