-- Phase 11: transactional admin order management and stock lifecycle.
-- Forward-only migration. Do not edit applied migrations.

create table if not exists app_private.order_transition_idempotency (
  id uuid primary key default extensions.gen_random_uuid(),
  operation text not null default 'order_transition',
  idempotency_key text not null,
  request_fingerprint text not null,
  result jsonb,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  constraint order_transition_idempotency_key_not_blank check (length(btrim(idempotency_key)) >= 32),
  constraint order_transition_idempotency_fingerprint_hex check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint order_transition_idempotency_status_known check (status = 'COMPLETED')
);

create unique index if not exists order_transition_idempotency_operation_key_idx
  on app_private.order_transition_idempotency(operation, idempotency_key);

create table if not exists app_private.payment_status_idempotency (
  id uuid primary key default extensions.gen_random_uuid(),
  operation text not null default 'payment_status_update',
  idempotency_key text not null,
  request_fingerprint text not null,
  result jsonb,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  constraint payment_status_idempotency_key_not_blank check (length(btrim(idempotency_key)) >= 32),
  constraint payment_status_idempotency_fingerprint_hex check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint payment_status_idempotency_status_known check (status = 'COMPLETED')
);

create unique index if not exists payment_status_idempotency_operation_key_idx
  on app_private.payment_status_idempotency(operation, idempotency_key);

grant usage on schema app_private to service_role;
revoke all on app_private.order_transition_idempotency from public, anon, authenticated;
revoke all on app_private.payment_status_idempotency from public, anon, authenticated;
grant select, insert, update on app_private.order_transition_idempotency to service_role;
grant select, insert, update on app_private.payment_status_idempotency to service_role;

create table if not exists public.order_internal_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint order_internal_notes_note_not_blank check (length(btrim(note)) > 0),
  constraint order_internal_notes_note_length check (char_length(note) <= 1000)
);

create index if not exists order_internal_notes_order_created_idx
  on public.order_internal_notes(order_id, created_at desc);

alter table public.order_internal_notes enable row level security;

drop policy if exists "order_internal_notes_staff_read" on public.order_internal_notes;
create policy "order_internal_notes_staff_read" on public.order_internal_notes
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

