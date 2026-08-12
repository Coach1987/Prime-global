alter table public.legal_acceptance_events enable row level security;

revoke all on table public.legal_acceptance_events from anon, authenticated;
revoke all on table public.legal_acceptance_events from service_role;

grant select, insert, delete on table public.legal_acceptance_events to service_role;

comment on table public.legal_acceptance_events is
  'Append-only legal acceptance evidence. Direct client access is prohibited; service-role DELETE is reserved for failed-registration rollback and isolated test cleanup.';