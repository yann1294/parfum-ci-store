begin;

do $$
<<phase8>>
declare
  brand_id uuid := '10000000-0000-4000-8000-000000000001';
  category_id uuid := '10000000-0000-4000-8000-000000000002';
  product_id uuid := '10000000-0000-4000-8000-000000000003';
  variant_id uuid := '10000000-0000-4000-8000-000000000004';
  rollback_product_id uuid := '10000000-0000-4000-8000-000000000005';
  rollback_variant_id uuid := '10000000-0000-4000-8000-000000000006';
  payload jsonb;
  response jsonb;
  first_order_id uuid;
  first_order_number text;
  before_count integer;
  after_count integer;
begin
  update public.store_settings
  set
    enabled_payment_methods = array['CASH_ON_DELIVERY', 'ORANGE_MONEY']::public.payment_method[],
    enabled_delivery_methods = array['HOME_DELIVERY', 'PICKUP']::text[],
    notification_email = 'orders-test@example.com',
    default_delivery_fee_xof = 0,
    accepting_orders = true,
    maintenance_mode = false
  where id is true;

  insert into public.brands (id, name, slug, active)
  values (brand_id, 'Phase 8 Brand', 'phase-8-brand', true)
  on conflict (id) do nothing;

  insert into public.categories (id, name, slug, active)
  values (category_id, 'Phase 8 Category', 'phase-8-category', true)
  on conflict (id) do nothing;

  insert into public.products (id, brand_id, category_id, name, slug, description, status)
  values (product_id, brand_id, category_id, 'Phase 8 Product', 'phase-8-product', 'Valid product for order transaction tests.', 'DRAFT')
  on conflict (id) do nothing;

  insert into public.product_variants (
    id,
    product_id,
    sku,
    size_ml,
    concentration,
    price_xof,
    stock_on_hand,
    reserved_quantity,
    low_stock_threshold,
    active,
    inventory_initialized_at
  )
  values (
    variant_id,
    product_id,
    'PHASE8-100-EDP',
    100,
    'EDP',
    95000,
    2,
    0,
    1,
    true,
    timezone('utc', now())
  )
  on conflict (id) do nothing;

  insert into public.product_images (
    product_id,
    bucket_id,
    object_path,
    alt_text,
    approved,
    active,
    is_primary,
    mime_type,
    byte_size
  )
  values (
    product_id,
    'product-images',
    'products/10000000-0000-4000-8000-000000000003/10000000-0000-4000-8000-000000000007.webp',
    'Phase 8 Product',
    true,
    true,
    true,
    'image/webp',
    1024
  )
  on conflict do nothing;

  update public.products set status = 'ACTIVE' where id = product_id;

  payload := jsonb_build_object(
    'idempotencyKey', 'phase8-sql-idempotency-key-00000001',
    'requestFingerprint', repeat('a', 64),
    'customer', jsonb_build_object(
      'fullName', 'Awa Koné',
      'phone', '+2250700000000',
      'whatsapp', '+2250700000000',
      'email', 'awa.sql@example.com',
      'city', 'Abidjan',
      'commune', 'Cocody',
      'address', 'Adresse test',
      'landmark', 'Repère test',
      'deliveryInstructions', 'Instructions test',
      'customerNote', 'Note test'
    ),
    'deliveryMethod', 'HOME_DELIVERY',
    'paymentMethod', 'CASH_ON_DELIVERY',
    'attribution', jsonb_build_object('utmSource', 'sql-test'),
    'lines', jsonb_build_array(jsonb_build_object('productId', product_id, 'variantId', variant_id, 'quantity', 1))
  );

  response := public.create_guest_order_server(payload);
  first_order_id := (response->>'orderId')::uuid;
  first_order_number := response->>'orderNumber';

  if response->>'orderStatus' <> 'PENDING_CONFIRMATION' then
    raise exception 'Expected initial order status PENDING_CONFIRMATION';
  end if;

  if response->>'paymentStatus' <> 'UNPAID' then
    raise exception 'Expected COD payment status UNPAID';
  end if;

  if (response->>'subtotalXof')::bigint <> 95000 or (response->>'totalXof')::bigint <> 95000 then
    raise exception 'Expected authoritative integer totals of 95000 XOF';
  end if;

  if not exists (
    select 1 from public.orders
    where id = first_order_id
      and order_number = first_order_number
      and customer_phone = '+2250700000000'
      and delivery_country = 'CI'
      and subtotal_xof = 95000
      and total_xof = 95000
  ) then
    raise exception 'Expected order snapshot to be persisted';
  end if;

  if not exists (
    select 1 from public.customers
    where normalized_phone = '+2250700000000'
  ) then
    raise exception 'Expected reusable customer matched by normalized phone';
  end if;

  if not exists (
    select 1 from public.order_items
    where order_id = first_order_id
      and product_name = 'Phase 8 Product'
      and sku = 'PHASE8-100-EDP'
      and brand_name = 'Phase 8 Brand'
      and product_slug = 'phase-8-product'
      and currency = 'XOF'
      and unit_price_xof = 95000
      and quantity = 1
      and total_price_xof = 95000
  ) then
    raise exception 'Expected immutable order item snapshot';
  end if;

  if not exists (
    select 1 from public.product_variants
    where id = variant_id
      and stock_on_hand = 2
      and reserved_quantity = 1
  ) then
    raise exception 'Expected inventory reservation without stock decrement';
  end if;

  if not exists (
    select 1 from public.inventory_transactions
    where order_id = first_order_id
      and inventory_transactions.variant_id = phase8.variant_id
      and type = 'RESERVED'
      and quantity_delta = 1
      and stock_before = 2
      and stock_after = 2
      and reserved_before = 0
      and reserved_after = 1
  ) then
    raise exception 'Expected RESERVED inventory transaction';
  end if;

  if not exists (
    select 1 from public.order_status_history
    where order_id = first_order_id
      and from_status is null
      and to_status = 'PENDING_CONFIRMATION'
  ) then
    raise exception 'Expected initial order status history';
  end if;

  if not exists (
    select 1 from public.audit_logs
    where resource_type = 'order'
      and resource_id = first_order_id
      and action = 'ORDER_CREATED'
  ) then
    raise exception 'Expected ORDER_CREATED audit event';
  end if;

  if not exists (
    select 1 from public.notifications
    where template_key = 'admin_order_created'
      and recipient = 'orders-test@example.com'
      and public.notifications.payload->>'order_number' = first_order_number
  ) then
    raise exception 'Expected admin notification intent';
  end if;

  if not exists (
    select 1 from public.notifications
    where template_key = 'customer_order_received'
      and recipient = 'awa.sql@example.com'
  ) then
    raise exception 'Expected customer email notification intent when email exists';
  end if;

  select count(*) into before_count from public.inventory_transactions where order_id = first_order_id;
  response := public.create_guest_order_server(payload);
  select count(*) into after_count from public.inventory_transactions where order_id = first_order_id;

  if response->>'orderId' <> first_order_id::text or before_count <> after_count then
    raise exception 'Expected idempotent replay to return original order without duplicate reservation';
  end if;

  begin
    perform public.create_guest_order_server(jsonb_set(payload, '{requestFingerprint}', to_jsonb(repeat('b', 64))));
    raise exception 'Expected idempotency conflict';
  exception
    when raise_exception then
      if sqlerrm <> 'ORDER_IDEMPOTENCY_CONFLICT' then
        raise;
      end if;
  end;

  -- The production RPC commits between distinct requests, which drops this
  -- per-request table. The outer test transaction must simulate that boundary.
  drop table if exists pg_temp.phase8_locked_variants;
  drop table if exists pg_temp.phase8_order_lines;

  begin
    perform public.create_guest_order_server(
      jsonb_set(
        jsonb_set(payload, '{idempotencyKey}', '"phase8-sql-idempotency-key-00000002"'::jsonb),
        '{lines,0,quantity}',
        '2'::jsonb
      )
    );
    raise exception 'Expected insufficient stock after one unit is already reserved';
  exception
    when raise_exception then
      if sqlerrm <> 'ORDER_INSUFFICIENT_STOCK' then
        raise;
      end if;
  end;

  if has_function_privilege('anon', 'public.create_guest_order_server(jsonb)', 'execute') then
    raise exception 'Expected anon execute grant to be denied';
  end if;

  if has_function_privilege('authenticated', 'public.create_guest_order_server(jsonb)', 'execute') then
    raise exception 'Expected authenticated execute grant to be denied';
  end if;

  if not has_function_privilege('service_role', 'public.create_guest_order_server(jsonb)', 'execute') then
    raise exception 'Expected service_role execute grant';
  end if;

  insert into public.products (id, brand_id, category_id, name, slug, description, status)
  values (rollback_product_id, brand_id, category_id, 'Phase 8 Rollback Product', 'phase-8-rollback-product', 'Valid rollback product.', 'DRAFT');

  insert into public.product_variants (
    id,
    product_id,
    sku,
    size_ml,
    concentration,
    price_xof,
    stock_on_hand,
    reserved_quantity,
    low_stock_threshold,
    active,
    inventory_initialized_at
  )
  values (
    rollback_variant_id,
    rollback_product_id,
    'PHASE8-ROLLBACK-100-EDP',
    100,
    'EDP',
    125000,
    1,
    0,
    1,
    true,
    timezone('utc', now())
  );

  insert into public.product_images (
    product_id,
    bucket_id,
    object_path,
    alt_text,
    approved,
    active,
    is_primary,
    mime_type,
    byte_size
  )
  values (
    rollback_product_id,
    'product-images',
    'products/10000000-0000-4000-8000-000000000005/10000000-0000-4000-8000-000000000008.webp',
    'Phase 8 Rollback Product',
    true,
    true,
    true,
    'image/webp',
    1024
  );

  update public.products set status = 'ACTIVE' where id = rollback_product_id;

  create temporary table phase8_force_guest_order_rollback(id boolean) on commit drop;

  begin
    perform public.create_guest_order_server(jsonb_build_object(
      'idempotencyKey', 'phase8-sql-idempotency-key-rollback-001',
      'requestFingerprint', repeat('c', 64),
      'customer', jsonb_build_object(
        'fullName', 'Rollback Test',
        'phone', '+2250500000000',
        'city', 'Abidjan',
        'commune', 'Plateau',
        'address', 'Rollback'
      ),
      'deliveryMethod', 'HOME_DELIVERY',
      'paymentMethod', 'CASH_ON_DELIVERY',
      'lines', jsonb_build_array(jsonb_build_object('productId', rollback_product_id, 'variantId', rollback_variant_id, 'quantity', 1))
    ));
    raise exception 'Expected forced rollback failure';
  exception
    when raise_exception then
      if sqlerrm <> 'ORDER_FORCED_ROLLBACK' then
        raise;
      end if;
  end;

  if exists (select 1 from public.orders where customer_phone = '+2250500000000')
    or exists (select 1 from public.customers where normalized_phone = '+2250500000000')
    or exists (select 1 from public.inventory_transactions where inventory_transactions.variant_id = phase8.rollback_variant_id and type = 'RESERVED')
    or exists (select 1 from public.product_variants where id = phase8.rollback_variant_id and reserved_quantity <> 0)
    or exists (select 1 from app_private.guest_order_idempotency where idempotency_key = 'phase8-sql-idempotency-key-rollback-001') then
    raise exception 'Expected forced rollback to leave no partial order/customer/reservation/idempotency state';
  end if;
end $$;

rollback;
