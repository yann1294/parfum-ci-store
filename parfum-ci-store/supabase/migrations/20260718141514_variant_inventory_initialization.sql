-- Phase 6.5: distinguish unconfigured inventory from confirmed zero stock.
-- Forward-only migration. Do not infer initialization from stock_on_hand = 0.

alter table public.product_variants
  add column if not exists inventory_initialized_at timestamptz;

comment on column public.product_variants.inventory_initialized_at is
  'Set when a variant stock position has been initialized through the inventory transaction boundary. Null means stock is not configured.';

update public.product_variants
set inventory_initialized_at = initialized.first_movement_at
from (
  select
    inventory_transactions.variant_id,
    min(inventory_transactions.created_at) as first_movement_at
  from public.inventory_transactions
  group by inventory_transactions.variant_id
) as initialized
where product_variants.id = initialized.variant_id
  and product_variants.inventory_initialized_at is null;

create index if not exists product_variants_inventory_initialized_idx
  on public.product_variants(inventory_initialized_at)
  where inventory_initialized_at is not null;

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_quantity_nonzero,
  add constraint inventory_transactions_quantity_nonzero check (
    quantity_delta <> 0
    or coalesce(metadata->>'operation', '') = 'INITIAL_STOCK'
  );

create or replace function public.initialize_variant_inventory(
  target_variant_id uuid,
  initial_stock integer,
  movement_reason text default 'Stock initial à la création de la variante'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  variant_row public.product_variants%rowtype;
  initialized_at timestamptz;
begin
  if not app_private.has_staff_role(array['OWNER', 'ADMIN', 'INVENTORY_MANAGER']::public.app_role[]) then
    raise exception 'Not authorized to initialize inventory'
      using errcode = '42501';
  end if;

  if initial_stock is null or initial_stock < 0 then
    raise exception 'Initial stock must be a non-negative integer'
      using errcode = '23514';
  end if;

  if length(btrim(coalesce(movement_reason, ''))) = 0 then
    raise exception 'Inventory reason is required'
      using errcode = '23514';
  end if;

  select *
  into variant_row
  from public.product_variants
  where id = target_variant_id
  for update;

  if not found then
    raise exception 'Variant not found'
      using errcode = 'P0002';
  end if;

  if variant_row.inventory_initialized_at is not null then
    raise exception 'Variant inventory is already initialized'
      using errcode = '23505';
  end if;

  initialized_at := timezone('utc', now());

  update public.product_variants
  set
    stock_on_hand = initial_stock,
    reserved_quantity = 0,
    inventory_initialized_at = initialized_at
  where id = target_variant_id;

  insert into public.inventory_transactions (
    variant_id,
    type,
    quantity_delta,
    stock_before,
    stock_after,
    reserved_before,
    reserved_after,
    actor_id,
    reason,
    metadata
  )
  values (
    target_variant_id,
    'ADJUSTMENT'::public.inventory_transaction_type,
    initial_stock - variant_row.stock_on_hand,
    variant_row.stock_on_hand,
    initial_stock,
    variant_row.reserved_quantity,
    0,
    auth.uid(),
    movement_reason,
    jsonb_build_object('operation', 'INITIAL_STOCK')
  );
end;
$$;

revoke all on function public.initialize_variant_inventory(uuid, integer, text) from public;
revoke all on function public.initialize_variant_inventory(uuid, integer, text) from anon;
grant execute on function public.initialize_variant_inventory(uuid, integer, text) to authenticated;

create or replace view public.public_catalogue_variants
with (security_invoker = true)
as
select
  product_variants.id,
  product_variants.product_id,
  product_variants.sku,
  product_variants.size_ml,
  product_variants.concentration,
  product_variants.price_xof,
  product_variants.compare_at_price_xof,
  greatest(product_variants.stock_on_hand - product_variants.reserved_quantity, 0) as available_quantity,
  case
    when product_variants.inventory_initialized_at is null then 'UNCONFIGURED'
    when greatest(product_variants.stock_on_hand - product_variants.reserved_quantity, 0) = 0 then 'OUT_OF_STOCK'
    when greatest(product_variants.stock_on_hand - product_variants.reserved_quantity, 0) <= product_variants.low_stock_threshold then 'LOW_STOCK'
    else 'IN_STOCK'
  end as availability_status
from public.product_variants
join public.products on products.id = product_variants.product_id
where product_variants.active is true
  and product_variants.price_xof > 0
  and products.status = 'ACTIVE'::public.product_status;

revoke all on public.public_catalogue_variants from public;
grant select on public.public_catalogue_variants to anon, authenticated;
