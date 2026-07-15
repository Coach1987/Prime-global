create extension if not exists pgcrypto;

create table if not exists public.recruitment_conversation_requests (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  employer_auth_user_id uuid not null,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  candidate_auth_user_id uuid,
  related_job_id uuid references public.jobs(id) on delete set null,
  related_application_id uuid references public.job_applications_v2(id) on delete set null,
  status text not null default 'pending_prime_global_assignment'
    check (status in ('pending_prime_global_assignment', 'pending_staff_review', 'approved', 'rejected', 'cancelled', 'expired')),
  requested_message text,
  assigned_staff_user_id uuid,
  reviewed_by_staff_user_id uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_conversation_requests_employer_idx
  on public.recruitment_conversation_requests (employer_id, created_at desc);

create index if not exists recruitment_conversation_requests_candidate_idx
  on public.recruitment_conversation_requests (candidate_id, created_at desc);

create index if not exists recruitment_conversation_requests_staff_idx
  on public.recruitment_conversation_requests (assigned_staff_user_id, created_at desc);

create table if not exists public.recruitment_conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.recruitment_conversation_requests(id) on delete set null,
  employer_id uuid not null references public.employers(id) on delete cascade,
  employer_auth_user_id uuid not null,
  candidate_id uuid not null references public.candidate_profiles(id) on delete cascade,
  candidate_auth_user_id uuid not null,
  assigned_staff_id uuid not null,
  related_job_id uuid references public.jobs(id) on delete set null,
  related_application_id uuid references public.job_applications_v2(id) on delete set null,
  status text not null default 'pending_candidate_acceptance'
    check (status in ('pending_candidate_acceptance', 'active', 'paused', 'closed', 'archived')),
  recruitment_stage text not null default 'conversation_requested'
    check (recruitment_stage in ('conversation_requested', 'candidate_review', 'active_dialogue', 'interview_planning', 'interview_live', 'offer_review', 'closed')),
  escalated_to_admin boolean not null default false,
  paused_reason text,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  closed_at timestamptz,
  closure_reason text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recruitment_conversations_supervision_chk check (
    status not in ('active', 'paused')
    or (
      employer_auth_user_id is not null
      and candidate_auth_user_id is not null
      and assigned_staff_id is not null
      and activated_at is not null
    )
  )
);

create index if not exists recruitment_conversations_employer_idx
  on public.recruitment_conversations (employer_id, updated_at desc);

create index if not exists recruitment_conversations_candidate_idx
  on public.recruitment_conversations (candidate_id, updated_at desc);

create index if not exists recruitment_conversations_staff_idx
  on public.recruitment_conversations (assigned_staff_id, updated_at desc);

create table if not exists public.recruitment_conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  auth_user_id uuid not null,
  participant_role text not null check (participant_role in ('employer', 'candidate', 'prime_global_staff')),
  participation_status text not null default 'active' check (participation_status in ('active', 'invited', 'declined', 'removed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, auth_user_id),
  unique (conversation_id, participant_role)
);

create index if not exists recruitment_conversation_participants_conversation_idx
  on public.recruitment_conversation_participants (conversation_id, participant_role);

create table if not exists public.recruitment_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  sender_auth_user_id uuid not null,
  sender_role text not null check (sender_role in ('employer', 'candidate', 'prime_global_staff', 'system')),
  message_type text not null default 'text' check (message_type in ('text', 'system', 'interview', 'moderation')),
  body text not null,
  moderation_state text not null default 'approved'
    check (moderation_state in ('approved', 'requires_review', 'rejected')),
  contains_contact_attempt boolean not null default false,
  visible_to_employer boolean not null default true,
  visible_to_candidate boolean not null default true,
  visible_to_staff boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_messages_conversation_idx
  on public.recruitment_messages (conversation_id, created_at asc);

create table if not exists public.recruitment_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.recruitment_messages(id) on delete cascade,
  uploaded_by_auth_user_id uuid not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  storage_bucket text not null,
  storage_object_path text not null,
  moderation_state text not null default 'approved'
    check (moderation_state in ('approved', 'requires_review', 'rejected')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_message_attachments_message_idx
  on public.recruitment_message_attachments (message_id, created_at asc);

create table if not exists public.recruitment_internal_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  created_by_staff_user_id uuid not null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_internal_notes_conversation_idx
  on public.recruitment_internal_notes (conversation_id, created_at desc);

create table if not exists public.recruitment_interviews (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  related_application_id uuid references public.job_applications_v2(id) on delete set null,
  created_by_staff_user_id uuid not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 10 and 240),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'waiting', 'live', 'completed', 'cancelled', 'no_show')),
  host_started_at timestamptz,
  host_ended_at timestamptz,
  waiting_room_enabled boolean not null default true,
  camera_enabled boolean not null default true,
  microphone_enabled boolean not null default true,
  screen_sharing_enabled boolean not null default true,
  interview_result text,
  interview_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_interviews_conversation_idx
  on public.recruitment_interviews (conversation_id, scheduled_at desc);

