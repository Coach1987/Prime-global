create table if not exists public.pgems_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  account_type text not null check (account_type in (
    'corporate_ledger',
    'customer_account',
    'employer_account',
    'candidate_wallet',
    'internal_treasury',
    'revenue_account',
    'expense_account',
    'tax_account',
    'reserve_account',
    'refund_account',
    'commission_account'
  )),
  natural_balance text not null default 'debit' check (natural_balance in ('debit', 'credit')),
  parent_account_id uuid references public.pgems_financial_accounts(id) on delete set null,
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  is_system boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_financial_journals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  journal_number text not null,
  source_domain text not null check (char_length(trim(source_domain)) between 2 and 120),
  source_reference text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'posted', 'voided')),
  journal_date date not null default current_date,
  posted_at timestamptz,
  posted_by_auth_user_id uuid,
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, journal_number)
);

create table if not exists public.pgems_financial_journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  journal_id uuid not null references public.pgems_financial_journals(id) on delete cascade,
  account_id uuid not null references public.pgems_financial_accounts(id) on delete restrict,
  entry_type text not null check (entry_type in ('debit', 'credit')),
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  exchange_rate numeric(20,8),
  base_amount numeric(20,6),
  line_description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_billing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 2 and 80),
  name text not null check (char_length(trim(name)) between 2 and 180),
  billing_type text not null check (billing_type in ('subscription', 'one_time', 'manual', 'enterprise_contract')),
  interval_unit text check (interval_unit in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  interval_count integer check (interval_count is null or interval_count between 1 and 120),
  amount numeric(20,6) not null default 0 check (amount >= 0),
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  trial_days integer not null default 0 check (trial_days between 0 and 365),
  grace_period_days integer not null default 0 check (grace_period_days between 0 and 365),
  auto_renew_default boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  account_id uuid not null references public.pgems_financial_accounts(id) on delete restrict,
  plan_id uuid not null references public.pgems_billing_plans(id) on delete restrict,
  subscriber_type text not null check (subscriber_type in ('employer', 'candidate', 'partner', 'enterprise', 'platform')),
  subscriber_reference text not null check (char_length(trim(subscriber_reference)) between 2 and 160),
  status text not null check (status in ('trialing', 'active', 'grace', 'past_due', 'paused', 'cancelled', 'expired')),
  starts_at timestamptz not null,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  cancelled_at timestamptz,
  auto_renew boolean not null default true,
  renewal_mode text not null default 'auto' check (renewal_mode in ('auto', 'manual')),
  external_contract_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  account_id uuid not null references public.pgems_financial_accounts(id) on delete restrict,
  subscription_id uuid references public.pgems_subscriptions(id) on delete set null,
  invoice_type text not null check (invoice_type in ('recurring', 'one_time', 'manual', 'proforma')),
  invoice_number text not null,
  invoice_sequence bigint not null,
  status text not null check (status in ('draft', 'issued', 'paid', 'partially_paid', 'past_due', 'void', 'cancelled', 'refunded')),
  currency_code text not null check (char_length(trim(currency_code)) between 3 and 10),
  subtotal_amount numeric(20,6) not null default 0,
  tax_amount numeric(20,6) not null default 0,
  discount_amount numeric(20,6) not null default 0,
  total_amount numeric(20,6) not null default 0,
  paid_amount numeric(20,6) not null default 0,
  due_amount numeric(20,6) not null default 0,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, invoice_number),
  unique (organization_id, invoice_sequence)
);

create table if not exists public.pgems_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  invoice_id uuid not null references public.pgems_invoices(id) on delete cascade,
  line_number integer not null check (line_number >= 1),
  item_code text,
  description text not null,
  quantity numeric(20,6) not null default 1 check (quantity > 0),
  unit_price numeric(20,6) not null default 0 check (unit_price >= 0),
  tax_code text,
  tax_rate numeric(10,6) default 0 check (tax_rate >= 0),
  line_subtotal numeric(20,6) not null default 0,
  line_tax_amount numeric(20,6) not null default 0,
  line_total numeric(20,6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (invoice_id, line_number)
);

