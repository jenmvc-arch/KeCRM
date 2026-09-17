-- FlowTrace CRM initial Supabase schema
--
-- Run this migration with `supabase db push` or paste it into the Supabase SQL
-- Editor for a new project. It contains no platform tokens or other secrets.
-- Store WhatsApp, Meta, and AI credentials in Supabase Edge Function Secrets
-- (or Vault), never in the tables below.

begin;

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  create type public.organization_role as enum ('owner', 'sales');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.operating_mode as enum ('demo', 'production');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.integration_provider as enum ('whatsapp', 'meta_capi', 'ai', 'order_system');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.integration_state as enum ('not_connected', 'testing', 'connected', 'disabled', 'error');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.customer_quality as enum ('unknown', 'qualified', 'disqualified');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_stage as enum ('new', 'needs_confirmed', 'quoted', 'booked', 'won', 'lost');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.contact_channel as enum ('whatsapp', 'phone', 'email');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.attribution_status as enum ('matched', 'unknown', 'unmapped');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ai_analysis_status as enum ('queued', 'completed', 'failed', 'skipped');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.follow_up_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.conversion_standard as enum ('deposit_paid', 'paid_in_full');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_payment_status as enum ('unpaid', 'deposit_paid', 'paid_in_full', 'cancelled', 'refunded');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_event_type as enum ('created', 'unpaid', 'deposit_paid', 'paid_in_full', 'cancelled', 'refunded', 'note');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.meta_delivery_status as enum ('queued', 'processing', 'succeeded', 'failed', 'blocked', 'suppressed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.meta_attempt_status as enum ('succeeded', 'failed', 'skipped');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  default_currency char(3) not null default 'MYR' check (default_currency ~ '^[A-Z]{3}$'),
  time_zone text not null default 'Asia/Kuala_Lumpur',
  operating_mode public.operating_mode not null default 'demo',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'sales',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table if not exists public.business_rule_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check (version > 0),
  product_service text not null default '',
  service_areas text[] not null default '{}'::text[],
  min_budget numeric(14, 2) check (min_budget is null or min_budget >= 0),
  currency char(3) not null default 'MYR' check (currency ~ '^[A-Z]{3}$'),
  qualification_criteria text not null default '',
  conversion_standard public.conversion_standard not null default 'deposit_paid',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, version),
  unique (organization_id, id)
);

create unique index if not exists business_rule_versions_one_active_per_org
  on public.business_rule_versions (organization_id)
  where is_active;

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  state public.integration_state not null default 'not_connected',
  safe_config jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_config) = 'object'),
  secret_reference text,
  last_error_code text,
  last_error_message text,
  last_checked_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  unique (organization_id, id)
);

comment on column public.integration_connections.safe_config is
  'Safe identifiers only, such as WABA ID, phone number ID, Dataset ID, provider name, or model name. Never place tokens, App Secrets, or API keys here.';
comment on column public.integration_connections.secret_reference is
  'A reference name for an Edge Function Secret or Vault entry, never the secret value.';

create table if not exists public.whatsapp_phone_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  integration_connection_id uuid not null,
  waba_id text not null,
  phone_number_id text not null,
  display_number text,
  state public.integration_state not null default 'not_connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone_number_id),
  unique (organization_id, id),
  foreign key (organization_id, integration_connection_id)
    references public.integration_connections(organization_id, id) on delete cascade
);

create table if not exists public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null default 'meta',
  external_account_id text not null,
  name text not null,
  currency char(3) not null default 'MYR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform, external_account_id),
  unique (organization_id, id)
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  ad_account_id uuid,
  platform text not null default 'meta',
  external_ad_id text,
  external_campaign_id text,
  external_adset_id text,
  name text not null,
  campaign_name text,
  adset_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts(organization_id, id) on delete restrict
);

create unique index if not exists ads_external_id_per_org_unique
  on public.ads (organization_id, platform, external_ad_id)
  where external_ad_id is not null;

create table if not exists public.ad_spend_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  ad_id uuid not null,
  metric_date date not null,
  spend numeric(14, 2) not null check (spend >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  impressions bigint check (impressions is null or impressions >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  imported_at timestamptz not null default now(),
  unique (organization_id, ad_id, metric_date, currency),
  foreign key (organization_id, ad_id)
    references public.ads(organization_id, id) on delete cascade
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_customer_key text,
  display_name text not null default '',
  owner_membership_id uuid references public.organization_members(id) on delete set null,
  quality public.customer_quality not null default 'unknown',
  sales_stage public.sales_stage not null default 'new',
  need_summary text,
  budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14, 2) check (budget_max is null or budget_max >= 0),
  budget_currency char(3) check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$'),
  region text,
  purchase_timeframe text,
  first_inquiry_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_max is null or budget_min is null or budget_max >= budget_min),
  unique (organization_id, id)
);

