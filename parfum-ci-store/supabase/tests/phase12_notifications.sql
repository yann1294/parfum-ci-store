-- Phase 12 notification processing smoke tests.
-- Run only against a non-production database.

do $$
begin
  if not has_function_privilege('service_role', 'public.claim_notifications_server(integer,text,integer)', 'execute') then
    raise exception 'service_role must execute claim_notifications_server';
  end if;
  if has_function_privilege('anon', 'public.claim_notifications_server(integer,text,integer)', 'execute') then
    raise exception 'anon must not execute claim_notifications_server';
  end if;
  if has_function_privilege('authenticated', 'public.complete_notification_server(uuid,uuid,text,text)', 'execute') then
    raise exception 'authenticated must not execute complete_notification_server';
  end if;
end;
$$;

begin;

insert into public.notifications (
  channel,
  status,
  recipient,
  subject,
  template_key,
  payload,
  idempotency_key
)
values (
  'EMAIL',
  'PENDING',
  'phase12@example.test',
  'Phase 12 test',
  'customer_order_received',
  jsonb_build_object('order_number', 'CMD-TEST-P12'),
  'phase12-test-claim'
)
on conflict (idempotency_key) do update
set status = 'PENDING',
    attempt_count = 0,
    retryable = true,
    next_attempt_at = timezone('utc', now()),
    claim_token = null,
    claimed_at = null;

do $$
declare
  claim_result jsonb;
  claim_token uuid;
  claimed_notification_id uuid;
begin
  claim_result := public.claim_notifications_server(1, 'sql-test', 900);
  if jsonb_array_length(claim_result->'notifications') <> 1 then
    raise exception 'Expected one claimed notification';
  end if;

  claim_token := (claim_result->>'claimToken')::uuid;
  claimed_notification_id := ((claim_result->'notifications')->0->>'id')::uuid;

  perform public.complete_notification_server(claimed_notification_id, claim_token, 'development', 'sql-message-id');

  if not exists (
    select 1
    from public.notifications
    where id = claimed_notification_id
      and status = 'SENT'
      and provider_message_id = 'sql-message-id'
  ) then
    raise exception 'Expected notification to be SENT';
  end if;

  if not exists (
    select 1
    from public.notification_attempts
    where notification_attempts.notification_id = claimed_notification_id
      and status = 'SENT'
  ) then
    raise exception 'Expected sent attempt history';
  end if;
end;
$$;

rollback;
