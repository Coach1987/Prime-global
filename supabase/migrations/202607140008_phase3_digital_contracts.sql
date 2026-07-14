create table if not exists public.employment_contracts (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.job_offers(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  contract_storage_path text,
  status text not null default 'generated' check (status in ('generated', 'sent', 'signed', 'cancelled')),
  signature_hash text,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists employment_contracts_employer_idx on public.employment_contracts (employer_id, created_at desc);
create index if not exists employment_contracts_candidate_idx on public.employment_contracts (candidate_id, created_at desc);

alter table public.employment_contracts enable row level security;

drop policy if exists "employment_contracts_visibility" on public.employment_contracts;
create policy "employment_contracts_visibility"
on public.employment_contracts
for all
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or exists (select 1 from public.candidate_profiles c where c.id = candidate_id and c.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signed-contracts',
  'signed-contracts',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "signed_contracts_owner_all" on storage.objects;
create policy "signed_contracts_owner_all"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'signed-contracts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
)
with check (
  bucket_id = 'signed-contracts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  )
);
