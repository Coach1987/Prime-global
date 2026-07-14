create table if not exists public.partner_job_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  company_website text,
  country text not null,
  target_hiring_regions jsonb not null default '[]'::jsonb,
  job_titles jsonb not null default '[]'::jsonb,
  headcount integer not null default 1 check (headcount > 0),
  budget_range text,
  timeline text,
  notes text,
  source text not null default 'public_partner_request',
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected', 'fulfilled')),
  assigned_to uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists partner_job_requests_status_idx
  on public.partner_job_requests (status, created_at desc);
create index if not exists partner_job_requests_country_idx
  on public.partner_job_requests (country, created_at desc);

alter table public.partner_job_requests enable row level security;

drop policy if exists "partner_job_requests_admin_read_write" on public.partner_job_requests;
create policy "partner_job_requests_admin_read_write"
on public.partner_job_requests
for all
to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin'));

create or replace function public.set_partner_job_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_partner_job_requests_updated_at on public.partner_job_requests;
create trigger trg_partner_job_requests_updated_at
before update on public.partner_job_requests
for each row
execute function public.set_partner_job_requests_updated_at();
