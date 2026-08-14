-- Phase 15 role-aware dashboard aggregate smoke tests.
-- Run only against a disposable local/staging database with all migrations applied.

begin;

do $$
<<phase15_dashboard>>
declare
  owner_id uuid := '15000000-0000-4000-8000-000000000001';
  support_id uuid := '15000000-0000-4000-8000-000000000002';
  inventory_id uuid := '15000000-0000-4000-8000-000000000003';
  paid_order_one uuid := '15000000-0000-4000-8000-000000000010';
  paid_order_two uuid := '15000000-0000-4000-8000-000000000011';
  unpaid_order uuid := '15000000-0000-4000-8000-000000000012';
  product_id uuid := '15000000-0000-4000-8000-000000000020';
  variant_id uuid := '15000000-0000-4000-8000-000000000021';
  request_value jsonb;
  owner_result jsonb;
  support_result jsonb;
  inventory_result jsonb;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated',
      'phase15-owner@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
      timezone('utc', now()), timezone('utc', now())),
    ('00000000-0000-0000-0000-000000000000', support_id, 'authenticated', 'authenticated',
      'phase15-support@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
      timezone('utc', now()), timezone('utc', now())),
    ('00000000-0000-0000-0000-000000000000', inventory_id, 'authenticated', 'authenticated',
      'phase15-inventory@example.test', '', timezone('utc', now()), '{}'::jsonb, '{}'::jsonb,
      timezone('utc', now()), timezone('utc', now()))
  on conflict (id) do nothing;

  update public.profiles set role = 'OWNER', active = true where id = owner_id;
  update public.profiles set role = 'CUSTOMER_SUPPORT', active = true where id = support_id;
  update public.profiles set role = 'INVENTORY_MANAGER', active = true where id = inventory_id;

  update public.store_settings
  set accepting_orders = true,
      maintenance_mode = false,
      business_timezone = 'Africa/Abidjan',
      enabled_delivery_methods = array['HOME_DELIVERY']::text[],
      default_delivery_fee_xof = 0,
      free_delivery_enabled = false,
      free_delivery_threshold_xof = null
  where id is true;

  insert into public.orders (
    id, order_number, customer_name, customer_phone, delivery_city, delivery_address,
    delivery_method, source, subtotal_xof, delivery_fee_xof, total_xof,
    payment_method, payment_status, status, created_at
  ) values
    (paid_order_one, 'CMD-2015-PAID01', 'Client payé un', '+2250700001501', 'Abidjan', 'Adresse test',
      'HOME_DELIVERY', 'WEBSITE', 10000, 0, 10000, 'WAVE', 'PAID', 'DELIVERED', '2040-08-14T00:00:00Z'),
    (paid_order_two, 'CMD-2015-PAID02', 'Client payé deux', '+2250700001502', 'Abidjan', 'Adresse test',
      'HOME_DELIVERY', 'PHONE', 25000, 0, 25000, 'ORANGE_MONEY', 'PAID', 'CONFIRMED', '2040-08-14T00:00:01Z'),
    (unpaid_order, 'CMD-2015-UNPAID', 'Client non payé', '+2250700001503', 'Abidjan', 'Adresse test',
      'HOME_DELIVERY', 'WEBSITE', 9000, 0, 9000, 'BANK_TRANSFER', 'PENDING', 'PENDING_CONFIRMATION', '2040-08-13T23:59:59Z');

  insert into public.payment_transactions (
    order_id, method, status, amount_xof, verified_by, verified_at, created_at
  ) values
    (paid_order_one, 'WAVE', 'PAID', 10000, owner_id, '2040-08-14T00:00:02Z', '2040-08-14T00:00:02Z'),
    -- A replay/history duplicate for the same economic payment must never be summed again.
    (paid_order_one, 'WAVE', 'PAID', 999999, owner_id, '2040-08-14T00:00:03Z', '2040-08-14T00:00:03Z'),
    (paid_order_one, 'WAVE', 'REFUNDED', 10000, owner_id, '2040-08-14T00:00:04Z', '2040-08-14T00:00:04Z'),
    (paid_order_two, 'ORANGE_MONEY', 'PAID', 25000, owner_id, '2040-08-14T00:00:05Z', '2040-08-14T00:00:05Z'),
    (unpaid_order, 'BANK_TRANSFER', 'PENDING', 9000, null, null, '2040-08-14T00:00:06Z');

  insert into public.products (id, name, slug, status)
  values (product_id, 'Nom actuel ignoré', 'phase15-snapshot-parfum', 'DRAFT');
  insert into public.product_variants (
    id, product_id, sku, size_ml, price_xof, stock_on_hand, reserved_quantity,
    low_stock_threshold, active, inventory_initialized_at, updated_at
  ) values (
    variant_id, product_id, 'PHASE15-SKU', 50, 5000, 4, 3, 2, true,
    '2040-08-01T00:00:00Z', '2040-08-01T00:00:00Z'
  );
  insert into public.order_items (
    order_id, product_id, variant_id, sku, product_name, variant_name,
    unit_price_xof, quantity, total_price_xof
  ) values (
    paid_order_one, product_id, variant_id, 'PHASE15-SKU', 'Instantané historique',
    '50 ml', 5000, 2, 10000
  );
  insert into public.inventory_transactions (
    variant_id, type, quantity_delta, stock_before, stock_after, reserved_before,
    reserved_after, order_id, actor_id, reason, created_at
  ) values (
    variant_id, 'SOLD', -2, 6, 4, 5, 3, paid_order_one, owner_id,
    'Vente Phase 15', '2040-08-14T00:00:07Z'
  );
  update public.products set name = 'Produit renommé' where id = product_id;

  insert into public.contact_messages (
    customer_name, customer_email, source, subject, body, status, created_at
  ) values (
    'Client message', 'phase15-message@example.test', 'WEBSITE', 'Question Phase 15',
    'Corps de message suffisamment long.', 'NEW', '2040-08-14T00:00:08Z'
  );
  insert into public.notifications (
    channel, status, recipient, subject, body, template_key, scheduled_at, created_at
  ) values (
    'EMAIL', 'FAILED', 'phase15-notification@example.test', 'Échec Phase 15',
    'Corps de notification', 'PHASE15_TEST', '2040-08-14T00:00:09Z', '2040-08-14T00:00:09Z'
  );

  request_value := jsonb_build_object(
    'actorId', owner_id,
    'range', '7d',
    'rangeStart', '2040-08-08T00:00:00Z',
    'rangeEnd', '2040-08-15T00:00:00Z',
    'todayStart', '2040-08-14T00:00:00Z',
    'todayEnd', '2040-08-15T00:00:00Z'
  );
  owner_result := public.get_admin_dashboard_server(request_value);

  if (owner_result->'summary'->>'grossPaidRevenueXof')::bigint <> 35000 then
    raise exception 'Expected gross paid revenue of 35000 without duplicate replay or refund subtraction';
  end if;
  if (owner_result->'summary'->>'paidOrderCount')::integer <> 2 then
    raise exception 'Expected two unique paid economic events';
  end if;
  if (owner_result->'summary'->>'ordersToday')::integer <> 2 then
    raise exception 'Expected exact-midnight and after-midnight orders, excluding the prior second';
  end if;
  if jsonb_array_length(owner_result->'salesTrend') <> 7
    or not exists (
      select 1 from jsonb_array_elements(owner_result->'salesTrend') bucket
      where bucket->>'date' = '2040-08-14'
        and (bucket->>'paidOrderCount')::integer = 2
        and (bucket->>'revenueXof')::bigint = 35000
    ) then
    raise exception 'Expected seven business-local daily buckets with correct paid totals';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(owner_result->'ordersBySource') source_row
    where source_row->>'source' = 'WEBSITE' and (source_row->>'orderCount')::integer = 2
  ) or not exists (
    select 1 from jsonb_array_elements(owner_result->'ordersBySource') source_row
    where source_row->>'source' = 'PHONE' and (source_row->>'orderCount')::integer = 1
  ) then raise exception 'Expected authoritative order channel grouping'; end if;
  if exists (
    select 1 from jsonb_array_elements(owner_result->'ordersBySource') source_row
    where source_row->>'source' = 'WHATSAPP'
  ) then raise exception 'A WhatsApp intent must not appear as an order'; end if;
  if owner_result->'topProducts'->0->>'productName' <> 'Instantané historique'
    or (owner_result->'topProducts'->0->>'unitsSold')::integer <> 2 then
    raise exception 'Expected SOLD quantities grouped by immutable product snapshot';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(owner_result->'lowStock') item
    where item->>'variantId' = variant_id::text
      and (item->>'availableQuantity')::integer = 1
  ) then raise exception 'Expected Phase 10 available stock rule to include reservations'; end if;

  support_result := public.get_admin_dashboard_server(request_value || jsonb_build_object('actorId', support_id));
  if support_result->'summary' ? 'grossPaidRevenueXof'
    or jsonb_array_length(support_result->'salesTrend') <> 0
    or jsonb_array_length(support_result->'paymentDistribution') <> 0
    or jsonb_array_length(support_result->'lowStock') <> 0 then
    raise exception 'CUSTOMER_SUPPORT received unauthorized financial or inventory data';
  end if;
  if not (support_result->'summary' ? 'newMessages')
    or jsonb_array_length(support_result->'recentMessages') = 0 then
    raise exception 'CUSTOMER_SUPPORT should receive message operations';
  end if;

  inventory_result := public.get_admin_dashboard_server(request_value || jsonb_build_object('actorId', inventory_id));
  if inventory_result->'summary' ? 'grossPaidRevenueXof'
    or inventory_result->'summary' ? 'ordersToday'
    or jsonb_array_length(inventory_result->'recentOrders') <> 0
    or jsonb_array_length(inventory_result->'recentMessages') <> 0
    or jsonb_array_length(inventory_result->'topProducts') = 0 then
    raise exception 'INVENTORY_MANAGER projection is not least privilege';
  end if;

  update public.profiles set active = false where id = support_id;
  begin
    perform public.get_admin_dashboard_server(request_value || jsonb_build_object('actorId', support_id));
    raise exception 'Expected inactive staff denial';
  exception when raise_exception then
    if sqlerrm <> 'DASHBOARD_FORBIDDEN' then raise; end if;
  end;

  if has_function_privilege('anon', 'public.get_admin_dashboard_server(jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.get_admin_dashboard_server(jsonb)', 'execute') then
    raise exception 'Dashboard aggregate must not be browser executable';
  end if;

  begin
    perform public.get_admin_dashboard_server(request_value || jsonb_build_object('rangeStart', '2040-08-08T01:00:00Z'));
    raise exception 'Expected non-midnight business boundary rejection';
  exception when raise_exception then
    if sqlerrm <> 'DASHBOARD_INVALID_RANGE' then raise; end if;
  end;
end
$$;

rollback;