drop policy if exists "order_internal_notes_staff_insert" on public.order_internal_notes;
create policy "order_internal_notes_staff_insert" on public.order_internal_notes
  for insert to authenticated
  with check (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

revoke update, delete on public.order_status_history from anon, authenticated;
revoke update, delete on public.payment_transactions from anon, authenticated;
revoke update, delete on public.order_internal_notes from anon, authenticated;

create index if not exists payment_transactions_order_created_idx
  on public.payment_transactions(order_id, created_at desc);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history(order_id, created_at desc);

create or replace function app_private.transition_order(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order_id uuid;
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

create or replace function public.transition_order_server(request jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.transition_order(request);
$$;

revoke all on function public.transition_order_server(jsonb) from public, anon, authenticated;
grant execute on function public.transition_order_server(jsonb) to service_role;

create or replace function app_private.record_order_payment(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order_id uuid;
  v_target_status public.payment_status;
  v_reason text;
  v_reference text;
  v_idempotency_key text;
  v_actor_id uuid;
  v_request_fingerprint text;
  v_amount_xof bigint;
  v_result jsonb;
  order_row public.orders%rowtype;
  actor_row public.profiles%rowtype;
  existing_row app_private.payment_status_idempotency%rowtype;
  inserted_payment_id uuid;
begin
  v_order_id := nullif(request->>'orderId', '')::uuid;
  v_target_status := nullif(request->>'targetPaymentStatus', '')::public.payment_status;
  v_reason := btrim(coalesce(request->>'reason', ''));
  v_reference := nullif(btrim(coalesce(request->>'reference', '')), '');
  v_idempotency_key := btrim(coalesce(request->>'idempotencyKey', ''));
  v_actor_id := nullif(request->>'actorId', '')::uuid;
  v_request_fingerprint := btrim(coalesce(request->>'requestFingerprint', ''));

  if v_order_id is null or v_target_status is null or v_actor_id is null then
    raise exception 'PAYMENT_INVALID_REQUEST';
  end if;

  if v_target_status not in ('PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') then
    raise exception 'PAYMENT_INVALID_STATUS';
  end if;

  if v_idempotency_key = '' or length(v_idempotency_key) < 32 or length(v_idempotency_key) > 180 then
    raise exception 'PAYMENT_INVALID_REQUEST';
  end if;

  if v_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'PAYMENT_INVALID_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('payment_status:' || v_idempotency_key, 0));

  select *
  into existing_row
  from app_private.payment_status_idempotency
  where operation = 'payment_status_update'
    and idempotency_key = v_idempotency_key
  for update;

  if found then
    if existing_row.request_fingerprint <> v_request_fingerprint then
      raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
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
    raise exception 'PAYMENT_UNAUTHORIZED';
  end if;

  select *
  into order_row
  from public.orders
  where id = v_order_id
  for update;

  if not found then
    raise exception 'PAYMENT_ORDER_NOT_FOUND';
  end if;

  if order_row.payment_status = v_target_status then
    v_result := jsonb_build_object(
      'orderId', order_row.id,
      'orderNumber', order_row.order_number,
      'fromPaymentStatus', order_row.payment_status,
      'toPaymentStatus', order_row.payment_status,
      'paymentTransactionId', null,
      'idempotent', true
    );

    insert into app_private.payment_status_idempotency (operation, idempotency_key, request_fingerprint, result)
    values ('payment_status_update', v_idempotency_key, v_request_fingerprint, v_result);

    return v_result;
  end if;

  if v_target_status = 'PAID' and order_row.payment_status not in ('UNPAID', 'PENDING', 'FAILED') then
    raise exception 'PAYMENT_INVALID_STATUS';
  end if;

  if v_target_status in ('FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') and v_reason = '' then
    raise exception 'PAYMENT_REASON_REQUIRED';
  end if;

  if v_target_status = 'PAID'
    and order_row.payment_method in ('ORANGE_MONEY'::public.payment_method, 'MTN_MOMO'::public.payment_method, 'WAVE'::public.payment_method, 'MOOV_MONEY'::public.payment_method, 'BANK_TRANSFER'::public.payment_method)
    and coalesce(v_reference, v_reason, '') = ''
  then
    raise exception 'PAYMENT_REFERENCE_REQUIRED';
  end if;

  v_amount_xof := order_row.total_xof;
  if v_amount_xof is null or v_amount_xof < 0 then
    raise exception 'PAYMENT_AMOUNT_INVALID';
  end if;

  update public.orders
  set
    payment_status = v_target_status,
    payment_reference = case when v_reference is not null then v_reference else payment_reference end
  where id = v_order_id;

  insert into public.payment_transactions (
    order_id,
    method,
    status,
    provider,
    provider_reference,
    amount_xof,
    verified_by,
    verified_at,
    metadata
  )
  values (
    v_order_id,
    order_row.payment_method,
    v_target_status,
    'manual',
    v_reference,
    v_amount_xof,
    v_actor_id,
    timezone('utc', now()),
    jsonb_strip_nulls(jsonb_build_object(
      'source', 'admin_order_payment',
      'reason', nullif(left(v_reason, 300), ''),
      'idempotency_key', v_idempotency_key
    ))
  )
  returning id into inserted_payment_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    v_actor_id,
    'ORDER_PAYMENT_STATUS_CHANGED',
    'order',
    v_order_id,
    jsonb_strip_nulls(jsonb_build_object(
      'order_number', order_row.order_number,
      'from_payment_status', order_row.payment_status,
      'to_payment_status', v_target_status,
      'amount_xof', v_amount_xof,
      'reference', v_reference,
      'reason', nullif(left(v_reason, 300), '')
    ))
  );

  insert into public.notifications (channel, status, recipient, subject, template_key, payload, idempotency_key)
  values (
    'IN_APP'::public.notification_channel,
    'PENDING'::public.notification_status,
    'staff:orders',
    'Paiement ' || order_row.order_number || ' - ' || v_target_status::text,
    'order_payment_status_changed',
    jsonb_build_object('order_id', v_order_id, 'order_number', order_row.order_number, 'payment_status', v_target_status),
    'payment_status:' || v_idempotency_key || ':staff_in_app'
  )
  on conflict (idempotency_key) do nothing;

  v_result := jsonb_build_object(
    'orderId', v_order_id,
    'orderNumber', order_row.order_number,
    'fromPaymentStatus', order_row.payment_status,
    'toPaymentStatus', v_target_status,
    'paymentTransactionId', inserted_payment_id,
    'idempotent', false
  );

  insert into app_private.payment_status_idempotency (operation, idempotency_key, request_fingerprint, result)
  values ('payment_status_update', v_idempotency_key, v_request_fingerprint, v_result);

  return v_result;
exception
  when invalid_text_representation then
    raise exception 'PAYMENT_INVALID_REQUEST';
end;
$$;

revoke all on function app_private.record_order_payment(jsonb) from public, anon, authenticated;
grant execute on function app_private.record_order_payment(jsonb) to service_role;

create or replace function public.record_order_payment_server(request jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.record_order_payment(request);
$$;

revoke all on function public.record_order_payment_server(jsonb) from public, anon, authenticated;
grant execute on function public.record_order_payment_server(jsonb) to service_role;

comment on function app_private.transition_order(jsonb) is
  'Private Phase 11 order lifecycle transaction. Validates transitions, locks order and stock rows, applies RELEASED/SOLD effects exactly once, writes history/audit/notifications, and deduplicates by idempotency key.';

comment on function app_private.record_order_payment(jsonb) is
  'Private Phase 11 payment-status transaction. Uses authoritative order totals, immutable payment_transactions, bounded audit, notifications, and payment idempotency.';
