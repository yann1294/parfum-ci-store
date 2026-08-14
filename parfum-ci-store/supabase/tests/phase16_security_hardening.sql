-- Phase 16 least-privilege and atomic notification retry tests.
-- Run only against a disposable local/staging database with all migrations applied.

do $$
begin
  if has_table_privilege('anon', 'public.orders', 'truncate')
    or has_table_privilege('authenticated', 'public.orders', 'truncate') then
    raise exception 'Browser roles must not truncate orders';
  end if;
  if has_table_privilege('anon', 'public.inventory_transactions', 'insert')
    or has_table_privilege('authenticated', 'public.inventory_transactions', 'update') then
    raise exception 'Browser roles must not mutate inventory transactions';
  end if;
  if has_table_privilege('anon', 'public.audit_logs', 'insert')
    or has_table_privilege('authenticated', 'public.store_settings', 'update') then
    raise exception 'Browser roles must not mutate audit logs or store settings';
  end if;
  if has_function_privilege('anon', 'public.retry_notification_server(uuid,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.retry_notification_server(uuid,uuid)', 'execute') then
    raise exception 'Manual retry must be service-only';
  end if;
  if not has_function_privilege('service_role', 'public.retry_notification_server(uuid,uuid)', 'execute') then
    raise exception 'service_role must execute manual retry';
  end if;
end;
$$;

begin;

do $$
declare
  owner_id uuid := '16000000-0000-4000-8000-000000000001';
  notification_id uuid := '16000000-0000-4000-8000-000000000010';
  result jsonb;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated',
    'phase16-owner@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
    timezone('utc', now()), timezone('utc', now())
  ) on conflict (id) do nothing;

  update public.profiles set role = 'OWNER', active = true where id = owner_id;

  insert into public.notifications (
    id, channel, status, recipient, subject, body, template_key, attempt_count,
    max_attempts, retryable, last_error_code, last_error_message
  ) values (
    notification_id, 'EMAIL', 'FAILED', 'phase16@example.test', 'Phase 16',
    'Test hardening', 'phase16_retry', 5, 5, false, 'TEST_FAILURE', 'Safe test failure'
  );

  result := public.retry_notification_server(notification_id, owner_id);
  if result->>'status' <> 'PENDING' then
    raise exception 'Expected retry to return PENDING';
  end if;
  if not exists (
    select 1 from public.notifications n
    where n.id = notification_id
      and n.status = 'PENDING'
      and n.retryable is true
      and n.max_attempts = 6
      and n.last_error_code is null
      and n.claim_token is null
  ) then
    raise exception 'Expected one additional atomic manual attempt';
  end if;
  if not exists (
    select 1 from public.audit_logs a
    where a.resource_id = notification_id
      and a.action = 'NOTIFICATION_RETRY_REQUESTED'
      and a.actor_id = owner_id
  ) then
    raise exception 'Expected bounded retry audit event';
  end if;

  begin
    perform public.retry_notification_server(notification_id, owner_id);
    raise exception 'Expected duplicate retry rejection';
  exception when raise_exception then
    if sqlerrm <> 'NOTIFICATION_NOT_RETRYABLE' then raise; end if;
  end;
end;
$$;

rollback;
