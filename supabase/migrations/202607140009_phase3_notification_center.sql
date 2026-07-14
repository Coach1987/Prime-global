create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  category text not null check (category in ('interview', 'offer', 'status_change', 'message', 'email', 'dashboard', 'realtime')),
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  delivery_channels text[] not null default array['dashboard', 'realtime'],
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_events_user_idx on public.notification_events (auth_user_id, is_read, created_at desc);

alter table public.notification_events enable row level security;

drop policy if exists "notification_events_owner_admin" on public.notification_events;
create policy "notification_events_owner_admin"
on public.notification_events
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