create unique index if not exists customers_external_key_per_org_unique
  on public.customers (organization_id, external_customer_key)
  where external_customer_key is not null;

create index if not exists customers_org_owner_updated_idx
  on public.customers (organization_id, owner_membership_id, last_interaction_at desc);

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  channel public.contact_channel not null,
  address_normalized text not null,
  display_value text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel, address_normalized),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade
);

create unique index if not exists customer_contacts_one_primary_per_channel
  on public.customer_contacts (customer_id, channel)
  where is_primary;

create table if not exists public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  integration_connection_id uuid not null,
  provider_delivery_id text not null,
  signature_verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed', 'ignored')),
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (organization_id, integration_connection_id, provider_delivery_id),
  foreign key (organization_id, integration_connection_id)
    references public.integration_connections(organization_id, id) on delete cascade
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  whatsapp_phone_number_id uuid,
  external_conversation_id text,
  opened_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  foreign key (organization_id, whatsapp_phone_number_id)
    references public.whatsapp_phone_numbers(organization_id, id) on delete restrict
);

create unique index if not exists conversations_external_reference_unique
  on public.conversations (whatsapp_phone_number_id, external_conversation_id)
  where external_conversation_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  conversation_id uuid not null,
  customer_id uuid not null,
  whatsapp_phone_number_id uuid,
  external_message_id text,
  direction public.message_direction not null,
  message_type text not null default 'text',
  body text,
  message_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(message_metadata) = 'object'),
  sent_at timestamptz not null default now(),
  delivery_state text,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, conversation_id)
    references public.conversations(organization_id, id) on delete cascade,
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  foreign key (organization_id, whatsapp_phone_number_id)
    references public.whatsapp_phone_numbers(organization_id, id) on delete restrict
);

create unique index if not exists messages_external_message_once
  on public.messages (whatsapp_phone_number_id, external_message_id)
  where external_message_id is not null;

create index if not exists messages_customer_sent_at_idx
  on public.messages (customer_id, sent_at desc);

create table if not exists public.customer_attribution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  message_id uuid,
  ad_id uuid,
  attribution_status public.attribution_status not null,
  ctwa_clid text,
  internal_click_id text,
  captured_at timestamptz not null default now(),
  is_first_touch boolean not null default false,
  source_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(source_payload) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  foreign key (organization_id, message_id)
    references public.messages(organization_id, id) on delete restrict,
  foreign key (organization_id, ad_id)
    references public.ads(organization_id, id) on delete restrict,
  check (
    attribution_status <> 'unknown'
    or (ad_id is null and ctwa_clid is null and internal_click_id is null)
  )
);

create unique index if not exists customer_attribution_one_first_touch
  on public.customer_attribution_events (customer_id)
  where is_first_touch;

create unique index if not exists customer_attribution_ctwa_clid_once
  on public.customer_attribution_events (organization_id, ctwa_clid)
  where ctwa_clid is not null;

create index if not exists customer_attribution_customer_captured_idx
  on public.customer_attribution_events (customer_id, captured_at);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  body text not null check (char_length(trim(body)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade
);

create table if not exists public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_source text not null default 'system' check (actor_source in ('user', 'webhook', 'ai', 'system')),
  action text not null,
  before_data jsonb not null default '{}'::jsonb check (jsonb_typeof(before_data) = 'object'),
  after_data jsonb not null default '{}'::jsonb check (jsonb_typeof(after_data) = 'object'),
  note text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade
);

create index if not exists customer_activities_customer_created_idx
  on public.customer_activities (customer_id, created_at desc);

create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  rule_version_id uuid,
  provider text not null,
  model_name text,
  prompt_version text,
  source_message_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(source_message_ids) = 'array'),
  status public.ai_analysis_status not null default 'queued',
  extracted_data jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_data) = 'object'),
  suggested_quality public.customer_quality,
  suggested_priority public.follow_up_priority,
  suggested_next_action text,
  reasoning text,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete cascade,
  foreign key (organization_id, rule_version_id)
    references public.business_rule_versions(organization_id, id) on delete restrict
);

