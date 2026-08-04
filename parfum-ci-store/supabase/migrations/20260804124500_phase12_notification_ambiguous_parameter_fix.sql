-- Phase 12 repair: remove ambiguous parameter/column references from
-- notification result and cancellation functions.

drop function if exists public.complete_notification_server(uuid, uuid, text, text);
drop function if exists public.fail_notification_server(uuid, uuid, text, text, text, boolean, integer);
drop function if exists public.cancel_notification_server(uuid, uuid, text);
drop function if exists app_private.complete_notification(uuid, uuid, text, text);
drop function if exists app_private.fail_notification(uuid, uuid, text, text, text, boolean, integer);
drop function if exists app_private.cancel_notification(uuid, uuid, text);

create or replace function app_private.complete_notification(
  p_notification_id uuid,
  p_claim_token uuid,
  p_provider_name text,
  p_provider_message_id text
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
  from public.notifications n
  where n.id = p_notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status = 'SENT'::public.notification_status then
    return jsonb_build_object('status', 'SENT', 'idempotent', true);
  end if;

  if notification_row.status <> 'PROCESSING'::public.notification_status
    or notification_row.claim_token <> p_claim_token then
    raise exception 'NOTIFICATION_CLAIM_MISMATCH';
  end if;

  update public.notifications n
  set
    status = 'SENT'::public.notification_status,
    provider = left(btrim(p_provider_name), 80),
    provider_message_id = nullif(left(btrim(coalesce(p_provider_message_id, '')), 180), ''),
    processed_at = v_now,
    claim_token = null,
    claimed_at = null,
    last_error_code = null,
    last_error_message = null,
    retryable = false,
    updated_at = v_now
  where n.id = p_notification_id;

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
    p_notification_id,
    notification_row.attempt_count,
    left(btrim(p_provider_name), 80),
    'SENT'::public.notification_status,
    nullif(left(btrim(coalesce(p_provider_message_id, '')), 180), ''),
    false,
    p_claim_token
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
  select app_private.complete_notification($1, $2, $3, $4);
$$;

create or replace function app_private.fail_notification(
  p_notification_id uuid,
  p_claim_token uuid,
  p_provider_name text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean,
  p_retry_delay_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  v_now timestamptz := timezone('utc', now());
  v_retryable boolean := coalesce(p_retryable, false);
  v_delay integer := least(greatest(coalesce(p_retry_delay_seconds, 300), 0), 86400);
begin
  select *
  into notification_row
  from public.notifications n
  where n.id = p_notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status = 'SENT'::public.notification_status then
    return jsonb_build_object('status', 'SENT', 'idempotent', true);
  end if;

  if notification_row.status <> 'PROCESSING'::public.notification_status
    or notification_row.claim_token <> p_claim_token then
    raise exception 'NOTIFICATION_CLAIM_MISMATCH';
  end if;

  if notification_row.attempt_count >= notification_row.max_attempts then
    v_retryable := false;
  end if;

  update public.notifications n
  set
    status = 'FAILED'::public.notification_status,
    provider = left(btrim(p_provider_name), 80),
    processed_at = null,
    claim_token = null,
    claimed_at = null,
    last_error_code = left(btrim(coalesce(p_error_code, 'PROVIDER_ERROR')), 120),
    last_error_message = left(btrim(coalesce(p_error_message, 'Erreur fournisseur')), 300),
    retryable = v_retryable,
    next_attempt_at = case when v_retryable then v_now + make_interval(secs => v_delay) else n.next_attempt_at end,
    updated_at = v_now
  where n.id = p_notification_id;

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
    p_notification_id,
    notification_row.attempt_count,
    left(btrim(p_provider_name), 80),
    'FAILED'::public.notification_status,
    left(btrim(coalesce(p_error_code, 'PROVIDER_ERROR')), 120),
    left(btrim(coalesce(p_error_message, 'Erreur fournisseur')), 300),
    v_retryable,
    p_claim_token
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
  select app_private.fail_notification($1, $2, $3, $4, $5, $6, $7);
$$;

create or replace function app_private.cancel_notification(
  p_notification_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  actor_row public.profiles%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_now timestamptz := timezone('utc', now());
begin
  if p_actor_id is null or v_reason = '' or char_length(v_reason) > 300 then
    raise exception 'NOTIFICATION_INVALID_REQUEST';
  end if;

  select *
  into actor_row
  from public.profiles p
  where p.id = p_actor_id
    and p.active is true
    and p.role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role);

  if not found then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  select *
  into notification_row
  from public.notifications n
  where n.id = p_notification_id
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

  update public.notifications n
  set
    status = 'CANCELLED'::public.notification_status,
    cancelled_at = v_now,
    cancelled_by = p_actor_id,
    cancel_reason = v_reason,
    claim_token = null,
    claimed_at = null,
    retryable = false,
    updated_at = v_now
  where n.id = p_notification_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    p_actor_id,
    'NOTIFICATION_CANCELLED',
    'notification',
    p_notification_id,
    jsonb_build_object('reason', left(v_reason, 300), 'template_key', notification_row.template_key)
  );

  return jsonb_build_object('notificationId', p_notification_id, 'status', 'CANCELLED');
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
  select app_private.cancel_notification($1, $2, $3);
$$;

revoke all on function app_private.complete_notification(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_notification_server(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function app_private.fail_notification(uuid, uuid, text, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.fail_notification_server(uuid, uuid, text, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function app_private.cancel_notification(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_notification_server(uuid, uuid, text) from public, anon, authenticated;

grant execute on function app_private.complete_notification(uuid, uuid, text, text) to service_role;
grant execute on function public.complete_notification_server(uuid, uuid, text, text) to service_role;
grant execute on function app_private.fail_notification(uuid, uuid, text, text, text, boolean, integer) to service_role;
grant execute on function public.fail_notification_server(uuid, uuid, text, text, text, boolean, integer) to service_role;
grant execute on function app_private.cancel_notification(uuid, uuid, text) to service_role;
grant execute on function public.cancel_notification_server(uuid, uuid, text) to service_role;