create table if not exists public.recruitment_interview_participants (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.recruitment_interviews(id) on delete cascade,
  auth_user_id uuid not null,
  participant_role text not null check (participant_role in ('employer', 'candidate', 'prime_global_staff')),
  presence_status text not null default 'invited' check (presence_status in ('invited', 'joined', 'left', 'declined')),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (interview_id, auth_user_id),
  unique (interview_id, participant_role)
);

create table if not exists public.recruitment_moderation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.recruitment_conversations(id) on delete cascade,
  message_id uuid references public.recruitment_messages(id) on delete set null,
  actor_auth_user_id uuid,
  event_type text not null,
  moderation_state text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recruitment_moderation_events_conversation_idx
  on public.recruitment_moderation_events (conversation_id, created_at desc);

create or replace function public.recruitment_is_prime_staff(role_value text)
returns boolean
language sql
stable
as $$
  select coalesce(role_value, '') in ('prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin');
$$;

create or replace function public.recruitment_can_access_conversation(conversation_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.recruitment_conversations c
    where c.id = conversation_uuid
      and (
        c.employer_auth_user_id = auth.uid()
        or c.candidate_auth_user_id = auth.uid()
        or c.assigned_staff_id = auth.uid()
        or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
      )
  );
$$;

create or replace function public.recruitment_can_manage_request(request_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.recruitment_conversation_requests r
    where r.id = request_uuid
      and (
        r.employer_auth_user_id = auth.uid()
        or r.candidate_auth_user_id = auth.uid()
        or r.assigned_staff_user_id = auth.uid()
        or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
      )
  );
$$;

create or replace function public.ensure_recruitment_conversation_participants()
returns trigger
language plpgsql
as $$
declare
  participant_count integer;
  has_employer boolean;
  has_candidate boolean;
  has_staff boolean;
