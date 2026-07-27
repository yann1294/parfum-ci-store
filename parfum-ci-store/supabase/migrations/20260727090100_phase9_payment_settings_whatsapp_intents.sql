alter table public.store_settings
  add column if not exists payment_method_configs jsonb not null default '{}'::jsonb,
  add constraint store_settings_payment_method_configs_object
    check (jsonb_typeof(payment_method_configs) = 'object');

create table if not exists public.storefront_order_intents (
  id uuid primary key default extensions.gen_random_uuid(),
  channel text not null,
  status text not null,
  intent_key text not null,
  cart_fingerprint text not null,
  subtotal_xof bigint not null,
  currency text not null default 'XOF',
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  created_at timestamptz not null default timezone('utc', now()),
  constraint storefront_order_intents_channel_known check (channel in ('WHATSAPP')),
  constraint storefront_order_intents_status_known check (status in ('OPENED')),
  constraint storefront_order_intents_key_not_blank check (length(btrim(intent_key)) >= 16),
  constraint storefront_order_intents_fingerprint_not_blank check (length(btrim(cart_fingerprint)) > 0),
  constraint storefront_order_intents_amount_nonnegative check (subtotal_xof >= 0),
  constraint storefront_order_intents_currency_xof check (currency = 'XOF')
);

create table if not exists public.storefront_order_intent_items (
  id uuid primary key default extensions.gen_random_uuid(),
  intent_id uuid not null references public.storefront_order_intents(id) on delete cascade,
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  product_slug text,
  brand_name text,
  variant_label text not null,
  unit_price_xof bigint not null,
  quantity integer not null,
  line_total_xof bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint storefront_order_intent_items_product_name_not_blank check (length(btrim(product_name)) > 0),
  constraint storefront_order_intent_items_variant_label_not_blank check (length(btrim(variant_label)) > 0),
  constraint storefront_order_intent_items_unit_price_nonnegative check (unit_price_xof >= 0),
  constraint storefront_order_intent_items_quantity_positive check (quantity > 0),
  constraint storefront_order_intent_items_total_matches check (line_total_xof = unit_price_xof * quantity)
);

create unique index if not exists storefront_order_intents_recent_key_idx
  on public.storefront_order_intents (channel, intent_key, cart_fingerprint);

create index if not exists storefront_order_intents_created_at_idx
  on public.storefront_order_intents (created_at desc);

create index if not exists storefront_order_intent_items_intent_id_idx
  on public.storefront_order_intent_items (intent_id);

alter table public.storefront_order_intents enable row level security;
alter table public.storefront_order_intent_items enable row level security;

drop policy if exists "storefront_order_intents_staff_read" on public.storefront_order_intents;
create policy "storefront_order_intents_staff_read" on public.storefront_order_intents
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN', 'ORDER_MANAGER']::public.app_role[]));

drop policy if exists "storefront_order_intent_items_staff_read" on public.storefront_order_intent_items;
create policy "storefront_order_intent_items_staff_read" on public.storefront_order_intent_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.storefront_order_intents
      where storefront_order_intents.id = storefront_order_intent_items.intent_id
        and app_private.has_staff_role(array['OWNER', 'ADMIN', 'ORDER_MANAGER']::public.app_role[])
    )
  );