create index if not exists ai_analyses_customer_created_idx
  on public.ai_analyses (customer_id, created_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  order_number text not null check (char_length(trim(order_number)) > 0),
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  payment_status public.order_payment_status not null default 'unpaid',
  qualifying_payment_at timestamptz,
  conversion_eligible boolean not null default false,
  conversion_eligible_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  recorded_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  record_request_payload jsonb not null check (jsonb_typeof(record_request_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number),
  unique (organization_id, id),
  unique (organization_id, id, customer_id),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  check (not conversion_eligible or conversion_eligible_at is not null)
);

create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc);
create index if not exists orders_conversion_queue_idx
  on public.orders (organization_id, conversion_eligible, updated_at desc)
  where conversion_eligible;

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null,
  customer_id uuid not null,
  event_type public.order_event_type not null,
  amount numeric(14, 2) check (amount is null or amount >= 0),
  note text,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, order_id, customer_id)
    references public.orders(organization_id, id, customer_id) on delete cascade
);

create index if not exists order_events_order_occurred_idx
  on public.order_events (order_id, occurred_at desc);

create table if not exists public.meta_conversion_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  integration_connection_id uuid,
  order_id uuid not null,
  customer_id uuid not null,
  event_name text not null default 'Purchase' check (event_name = 'Purchase'),
  event_id uuid not null default gen_random_uuid(),
  idempotency_key text not null,
  event_time timestamptz not null default now(),
  matching_data jsonb not null default '{}'::jsonb check (jsonb_typeof(matching_data) = 'object'),
  payload_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(payload_snapshot) = 'object'),
  delivery_status public.meta_delivery_status not null default 'queued',
  blocked_reason text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  meta_event_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id),
  unique (organization_id, order_id, event_name),
  unique (organization_id, event_name, idempotency_key),
  foreign key (organization_id, integration_connection_id)
    references public.integration_connections(organization_id, id) on delete restrict,
  foreign key (organization_id, order_id, customer_id)
    references public.orders(organization_id, id, customer_id) on delete restrict
);

create index if not exists meta_conversion_events_queue_idx
  on public.meta_conversion_events (organization_id, delivery_status, next_retry_at, created_at)
  where delivery_status in ('queued', 'failed', 'blocked');

create table if not exists public.meta_conversion_attempts (
  id uuid primary key default gen_random_uuid(),
  conversion_event_id uuid not null references public.meta_conversion_events(id) on delete cascade,
  attempt_no integer not null check (attempt_no > 0),
  attempted_at timestamptz not null default now(),
  status public.meta_attempt_status not null,
  http_status integer check (http_status is null or http_status between 100 and 599),
  provider_request_id text,
  retryable boolean not null default false,
  error_code text,
  error_message text,
  response_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(response_snapshot) = 'object'),
  unique (conversion_event_id, attempt_no)
);

create index if not exists meta_conversion_attempts_event_idx
  on public.meta_conversion_attempts (conversion_event_id, attempted_at desc);

-- Security-definer helpers are kept outside the public API schema. The RLS
-- policies below call them so member lookups do not recurse into themselves.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1), ''),
    new.email
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

create or replace function private.current_membership_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = (select auth.uid())
    and m.is_active
  limit 1;
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.is_active
        and m.role = any(p_roles)
    );
$$;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(
    p_organization_id,
    array['owner', 'sales']::public.organization_role[]
  );
$$;

create or replace function private.shares_organization(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_profile_id
    or exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = (select auth.uid())
        and mine.is_active
        and theirs.user_id = p_profile_id
        and theirs.is_active
    );
$$;

create or replace function private.validate_customer_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_membership_id is not null
    and not exists (
      select 1
      from public.organization_members m
      where m.id = new.owner_membership_id
        and m.organization_id = new.organization_id
        and m.is_active
    ) then
    raise exception 'Customer owner must be an active member of the same organization';
  end if;
  return new;
end;
$$;

create trigger customers_validate_owner
  before insert or update of organization_id, owner_membership_id on public.customers
  for each row execute procedure private.validate_customer_owner();

create or replace function private.can_access_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and (
        private.has_org_role(c.organization_id, array['owner']::public.organization_role[])
        or c.owner_membership_id = private.current_membership_id(c.organization_id)
      )
  );
$$;

create or replace function private.can_access_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and private.can_access_customer(o.customer_id)
  );
$$;

create or replace function private.prevent_removing_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_count integer;
begin
  if old.role = 'owner'
    and old.is_active
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.is_active = false
    ) then
    select count(*)
      into v_owner_count
      from public.organization_members m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.is_active;
    if v_owner_count <= 1 then
      raise exception 'An organization must retain at least one active owner';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger organization_members_keep_owner
  before delete or update of role, is_active on public.organization_members
  for each row execute procedure private.prevent_removing_last_owner();

