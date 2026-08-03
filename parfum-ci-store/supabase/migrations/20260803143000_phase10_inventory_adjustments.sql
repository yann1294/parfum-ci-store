-- Phase 10: transactional admin inventory adjustments.
-- Forward-only migration. Manual operations must use this transaction boundary.

create table if not exists app_private.inventory_adjustment_idempotency (
  id uuid primary key default extensions.gen_random_uuid(),
  operation text not null default 'manual_inventory_adjustment',
  idempotency_key text not null,
  request_fingerprint text not null,
  result jsonb,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  constraint inventory_adjustment_idempotency_key_not_blank check (length(btrim(idempotency_key)) >= 32),
  constraint inventory_adjustment_idempotency_fingerprint_hex check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint inventory_adjustment_idempotency_status_known check (status = 'COMPLETED')
);

create unique index if not exists inventory_adjustment_idempotency_operation_key_idx
  on app_private.inventory_adjustment_idempotency(operation, idempotency_key);

create index if not exists inventory_adjustment_idempotency_expires_at_idx
  on app_private.inventory_adjustment_idempotency(expires_at);

grant usage on schema app_private to service_role;
revoke all on app_private.inventory_adjustment_idempotency from public, anon, authenticated;
grant select, insert, update on app_private.inventory_adjustment_idempotency to service_role;

create index if not exists inventory_transactions_variant_created_idx
  on public.inventory_transactions(variant_id, created_at desc);

create index if not exists inventory_transactions_type_created_idx
  on public.inventory_transactions(type, created_at desc);

revoke update, delete on public.inventory_transactions from anon, authenticated;

create or replace view public.admin_inventory_variants
with (security_invoker = true)
as
select
  product_variants.id as variant_id,
  product_variants.product_id,
  products.name as product_name,
  products.slug as product_slug,
  products.status as product_status,
  brands.id as brand_id,
  brands.name as brand_name,
  categories.id as category_id,
  categories.name as category_name,
  product_variants.sku,
  product_variants.size_ml,
  product_variants.concentration,
  product_variants.active as variant_active,
  product_variants.inventory_initialized_at,
  product_variants.inventory_initialized_at is not null as stock_initialized,
  product_variants.stock_on_hand,
  product_variants.reserved_quantity,
  product_variants.stock_on_hand - product_variants.reserved_quantity as available_quantity,
  product_variants.low_stock_threshold,
  case
    when product_variants.inventory_initialized_at is null then 'UNCONFIGURED'
    when product_variants.stock_on_hand - product_variants.reserved_quantity = 0 then 'OUT_OF_STOCK'
    when product_variants.stock_on_hand - product_variants.reserved_quantity <= product_variants.low_stock_threshold then 'LOW_STOCK'
    else 'IN_STOCK'
  end as inventory_status,
  product_variants.updated_at,
  latest_movement.created_at as last_movement_at,
  latest_movement.type as last_movement_type
from public.product_variants
join public.products on products.id = product_variants.product_id
left join public.brands on brands.id = products.brand_id
left join public.categories on categories.id = products.category_id
left join lateral (
  select inventory_transactions.created_at, inventory_transactions.type
  from public.inventory_transactions
  where inventory_transactions.variant_id = product_variants.id
  order by inventory_transactions.created_at desc, inventory_transactions.id desc
  limit 1
) as latest_movement on true;

revoke all on public.admin_inventory_variants from public;
grant select on public.admin_inventory_variants to authenticated, service_role;