create table if not exists public.pgems_billing_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  run_type text not null check (run_type in ('recurring', 'manual', 'one_time')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  period_start timestamptz,
  period_end timestamptz,
  requested_by_auth_user_id uuid,
  started_at timestamptz,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_credit_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  invoice_id uuid not null references public.pgems_invoices(id) on delete cascade,
  note_number text not null,
  reason text,
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('draft', 'issued', 'applied', 'void')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, note_number)
);

create table if not exists public.pgems_debit_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  invoice_id uuid not null references public.pgems_invoices(id) on delete cascade,
  note_number text not null,
  reason text,
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('draft', 'issued', 'applied', 'void')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, note_number)
);

create table if not exists public.pgems_refund_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  invoice_id uuid references public.pgems_invoices(id) on delete set null,
  payment_id uuid,
  note_number text not null,
  reason text,
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('draft', 'issued', 'settled', 'void')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, note_number)
);

create table if not exists public.pgems_payment_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  provider_kind text not null check (provider_kind in ('gateway', 'bank_transfer', 'manual', 'cash')),
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_payment_provider_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  provider_id uuid not null references public.pgems_payment_providers(id) on delete cascade,
  mode text not null default 'test' check (mode in ('test', 'live')),
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, provider_id, mode)
);

create table if not exists public.pgems_payment_intents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  account_id uuid not null references public.pgems_financial_accounts(id) on delete restrict,
  invoice_id uuid references public.pgems_invoices(id) on delete set null,
  provider_config_id uuid references public.pgems_payment_provider_configs(id) on delete set null,
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('requires_payment_method', 'requires_confirmation', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text not null,
  external_intent_id text,
  payment_method_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, idempotency_key)
);

create table if not exists public.pgems_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  payment_intent_id uuid references public.pgems_payment_intents(id) on delete set null,
  invoice_id uuid references public.pgems_invoices(id) on delete set null,
  account_id uuid not null references public.pgems_financial_accounts(id) on delete restrict,
  provider_config_id uuid references public.pgems_payment_provider_configs(id) on delete set null,
  payment_channel text not null check (payment_channel in ('card', 'bank_transfer', 'wallet', 'manual', 'cash', 'other')),
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('pending', 'authorized', 'captured', 'settled', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  external_payment_id text,
  settled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pgems_refund_notes
  add constraint if not exists pgems_refund_notes_payment_fk
  foreign key (payment_id) references public.pgems_payments(id) on delete set null;

create table if not exists public.pgems_payment_refunds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  payment_id uuid not null references public.pgems_payments(id) on delete cascade,
  refund_note_id uuid references public.pgems_refund_notes(id) on delete set null,
  amount numeric(20,6) not null check (amount > 0),
  currency_code text not null,
  status text not null check (status in ('requested', 'processing', 'succeeded', 'failed', 'cancelled')),
  reason text,
  external_refund_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_commission_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  commission_type text not null check (commission_type in ('employer', 'recruitment', 'partner', 'referral', 'marketplace')),
  basis text not null check (basis in ('percentage', 'flat', 'tiered')),
  rate numeric(10,6),
  flat_amount numeric(20,6),
  currency_code text,
  min_amount numeric(20,6),
  max_amount numeric(20,6),
  effective_from timestamptz not null,
  effective_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_commission_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  policy_id uuid not null references public.pgems_commission_policies(id) on delete restrict,
  source_domain text not null,
  source_reference text not null,
  base_amount numeric(20,6) not null,
  commission_amount numeric(20,6) not null,
  currency_code text not null,
  beneficiary_type text not null check (beneficiary_type in ('platform', 'partner', 'referrer', 'recruiter')),
  beneficiary_reference text,
  status text not null check (status in ('calculated', 'accrued', 'payable', 'paid', 'reversed')),
  settled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_currency_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  symbol text,
  decimal_places integer not null default 2 check (decimal_places between 0 and 6),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pgems_exchange_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  base_currency_code text not null,
  quote_currency_code text not null,
  rate numeric(20,8) not null check (rate > 0),
  as_of timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider_code, base_currency_code, quote_currency_code, as_of)
);

