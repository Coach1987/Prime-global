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

with invalid_ads as (
  select a.id, a.status, a.media_url
  from public.advertisements a
  left join storage.objects o
    on o.bucket_id = 'advertisement-media'
   and o.name = regexp_replace(trim(a.media_url), '^/+', '')
  where o.id is null
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
  'delete',
  null,
  'system',
  invalid_ads.status,
  null,
  'Removed advertisement because referenced media object was missing from advertisement-media bucket.',
  jsonb_build_object('media_url', invalid_ads.media_url, 'source', '202608040001_advertisement_media_integrity_guards')
from invalid_ads;

delete from public.advertisements a
using (
  select a2.id
  from public.advertisements a2
  left join storage.objects o
    on o.bucket_id = 'advertisement-media'
   and o.name = regexp_replace(trim(a2.media_url), '^/+', '')
  where o.id is null
) doomed
where a.id = doomed.id;