create or replace function app_private.adjust_inventory(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_variant_id uuid;
  v_operation text;
  v_quantity integer;
  v_direction text;
  v_reason text;
  v_reference text;
  v_idempotency_key text;
  v_actor_id uuid;
  v_request_fingerprint text;
  v_delta integer;
  v_type public.inventory_transaction_type;
  v_stock_after integer;
  v_initialized_at timestamptz;
  v_result jsonb;
  variant_row public.product_variants%rowtype;
  actor_row public.profiles%rowtype;
  existing_row app_private.inventory_adjustment_idempotency%rowtype;
  inserted_transaction_id uuid;
begin
  v_variant_id := nullif(request->>'variantId', '')::uuid;
  v_operation := upper(btrim(coalesce(request->>'operationType', '')));
  v_quantity := (request->>'quantity')::integer;
  v_direction := upper(btrim(coalesce(request->>'adjustmentDirection', '')));
  v_reason := btrim(coalesce(request->>'reason', ''));
  v_reference := nullif(btrim(coalesce(request->>'reference', '')), '');
  v_idempotency_key := btrim(coalesce(request->>'idempotencyKey', ''));
  v_actor_id := nullif(request->>'actorId', '')::uuid;
  v_request_fingerprint := btrim(coalesce(request->>'requestFingerprint', ''));

  if v_variant_id is null or v_actor_id is null then
    raise exception 'INVENTORY_INVALID_REQUEST';
  end if;

  if v_idempotency_key = '' or length(v_idempotency_key) < 32 or length(v_idempotency_key) > 180 then
    raise exception 'INVENTORY_INVALID_REQUEST';
  end if;

  if v_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVENTORY_INVALID_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('inventory_adjustment:' || v_idempotency_key, 0));

  select *
  into existing_row
  from app_private.inventory_adjustment_idempotency
  where operation = 'manual_inventory_adjustment'
    and idempotency_key = v_idempotency_key
  for update;

  if found then
    if existing_row.request_fingerprint <> v_request_fingerprint then
      raise exception 'INVENTORY_IDEMPOTENCY_CONFLICT';
    end if;

    return existing_row.result;
  end if;

  select *
  into actor_row
  from public.profiles
  where id = v_actor_id
    and active is true
    and role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role, 'INVENTORY_MANAGER'::public.app_role);

  if not found then
    raise exception 'INVENTORY_UNAUTHORIZED';
  end if;

  if v_operation not in ('INITIALIZE', 'RECEIVED', 'DAMAGED', 'ADJUSTMENT', 'RETURNED') then
    raise exception 'INVENTORY_INVALID_OPERATION';
  end if;

  if v_quantity is null or v_quantity < 0 then
    raise exception 'INVENTORY_INVALID_QUANTITY';
  end if;

  if v_operation <> 'INITIALIZE' and v_quantity <= 0 then
    raise exception 'INVENTORY_INVALID_QUANTITY';
  end if;

  if v_operation in ('INITIALIZE', 'DAMAGED', 'ADJUSTMENT', 'RETURNED') and v_reason = '' then
    raise exception 'INVENTORY_REASON_REQUIRED';
  end if;

  select *
  into variant_row
  from public.product_variants
  where id = v_variant_id
  for update;

  if not found then
    raise exception 'INVENTORY_VARIANT_NOT_FOUND';
  end if;

  if v_operation = 'INITIALIZE' then
    if variant_row.inventory_initialized_at is not null then
      raise exception 'INVENTORY_ALREADY_INITIALIZED';
    end if;

    if variant_row.reserved_quantity <> 0 then
      raise exception 'INVENTORY_RESERVED_INVARIANT';
    end if;

    v_type := 'ADJUSTMENT'::public.inventory_transaction_type;
    v_delta := v_quantity - variant_row.stock_on_hand;
    v_stock_after := v_quantity;
    v_initialized_at := timezone('utc', now());
    if v_reason = '' then
      v_reason := 'Stock initial à la création de la variante';
    end if;
  else
    if variant_row.inventory_initialized_at is null then
      raise exception 'INVENTORY_NOT_INITIALIZED';
    end if;

    v_initialized_at := variant_row.inventory_initialized_at;

    if v_operation = 'RECEIVED' then
      v_type := 'RECEIVED'::public.inventory_transaction_type;
      v_delta := v_quantity;
    elsif v_operation = 'DAMAGED' then
      v_type := 'DAMAGED'::public.inventory_transaction_type;
      v_delta := -v_quantity;
    elsif v_operation = 'RETURNED' then
      v_type := 'RETURNED'::public.inventory_transaction_type;
      v_delta := v_quantity;
    elsif v_operation = 'ADJUSTMENT' then
      v_type := 'ADJUSTMENT'::public.inventory_transaction_type;
      if v_direction = 'INCREASE' then
        v_delta := v_quantity;
      elsif v_direction = 'DECREASE' then
        v_delta := -v_quantity;
      else
        raise exception 'INVENTORY_INVALID_OPERATION';
      end if;
    end if;

    v_stock_after := variant_row.stock_on_hand + v_delta;
  end if;

  if v_stock_after < 0 then
    raise exception 'INVENTORY_NEGATIVE_STOCK';
  end if;

  if variant_row.reserved_quantity < 0 or variant_row.reserved_quantity > v_stock_after then
    raise exception 'INVENTORY_RESERVED_INVARIANT';
  end if;

  update public.product_variants
  set
    stock_on_hand = v_stock_after,
    inventory_initialized_at = v_initialized_at
  where id = v_variant_id;

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
    v_variant_id,
    v_type,
    v_delta,
    variant_row.stock_on_hand,
    v_stock_after,
    variant_row.reserved_quantity,
    variant_row.reserved_quantity,
    null,
    v_actor_id,
    v_reason,
    jsonb_strip_nulls(
      jsonb_build_object(
        'source', 'admin_inventory',
        'operation', case when v_operation = 'INITIALIZE' then 'INITIAL_STOCK' else v_operation end,
        'reference', v_reference,
        'idempotency_key', v_idempotency_key
      )
    )
  )
  returning id into inserted_transaction_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    v_actor_id,
    'INVENTORY_ADJUSTED',
    'product_variant',
    v_variant_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'operation', v_operation,
        'transaction_type', v_type,
        'quantity', v_quantity,
        'quantity_delta', v_delta,
        'stock_before', variant_row.stock_on_hand,
        'stock_after', v_stock_after,
        'reserved_before', variant_row.reserved_quantity,
        'reserved_after', variant_row.reserved_quantity,
        'reason', left(v_reason, 300),
        'reference', v_reference
      )
    )
  );

  v_result := jsonb_build_object(
    'variantId', v_variant_id,
    'operationType', v_operation,
    'transactionType', v_type,
    'quantityDelta', v_delta,
    'stockBefore', variant_row.stock_on_hand,
    'stockAfter', v_stock_after,
    'reservedBefore', variant_row.reserved_quantity,
    'reservedAfter', variant_row.reserved_quantity,
    'availableAfter', v_stock_after - variant_row.reserved_quantity,
    'inventoryInitializedAt', v_initialized_at,
    'transactionId', inserted_transaction_id
  );

  insert into app_private.inventory_adjustment_idempotency (
    operation,
    idempotency_key,
    request_fingerprint,
    result
  )
  values (
    'manual_inventory_adjustment',
    v_idempotency_key,
    v_request_fingerprint,
    v_result
  );

  return v_result;
exception
  when invalid_text_representation then
    raise exception 'INVENTORY_INVALID_REQUEST';
end;
$$;

revoke all on function app_private.adjust_inventory(jsonb) from public;
revoke all on function app_private.adjust_inventory(jsonb) from anon;
revoke all on function app_private.adjust_inventory(jsonb) from authenticated;
grant execute on function app_private.adjust_inventory(jsonb) to service_role;

create or replace function public.adjust_inventory_server(request jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.adjust_inventory(request);
$$;

revoke all on function public.adjust_inventory_server(jsonb) from public;
revoke all on function public.adjust_inventory_server(jsonb) from anon;
revoke all on function public.adjust_inventory_server(jsonb) from authenticated;
grant execute on function public.adjust_inventory_server(jsonb) to service_role;

comment on function app_private.adjust_inventory(jsonb) is
  'Private transactional inventory adjustment boundary. Locks one variant row, enforces stock/reserved invariants, writes immutable ledger and bounded audit, and deduplicates by idempotency key.';

comment on function public.adjust_inventory_server(jsonb) is
  'Service-role-only wrapper for app_private.adjust_inventory because app_private is not exposed through Supabase REST.';