create table if not exists public.pgems_tax_regimes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  code text not null,
  name text not null,
  country_code text not null,
  tax_kind text not null check (tax_kind in ('vat', 'gst', 'sales_tax', 'withholding', 'other')),
  adapter_code text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_tax_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  regime_id uuid not null references public.pgems_tax_regimes(id) on delete cascade,
  code text not null,
  name text not null,
  rate numeric(10,6) not null check (rate >= 0),
  applies_to text not null,
  effective_from timestamptz not null,
  effective_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, regime_id, code)
);

create table if not exists public.pgems_reconciliation_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  provider_config_id uuid references public.pgems_payment_provider_configs(id) on delete set null,
  code text not null,
  status text not null check (status in ('draft', 'in_progress', 'matched', 'mismatched', 'resolved', 'closed')),
  period_start timestamptz,
  period_end timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_by_auth_user_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, code)
);

create table if not exists public.pgems_financial_disputes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  payment_id uuid references public.pgems_payments(id) on delete set null,
  invoice_id uuid references public.pgems_invoices(id) on delete set null,
  code text not null,
  reason text,
  status text not null check (status in ('opened', 'under_review', 'won', 'lost', 'settled', 'cancelled')),
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (organization_id, code)
);

create table if not exists public.pgems_financial_approval_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.pgems_organizations(id) on delete cascade,
  operation_code text not null,
  min_authority_level integer not null default 0,
  required_permission_code text,
  separation_of_duty boolean not null default false,
  requires_two_person_rule boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, operation_code)
);

create table if not exists public.pgems_financial_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.pgems_organizations(id) on delete set null,
  event_type text not null,
  event_version integer not null default 1,
  aggregate_type text not null,
  aggregate_id text not null,
  source_domain text not null,
  source_reference text,
  actor_auth_user_id uuid,
  actor_role text,
  correlation_id text,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (idempotency_key)
);

create or replace function public.pgems_generate_invoice_number(p_organization_id uuid)
returns table (invoice_sequence bigint, invoice_number text)
language plpgsql
as $$
declare
  next_sequence bigint;
begin
  select coalesce(max(i.invoice_sequence), 0) + 1
  into next_sequence
  from public.pgems_invoices i
  where i.organization_id = p_organization_id;

  return query
  select
    next_sequence,
    format('PG-%s-%s', to_char(current_date, 'YYYYMM'), lpad(next_sequence::text, 8, '0'));
end;
$$;