create or replace function private.prevent_first_touch_overwrite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_first_touch and (
    new.is_first_touch is distinct from old.is_first_touch
    or new.ad_id is distinct from old.ad_id
    or new.ctwa_clid is distinct from old.ctwa_clid
    or new.internal_click_id is distinct from old.internal_click_id
    or new.attribution_status is distinct from old.attribution_status
  ) then
    raise exception 'First-touch attribution is immutable; add a new attribution event instead';
  end if;
  return new;
end;
$$;

create trigger customer_attribution_keep_first_touch
  before update on public.customer_attribution_events
  for each row execute procedure private.prevent_first_touch_overwrite();

create or replace function private.audit_customer_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.customer_activities (
      organization_id, customer_id, actor_user_id, actor_source, action, after_data
    ) values (
      new.organization_id,
      new.id,
      (select auth.uid()),
      case when (select auth.uid()) is null then 'system' else 'user' end,
      'customer_created',
      jsonb_build_object(
        'quality', new.quality,
        'sales_stage', new.sales_stage,
        'owner_membership_id', new.owner_membership_id
      )
    );
  elsif old.quality is distinct from new.quality
     or old.sales_stage is distinct from new.sales_stage
     or old.owner_membership_id is distinct from new.owner_membership_id
     or old.need_summary is distinct from new.need_summary
     or old.budget_min is distinct from new.budget_min
     or old.budget_max is distinct from new.budget_max
     or old.region is distinct from new.region
     or old.purchase_timeframe is distinct from new.purchase_timeframe then
    insert into public.customer_activities (
      organization_id, customer_id, actor_user_id, actor_source, action, before_data, after_data
    ) values (
      new.organization_id,
      new.id,
      (select auth.uid()),
      case when (select auth.uid()) is null then 'system' else 'user' end,
      'customer_updated',
      jsonb_build_object(
        'quality', old.quality,
        'sales_stage', old.sales_stage,
        'owner_membership_id', old.owner_membership_id,
        'need_summary', old.need_summary,
        'budget_min', old.budget_min,
        'budget_max', old.budget_max,
        'region', old.region,
        'purchase_timeframe', old.purchase_timeframe
      ),
      jsonb_build_object(
        'quality', new.quality,
        'sales_stage', new.sales_stage,
        'owner_membership_id', new.owner_membership_id,
        'need_summary', new.need_summary,
        'budget_min', new.budget_min,
        'budget_max', new.budget_max,
        'region', new.region,
        'purchase_timeframe', new.purchase_timeframe
      )
    );
  end if;
  return new;
end;
$$;

create trigger customers_audit_changes
  after insert or update on public.customers
  for each row execute procedure private.audit_customer_changes();

create or replace function private.apply_order_conversion_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_standard public.conversion_standard;
begin
  select r.conversion_standard
    into v_standard
    from public.business_rule_versions r
    where r.organization_id = new.organization_id
      and r.is_active
    order by r.version desc
    limit 1;

  if v_standard is null then
    raise exception 'An active business rule is required before recording orders';
  end if;

  new.conversion_eligible := (
    new.payment_status not in ('cancelled', 'refunded')
    and (
      (v_standard = 'deposit_paid' and new.payment_status in ('deposit_paid', 'paid_in_full'))
      or (v_standard = 'paid_in_full' and new.payment_status = 'paid_in_full')
    )
  );

  if new.conversion_eligible then
    new.qualifying_payment_at := coalesce(new.qualifying_payment_at, now());
    new.conversion_eligible_at := coalesce(new.conversion_eligible_at, new.qualifying_payment_at, now());
  else
    new.conversion_eligible_at := null;
  end if;

  if new.payment_status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif new.payment_status = 'refunded' then
    new.refunded_at := coalesce(new.refunded_at, now());
  end if;

  return new;
end;
$$;

create trigger orders_apply_conversion_eligibility
  before insert or update of organization_id, payment_status, qualifying_payment_at, amount, currency
  on public.orders
  for each row execute procedure private.apply_order_conversion_eligibility();

