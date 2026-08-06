-- ============================================================
-- Phase 1: Retract orphaned advertisements BEFORE triggers are
-- installed so the cleanup DML is not blocked by the guards it
-- is about to put in place.
-- ============================================================

-- Log every advertisement whose media_url references a missing storage object.
-- Skip already-retracted rows where media_url was cleared to ''.
with invalid_ads as (
  select a.id, a.status, a.media_url
  from public.advertisements a
  left join storage.objects o
    on o.bucket_id = 'advertisement-media'
   and o.name = regexp_replace(trim(a.media_url), '^/+', '')
  where o.id is null
    and a.media_url <> ''
)
insert into public.advertisement_audit_logs (
  advertisement_id,
  action,
  actor_auth_user_id,
  actor_role,
  from_status,
  to_status,
  reason,
  metadata
)
select
  invalid_ads.id,
  'edit',
  null,
  'system',
  invalid_ads.status,
  'draft',
  'Migration 202608040001: media object missing from advertisement-media bucket. Advertisement retracted to draft for re-upload.',
  jsonb_build_object(
    'media_url', invalid_ads.media_url,
    'source', '202608040001_advertisement_media_integrity_guards'
  )
from invalid_ads;

-- Retract to draft — never delete; employer can re-upload the media.
update public.advertisements a
set
  status            = 'draft',
  moderation_status = 'needs_review',
  moderation_reason = 'Migration 202608040001: media object missing from storage. Upload replacement media before resubmitting.',
  approved_by       = null,
  approved_at       = null,
  updated_at        = timezone('utc', now())
where exists (
  select 1
  from (
    select a2.id
    from public.advertisements a2
    left join storage.objects o
      on o.bucket_id = 'advertisement-media'
     and o.name = regexp_replace(trim(a2.media_url), '^/+', '')
    where o.id is null
      and a2.media_url <> ''
  ) orphaned
  where orphaned.id = a.id
);

-- ============================================================
-- Phase 2: Install integrity guards now that the table is clean.
-- ============================================================

create or replace function public.assert_advertisement_media_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  normalized_path text;
  media_exists boolean;
begin
  normalized_path := regexp_replace(trim(coalesce(new.media_url, '')), '^/+', '');

  if normalized_path = '' or position('://' in normalized_path) > 0 then
    raise exception using
      errcode = '22023',
      message = 'Invalid advertisement media path. media_url must be a storage object key.';
  end if;

  select exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'advertisement-media'
      and o.name = normalized_path
  )
  into media_exists;

  if new.status = 'active' and not media_exists then
    raise exception using
      errcode = '23503',
      message = 'Cannot activate advertisement because media object is missing from storage.';
  end if;

  if not media_exists then
    raise exception using
      errcode = '23503',
      message = format('Advertisement media object is missing for path "%s" in bucket advertisement-media.', normalized_path);
  end if;

  new.media_url := normalized_path;
  return new;
end;
$$;

drop trigger if exists trg_assert_advertisement_media_integrity on public.advertisements;
create trigger trg_assert_advertisement_media_integrity
before insert or update of media_url, status
on public.advertisements
for each row
execute function public.assert_advertisement_media_integrity();

create or replace function public.prevent_deleting_referenced_advertisement_media()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if old.bucket_id = 'advertisement-media' and exists (
    select 1
    from public.advertisements a
    where a.media_url = old.name
  ) then
    raise exception using
      errcode = '23503',
      message = format('Cannot delete advertisement media object "%s" because it is referenced by advertisements.', old.name);
  end if;

  return old;
end;
$$;

drop trigger if exists trg_prevent_deleting_referenced_advertisement_media on storage.objects;
create trigger trg_prevent_deleting_referenced_advertisement_media
before delete
on storage.objects
for each row
execute function public.prevent_deleting_referenced_advertisement_media();

create or replace function public.prevent_renaming_referenced_advertisement_media()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if old.bucket_id = 'advertisement-media'
    and (new.bucket_id is distinct from old.bucket_id or new.name is distinct from old.name)
    and exists (
      select 1
      from public.advertisements a
      where a.media_url = old.name
    ) then
    raise exception using
      errcode = '23503',
      message = format('Cannot rename or move advertisement media object "%s" because it is referenced by advertisements.', old.name);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_renaming_referenced_advertisement_media on storage.objects;
create trigger trg_prevent_renaming_referenced_advertisement_media
before update of bucket_id, name
on storage.objects
for each row
execute function public.prevent_renaming_referenced_advertisement_media();