create or replace function public.pgems_record_financial_event(
  p_organization_id uuid,
  p_event_type text,
  p_event_version integer,
  p_aggregate_type text,
  p_aggregate_id text,
  p_source_domain text,
  p_source_reference text,
  p_actor_auth_user_id uuid,
  p_actor_role text,
  p_correlation_id text,
  p_idempotency_key text,
  p_payload jsonb,
  p_metadata jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
as $$
declare
  inserted_id uuid;
begin
  insert into public.pgems_financial_events (
    organization_id,
    event_type,
    event_version,
    aggregate_type,
    aggregate_id,
    source_domain,
    source_reference,
    actor_auth_user_id,
    actor_role,
    correlation_id,
    idempotency_key,
    payload,
    metadata,
    occurred_at
  ) values (
    p_organization_id,
    p_event_type,
    coalesce(p_event_version, 1),
    p_aggregate_type,
    p_aggregate_id,
    p_source_domain,
    p_source_reference,
    p_actor_auth_user_id,
    p_actor_role,
    p_correlation_id,
    p_idempotency_key,
    coalesce(p_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, timezone('utc', now()))
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.pgems_prevent_financial_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pgems_financial_events is immutable';
end;
$$;

drop trigger if exists pgems_financial_events_no_update on public.pgems_financial_events;
create trigger pgems_financial_events_no_update
before update on public.pgems_financial_events
for each row execute function public.pgems_prevent_financial_event_mutation();

drop trigger if exists pgems_financial_events_no_delete on public.pgems_financial_events;
create trigger pgems_financial_events_no_delete
before delete on public.pgems_financial_events
for each row execute function public.pgems_prevent_financial_event_mutation();

create index if not exists pgems_financial_accounts_org_idx on public.pgems_financial_accounts (organization_id, account_type, is_active);
create index if not exists pgems_financial_journals_org_idx on public.pgems_financial_journals (organization_id, journal_date, status);
create index if not exists pgems_journal_entries_journal_idx on public.pgems_financial_journal_entries (journal_id);
create index if not exists pgems_invoices_org_status_idx on public.pgems_invoices (organization_id, status, due_at);
create index if not exists pgems_subscriptions_org_status_idx on public.pgems_subscriptions (organization_id, status, current_period_end);
create index if not exists pgems_payment_intents_org_status_idx on public.pgems_payment_intents (organization_id, status, created_at);
create index if not exists pgems_payments_org_status_idx on public.pgems_payments (organization_id, status, created_at);
create index if not exists pgems_commissions_org_status_idx on public.pgems_commission_records (organization_id, status, created_at);
create index if not exists pgems_financial_events_org_time_idx on public.pgems_financial_events (organization_id, occurred_at desc);
create index if not exists pgems_financial_events_aggregate_idx on public.pgems_financial_events (aggregate_type, aggregate_id, occurred_at desc);

alter table public.pgems_financial_accounts enable row level security;
alter table public.pgems_financial_journals enable row level security;
alter table public.pgems_financial_journal_entries enable row level security;
alter table public.pgems_billing_plans enable row level security;
alter table public.pgems_subscriptions enable row level security;
alter table public.pgems_invoices enable row level security;
alter table public.pgems_invoice_lines enable row level security;
alter table public.pgems_billing_runs enable row level security;
alter table public.pgems_credit_notes enable row level security;
alter table public.pgems_debit_notes enable row level security;
alter table public.pgems_refund_notes enable row level security;
alter table public.pgems_payment_providers enable row level security;
alter table public.pgems_payment_provider_configs enable row level security;
alter table public.pgems_payment_intents enable row level security;
alter table public.pgems_payments enable row level security;
alter table public.pgems_payment_refunds enable row level security;
alter table public.pgems_commission_policies enable row level security;
alter table public.pgems_commission_records enable row level security;
alter table public.pgems_currency_definitions enable row level security;
alter table public.pgems_exchange_rate_snapshots enable row level security;
alter table public.pgems_tax_regimes enable row level security;
alter table public.pgems_tax_rules enable row level security;
alter table public.pgems_reconciliation_batches enable row level security;
alter table public.pgems_financial_disputes enable row level security;
alter table public.pgems_financial_approval_policies enable row level security;
alter table public.pgems_financial_events enable row level security;

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_accounts;
create policy "pgems_internal_read_write" on public.pgems_financial_accounts
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_journals;
create policy "pgems_internal_read_write" on public.pgems_financial_journals
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_journal_entries;
create policy "pgems_internal_read_write" on public.pgems_financial_journal_entries
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_billing_plans;
create policy "pgems_internal_read_write" on public.pgems_billing_plans
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_subscriptions;
create policy "pgems_internal_read_write" on public.pgems_subscriptions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_invoices;
create policy "pgems_internal_read_write" on public.pgems_invoices
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_invoice_lines;
create policy "pgems_internal_read_write" on public.pgems_invoice_lines
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_billing_runs;
create policy "pgems_internal_read_write" on public.pgems_billing_runs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_credit_notes;
create policy "pgems_internal_read_write" on public.pgems_credit_notes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_debit_notes;
create policy "pgems_internal_read_write" on public.pgems_debit_notes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_refund_notes;
create policy "pgems_internal_read_write" on public.pgems_refund_notes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_payment_providers;
create policy "pgems_internal_read_write" on public.pgems_payment_providers
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_payment_provider_configs;
create policy "pgems_internal_read_write" on public.pgems_payment_provider_configs
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_payment_intents;
create policy "pgems_internal_read_write" on public.pgems_payment_intents
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_payments;
create policy "pgems_internal_read_write" on public.pgems_payments
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_payment_refunds;
create policy "pgems_internal_read_write" on public.pgems_payment_refunds
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_commission_policies;
create policy "pgems_internal_read_write" on public.pgems_commission_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_commission_records;
create policy "pgems_internal_read_write" on public.pgems_commission_records
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_currency_definitions;
create policy "pgems_internal_read_write" on public.pgems_currency_definitions
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_exchange_rate_snapshots;
create policy "pgems_internal_read_write" on public.pgems_exchange_rate_snapshots
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_tax_regimes;
create policy "pgems_internal_read_write" on public.pgems_tax_regimes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_tax_rules;
create policy "pgems_internal_read_write" on public.pgems_tax_rules
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_reconciliation_batches;
create policy "pgems_internal_read_write" on public.pgems_reconciliation_batches
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_disputes;
create policy "pgems_internal_read_write" on public.pgems_financial_disputes
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_approval_policies;
create policy "pgems_internal_read_write" on public.pgems_financial_approval_policies
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

drop policy if exists "pgems_internal_read_write" on public.pgems_financial_events;
create policy "pgems_internal_read_write" on public.pgems_financial_events
for all to authenticated
using (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'))
with check (coalesce(auth.jwt() ->> 'app_role', '') in ('employer', 'prime_global_recruiter', 'prime_global_admin', 'admin', 'super_admin'));

insert into public.pgems_currency_definitions (code, name, symbol, decimal_places, is_active)
values
  ('USD', 'US Dollar', '$', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('SAR', 'Saudi Riyal', 'SAR', 2, true),
  ('AED', 'UAE Dirham', 'AED', 2, true),
  ('QAR', 'Qatari Riyal', 'QAR', 2, true),
  ('KWD', 'Kuwaiti Dinar', 'KWD', 3, true),
  ('BHD', 'Bahraini Dinar', 'BHD', 3, true),
  ('OMR', 'Omani Rial', 'OMR', 3, true),
  ('TND', 'Tunisian Dinar', 'TND', 3, true)
on conflict (code) do update
set
  name = excluded.name,
  symbol = excluded.symbol,
  decimal_places = excluded.decimal_places,
  is_active = excluded.is_active;

insert into public.pgems_payment_providers (code, name, provider_kind, capabilities, is_active)
values
  ('stripe', 'Stripe', 'gateway', '{"supports": ["card", "wallet", "refund", "webhook"]}'::jsonb, true),
  ('paypal', 'PayPal', 'gateway', '{"supports": ["wallet", "refund", "dispute"]}'::jsonb, true),
  ('moyasar', 'Moyasar', 'gateway', '{"supports": ["card", "mada", "refund"]}'::jsonb, true),
  ('hyperpay', 'HyperPay', 'gateway', '{"supports": ["card", "mada", "apple_pay", "refund"]}'::jsonb, true),
  ('checkout_com', 'Checkout.com', 'gateway', '{"supports": ["card", "wallet", "refund"]}'::jsonb, true),
  ('paytabs', 'PayTabs', 'gateway', '{"supports": ["card", "refund"]}'::jsonb, true),
  ('bank_transfer', 'Bank Transfer', 'bank_transfer', '{"supports": ["bank_transfer", "manual_reconciliation"]}'::jsonb, true),
  ('manual', 'Manual Payment', 'manual', '{"supports": ["manual", "offline"]}'::jsonb, true),
  ('cash', 'Cash', 'cash', '{"supports": ["cash", "future"]}'::jsonb, false)
on conflict (code) do update
set
  name = excluded.name,
  provider_kind = excluded.provider_kind,
  capabilities = excluded.capabilities,
  is_active = excluded.is_active;
