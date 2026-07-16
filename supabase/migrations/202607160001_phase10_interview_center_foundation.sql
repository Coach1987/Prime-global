alter table if exists public.recruitment_interviews
  add column if not exists meeting_provider text not null default 'prime_global_meeting_center',
  add column if not exists external_meeting_links_blocked boolean not null default true,
  add column if not exists meeting_room_reference text,
  add column if not exists meeting_metadata jsonb not null default '{}'::jsonb,
  add column if not exists meeting_duration_seconds integer;

create table if not exists public.recruitment_interview_events (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.recruitment_interviews(id) on delete cascade,
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  actor_auth_user_id uuid,
  actor_role text not null check (actor_role in ('employer', 'candidate', 'prime_global_staff')),
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_interview_events_interview_idx
  on public.recruitment_interview_events (interview_id, created_at asc);

create table if not exists public.recruitment_interview_chat_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.recruitment_interviews(id) on delete cascade,
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  sender_auth_user_id uuid not null,
  sender_role text not null check (sender_role in ('employer', 'candidate', 'prime_global_staff')),
  body text not null,
  moderation_state text not null default 'approved'
    check (moderation_state in ('approved', 'requires_review', 'rejected')),
  contains_contact_attempt boolean not null default false,
  visible_to_employer boolean not null default true,
  visible_to_candidate boolean not null default true,
  visible_to_staff boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_interview_chat_messages_interview_idx
  on public.recruitment_interview_chat_messages (interview_id, created_at asc);
