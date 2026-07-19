-- Phase 9: Candidate portal integration - allow candidate withdrawal in job applications status lifecycle

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'job_applications_v2_status_check'
      and conrelid = 'public.job_applications_v2'::regclass
  ) then
    alter table public.job_applications_v2
      drop constraint job_applications_v2_status_check;
  end if;

  alter table public.job_applications_v2
    add constraint job_applications_v2_status_check
    check (status in ('new', 'reviewing', 'interview', 'shortlisted', 'accepted', 'rejected', 'withdrawn'));
end
$$;
