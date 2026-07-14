create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete cascade,
  candidate_id uuid references public.candidate_profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_party_chk check (employer_id is not null or candidate_id is not null)
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  auth_user_id uuid not null,
  role text not null check (role in ('employer', 'candidate', 'admin', 'super_admin')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, auth_user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_auth_user_id uuid not null,
  body text not null,
  attachment_storage_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index if not exists conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_owner_admin" on public.conversations;
create policy "conversations_owner_admin"
on public.conversations
for all
to authenticated
using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = id and p.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
  or exists (select 1 from public.conversation_participants p where p.conversation_id = id and p.auth_user_id = auth.uid())
);

drop policy if exists "conversation_participants_owner_admin" on public.conversation_participants;
create policy "conversation_participants_owner_admin"
on public.conversation_participants
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

drop policy if exists "messages_owner_admin" on public.messages;
create policy "messages_owner_admin"
on public.messages
for all
to authenticated
using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
)
with check (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);

create table if not exists public.hiring_funnel_metrics (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  applications_count integer not null default 0,
  interviews_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  time_to_hire_days numeric(8, 2),
  computed_at timestamptz not null default timezone('utc', now()),
  unique (employer_id)
);

alter table public.hiring_funnel_metrics enable row level security;

drop policy if exists "hiring_metrics_owner_admin" on public.hiring_funnel_metrics;
create policy "hiring_metrics_owner_admin"
on public.hiring_funnel_metrics
for select
to authenticated
using (
  exists (select 1 from public.employers e where e.id = employer_id and e.auth_user_id = auth.uid())
  or coalesce(auth.jwt() ->> 'app_role', '') in ('admin', 'super_admin')
);
