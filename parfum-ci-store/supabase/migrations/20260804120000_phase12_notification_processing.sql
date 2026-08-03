-- Phase 12: notification outbox processing, retry metadata and low-stock alert state.
-- Forward-only migration. Do not edit applied migrations.

alter table public.notifications
  add column if not exists provider text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists claim_token uuid,
  add column if not exists claimed_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists retryable boolean,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancel_reason text;

update public.notifications
set next_attempt_at = coalesce(next_attempt_at, scheduled_at)
where next_attempt_at is null;

alter table public.notifications
  alter column next_attempt_at set default timezone('utc', now()),
  add constraint notifications_attempt_count_nonnegative check (attempt_count >= 0),
  add constraint notifications_max_attempts_bounds check (max_attempts between 1 and 10),
  add constraint notifications_cancel_reason_length check (cancel_reason is null or char_length(cancel_reason) <= 300),
  add constraint notifications_last_error_code_length check (last_error_code is null or char_length(last_error_code) <= 120),
  add constraint notifications_last_error_message_length check (last_error_message is null or char_length(last_error_message) <= 300);

create index if not exists notifications_claimable_idx
  on public.notifications(status, channel, next_attempt_at, scheduled_at, created_at)
  where status in ('PENDING', 'FAILED', 'PROCESSING');

create index if not exists notifications_template_idx
  on public.notifications(template_key);

create index if not exists notifications_provider_idx
  on public.notifications(provider);

create table if not exists public.notification_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  attempt_number integer not null,
  provider text not null,
  status public.notification_status not null,
  provider_message_id text,
  error_code text,
  error_message text,
  retryable boolean,
  claim_token uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notification_attempts_attempt_positive check (attempt_number > 0),
  constraint notification_attempts_error_code_length check (error_code is null or char_length(error_code) <= 120),
  constraint notification_attempts_error_message_length check (error_message is null or char_length(error_message) <= 300)
);

create index if not exists notification_attempts_notification_created_idx
  on public.notification_attempts(notification_id, created_at desc);

alter table public.notification_attempts enable row level security;

drop policy if exists "notification_attempts_staff_read" on public.notification_attempts;
create policy "notification_attempts_staff_read" on public.notification_attempts
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT', 'INVENTORY_MANAGER']::public.app_role[]
    )
  );

revoke insert, update, delete on public.notifications from anon, authenticated;
revoke insert, update, delete on public.notification_attempts from anon, authenticated;
grant select on public.notifications to authenticated;
grant select on public.notification_attempts to authenticated;
grant select, insert, update on public.notifications to service_role;
grant select, insert on public.notification_attempts to service_role;

create table if not exists public.low_stock_alert_states (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  below_threshold boolean not null default false,
  cycle integer not null default 0,
  last_notification_id uuid references public.notifications(id) on delete set null,
  last_crossed_at timestamptz,
  recovered_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint low_stock_alert_states_cycle_nonnegative check (cycle >= 0)
);

alter table public.low_stock_alert_states enable row level security;

drop policy if exists "low_stock_alert_states_staff_read" on public.low_stock_alert_states;
create policy "low_stock_alert_states_staff_read" on public.low_stock_alert_states
  for select to authenticated
  using (
    app_private.has_staff_role(array['OWNER', 'ADMIN', 'INVENTORY_MANAGER']::public.app_role[])
  );

revoke insert, update, delete on public.low_stock_alert_states from anon, authenticated;
grant select on public.low_stock_alert_states to authenticated;
grant select, insert, update on public.low_stock_alert_states to service_role;