create or replace function private.log_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type public.order_event_type;
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (
      organization_id, order_id, customer_id, event_type, amount, actor_user_id
    ) values (
      new.organization_id, new.id, new.customer_id, 'created', new.amount, (select auth.uid())
    );
  elsif old.payment_status is distinct from new.payment_status then
    v_event_type := new.payment_status::text::public.order_event_type;
    insert into public.order_events (
      organization_id, order_id, customer_id, event_type, amount, actor_user_id
    ) values (
      new.organization_id, new.id, new.customer_id, v_event_type, new.amount, (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger orders_log_events
  after insert or update on public.orders
  for each row execute procedure private.log_order_event();

create or replace function private.cancel_unsent_meta_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.conversion_eligible and not new.conversion_eligible then
    update public.meta_conversion_events
      set delivery_status = 'cancelled',
          blocked_reason = 'Order is no longer eligible because it was cancelled, refunded, or no longer meets the conversion standard.',
          next_retry_at = null,
          updated_at = now()
      where organization_id = new.organization_id
        and order_id = new.id
        and delivery_status in ('queued', 'processing', 'failed', 'blocked', 'suppressed');
  end if;
  return new;
end;
$$;

create trigger orders_cancel_unsent_meta_events
  after update on public.orders
  for each row execute procedure private.cancel_unsent_meta_events();

create or replace function private.validate_meta_conversion_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eligible boolean;
  v_mode public.operating_mode;
  v_paid_at timestamptz;
begin
  select o.conversion_eligible, org.operating_mode, o.conversion_eligible_at
    into v_eligible, v_mode, v_paid_at
    from public.orders o
    join public.organizations org on org.id = o.organization_id
    where o.id = new.order_id
      and o.organization_id = new.organization_id
      and o.customer_id = new.customer_id;

  if not found then
    raise exception 'Meta conversion event must reference an order and customer in the same organization';
  end if;

  if tg_op = 'UPDATE' and old.delivery_status = 'succeeded' then
    raise exception 'A successfully delivered Meta conversion event is immutable';
  end if;

  if not v_eligible then
    if tg_op = 'UPDATE'
      and new.delivery_status = 'cancelled'
      and old.delivery_status in ('queued', 'processing', 'failed', 'blocked', 'suppressed') then
      new.blocked_reason := coalesce(
        nullif(trim(new.blocked_reason), ''),
        'Order is no longer eligible because it was cancelled, refunded, or no longer meets the conversion standard.'
      );
      new.next_retry_at := null;
      return new;
    end if;

    raise exception 'Purchase events can only be created or kept active for conversion-eligible orders';
  end if;

  new.idempotency_key := coalesce(nullif(trim(new.idempotency_key), ''), 'purchase:' || new.order_id::text);
  new.event_time := coalesce(v_paid_at, new.event_time, now());

  if v_mode = 'demo' then
    new.delivery_status := 'suppressed';
    new.blocked_reason := 'Demo organization: outbound Meta delivery is disabled.';
  elsif new.integration_connection_id is null then
    new.delivery_status := 'blocked';
    new.blocked_reason := 'No connected Meta Conversions API integration is available for this organization.';
  elsif not exists (
    select 1
    from public.integration_connections c
    where c.id = new.integration_connection_id
      and c.organization_id = new.organization_id
      and c.provider = 'meta_capi'
      and c.state in ('testing', 'connected')
  ) then
    new.delivery_status := 'blocked';
    new.blocked_reason := 'The selected Meta Conversions API integration is not ready for delivery.';
  elsif new.matching_data = '{}'::jsonb then
    new.delivery_status := 'blocked';
    new.blocked_reason := 'Missing Meta matching data. Do not fabricate ctwa_clid or other identifiers.';
  elsif new.delivery_status in ('blocked', 'suppressed') then
    new.delivery_status := 'queued';
    new.blocked_reason := null;
  end if;

  return new;
end;
$$;

create trigger meta_conversion_events_validate
  before insert or update on public.meta_conversion_events
  for each row execute procedure private.validate_meta_conversion_event();

-- Common timestamp triggers.
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute procedure private.set_updated_at();
create trigger organization_members_set_updated_at before update on public.organization_members for each row execute procedure private.set_updated_at();
create trigger business_rules_set_updated_at before update on public.business_rule_versions for each row execute procedure private.set_updated_at();
create trigger integrations_set_updated_at before update on public.integration_connections for each row execute procedure private.set_updated_at();
create trigger whatsapp_numbers_set_updated_at before update on public.whatsapp_phone_numbers for each row execute procedure private.set_updated_at();
create trigger ad_accounts_set_updated_at before update on public.ad_accounts for each row execute procedure private.set_updated_at();
create trigger ads_set_updated_at before update on public.ads for each row execute procedure private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute procedure private.set_updated_at();
create trigger customer_contacts_set_updated_at before update on public.customer_contacts for each row execute procedure private.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute procedure private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute procedure private.set_updated_at();
create trigger meta_conversion_events_set_updated_at before update on public.meta_conversion_events for each row execute procedure private.set_updated_at();

-- A caller can create its first organization without direct INSERT privileges
-- on organization tables. The same transaction creates an owner membership and
-- an initial active rule version, so order validation always has a standard.
create or replace function public.create_organization(
  p_name text,
  p_default_currency text default 'MYR'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_currency char(3);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Organization name is required';
  end if;

  if upper(trim(coalesce(p_default_currency, 'MYR'))) !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;
  v_currency := upper(trim(coalesce(p_default_currency, 'MYR')))::char(3);

  insert into public.organizations (name, default_currency, created_by)
  values (trim(p_name), v_currency, (select auth.uid()))
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, (select auth.uid()), 'owner');

  insert into public.business_rule_versions (
    organization_id, version, currency, conversion_standard, is_active, created_by
  ) values (
    v_organization_id, 1, v_currency, 'deposit_paid', true, (select auth.uid())
  );

  return v_organization_id;
end;
$$;

create or replace function public.save_business_rule_version(
  p_organization_id uuid,
  p_product_service text,
  p_service_areas text[],
  p_min_budget numeric,
  p_currency text,
  p_qualification_criteria text,
  p_conversion_standard public.conversion_standard
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_version integer;
  v_rule_id uuid;
  v_currency char(3);
begin
  if not private.has_org_role(p_organization_id, array['owner']::public.organization_role[]) then
    raise exception 'Only organization owners can change business rules';
  end if;

  if upper(trim(coalesce(p_currency, ''))) !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;
  v_currency := upper(trim(p_currency))::char(3);

  select coalesce(max(version), 0) + 1
    into v_next_version
    from public.business_rule_versions
    where organization_id = p_organization_id;

  update public.business_rule_versions
    set is_active = false,
        updated_at = now()
    where organization_id = p_organization_id
      and is_active;

  insert into public.business_rule_versions (
    organization_id, version, product_service, service_areas, min_budget,
    currency, qualification_criteria, conversion_standard, is_active, created_by
  ) values (
    p_organization_id,
    v_next_version,
    coalesce(p_product_service, ''),
    coalesce(p_service_areas, '{}'::text[]),
    p_min_budget,
    v_currency,
    coalesce(p_qualification_criteria, ''),
    p_conversion_standard,
    true,
    (select auth.uid())
  ) returning id into v_rule_id;

  return v_rule_id;
end;
$$;

-- This RPC records an order and creates at most one Purchase queue item. Its
-- uniqueness constraints plus the INSERT ... ON CONFLICT guarantee prevent a
-- repeated click or retry from double-counting a conversion.
create or replace function public.record_order_and_enqueue_purchase(
  p_organization_id uuid,
  p_customer_id uuid,
  p_order_number text,
  p_amount numeric,
  p_currency text,
  p_payment_status public.order_payment_status,
  p_qualifying_payment_at timestamptz default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_currency char(3);
  v_meta_connection_id uuid;
  v_request_payload jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;

  if not private.can_access_customer(p_customer_id) then
    raise exception 'You cannot record an order for this customer';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.organization_id = p_organization_id
  ) then
    raise exception 'Customer does not belong to this organization';
  end if;

  if coalesce(trim(p_order_number), '') = '' or coalesce(p_amount, 0) <= 0 then
    raise exception 'A unique order number and a positive amount are required';
  end if;

  if upper(trim(coalesce(p_currency, ''))) !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter ISO code';
  end if;
  v_currency := upper(trim(p_currency))::char(3);

  v_request_payload := jsonb_build_object(
    'organization_id', p_organization_id,
    'customer_id', p_customer_id,
    'order_number', trim(p_order_number),
    'amount', p_amount,
    'currency', v_currency,
    'payment_status', p_payment_status,
    'qualifying_payment_at', p_qualifying_payment_at,
    'note', p_note
  );

  insert into public.orders (
    organization_id, customer_id, order_number, amount, currency, payment_status,
    qualifying_payment_at, recorded_by, updated_by, record_request_payload
  ) values (
    p_organization_id, p_customer_id, trim(p_order_number), p_amount, v_currency,
    p_payment_status, p_qualifying_payment_at, (select auth.uid()), (select auth.uid()),
    v_request_payload
  )
  on conflict (organization_id, order_number) do nothing
  returning * into v_order;

  if v_order.id is null then
    select o.*
      into v_order
      from public.orders o
      where o.organization_id = p_organization_id
        and o.order_number = trim(p_order_number);

    if v_order.record_request_payload = v_request_payload then
      return v_order.id;
    end if;

    raise exception using
      errcode = '23505',
      message = 'Order number already exists with different order details';
  end if;

  insert into public.customer_activities (
    organization_id, customer_id, actor_user_id, actor_source, action, after_data, note
  ) values (
    p_organization_id,
    p_customer_id,
    (select auth.uid()),
    'user',
    'order_recorded',
    jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'payment_status', v_order.payment_status,
      'conversion_eligible', v_order.conversion_eligible
    ),
    p_note
  );

  if v_order.conversion_eligible then
    select c.id
      into v_meta_connection_id
      from public.integration_connections c
      where c.organization_id = p_organization_id
        and c.provider = 'meta_capi'
        and c.state in ('testing', 'connected')
      limit 1;

    insert into public.meta_conversion_events (
      organization_id, integration_connection_id, order_id, customer_id, event_name, idempotency_key, event_time
    ) values (
      p_organization_id,
      v_meta_connection_id,
      v_order.id,
      p_customer_id,
      'Purchase',
      'purchase:' || v_order.id::text,
      coalesce(v_order.conversion_eligible_at, now())
    )
    on conflict (organization_id, order_id, event_name) do nothing;
  end if;

  return v_order.id;
end;
$$;

-- RLS helper functions are callable by policies only; `private` should not be
-- added to Supabase's exposed API schemas.
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.current_membership_id(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;
grant execute on function private.can_access_customer(uuid) to authenticated;
grant execute on function private.can_access_order(uuid) to authenticated;
revoke all on function public.create_organization(text, text) from public;
revoke all on function public.save_business_rule_version(uuid, text, text[], numeric, text, text, public.conversion_standard) from public;
revoke all on function public.record_order_and_enqueue_purchase(uuid, uuid, text, numeric, text, public.order_payment_status, timestamptz, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.save_business_rule_version(uuid, text, text[], numeric, text, text, public.conversion_standard) to authenticated;
grant execute on function public.record_order_and_enqueue_purchase(uuid, uuid, text, numeric, text, public.order_payment_status, timestamptz, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_rule_versions enable row level security;
alter table public.integration_connections enable row level security;
alter table public.whatsapp_phone_numbers enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.ads enable row level security;
alter table public.ad_spend_daily enable row level security;
alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.webhook_receipts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.customer_attribution_events enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_activities enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.meta_conversion_events enable row level security;
alter table public.meta_conversion_attempts enable row level security;

-- Remove broad defaults, then grant the minimum client-facing verbs. The
-- service role used by server-side functions bypasses RLS and must never be
-- placed in a browser or mobile client.
revoke all on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.business_rule_versions,
  public.integration_connections,
  public.whatsapp_phone_numbers,
  public.ad_accounts,
  public.ads,
  public.ad_spend_daily,
  public.customers,
  public.customer_contacts,
  public.webhook_receipts,
  public.conversations,
  public.messages,
  public.customer_attribution_events,
  public.customer_notes,
  public.customer_activities,
  public.ai_analyses,
  public.orders,
  public.order_events,
  public.meta_conversion_events,
  public.meta_conversion_attempts
from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select on public.business_rule_versions to authenticated;
grant select, insert, update on public.integration_connections to authenticated;
grant select, insert, update on public.whatsapp_phone_numbers to authenticated;
grant select, insert, update on public.ad_accounts, public.ads, public.ad_spend_daily to authenticated;
grant select, insert, update on public.customers, public.customer_contacts to authenticated;
grant select on public.webhook_receipts, public.conversations, public.messages, public.customer_activities, public.ai_analyses, public.orders, public.order_events, public.meta_conversion_events, public.meta_conversion_attempts to authenticated;
grant select on public.customer_attribution_events to authenticated;
grant select, insert on public.customer_notes to authenticated;
grant all on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.business_rule_versions,
  public.integration_connections,
  public.whatsapp_phone_numbers,
  public.ad_accounts,
  public.ads,
  public.ad_spend_daily,
  public.customers,
  public.customer_contacts,
  public.webhook_receipts,
  public.conversations,
  public.messages,
  public.customer_attribution_events,
  public.customer_notes,
  public.customer_activities,
  public.ai_analyses,
  public.orders,
  public.order_events,
  public.meta_conversion_events,
  public.meta_conversion_attempts
to service_role;
grant execute on function public.create_organization(text, text) to service_role;
grant execute on function public.save_business_rule_version(uuid, text, text[], numeric, text, text, public.conversion_standard) to service_role;
grant execute on function public.record_order_and_enqueue_purchase(uuid, uuid, text, numeric, text, public.order_payment_status, timestamptz, text) to service_role;

create policy profiles_select_shared_organization
  on public.profiles for select to authenticated
  using ((select private.shares_organization(id)));

create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_self
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy organizations_select_members
  on public.organizations for select to authenticated
  using ((select private.is_org_member(id)));

create policy organizations_update_owners
  on public.organizations for update to authenticated
  using ((select private.has_org_role(id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(id, array['owner']::public.organization_role[])));

create policy organization_members_select_members
  on public.organization_members for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy organization_members_manage_owners
  on public.organization_members for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy business_rule_versions_select_members
  on public.business_rule_versions for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy integration_connections_select_owners
  on public.integration_connections for select to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy integration_connections_manage_owners
  on public.integration_connections for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy whatsapp_phone_numbers_select_owners
  on public.whatsapp_phone_numbers for select to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy whatsapp_phone_numbers_manage_owners
  on public.whatsapp_phone_numbers for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy ad_accounts_select_members
  on public.ad_accounts for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy ad_accounts_manage_owners
  on public.ad_accounts for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy ads_select_members
  on public.ads for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy ads_manage_owners
  on public.ads for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy ad_spend_daily_select_members
  on public.ad_spend_daily for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy ad_spend_daily_manage_owners
  on public.ad_spend_daily for all to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])))
  with check ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy customers_select_owners_or_assignees
  on public.customers for select to authenticated
  using ((select private.can_access_customer(id)));

create policy customers_insert_owners_or_self_assignments
  on public.customers for insert to authenticated
  with check (
    (select private.has_org_role(organization_id, array['owner']::public.organization_role[]))
    or owner_membership_id = (select private.current_membership_id(organization_id))
  );

create policy customers_update_owners_or_assignees
  on public.customers for update to authenticated
  using ((select private.can_access_customer(id)))
  with check (
    (select private.has_org_role(organization_id, array['owner']::public.organization_role[]))
    or owner_membership_id = (select private.current_membership_id(organization_id))
  );

create policy customer_contacts_select_customer_access
  on public.customer_contacts for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy customer_contacts_insert_customer_access
  on public.customer_contacts for insert to authenticated
  with check ((select private.can_access_customer(customer_id)));

create policy customer_contacts_update_customer_access
  on public.customer_contacts for update to authenticated
  using ((select private.can_access_customer(customer_id)))
  with check ((select private.can_access_customer(customer_id)));

create policy webhook_receipts_select_owners
  on public.webhook_receipts for select to authenticated
  using ((select private.has_org_role(organization_id, array['owner']::public.organization_role[])));

create policy conversations_select_customer_access
  on public.conversations for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy messages_select_customer_access
  on public.messages for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy attribution_select_customer_access
  on public.customer_attribution_events for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy customer_notes_select_customer_access
  on public.customer_notes for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy customer_notes_insert_customer_access
  on public.customer_notes for insert to authenticated
  with check (
    (select private.can_access_customer(customer_id))
    and created_by = (select auth.uid())
  );

create policy customer_activities_select_customer_access
  on public.customer_activities for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy ai_analyses_select_customer_access
  on public.ai_analyses for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy orders_select_customer_access
  on public.orders for select to authenticated
  using ((select private.can_access_customer(customer_id)));

create policy order_events_select_customer_access
  on public.order_events for select to authenticated
  using ((select private.can_access_order(order_id)));

create policy meta_conversion_events_select_customer_access
  on public.meta_conversion_events for select to authenticated
  using ((select private.can_access_order(order_id)));

create policy meta_conversion_attempts_select_customer_access
  on public.meta_conversion_attempts for select to authenticated
  using (
    exists (
      select 1
      from public.meta_conversion_events e
      where e.id = conversion_event_id
        and private.can_access_order(e.order_id)
    )
  );

comment on table public.customer_attribution_events is
  'Append-only attribution history. Unknown sources must retain a null ad ID and null click IDs; first touch cannot be overwritten.';
comment on table public.meta_conversion_events is
  'A successful delivery only records Meta receipt status. It never proves attribution or that campaign conversion optimization is enabled.';
comment on table public.ai_analyses is
  'AI outputs are advisory records. They cannot automatically create orders, send messages, or enqueue a conversion outside server-side workflows.';

commit;
