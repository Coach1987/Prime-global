create or replace function public.set_candidate_primary_resume(
  p_candidate_id uuid,
  p_resume_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.candidate_resumes
  set is_primary = false
  where candidate_id = p_candidate_id;

  update public.candidate_resumes
  set is_primary = true
  where candidate_id = p_candidate_id
    and id = p_resume_id;

  if not found then
    raise exception 'resume_not_found' using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.set_candidate_primary_resume(uuid, uuid) to authenticated;
