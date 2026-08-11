-- Phase 13 customer-message smoke tests. Run against a non-production
-- database with Phase 13 migrations applied.

do $$
begin
  if not has_function_privilege('service_role', 'public.create_contact_message_server(jsonb)', 'execute') then
    raise exception 'service_role must execute create_contact_message_server';
  end if;
  if has_function_privilege('anon', 'public.create_contact_message_server(jsonb)', 'execute') then
    raise exception 'anon must not execute create_contact_message_server';
  end if;
end $$;

begin;

do $$
declare
  v_key text := 'phase13-sql-contact-111111111111111111111111';
  v_request jsonb;
  v_result jsonb;
  v_replay jsonb;
  v_message_id uuid;
begin
  v_request := jsonb_build_object(
    'idempotencyKey', v_key,
    'requestFingerprint', repeat('a', 64),
    'source', 'WEBSITE',
    'name', 'Client Phase 13',
    'email', 'phase13@example.test',
    'phone', '+2250700000012',
    'subject', 'Question parfum',
    'message', 'Bonjour, je souhaite recevoir une information.',
    'consent', true,
    'sourcePage', '/contact'
  );

  v_result := public.create_contact_message_server(v_request);
  v_replay := public.create_contact_message_server(v_request);
  if v_result <> v_replay then
    raise exception 'Expected idempotent replay result';
  end if;

  select id
  into v_message_id
  from public.contact_messages
  where customer_email = 'phase13@example.test'
  order by created_at desc
  limit 1;

  if v_message_id is null then
    raise exception 'Expected contact message row';
  end if;

  if (select count(*) from public.contact_messages where customer_email = 'phase13@example.test') <> 1 then
    raise exception 'Expected exactly one contact message row';
  end if;

  if (select count(*) from public.notifications where payload->>'message_id' = v_message_id::text) <> 2 then
    raise exception 'Expected one in-app and one email notification intent';
  end if;
end $$;

rollback;
