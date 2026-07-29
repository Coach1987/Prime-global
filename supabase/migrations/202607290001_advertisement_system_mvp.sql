create extension if not exists pgcrypto;

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null check (char_length(trim(title_ar)) between 3 and 180),
  title_en text not null check (char_length(trim(title_en)) between 3 and 180),
  description_ar text not null check (char_length(trim(description_ar)) between 10 and 2000),
  description_en text not null check (char_length(trim(description_en)) between 10 and 2000),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  media_alt_ar text not null check (char_length(trim(media_alt_ar)) between 2 and 240),
  media_alt_en text not null check (char_length(trim(media_alt_en)) between 2 and 240),
  target_url text not null,
  cta_text_ar text not null check (char_length(trim(cta_text_ar)) between 2 and 80),
  cta_text_en text not null check (char_length(trim(cta_text_en)) between 2 and 80),
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'approved', 'rejected', 'active', 'paused', 'expired')),
  priority integer not null default 100 check (priority between 1 and 10000),
  starts_at timestamptz,
  ends_at timestamptz,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'passed', 'needs_review', 'failed')),
  moderation_reason text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint advertisements_schedule_valid check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists advertisements_status_idx
  on public.advertisements (status);

create index if not exists advertisements_schedule_idx
  on public.advertisements (starts_at, ends_at);

create index if not exists advertisements_priority_idx
  on public.advertisements (priority asc, updated_at desc);

create index if not exists advertisements_public_visibility_idx
  on public.advertisements (status, moderation_status, starts_at, ends_at, priority);

create table if not exists public.advertisement_audit_logs (
  id uuid primary key default gen_random_uuid(),
  advertisement_id uuid references public.advertisements(id) on delete set null,
  action text not null check (action in ('create', 'edit', 'submit_review', 'approve', 'reject', 'activate', 'pause', 'delete')),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  from_status text,
  to_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists advertisement_audit_logs_ad_id_created_idx
  on public.advertisement_audit_logs (advertisement_id, created_at desc);

create index if not exists advertisement_audit_logs_action_idx
  on public.advertisement_audit_logs (action, created_at desc);

create table if not exists public.advertisement_analytics_events (
  id uuid primary key default gen_random_uuid(),
  advertisement_id uuid not null references public.advertisements(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  locale text not null check (locale in ('en', 'ar')),
  session_hash text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  event_date date generated always as ((occurred_at at time zone 'utc')::date) stored,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists advertisement_analytics_ad_type_date_idx
  on public.advertisement_analytics_events (advertisement_id, event_type, event_date desc);

create unique index if not exists advertisement_analytics_unique_impression_per_day
  on public.advertisement_analytics_events (advertisement_id, event_type, session_hash, event_date)
  where event_type = 'impression';

create or replace function public.advertisements_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_advertisements_set_updated_at on public.advertisements;
create trigger trg_advertisements_set_updated_at
before update on public.advertisements
for each row
execute function public.advertisements_set_updated_at();

alter table public.advertisements enable row level security;
alter table public.advertisement_audit_logs enable row level security;
alter table public.advertisement_analytics_events enable row level security;

drop policy if exists "advertisements_public_active_select" on public.advertisements;
create policy "advertisements_public_active_select"
on public.advertisements
for select
to anon, authenticated
using (
  status = 'active'
  and moderation_status = 'passed'
  and (starts_at is null or starts_at <= timezone('utc', now()))
  and (ends_at is null or ends_at > timezone('utc', now()))
);

drop policy if exists "advertisements_admin_all" on public.advertisements;
create policy "advertisements_admin_all"
on public.advertisements
for all
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_audit_logs_admin_select" on public.advertisement_audit_logs;
create policy "advertisement_audit_logs_admin_select"
on public.advertisement_audit_logs
for select
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_audit_logs_admin_insert" on public.advertisement_audit_logs;
create policy "advertisement_audit_logs_admin_insert"
on public.advertisement_audit_logs
for insert
to authenticated
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_analytics_public_insert" on public.advertisement_analytics_events;
create policy "advertisement_analytics_public_insert"
on public.advertisement_analytics_events
for insert
to anon, authenticated
with check (
  char_length(session_hash) between 16 and 128
  and event_type in ('impression', 'click')
);

drop policy if exists "advertisement_analytics_admin_select" on public.advertisement_analytics_events;
create policy "advertisement_analytics_admin_select"
on public.advertisement_analytics_events
for select
to authenticated
using (
  coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

grant select on public.advertisements to anon, authenticated;
grant insert on public.advertisement_analytics_events to anon, authenticated;
grant select on public.advertisement_analytics_events to authenticated;
grant insert, select on public.advertisement_audit_logs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advertisement-media',
  'advertisement-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "advertisement_media_admin_select" on storage.objects;
create policy "advertisement_media_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'advertisement-media'
  and coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_media_admin_insert" on storage.objects;
create policy "advertisement_media_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'advertisement-media'
  and coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_media_admin_update" on storage.objects;
create policy "advertisement_media_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'advertisement-media'
  and coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
)
with check (
  bucket_id = 'advertisement-media'
  and coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);

drop policy if exists "advertisement_media_admin_delete" on storage.objects;
create policy "advertisement_media_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'advertisement-media'
  and coalesce(auth.jwt() ->> 'app_role', '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin')
);
