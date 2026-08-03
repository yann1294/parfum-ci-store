-- Phase 11 repair: reject stale admin order transitions after locking the order row.
-- Forward-only migration. Do not edit applied migrations.

create or replace function app_private.transition_order(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order_id uuid;
  v_expected_status public.order_status;
  v_target_status public.order_status;
  v_reason text;
  v_note text;
  v_idempotency_key text;
  v_actor_id uuid;
  v_request_fingerprint text;
  v_result jsonb;
  v_now timestamptz := timezone('utc', now());
  order_row public.orders%rowtype;
  actor_row public.profiles%rowtype;
  existing_row app_private.order_transition_idempotency%rowtype;
  line_record record;
  variant_row public.product_variants%rowtype;
  variant_id_value uuid;
  v_stock_effect text := 'NONE';
  v_reason_required boolean := false;
  v_notification_template text;
begin
  v_order_id := nullif(request->>'orderId', '')::uuid;
  v_expected_status := nullif(request->>'expectedStatus', '')::public.order_status;
  v_target_status := nullif(request->>'targetStatus', '')::public.order_status;
  v_reason := btrim(coalesce(request->>'reason', ''));
  v_note := nullif(btrim(coalesce(request->>'note', '')), '');
  v_idempotency_key := btrim(coalesce(request->>'idempotencyKey', ''));
  v_actor_id := nullif(request->>'actorId', '')::uuid;
  v_request_fingerprint := btrim(coalesce(request->>'requestFingerprint', ''));

  if v_order_id is null or v_target_status is null or v_actor_id is null then
    raise exception 'ORDER_TRANSITION_INVALID_REQUEST';
  end if;

  if v_idempotency_key = '' or length(v_idempotency_key) < 32 or length(v_idempotency_key) > 180 then
    raise exception 'ORDER_TRANSITION_INVALID_REQUEST';
  end if;

  if v_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'ORDER_TRANSITION_INVALID_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('order_transition:' || v_idempotency_key, 0));

  select *
  into existing_row
  from app_private.order_transition_idempotency
  where operation = 'order_transition'
    and idempotency_key = v_idempotency_key
  for update;

  if found then
    if existing_row.request_fingerprint <> v_request_fingerprint then
      raise exception 'ORDER_TRANSITION_IDEMPOTENCY_CONFLICT';
    end if;
    return existing_row.result;
  end if;

  select *
  into actor_row
  from public.profiles
  where id = v_actor_id
    and active is true
    and role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role, 'ORDER_MANAGER'::public.app_role);

  if not found then
    raise exception 'ORDER_TRANSITION_UNAUTHORIZED';
  end if;

  select *
  into order_row
  from public.orders
  where id = v_order_id
  for update;

  if not found then
    raise exception 'ORDER_TRANSITION_NOT_FOUND';
  end if;

  if v_expected_status is not null and order_row.status <> v_expected_status then
    raise exception 'ORDER_TRANSITION_STALE_STATE';
  end if;

  if order_row.status = v_target_status then
    v_result := jsonb_build_object(
      'orderId', order_row.id,
      'orderNumber', order_row.order_number,
      'fromStatus', order_row.status,
      'toStatus', order_row.status,
      'stockEffect', 'NONE',
      'idempotent', true
    );

    insert into app_private.order_transition_idempotency (operation, idempotency_key, request_fingerprint, result)
    values ('order_transition', v_idempotency_key, v_request_fingerprint, v_result);

    return v_result;
  end if;

  if order_row.status = 'PENDING_CONFIRMATION' and v_target_status in ('CONFIRMED', 'CANCELLED') then
    null;
  elsif order_row.status = 'CONFIRMED' and v_target_status in ('PREPARING', 'CANCELLED') then
    null;
  elsif order_row.status = 'PREPARING' and v_target_status = 'READY_FOR_PICKUP' and order_row.delivery_method = 'PICKUP' then
    null;
  elsif order_row.status = 'PREPARING' and v_target_status = 'OUT_FOR_DELIVERY' and order_row.delivery_method = 'HOME_DELIVERY' then
    null;
  elsif order_row.status = 'PREPARING' and v_target_status = 'CANCELLED' then
    null;
  elsif order_row.status = 'READY_FOR_PICKUP' and v_target_status in ('DELIVERED', 'CANCELLED') then
    null;
  elsif order_row.status = 'OUT_FOR_DELIVERY' and v_target_status in ('DELIVERED', 'RETURNED') then
    null;
  elsif order_row.status = 'DELIVERED' and v_target_status = 'RETURNED' then
    null;
  else
    raise exception 'ORDER_TRANSITION_INVALID_STATUS';
  end if;

  if v_target_status = 'CANCELLED' then
    v_stock_effect := 'RELEASED';
    v_reason_required := true;
  elsif v_target_status = 'DELIVERED' then
    v_stock_effect := 'SOLD';
  elsif v_target_status = 'RETURNED' then
    v_reason_required := true;
  end if;

  if v_reason_required and v_reason = '' then
    raise exception 'ORDER_TRANSITION_REASON_REQUIRED';
  end if;

  if v_stock_effect in ('RELEASED', 'SOLD') then
    for variant_id_value in
      select distinct order_items.variant_id
      from public.order_items
      where order_items.order_id = v_order_id
        and order_items.variant_id is not null
      order by order_items.variant_id
    loop
      perform 1 from public.product_variants where id = variant_id_value for update;
    end loop;

    for line_record in
      select variant_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = v_order_id
        and variant_id is not null
      group by variant_id
      order by variant_id
    loop
      select *
      into variant_row
      from public.product_variants
      where id = line_record.variant_id
      for update;

      if not found then
        raise exception 'ORDER_TRANSITION_STOCK_INVALID';
      end if;

      if variant_row.reserved_quantity < line_record.quantity then
        raise exception 'ORDER_TRANSITION_RESERVATION_MISSING';
      end if;

      if v_stock_effect = 'RELEASED' then
        update public.product_variants
        set reserved_quantity = product_variants.reserved_quantity - line_record.quantity
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
          'RELEASED'::public.inventory_transaction_type,
          -line_record.quantity,
          variant_row.stock_on_hand,
          variant_row.stock_on_hand,
          variant_row.reserved_quantity,
          variant_row.reserved_quantity - line_record.quantity,
          v_order_id,
          v_actor_id,
          coalesce(nullif(v_reason, ''), 'Annulation commande'),
          jsonb_build_object('source', 'admin_order_transition', 'order_number', order_row.order_number, 'idempotency_key', v_idempotency_key)
        );
      elsif v_stock_effect = 'SOLD' then
        if variant_row.stock_on_hand < line_record.quantity then
          raise exception 'ORDER_TRANSITION_STOCK_INVALID';
        end if;

        update public.product_variants
        set
          stock_on_hand = product_variants.stock_on_hand - line_record.quantity,
          reserved_quantity = product_variants.reserved_quantity - line_record.quantity
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
          'SOLD'::public.inventory_transaction_type,
          -line_record.quantity,
          variant_row.stock_on_hand,
          variant_row.stock_on_hand - line_record.quantity,
          variant_row.reserved_quantity,
          variant_row.reserved_quantity - line_record.quantity,
          v_order_id,
          v_actor_id,
          'Conversion réservation en vente',
          jsonb_build_object('source', 'admin_order_transition', 'order_number', order_row.order_number, 'idempotency_key', v_idempotency_key)
        );
      end if;
    end loop;
  end if;

  update public.orders
  set
    status = v_target_status,
    confirmed_at = case when v_target_status = 'CONFIRMED' and confirmed_at is null then v_now else confirmed_at end,
    prepared_at = case when v_target_status = 'PREPARING' and prepared_at is null then v_now else prepared_at end,
    ready_at = case when v_target_status = 'READY_FOR_PICKUP' and ready_at is null then v_now else ready_at end,
    out_for_delivery_at = case when v_target_status = 'OUT_FOR_DELIVERY' and out_for_delivery_at is null then v_now else out_for_delivery_at end,
    delivered_at = case when v_target_status = 'DELIVERED' and delivered_at is null then v_now else delivered_at end,
    cancelled_at = case when v_target_status = 'CANCELLED' and cancelled_at is null then v_now else cancelled_at end,
    returned_at = case when v_target_status = 'RETURNED' and returned_at is null then v_now else returned_at end
  where id = v_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, note)
  values (v_order_id, order_row.status, v_target_status, v_actor_id, coalesce(nullif(v_reason, ''), v_note));

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    v_actor_id,
    'ORDER_STATUS_CHANGED',
    'order',
    v_order_id,
    jsonb_strip_nulls(jsonb_build_object(
      'order_number', order_row.order_number,
      'from_status', order_row.status,
      'to_status', v_target_status,
      'stock_effect', v_stock_effect,
      'reason', nullif(left(v_reason, 300), ''),
      'note', case when v_note is null then null else left(v_note, 300) end
    ))
  );

  v_notification_template := case v_target_status
    when 'CONFIRMED' then 'order_confirmed'
    when 'PREPARING' then 'order_preparing'
    when 'READY_FOR_PICKUP' then 'order_ready_for_pickup'
    when 'OUT_FOR_DELIVERY' then 'order_out_for_delivery'
    when 'DELIVERED' then 'order_delivered'
    when 'CANCELLED' then 'order_cancelled'
    when 'RETURNED' then 'order_returned'
    else 'order_status_changed'
  end;

  insert into public.notifications (channel, status, recipient, subject, template_key, payload, idempotency_key)
  values (
    'IN_APP'::public.notification_channel,
    'PENDING'::public.notification_status,
    'staff:orders',
    'Commande ' || order_row.order_number || ' - ' || v_target_status::text,
    v_notification_template,
    jsonb_build_object('order_id', v_order_id, 'order_number', order_row.order_number, 'status', v_target_status),
    'order_transition:' || v_idempotency_key || ':staff_in_app'
  )
  on conflict (idempotency_key) do nothing;

  v_result := jsonb_build_object(
    'orderId', v_order_id,
    'orderNumber', order_row.order_number,
    'fromStatus', order_row.status,
    'toStatus', v_target_status,
    'stockEffect', v_stock_effect,
    'idempotent', false
  );

  insert into app_private.order_transition_idempotency (operation, idempotency_key, request_fingerprint, result)
  values ('order_transition', v_idempotency_key, v_request_fingerprint, v_result);

  return v_result;
exception
  when invalid_text_representation then
    raise exception 'ORDER_TRANSITION_INVALID_REQUEST';
end;
$$;

revoke all on function app_private.transition_order(jsonb) from public, anon, authenticated;
grant execute on function app_private.transition_order(jsonb) to service_role;

comment on function app_private.transition_order(jsonb) is
  'Phase 11 transactional order transition function. The optional expectedStatus field is checked after FOR UPDATE locking to reject stale concurrent UI actions.';