begin
  select count(*),
    bool_or(participant_role = 'employer' and participation_status = 'active'),
    bool_or(participant_role = 'candidate' and participation_status in ('active', 'invited')),
    bool_or(participant_role = 'prime_global_staff' and participation_status = 'active')
  into participant_count, has_employer, has_candidate, has_staff
  from public.recruitment_conversation_participants
  where conversation_id = coalesce(new.conversation_id, old.conversation_id);

  if participant_count > 3 then
    raise exception 'Recruitment conversations may not contain more than three participants';
  end if;

  update public.recruitment_conversations
  set updated_at = timezone('utc', now())
  where id = coalesce(new.conversation_id, old.conversation_id);

  if tg_op = 'DELETE' and old.participant_role = 'prime_global_staff' then
    raise exception 'Prime Global staff supervision is mandatory';
  end if;

  if exists (
    select 1
    from public.recruitment_conversations c
    where c.id = coalesce(new.conversation_id, old.conversation_id)
      and c.status in ('active', 'paused')
      and not (coalesce(has_employer, false) and coalesce(has_candidate, false) and coalesce(has_staff, false))
  ) then
    raise exception 'Active supervised conversations require employer, candidate, and Prime Global staff participants';
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.recruitment_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.recruitment_touch_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.recruitment_conversations
  set last_message_at = new.created_at,
      updated_at = timezone('utc', now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_recruitment_conversation_requests_updated_at on public.recruitment_conversation_requests;
create trigger trg_recruitment_conversation_requests_updated_at
before update on public.recruitment_conversation_requests
for each row
execute function public.recruitment_set_updated_at();

drop trigger if exists trg_recruitment_conversations_updated_at on public.recruitment_conversations;
create trigger trg_recruitment_conversations_updated_at
before update on public.recruitment_conversations
for each row
execute function public.recruitment_set_updated_at();

drop trigger if exists trg_recruitment_conversation_participants_updated_at on public.recruitment_conversation_participants;
create trigger trg_recruitment_conversation_participants_updated_at
before update on public.recruitment_conversation_participants
for each row
execute function public.recruitment_set_updated_at();

drop trigger if exists trg_recruitment_interviews_updated_at on public.recruitment_interviews;
create trigger trg_recruitment_interviews_updated_at
before update on public.recruitment_interviews
for each row
execute function public.recruitment_set_updated_at();

drop trigger if exists trg_recruitment_participants_enforce_insert on public.recruitment_conversation_participants;
create trigger trg_recruitment_participants_enforce_insert
after insert on public.recruitment_conversation_participants
for each row
execute function public.ensure_recruitment_conversation_participants();

drop trigger if exists trg_recruitment_participants_enforce_update on public.recruitment_conversation_participants;
create trigger trg_recruitment_participants_enforce_update
after update on public.recruitment_conversation_participants
for each row
execute function public.ensure_recruitment_conversation_participants();

drop trigger if exists trg_recruitment_participants_enforce_delete on public.recruitment_conversation_participants;
create trigger trg_recruitment_participants_enforce_delete
after delete on public.recruitment_conversation_participants
for each row
execute function public.ensure_recruitment_conversation_participants();

drop trigger if exists trg_recruitment_messages_touch_conversation on public.recruitment_messages;
create trigger trg_recruitment_messages_touch_conversation
after insert on public.recruitment_messages
for each row
execute function public.recruitment_touch_last_message_at();

alter table public.recruitment_conversation_requests enable row level security;
alter table public.recruitment_conversations enable row level security;
alter table public.recruitment_conversation_participants enable row level security;
alter table public.recruitment_messages enable row level security;
alter table public.recruitment_message_attachments enable row level security;
alter table public.recruitment_internal_notes enable row level security;
alter table public.recruitment_interviews enable row level security;
alter table public.recruitment_interview_participants enable row level security;
alter table public.recruitment_moderation_events enable row level security;

drop policy if exists "recruitment_request_access" on public.recruitment_conversation_requests;
create policy "recruitment_request_access"
on public.recruitment_conversation_requests
for select
to authenticated
using (public.recruitment_can_manage_request(id));

drop policy if exists "recruitment_request_insert" on public.recruitment_conversation_requests;
create policy "recruitment_request_insert"
on public.recruitment_conversation_requests
for insert
to authenticated
with check (
  employer_auth_user_id = auth.uid()
  or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

drop policy if exists "recruitment_request_update" on public.recruitment_conversation_requests;
create policy "recruitment_request_update"
on public.recruitment_conversation_requests
for update
to authenticated
using (public.recruitment_can_manage_request(id))
with check (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  or employer_auth_user_id = auth.uid()
  or candidate_auth_user_id = auth.uid()
);

drop policy if exists "recruitment_conversation_access" on public.recruitment_conversations;
create policy "recruitment_conversation_access"
on public.recruitment_conversations
for select
to authenticated
using (public.recruitment_can_access_conversation(id));

drop policy if exists "recruitment_conversation_manage" on public.recruitment_conversations;
create policy "recruitment_conversation_manage"
on public.recruitment_conversations
for all
to authenticated
using (public.recruitment_can_access_conversation(id))
with check (
  employer_auth_user_id = auth.uid()
  or candidate_auth_user_id = auth.uid()
  or assigned_staff_id = auth.uid()
  or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

drop policy if exists "recruitment_participants_access" on public.recruitment_conversation_participants;
create policy "recruitment_participants_access"
on public.recruitment_conversation_participants
for select
to authenticated
using (public.recruitment_can_access_conversation(conversation_id));

drop policy if exists "recruitment_participants_manage" on public.recruitment_conversation_participants;
create policy "recruitment_participants_manage"
on public.recruitment_conversation_participants
for all
to authenticated
using (public.recruitment_can_access_conversation(conversation_id))
with check (
  auth_user_id = auth.uid()
  or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

drop policy if exists "recruitment_messages_access" on public.recruitment_messages;
create policy "recruitment_messages_access"
on public.recruitment_messages
for select
to authenticated
using (
  public.recruitment_can_access_conversation(conversation_id)
  and (
    visible_to_staff
    or (visible_to_employer and exists (
      select 1 from public.recruitment_conversations c
      where c.id = conversation_id and c.employer_auth_user_id = auth.uid()
    ))
    or (visible_to_candidate and exists (
      select 1 from public.recruitment_conversations c
      where c.id = conversation_id and c.candidate_auth_user_id = auth.uid()
    ))
    or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  )
);

drop policy if exists "recruitment_messages_manage" on public.recruitment_messages;
create policy "recruitment_messages_manage"
on public.recruitment_messages
for insert
to authenticated
with check (
  public.recruitment_can_access_conversation(conversation_id)
  and sender_auth_user_id = auth.uid()
);

drop policy if exists "recruitment_message_attachments_access" on public.recruitment_message_attachments;
create policy "recruitment_message_attachments_access"
on public.recruitment_message_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_messages m
    where m.id = message_id
      and public.recruitment_can_access_conversation(m.conversation_id)
  )
);

drop policy if exists "recruitment_message_attachments_manage" on public.recruitment_message_attachments;
create policy "recruitment_message_attachments_manage"
on public.recruitment_message_attachments
for insert
to authenticated
with check (uploaded_by_auth_user_id = auth.uid());

drop policy if exists "recruitment_internal_notes_staff_only" on public.recruitment_internal_notes;
create policy "recruitment_internal_notes_staff_only"
on public.recruitment_internal_notes
for all
to authenticated
using (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  and public.recruitment_can_access_conversation(conversation_id)
)
with check (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  and created_by_staff_user_id = auth.uid()
);

drop policy if exists "recruitment_interviews_access" on public.recruitment_interviews;
create policy "recruitment_interviews_access"
on public.recruitment_interviews
for select
to authenticated
using (public.recruitment_can_access_conversation(conversation_id));

drop policy if exists "recruitment_interviews_manage" on public.recruitment_interviews;
create policy "recruitment_interviews_manage"
on public.recruitment_interviews
for all
to authenticated
using (public.recruitment_can_access_conversation(conversation_id))
with check (
  created_by_staff_user_id = auth.uid()
  or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

drop policy if exists "recruitment_interview_participants_access" on public.recruitment_interview_participants;
create policy "recruitment_interview_participants_access"
on public.recruitment_interview_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_interviews i
    where i.id = interview_id
      and public.recruitment_can_access_conversation(i.conversation_id)
  )
);

drop policy if exists "recruitment_interview_participants_manage" on public.recruitment_interview_participants;
create policy "recruitment_interview_participants_manage"
on public.recruitment_interview_participants
for all
to authenticated
using (
  exists (
    select 1
    from public.recruitment_interviews i
    where i.id = interview_id
      and public.recruitment_can_access_conversation(i.conversation_id)
  )
)
with check (
  auth_user_id = auth.uid()
  or public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

drop policy if exists "recruitment_moderation_events_staff_only" on public.recruitment_moderation_events;
create policy "recruitment_moderation_events_staff_only"
on public.recruitment_moderation_events
for all
to authenticated
using (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
  and public.recruitment_can_access_conversation(conversation_id)
)
with check (
  public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recruitment-supervised-documents',
  'recruitment-supervised-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recruitment_supervised_documents_access" on storage.objects;
create policy "recruitment_supervised_documents_access"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'recruitment-supervised-documents'
  and public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
)
with check (
  bucket_id = 'recruitment-supervised-documents'
  and public.recruitment_is_prime_staff(auth.jwt() ->> 'app_role')
);