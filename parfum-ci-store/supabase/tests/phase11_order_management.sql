-- Phase 11 order-management SQL verification.
-- Run only against an isolated local or staging database after applying Phase 11 migrations.

begin;

do $$
begin
  if not has_function_privilege('service_role', 'public.transition_order_server(jsonb)', 'execute') then
    raise exception 'Expected service_role to execute transition_order_server';
  end if;
  if has_function_privilege('anon', 'public.transition_order_server(jsonb)', 'execute') then
    raise exception 'anon must not execute transition_order_server';
  end if;
  if has_function_privilege('authenticated', 'public.transition_order_server(jsonb)', 'execute') then
    raise exception 'authenticated must not execute transition_order_server';
  end if;
  if has_function_privilege('anon', 'public.record_order_payment_server(jsonb)', 'execute') then
    raise exception 'anon must not execute record_order_payment_server';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'app_private'
      and table_name = 'order_transition_idempotency'
  ) then
    raise exception 'Missing order transition idempotency table';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_internal_notes'
  ) then
    raise exception 'Missing append-only order internal notes table';
  end if;
end;
$$;

rollback;
