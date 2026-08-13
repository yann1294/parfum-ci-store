-- Phase 14 settings, delivery and order-pricing integration smoke tests.
-- Run only against a disposable local/staging database with all migrations applied.

begin;

do $$
<<phase14_settings>>
declare
  actor_id uuid := '14000000-0000-4000-8000-000000000001';
  denied_actor_id uuid := '14000000-0000-4000-8000-000000000002';
  first_revision bigint;
  saved jsonb;
  replay jsonb;
  quote jsonb;
  first_order uuid;
  first_fee bigint;
  public_projection jsonb;
  request_value jsonb;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', actor_id, 'authenticated', 'authenticated',
    'phase14-owner@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
    timezone('utc', now()), timezone('utc', now())
  ) on conflict (id) do nothing;

  update public.profiles set role = 'OWNER', active = true where id = actor_id;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', denied_actor_id, 'authenticated', 'authenticated',
    'phase14-denied@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
    timezone('utc', now()), timezone('utc', now())
  ) on conflict (id) do nothing;
  update public.profiles set role = 'ORDER_MANAGER', active = true where id = denied_actor_id;
  select settings_revision into first_revision from public.store_settings where id is true;

  request_value := jsonb_build_object(
    'actorId', actor_id,
    'mutationId', '14000000-0000-4000-8000-000000000010',
    'requestFingerprint', repeat('a', 64),
    'section', 'delivery',
    'expectedRevision', first_revision,
    'value', jsonb_build_object(
      'enabledDeliveryMethods', jsonb_build_array('HOME_DELIVERY', 'PICKUP'),
      'deliveryMethodConfigs', jsonb_build_object(
        'HOME_DELIVERY', jsonb_build_object('label', 'Livraison à domicile', 'publicLabel', '1 à 3 jours'),
        'PICKUP', jsonb_build_object('label', 'Retrait boutique', 'publicLabel', 'Sur confirmation')
      ),
      'defaultDeliveryFeeXof', 2500,
      'pickupFeeXof', 500,
      'freeDeliveryEnabled', true,
      'freeDeliveryThresholdXof', 50000,
      'deliveryEstimatedMinDays', 1,
      'deliveryEstimatedMaxDays', 3,
      'zones', jsonb_build_array(jsonb_build_object(
        'id', '14000000-0000-4000-8000-000000000020',
        'name', 'Cocody', 'city', 'Abidjan', 'commune', 'Cocody Angré',
        'feeXof', 1500, 'estimatedMinDays', 1, 'estimatedMaxDays', 2,
        'enabled', true, 'displayOrder', 1
      ))
    )
  );
  saved := public.update_store_settings_server(request_value);

  replay := public.update_store_settings_server(request_value);
  if saved <> replay then raise exception 'Expected idempotent settings replay'; end if;
  if (select count(*) from public.audit_logs where action = 'STORE_SETTINGS_UPDATED' and public.audit_logs.actor_id = phase14_settings.actor_id) <> 1 then
    raise exception 'Expected one settings audit event for a replay';
  end if;
  if exists (
    select 1 from public.audit_logs
    where action = 'STORE_SETTINGS_UPDATED'
      and public.audit_logs.actor_id = phase14_settings.actor_id
      and metadata ?| array['value', 'payload', 'notificationEmail', 'merchantNumber']
  ) then raise exception 'Settings audit metadata exposed submitted values'; end if;

  begin
    perform public.update_store_settings_server(jsonb_build_object(
      'actorId', actor_id, 'mutationId', '14000000-0000-4000-8000-000000000011',
      'requestFingerprint', repeat('b', 64), 'section', 'notifications',
      'expectedRevision', first_revision, 'value', jsonb_build_object('notificationEmail', 'new@example.test')
    ));
    raise exception 'Expected stale settings rejection';
  exception when raise_exception then
    if sqlerrm <> 'SETTINGS_STALE_VERSION' then raise; end if;
  end;

  saved := public.update_store_settings_server(jsonb_build_object(
    'actorId', actor_id, 'mutationId', '14000000-0000-4000-8000-000000000012',
    'requestFingerprint', repeat('9', 64), 'section', 'payments',
    'expectedRevision', (saved->>'revision')::bigint,
    'value', jsonb_build_object(
      'enabledPaymentMethods', jsonb_build_array('CASH_ON_DELIVERY', 'ORANGE_MONEY'),
      'paymentMethodConfigs', jsonb_build_object(
        'CASH_ON_DELIVERY', jsonb_build_object(
          'enabled', true, 'label', 'Paiement à la livraison', 'merchantNumber', '',
          'beneficiaryName', '', 'instructions', 'Paiement à réception', 'displayOrder', 1
        ),
        'ORANGE_MONEY', jsonb_build_object(
          'enabled', true, 'label', 'Orange Money', 'merchantNumber', '+2250700000000',
          'beneficiaryName', 'Parfum CI', 'instructions', 'Utilisez le numéro marchand.', 'displayOrder', 2
        ),
        'MTN_MOMO', jsonb_build_object(
          'enabled', false, 'label', 'MTN MoMo', 'merchantNumber', '',
          'beneficiaryName', '', 'instructions', '', 'displayOrder', 3
        )
      )
    )
  ));
  if not exists (
    select 1 from public.store_settings
    where id is true
      and enabled_payment_methods = array['CASH_ON_DELIVERY', 'ORANGE_MONEY']::public.payment_method[]
      and payment_method_configs->'ORANGE_MONEY'->>'merchantNumber' = '+2250700000000'
  ) then raise exception 'Expected Phase 9 payment settings to persist through Phase 14'; end if;

  begin
    insert into public.delivery_zones (name, city, commune, fee_xof, enabled)
    values ('Duplicate Cocody', ' abidjan ', 'Cocody-Angre', 1700, true);
    raise exception 'Expected normalized active-zone uniqueness';
  exception when unique_violation then null; end;

  begin
    insert into public.delivery_zones (name, city, commune, fee_xof, enabled)
    values ('Negative', 'Abidjan', 'Yopougon', -1, true);
    raise exception 'Expected negative delivery fee rejection';
  exception when check_violation then null; end;

  insert into public.delivery_zones (name, city, commune, fee_xof, enabled)
  values ('Disabled Marcory', 'Abidjan', 'Marcory', 999, false);

  quote := public.quote_delivery_server('HOME_DELIVERY', ' ABIDJAN ', 'Cocody-Angre', 10000);
  if quote->>'status' <> 'AVAILABLE' or (quote->>'feeXof')::bigint <> 1500 then
    raise exception 'Expected normalized exact zone quote';
  end if;
  quote := public.quote_delivery_server('HOME_DELIVERY', 'Abidjan', 'Marcory', 10000);
  if (quote->>'feeXof')::bigint <> 2500 then raise exception 'Expected default fee fallback'; end if;
  quote := public.quote_delivery_server('PICKUP', 'Abidjan', 'Cocody', 10000);
  if (quote->>'feeXof')::bigint <> 500 then raise exception 'Expected configured pickup fee'; end if;
  quote := public.quote_delivery_server('PICKUP', 'Abidjan', 'Cocody', 50000);
  if (quote->>'feeXof')::bigint <> 500 or (quote->>'freeDeliveryApplied')::boolean is true then
    raise exception 'Expected pickup to be excluded from free-delivery threshold';
  end if;
  quote := public.quote_delivery_server('HOME_DELIVERY', 'Abidjan', 'Marcory', 50000);
  if (quote->>'feeXof')::bigint <> 0 or (quote->>'freeDeliveryApplied')::boolean is not true then
    raise exception 'Expected exact threshold to apply free delivery';
  end if;
  update public.store_settings set default_delivery_fee_xof = null where id is true;
  quote := public.quote_delivery_server('HOME_DELIVERY', 'Abidjan', 'Bingerville', 10000);
  if quote->>'status' <> 'UNAVAILABLE' or quote->>'reason' <> 'AREA_UNSUPPORTED' then
    raise exception 'Expected unsupported result without zone or default fee';
  end if;
  update public.store_settings set default_delivery_fee_xof = 2500 where id is true;

  insert into public.orders (
    order_number, customer_name, customer_phone, delivery_city, delivery_commune,
    delivery_address, delivery_method, subtotal_xof, delivery_fee_xof, total_xof,
    payment_method, payment_status
  ) values (
    'CMD-2014-AAAAAA', 'Phase 14 Client', '+2250700000014', 'Abidjan', 'Cocody Angré',
    'Adresse de test', 'HOME_DELIVERY', 10000, 0, 10000, 'CASH_ON_DELIVERY', 'UNPAID'
  ) returning id, delivery_fee_xof into first_order, first_fee;
  if first_fee <> 1500 then raise exception 'Expected order trigger to store authoritative fee'; end if;
  if not exists (select 1 from public.orders where id = first_order and total_xof = 11500 and delivery_rule_snapshot->>'zone_name' = 'Cocody') then
    raise exception 'Expected authoritative total and delivery snapshot';
  end if;

  update public.delivery_zones set fee_xof = 2000 where id = '14000000-0000-4000-8000-000000000020';
  if (select delivery_fee_xof from public.orders where id = first_order) <> 1500 then
    raise exception 'Historical order economics changed after zone edit';
  end if;

  insert into public.orders (
    order_number, customer_name, customer_phone, delivery_city, delivery_commune,
    delivery_address, delivery_method, subtotal_xof, delivery_fee_xof, total_xof,
    payment_method, payment_status
  ) values (
    'CMD-2014-BBBBBB', 'Phase 14 Client', '+2250700000014', 'Abidjan', 'Cocody Angré',
    'Adresse de test', 'HOME_DELIVERY', 10000, 0, 10000, 'CASH_ON_DELIVERY', 'UNPAID'
  );
  if (select delivery_fee_xof from public.orders where order_number = 'CMD-2014-BBBBBB') <> 2000 then
    raise exception 'Expected new order to use edited zone fee';
  end if;

  update public.store_settings set accepting_orders = false where id is true;
  begin
    insert into public.orders (
      order_number, customer_name, customer_phone, delivery_city, delivery_commune,
      delivery_address, delivery_method, subtotal_xof, delivery_fee_xof, total_xof,
      payment_method, payment_status
    ) values (
      'CMD-2014-CCCCCC', 'Phase 14 Client', '+2250700000014', 'Abidjan', 'Cocody Angré',
      'Adresse de test', 'HOME_DELIVERY', 10000, 0, 10000, 'CASH_ON_DELIVERY', 'UNPAID'
    );
    raise exception 'Expected order acceptance rejection';
  exception when raise_exception then if sqlerrm <> 'ORDER_ACCEPTANCE_DISABLED' then raise; end if; end;
  update public.store_settings set accepting_orders = true, maintenance_mode = true where id is true;
  begin
    insert into public.orders (
      order_number, customer_name, customer_phone, delivery_city, delivery_commune,
      delivery_address, delivery_method, subtotal_xof, delivery_fee_xof, total_xof,
      payment_method, payment_status
    ) values (
      'CMD-2014-DDDDDD', 'Phase 14 Client', '+2250700000014', 'Abidjan', 'Cocody Angré',
      'Adresse de test', 'HOME_DELIVERY', 10000, 0, 10000, 'CASH_ON_DELIVERY', 'UNPAID'
    );
    raise exception 'Expected maintenance order rejection';
  exception when raise_exception then if sqlerrm <> 'ORDER_ACCEPTANCE_DISABLED' then raise; end if; end;
  update public.store_settings set maintenance_mode = false where id is true;

  public_projection := public.get_public_store_settings();
  if public_projection ? 'notificationEmail' or public_projection ? 'settingsRevision' then
    raise exception 'Public projection exposed private settings';
  end if;
  if not (public_projection->'paymentMethodConfigs' ? 'CASH_ON_DELIVERY')
    or not (public_projection->'paymentMethodConfigs' ? 'ORANGE_MONEY')
    or public_projection->'paymentMethodConfigs' ? 'MTN_MOMO' then
    raise exception 'Public payment projection did not filter to enabled methods';
  end if;
  if has_table_privilege('anon', 'public.store_settings', 'select') then
    raise exception 'Anonymous direct store_settings select must be denied';
  end if;
  if has_function_privilege('anon', 'public.update_store_settings_server(jsonb)', 'execute') then
    raise exception 'Anonymous settings mutation must be denied';
  end if;

  begin
    perform public.update_store_settings_server(jsonb_build_object(
      'actorId', denied_actor_id, 'mutationId', '14000000-0000-4000-8000-000000000030',
      'requestFingerprint', repeat('c', 64), 'section', 'notifications',
      'expectedRevision', (saved->>'revision')::bigint,
      'value', jsonb_build_object('notificationEmail', 'denied@example.test')
    ));
    raise exception 'Expected ORDER_MANAGER settings denial';
  exception when raise_exception then
    if sqlerrm <> 'SETTINGS_FORBIDDEN' then raise; end if;
  end;

  update public.profiles set role = 'CUSTOMER_SUPPORT' where id = denied_actor_id;
  begin
    perform public.update_store_settings_server(jsonb_build_object(
      'actorId', denied_actor_id, 'mutationId', '14000000-0000-4000-8000-000000000031',
      'requestFingerprint', repeat('d', 64), 'section', 'notifications',
      'expectedRevision', (saved->>'revision')::bigint,
      'value', jsonb_build_object('notificationEmail', 'denied@example.test')
    ));
    raise exception 'Expected CUSTOMER_SUPPORT settings denial';
  exception when raise_exception then if sqlerrm <> 'SETTINGS_FORBIDDEN' then raise; end if; end;

  update public.profiles set role = 'INVENTORY_MANAGER' where id = denied_actor_id;
  begin
    perform public.update_store_settings_server(jsonb_build_object(
      'actorId', denied_actor_id, 'mutationId', '14000000-0000-4000-8000-000000000032',
      'requestFingerprint', repeat('e', 64), 'section', 'notifications',
      'expectedRevision', (saved->>'revision')::bigint,
      'value', jsonb_build_object('notificationEmail', 'denied@example.test')
    ));
    raise exception 'Expected INVENTORY_MANAGER settings denial';
  exception when raise_exception then if sqlerrm <> 'SETTINGS_FORBIDDEN' then raise; end if; end;

  update public.profiles set role = 'ADMIN', active = true where id = denied_actor_id;
  saved := public.update_store_settings_server(jsonb_build_object(
    'actorId', denied_actor_id, 'mutationId', '14000000-0000-4000-8000-000000000034',
    'requestFingerprint', repeat('0', 64), 'section', 'notifications',
    'expectedRevision', (saved->>'revision')::bigint,
    'value', jsonb_build_object('notificationEmail', 'admin-phase14@example.test')
  ));
  if (select notification_email from public.store_settings where id is true) <> 'admin-phase14@example.test' then
    raise exception 'Expected active ADMIN update success';
  end if;

  update public.profiles set active = false where id = denied_actor_id;
  begin
    perform public.update_store_settings_server(jsonb_build_object(
      'actorId', denied_actor_id, 'mutationId', '14000000-0000-4000-8000-000000000033',
      'requestFingerprint', repeat('f', 64), 'section', 'notifications',
      'expectedRevision', (saved->>'revision')::bigint,
      'value', jsonb_build_object('notificationEmail', 'denied@example.test')
    ));
    raise exception 'Expected inactive ADMIN settings denial';
  exception when raise_exception then if sqlerrm <> 'SETTINGS_FORBIDDEN' then raise; end if; end;
end
$$;

rollback;
