-- Phase 9 repair: fix ambiguous PL/pgSQL column resolution in guest-order creation.
-- Forward-only. Do not edit applied migrations.

create or replace function app_private.create_guest_order(request jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_idempotency_key text := btrim(coalesce(request->>'idempotencyKey', ''));
  request_fingerprint text := btrim(coalesce(request->>'requestFingerprint', ''));
  customer_payload jsonb := coalesce(request->'customer', '{}'::jsonb);
  attribution_payload jsonb := coalesce(request->'attribution', '{}'::jsonb);
  normalized_phone text := btrim(coalesce(customer_payload->>'phone', ''));
  normalized_whatsapp text := nullif(btrim(coalesce(customer_payload->>'whatsapp', '')), '');
  customer_email extensions.citext := nullif(lower(btrim(coalesce(customer_payload->>'email', ''))), '')::extensions.citext;
  customer_id_value uuid;
  order_id_value uuid;
  order_number_value text;
  subtotal_value bigint := 0;
  payment_method_value public.payment_method;
  payment_status_value public.payment_status;
  delivery_method_value text := btrim(coalesce(request->>'deliveryMethod', ''));
  existing_idempotency app_private.guest_order_idempotency%rowtype;
  settings_row public.store_settings%rowtype;
  line_count integer;
  variant_count integer;
  line_record record;
begin
  if v_idempotency_key !~ '^[A-Za-z0-9._:-]{32,160}$' then
    raise exception 'ORDER_INVALID_IDEMPOTENCY_KEY' using errcode = 'P0001';
  end if;

  if request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'ORDER_INVALID_FINGERPRINT' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('guest_order:' || v_idempotency_key, 0));

  select *
  into existing_idempotency
  from app_private.guest_order_idempotency
  where operation = 'guest_order_create'
    and guest_order_idempotency.idempotency_key = v_idempotency_key
  for update;

  if found then
    if existing_idempotency.request_fingerprint <> request_fingerprint then
      raise exception 'ORDER_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;

    if existing_idempotency.status = 'COMPLETED' and existing_idempotency.order_id is not null then
      return app_private.guest_order_confirmation(existing_idempotency.order_id);
    end if;
  else
    insert into app_private.guest_order_idempotency (
      operation,
      idempotency_key,
      request_fingerprint,
      status
    )
    values (
      'guest_order_create',
      v_idempotency_key,
      request_fingerprint,
      'PROCESSING'
    );
  end if;

  if jsonb_typeof(request->'lines') <> 'array' then
    raise exception 'ORDER_EMPTY_CART' using errcode = 'P0001';
  end if;

  create temporary table phase8_order_lines (
    product_id uuid not null,
    variant_id uuid not null,
    quantity integer not null,
    primary key (product_id, variant_id)
  ) on commit drop;

  insert into phase8_order_lines (product_id, variant_id, quantity)
  select
    (line->>'productId')::uuid,
    (line->>'variantId')::uuid,
    sum((line->>'quantity')::integer)::integer
  from jsonb_array_elements(request->'lines') as line
  group by (line->>'productId')::uuid, (line->>'variantId')::uuid;

  select count(*), count(distinct variant_id)
  into line_count, variant_count
  from phase8_order_lines;

  if line_count = 0 then
    raise exception 'ORDER_EMPTY_CART' using errcode = 'P0001';
  end if;

  if line_count > 20 or variant_count > 20 then
    raise exception 'ORDER_TOO_MANY_LINES' using errcode = 'P0001';
  end if;

  if exists (select 1 from phase8_order_lines where quantity < 1 or quantity > 20) then
    raise exception 'ORDER_INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  if normalized_phone !~ '^\+225[0-9]{10}$' then
    raise exception 'ORDER_INVALID_PHONE' using errcode = 'P0001';
  end if;

  if normalized_whatsapp is not null and normalized_whatsapp !~ '^\+225[0-9]{10}$' then
    raise exception 'ORDER_INVALID_PHONE' using errcode = 'P0001';
  end if;

  select *
  into settings_row
  from public.store_settings
  where id is true
  for share;

  if not found then
    raise exception 'ORDER_STORE_SETTINGS_UNAVAILABLE' using errcode = 'P0001';
  end if;

  payment_method_value := (request->>'paymentMethod')::public.payment_method;

  if not payment_method_value = any(settings_row.enabled_payment_methods) then
    raise exception 'ORDER_PAYMENT_METHOD_DISABLED' using errcode = 'P0001';
  end if;

  if not delivery_method_value = any(settings_row.enabled_delivery_methods) then
    raise exception 'ORDER_DELIVERY_METHOD_DISABLED' using errcode = 'P0001';
  end if;

  create temporary table phase8_locked_variants on commit drop as
  select
    order_lines.product_id as submitted_product_id,
    order_lines.variant_id,
    order_lines.quantity,
    product_variants.product_id as actual_product_id,
    product_variants.sku,
    product_variants.size_ml,
    product_variants.concentration,
    product_variants.price_xof,
    product_variants.stock_on_hand,
    product_variants.reserved_quantity,
    product_variants.inventory_initialized_at,
    product_variants.active as variant_active,
    products.name as product_name,
    products.slug as product_slug,
    products.description as product_description,
    products.status as product_status,
    brands.name as brand_name,
    product_images.object_path as image_object_path
  from phase8_order_lines as order_lines
  join public.product_variants on product_variants.id = order_lines.variant_id
  join public.products on products.id = product_variants.product_id
  left join public.brands on brands.id = products.brand_id
  left join lateral (
    select object_path
    from public.product_images
    where product_images.product_id = products.id
      and product_images.active is true
      and product_images.approved is true
      and product_images.object_path is not null
    order by product_images.is_primary desc, product_images.sort_order asc, product_images.created_at asc
    limit 1
  ) as product_images on true
  order by order_lines.variant_id
  for update of product_variants, products;

  if (select count(*) from phase8_locked_variants) <> line_count then
    raise exception 'ORDER_ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from phase8_locked_variants
    where actual_product_id <> submitted_product_id
  ) then
    raise exception 'ORDER_ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from phase8_locked_variants
    where product_status <> 'ACTIVE'::public.product_status
      or length(btrim(product_name)) = 0
      or length(btrim(coalesce(product_description, ''))) = 0
      or not app_private.product_meets_active_requirements(actual_product_id)
      or variant_active is not true
      or price_xof <= 0
  ) then
    raise exception 'ORDER_ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from phase8_locked_variants
    where inventory_initialized_at is null
  ) then
    raise exception 'ORDER_INVENTORY_NOT_CONFIGURED' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from phase8_locked_variants
    where stock_on_hand - reserved_quantity < quantity
  ) then
    raise exception 'ORDER_INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  select coalesce(sum(price_xof * quantity), 0)
  into subtotal_value
  from phase8_locked_variants;

  if subtotal_value < 1 or subtotal_value > 9000000000000 then
    raise exception 'ORDER_TOTAL_INVALID' using errcode = 'P0001';
  end if;

  insert into public.customers (
    full_name,
    email,
    phone,
    normalized_phone,
    whatsapp
  )
  values (
    btrim(customer_payload->>'fullName'),
    customer_email,
    normalized_phone,
    normalized_phone,
    normalized_whatsapp
  )
  on conflict (normalized_phone) where normalized_phone is not null do update set
    email = coalesce(excluded.email, public.customers.email),
    whatsapp = coalesce(excluded.whatsapp, public.customers.whatsapp)
  returning id into customer_id_value;

  order_number_value := app_private.generate_order_number();
  payment_status_value := case
    when payment_method_value in ('CASH_ON_DELIVERY'::public.payment_method, 'PAY_IN_STORE'::public.payment_method)
      then 'UNPAID'::public.payment_status
    else 'PENDING'::public.payment_status
  end;

  insert into public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_whatsapp,
    delivery_country,
    delivery_city,
    delivery_commune,
    delivery_area,
    delivery_address,
    delivery_landmark,
    delivery_instructions,
    delivery_method,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    currency,
    subtotal_xof,
    delivery_fee_xof,
    discount_xof,
    total_xof,
    payment_method,
    payment_status,
    status,
    customer_note
  )
  values (
    order_number_value,
    customer_id_value,
    btrim(customer_payload->>'fullName'),
    customer_email,
    normalized_phone,
    normalized_whatsapp,
    'CI',
    btrim(customer_payload->>'city'),
    btrim(customer_payload->>'commune'),
    nullif(btrim(coalesce(customer_payload->>'area', '')), ''),
    coalesce(nullif(btrim(coalesce(customer_payload->>'address', '')), ''), btrim(customer_payload->>'commune') || ', ' || btrim(customer_payload->>'city')),
    nullif(btrim(coalesce(customer_payload->>'landmark', '')), ''),
    nullif(btrim(coalesce(customer_payload->>'deliveryInstructions', '')), ''),
    delivery_method_value,
    'WEBSITE'::public.order_source,
    nullif(btrim(coalesce(attribution_payload->>'utmSource', '')), ''),
    nullif(btrim(coalesce(attribution_payload->>'utmMedium', '')), ''),
    nullif(btrim(coalesce(attribution_payload->>'utmCampaign', '')), ''),
    nullif(btrim(coalesce(attribution_payload->>'utmTerm', '')), ''),
    nullif(btrim(coalesce(attribution_payload->>'utmContent', '')), ''),
    'XOF',
    subtotal_value,
    0,
    0,
    subtotal_value,
    payment_method_value,
    payment_status_value,
    'PENDING_CONFIRMATION'::public.order_status,
    nullif(btrim(coalesce(customer_payload->>'customerNote', '')), '')
  )
  returning id into order_id_value;

  for line_record in select * from phase8_locked_variants order by variant_id loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      sku,
      product_name,
      brand_name,
      product_slug,
      variant_name,
      image_url,
      size_ml,
      concentration,
      currency,
      unit_price_xof,
      quantity,
      total_price_xof
    )
    values (
      order_id_value,
      line_record.actual_product_id,
      line_record.variant_id,
      line_record.sku,
      line_record.product_name,
      line_record.brand_name,
      line_record.product_slug,
      line_record.size_ml::text || ' ml' ||
        case when line_record.concentration is null or btrim(line_record.concentration) = '' then '' else ' · ' || line_record.concentration end,
      line_record.image_object_path,
      line_record.size_ml,
      line_record.concentration,
      'XOF',
      line_record.price_xof,
      line_record.quantity,
      line_record.price_xof * line_record.quantity
    );

    update public.product_variants
    set reserved_quantity = reserved_quantity + line_record.quantity
    where id = line_record.variant_id;

    insert into public.inventory_transactions (
      variant_id,
      type,
      quantity_delta,
      stock_before,
      stock_after,
      reserved_before,
      reserved_after,
      order_id,
      actor_id,
      reason,
      metadata
    )
    values (
      line_record.variant_id,
      'RESERVED'::public.inventory_transaction_type,
      line_record.quantity,
      line_record.stock_on_hand,
      line_record.stock_on_hand,
      line_record.reserved_quantity,
      line_record.reserved_quantity + line_record.quantity,
      order_id_value,
      null,
      'Réservation automatique commande invitée',
      jsonb_build_object('source', 'guest_checkout', 'order_number', order_number_value)
    );
  end loop;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, note)
  values (
    order_id_value,
    null,
    'PENDING_CONFIRMATION'::public.order_status,
    null,
    'Commande invitée créée; confirmation manuelle requise.'
  );

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    null,
    'ORDER_CREATED',
    'order',
    order_id_value,
    jsonb_build_object(
      'order_number', order_number_value,
      'source', 'guest_checkout',
      'idempotency_hash', request_fingerprint,
      'line_count', line_count,
      'subtotal_xof', subtotal_value
    )
  );

  insert into public.notifications (
    channel,
    status,
    recipient,
    subject,
    template_key,
    payload,
    idempotency_key
  )
  values
    (
      'IN_APP'::public.notification_channel,
      'PENDING'::public.notification_status,
      'staff:orders',
      'Nouvelle commande',
      'admin_order_created',
      jsonb_build_object('order_id', order_id_value, 'order_number', order_number_value),
      'guest_order:' || order_id_value::text || ':staff_in_app'
    ),
    (
      'EMAIL'::public.notification_channel,
      'PENDING'::public.notification_status,
      coalesce(settings_row.notification_email::text, settings_row.contact_email::text, 'staff:orders'),
      'Nouvelle commande ' || order_number_value,
      'admin_order_created',
      jsonb_build_object('order_id', order_id_value, 'order_number', order_number_value),
      'guest_order:' || order_id_value::text || ':admin_email'
    )
  on conflict (idempotency_key) do nothing;

  if customer_email is not null then
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
      'EMAIL'::public.notification_channel,
      'PENDING'::public.notification_status,
      customer_email::text,
      'Commande reçue ' || order_number_value,
      'customer_order_received',
      jsonb_build_object('order_number', order_number_value),
      'guest_order:' || order_id_value::text || ':customer_email'
    )
    on conflict (idempotency_key) do nothing;
  end if;

  update app_private.guest_order_idempotency
  set
    status = 'COMPLETED',
    order_id = order_id_value,
    completed_at = timezone('utc', now())
  where operation = 'guest_order_create'
    and guest_order_idempotency.idempotency_key = v_idempotency_key;

  if to_regclass('pg_temp.phase8_force_guest_order_rollback') is not null then
    raise exception 'ORDER_FORCED_ROLLBACK' using errcode = 'P0001';
  end if;

  return app_private.guest_order_confirmation(order_id_value);
exception
  when invalid_text_representation then
    raise exception 'ORDER_INVALID_REQUEST' using errcode = 'P0001';
  when check_violation then
    raise exception 'ORDER_INVALID_REQUEST' using errcode = 'P0001';
end;
$$;

revoke all on function app_private.create_guest_order(jsonb) from public, anon, authenticated;
grant execute on function app_private.create_guest_order(jsonb) to service_role;

comment on function app_private.create_guest_order(jsonb) is
  'Phase 8 private guest-order transaction. Phase 9 repair adds explicit PL/pgSQL variable-conflict handling for the customer normalized-phone upsert while preserving atomic reservation behaviour.';