create or replace function app_private.claim_notifications(
  batch_limit integer,
  worker_id text,
  stale_after_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch_limit integer := least(greatest(coalesce(batch_limit, 10), 1), 50);
  v_worker_id text := left(btrim(coalesce(worker_id, 'notification-worker')), 120);
  v_stale_after interval := make_interval(secs => least(greatest(coalesce(stale_after_seconds, 900), 60), 7200));
  v_claim_token uuid := extensions.gen_random_uuid();
  v_now timestamptz := timezone('utc', now());
  v_rows jsonb;
begin
  with candidates as (
    select id
    from public.notifications
    where channel = 'EMAIL'::public.notification_channel
      and (
        (status in ('PENDING'::public.notification_status, 'FAILED'::public.notification_status)
          and coalesce(next_attempt_at, scheduled_at) <= v_now
          and attempt_count < max_attempts
          and coalesce(retryable, true) is true)
        or
        (status = 'PROCESSING'::public.notification_status
          and claimed_at is not null
          and claimed_at < v_now - v_stale_after
          and attempt_count < max_attempts)
      )
    order by coalesce(next_attempt_at, scheduled_at), created_at, id
    limit v_batch_limit
    for update skip locked
  ),
  updated as (
    update public.notifications n
    set
      status = 'PROCESSING'::public.notification_status,
      claim_token = v_claim_token,
      claimed_at = v_now,
      provider = v_worker_id,
      attempt_count = n.attempt_count + 1,
      updated_at = v_now
    from candidates
    where n.id = candidates.id
    returning n.*
  )
  select coalesce(jsonb_agg(to_jsonb(updated) order by updated.created_at, updated.id), '[]'::jsonb)
  into v_rows
  from updated;

  return jsonb_build_object('claimToken', v_claim_token, 'notifications', v_rows);
end;
$$;

create or replace function public.claim_notifications_server(
  batch_limit integer,
  worker_id text,
  stale_after_seconds integer
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.claim_notifications(batch_limit, worker_id, stale_after_seconds);
$$;

create or replace function app_private.complete_notification(
  notification_id uuid,
  claim_token uuid,
  provider_name text,
  provider_message_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  select *
  into notification_row
  from public.notifications
  where id = notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status = 'SENT'::public.notification_status then
    return jsonb_build_object('status', 'SENT', 'idempotent', true);
  end if;

  if notification_row.status <> 'PROCESSING'::public.notification_status or notification_row.claim_token <> claim_token then
    raise exception 'NOTIFICATION_CLAIM_MISMATCH';
  end if;

  update public.notifications
  set
    status = 'SENT'::public.notification_status,
    provider = left(btrim(provider_name), 80),
    provider_message_id = nullif(left(btrim(coalesce(provider_message_id, '')), 180), ''),
    processed_at = v_now,
    claim_token = null,
    claimed_at = null,
    last_error_code = null,
    last_error_message = null,
    retryable = false,
    updated_at = v_now
  where id = notification_id;

  insert into public.notification_attempts (
    notification_id,
    attempt_number,
    provider,
    status,
    provider_message_id,
    retryable,
    claim_token
  )
  values (
    notification_id,
    notification_row.attempt_count,
    left(btrim(provider_name), 80),
    'SENT'::public.notification_status,
    nullif(left(btrim(coalesce(provider_message_id, '')), 180), ''),
    false,
    claim_token
  );

  return jsonb_build_object('status', 'SENT', 'idempotent', false);
end;
$$;

create or replace function public.complete_notification_server(
  notification_id uuid,
  claim_token uuid,
  provider_name text,
  provider_message_id text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.complete_notification(notification_id, claim_token, provider_name, provider_message_id);
$$;

create or replace function app_private.fail_notification(
  notification_id uuid,
  claim_token uuid,
  provider_name text,
  error_code text,
  error_message text,
  retryable boolean,
  retry_delay_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_retryable boolean := coalesce(retryable, false);
  v_delay integer := least(greatest(coalesce(retry_delay_seconds, 300), 0), 86400);
begin
  select *
  into notification_row
  from public.notifications
  where id = notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status = 'SENT'::public.notification_status then
    return jsonb_build_object('status', 'SENT', 'idempotent', true);
  end if;

  if notification_row.status <> 'PROCESSING'::public.notification_status or notification_row.claim_token <> claim_token then
    raise exception 'NOTIFICATION_CLAIM_MISMATCH';
  end if;

  if notification_row.attempt_count >= notification_row.max_attempts then
    v_retryable := false;
  end if;

  update public.notifications
  set
    status = 'FAILED'::public.notification_status,
    provider = left(btrim(provider_name), 80),
    processed_at = null,
    claim_token = null,
    claimed_at = null,
    last_error_code = left(btrim(coalesce(error_code, 'PROVIDER_ERROR')), 120),
    last_error_message = left(btrim(coalesce(error_message, 'Erreur fournisseur')), 300),
    retryable = v_retryable,
    next_attempt_at = case when v_retryable then v_now + make_interval(secs => v_delay) else next_attempt_at end,
    updated_at = v_now
  where id = notification_id;

  insert into public.notification_attempts (
    notification_id,
    attempt_number,
    provider,
    status,
    error_code,
    error_message,
    retryable,
    claim_token
  )
  values (
    notification_id,
    notification_row.attempt_count,
    left(btrim(provider_name), 80),
    'FAILED'::public.notification_status,
    left(btrim(coalesce(error_code, 'PROVIDER_ERROR')), 120),
    left(btrim(coalesce(error_message, 'Erreur fournisseur')), 300),
    v_retryable,
    claim_token
  );

  return jsonb_build_object('status', 'FAILED', 'retryable', v_retryable);
end;
$$;

create or replace function public.fail_notification_server(
  notification_id uuid,
  claim_token uuid,
  provider_name text,
  error_code text,
  error_message text,
  retryable boolean,
  retry_delay_seconds integer
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.fail_notification(notification_id, claim_token, provider_name, error_code, error_message, retryable, retry_delay_seconds);
$$;

create or replace function app_private.cancel_notification(
  notification_id uuid,
  actor_id uuid,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  actor_row public.profiles%rowtype;
  v_reason text := btrim(coalesce(reason, ''));
  v_now timestamptz := timezone('utc', now());
begin
  if actor_id is null or v_reason = '' or char_length(v_reason) > 300 then
    raise exception 'NOTIFICATION_INVALID_REQUEST';
  end if;

  select *
  into actor_row
  from public.profiles
  where id = actor_id
    and active is true
    and role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role);

  if not found then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  select *
  into notification_row
  from public.notifications
  where id = notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status in ('SENT'::public.notification_status, 'CANCELLED'::public.notification_status) then
    raise exception 'NOTIFICATION_NOT_CANCELLABLE';
  end if;

  if notification_row.status = 'PROCESSING'::public.notification_status
    and notification_row.claimed_at is not null
    and notification_row.claimed_at > v_now - interval '15 minutes' then
    raise exception 'NOTIFICATION_ACTIVE_PROCESSING';
  end if;

  update public.notifications
  set
    status = 'CANCELLED'::public.notification_status,
    cancelled_at = v_now,
    cancelled_by = actor_id,
    cancel_reason = v_reason,
    claim_token = null,
    claimed_at = null,
    retryable = false,
    updated_at = v_now
  where id = notification_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor_id,
    'NOTIFICATION_CANCELLED',
    'notification',
    notification_id,
    jsonb_build_object('reason', left(v_reason, 300), 'template_key', notification_row.template_key)
  );

  return jsonb_build_object('notificationId', notification_id, 'status', 'CANCELLED');
end;
$$;

create or replace function public.cancel_notification_server(
  notification_id uuid,
  actor_id uuid,
  reason text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.cancel_notification(notification_id, actor_id, reason);
$$;

revoke all on function app_private.claim_notifications(integer, text, integer) from public, anon, authenticated;
revoke all on function public.claim_notifications_server(integer, text, integer) from public, anon, authenticated;
revoke all on function app_private.complete_notification(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_notification_server(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function app_private.fail_notification(uuid, uuid, text, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.fail_notification_server(uuid, uuid, text, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function app_private.cancel_notification(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_notification_server(uuid, uuid, text) from public, anon, authenticated;

grant execute on function app_private.claim_notifications(integer, text, integer) to service_role;
grant execute on function public.claim_notifications_server(integer, text, integer) to service_role;
grant execute on function app_private.complete_notification(uuid, uuid, text, text) to service_role;
grant execute on function public.complete_notification_server(uuid, uuid, text, text) to service_role;
grant execute on function app_private.fail_notification(uuid, uuid, text, text, text, boolean, integer) to service_role;
grant execute on function public.fail_notification_server(uuid, uuid, text, text, text, boolean, integer) to service_role;
grant execute on function app_private.cancel_notification(uuid, uuid, text) to service_role;
grant execute on function public.cancel_notification_server(uuid, uuid, text) to service_role;

comment on table public.notification_attempts is
  'Immutable Phase 12 delivery-attempt history for notification outbox rows.';

comment on table public.low_stock_alert_states is
  'Phase 12 low-stock threshold crossing state. Prevents repeated alerts while available stock remains below threshold.';
