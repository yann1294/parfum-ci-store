create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create type public.app_role as enum (
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'CUSTOMER_SUPPORT'
);

create type public.product_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED');

create type public.inventory_transaction_type as enum (
  'RECEIVED',
  'RESERVED',
  'RELEASED',
  'SOLD',
  'RETURNED',
  'DAMAGED',
  'ADJUSTMENT'
);

create type public.order_status as enum (
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED'
);

create type public.payment_status as enum (
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

create type public.payment_method as enum (
  'CASH_ON_DELIVERY',
  'ORANGE_MONEY',
  'MTN_MOMO',
  'WAVE',
  'MOOV_MONEY',
  'BANK_TRANSFER',
  'PAY_IN_STORE'
);

create type public.order_source as enum (
  'WEBSITE',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'WHATSAPP',
  'PHONE',
  'PHYSICAL_STORE',
  'OTHER'
);

create type public.message_status as enum ('NEW', 'OPEN', 'RESOLVED', 'SPAM');

create type public.message_source as enum (
  'WEBSITE',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'WHATSAPP',
  'PHONE',
  'EMAIL',
  'OTHER'
);

create type public.notification_channel as enum ('EMAIL', 'IN_APP');
create type public.notification_status as enum ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'CUSTOMER_SUPPORT',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_not_blank check (length(btrim(full_name)) > 0)
);

create table public.brands (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint brands_name_not_blank check (length(btrim(name)) > 0),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_name_not_blank check (length(btrim(name)) > 0),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_not_own_parent check (id is null or id <> parent_id)
);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  fragrance_family text,
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  gender_category text,
  status public.product_status not null default 'DRAFT',
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_name_not_blank check (length(btrim(name)) > 0),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.product_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size_ml integer not null,
  concentration text,
  price_xof bigint not null default 0,
  compare_at_price_xof bigint,
  cost_price_xof bigint,
  stock_on_hand integer not null default 0,
  reserved_quantity integer not null default 0,
  low_stock_threshold integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_variants_sku_not_blank check (length(btrim(sku)) > 0),
  constraint product_variants_size_positive check (size_ml > 0),
  constraint product_variants_price_nonnegative check (price_xof >= 0),
  constraint product_variants_compare_price_nonnegative check (
    compare_at_price_xof is null or compare_at_price_xof >= 0
  ),
  constraint product_variants_cost_price_nonnegative check (
    cost_price_xof is null or cost_price_xof >= 0
  ),
  constraint product_variants_stock_nonnegative check (stock_on_hand >= 0),
  constraint product_variants_reserved_nonnegative check (reserved_quantity >= 0),
  constraint product_variants_low_stock_nonnegative check (low_stock_threshold >= 0),
  constraint product_variants_reserved_lte_stock check (reserved_quantity <= stock_on_hand)
);

create table public.product_images (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  image_url text,
  alt_text text not null,
  sort_order integer not null default 0,
  approved boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_images_alt_not_blank check (length(btrim(alt_text)) > 0),
  constraint product_images_one_source check (storage_path is not null or image_url is not null)
);

create table public.customers (
  id uuid primary key default extensions.gen_random_uuid(),
  full_name text not null,
  email extensions.citext,
  phone text,
  whatsapp text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_full_name_not_blank check (length(btrim(full_name)) > 0),
  constraint customers_contact_present check (email is not null or phone is not null or whatsapp is not null)
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email extensions.citext,
  customer_phone text,
  customer_whatsapp text,
  delivery_country text not null default 'CI',
  delivery_city text not null,
  delivery_commune text,
  delivery_area text,
  delivery_address text not null,
  delivery_landmark text,
  delivery_instructions text,
  delivery_method text not null,
  source public.order_source not null default 'WEBSITE',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  currency text not null default 'XOF',
  subtotal_xof bigint not null default 0,
  delivery_fee_xof bigint not null default 0,
  discount_xof bigint not null default 0,
  total_xof bigint not null default 0,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'UNPAID',
  payment_provider text,
  payment_reference text,
  status public.order_status not null default 'PENDING_CONFIRMATION',
  customer_note text,
  internal_note text,
  confirmed_at timestamptz,
  prepared_at timestamptz,
  ready_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_number_not_blank check (length(btrim(order_number)) > 0),
  constraint orders_customer_name_not_blank check (length(btrim(customer_name)) > 0),
  constraint orders_delivery_country_ci check (delivery_country = 'CI'),
  constraint orders_currency_xof check (currency = 'XOF'),
  constraint orders_amounts_nonnegative check (
    subtotal_xof >= 0 and delivery_fee_xof >= 0 and discount_xof >= 0 and total_xof >= 0
  ),
  constraint orders_total_matches_parts check (total_xof = subtotal_xof + delivery_fee_xof - discount_xof)
);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text,
  product_name text not null,
  variant_name text,
  image_url text,
  unit_price_xof bigint not null,
  quantity integer not null,
  total_price_xof bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint order_items_product_name_not_blank check (length(btrim(product_name)) > 0),
  constraint order_items_unit_price_nonnegative check (unit_price_xof >= 0),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_total_matches check (total_price_xof = unit_price_xof * quantity)
);

create table public.order_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint order_status_history_changed check (from_status is null or from_status <> to_status)
);

create table public.payment_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'PENDING',
  provider text,
  provider_reference text,
  amount_xof bigint not null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_transactions_amount_nonnegative check (amount_xof >= 0)
);

create table public.inventory_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  type public.inventory_transaction_type not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reserved_before integer not null,
  reserved_after integer not null,
  order_id uuid references public.orders(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint inventory_transactions_quantity_nonzero check (quantity_delta <> 0),
  constraint inventory_transactions_stock_nonnegative check (stock_before >= 0 and stock_after >= 0),
  constraint inventory_transactions_reserved_nonnegative check (reserved_before >= 0 and reserved_after >= 0),
  constraint inventory_transactions_reason_not_blank check (length(btrim(reason)) > 0)
);

create table public.contact_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_name text not null,
  customer_email extensions.citext,
  customer_phone text,
  customer_whatsapp text,
  source public.message_source not null default 'WEBSITE',
  subject text,
  body text not null,
  status public.message_status not null default 'NEW',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contact_messages_name_not_blank check (length(btrim(customer_name)) > 0),
  constraint contact_messages_body_not_blank check (length(btrim(body)) > 0),
  constraint contact_messages_contact_present check (
    customer_email is not null or customer_phone is not null or customer_whatsapp is not null
  )
);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  channel public.notification_channel not null,
  status public.notification_status not null default 'PENDING',
  recipient text not null,
  subject text,
  body text,
  template_key text,
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  scheduled_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notifications_recipient_not_blank check (length(btrim(recipient)) > 0)
);

create table public.store_settings (
  id boolean primary key default true,
  store_name text not null,
  legal_name text,
  contact_email extensions.citext,
  contact_phone text,
  whatsapp_number text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  orange_money_number text,
  mtn_momo_number text,
  wave_number text,
  moov_money_number text,
  delivery_information text,
  notification_email extensions.citext,
  default_low_stock_threshold integer not null default 3,
  public_readable boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_settings_singleton check (id),
  constraint store_settings_name_not_blank check (length(btrim(store_name)) > 0),
  constraint store_settings_low_stock_nonnegative check (default_low_stock_threshold >= 0)
);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_logs_action_not_blank check (length(btrim(action)) > 0),
  constraint audit_logs_resource_type_not_blank check (length(btrim(resource_type)) > 0)
);

create index products_status_idx on public.products(status);
create index products_slug_idx on public.products(slug);
create index products_featured_idx on public.products(featured) where featured is true;
create index product_variants_sku_idx on public.product_variants(sku);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index orders_order_number_idx on public.orders(order_number);
create index orders_status_idx on public.orders(status);
create index orders_payment_status_idx on public.orders(payment_status);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_customer_phone_idx on public.orders(customer_phone);
create index inventory_transactions_variant_id_idx on public.inventory_transactions(variant_id);
create index inventory_transactions_created_at_idx on public.inventory_transactions(created_at desc);
create index contact_messages_status_idx on public.contact_messages(status);
create index contact_messages_created_at_idx on public.contact_messages(created_at desc);
create index notifications_status_idx on public.notifications(status);
create index notifications_scheduled_at_idx on public.notifications(scheduled_at);
create index audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger brands_set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger product_images_set_updated_at before update on public.product_images
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger order_items_set_updated_at before update on public.order_items
  for each row execute function public.set_updated_at();
create trigger payment_transactions_set_updated_at before update on public.payment_transactions
  for each row execute function public.set_updated_at();
create trigger contact_messages_set_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER justification:
-- RLS policies need a non-recursive way to read the current user's staff profile.
-- This helper is outside exposed schemas, uses an empty search_path, fully qualifies relations,
-- and is executable only by authenticated users.
create or replace function app_private.has_staff_role(required_roles public.app_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.active is true
      and (required_roles is null or profiles.role = any(required_roles))
  );
$$;

revoke all on function app_private.has_staff_role(public.app_role[]) from public;
grant execute on function app_private.has_staff_role(public.app_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.store_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_select_staff_admin" on public.profiles
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

create policy "brands_public_read_active" on public.brands
  for select to anon, authenticated
  using (active is true);

create policy "brands_staff_read_all" on public.brands
  for select to authenticated
  using (app_private.has_staff_role(null));

create policy "categories_public_read_active" on public.categories
  for select to anon, authenticated
  using (active is true);

create policy "categories_staff_read_all" on public.categories
  for select to authenticated
  using (app_private.has_staff_role(null));

create policy "products_public_read_active" on public.products
  for select to anon, authenticated
  using (status = 'ACTIVE');

create policy "products_staff_read_all" on public.products
  for select to authenticated
  using (app_private.has_staff_role(null));

create policy "product_variants_public_read_active" on public.product_variants
  for select to anon, authenticated
  using (
    active is true
    and exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.status = 'ACTIVE'
    )
  );

create policy "product_variants_staff_read_all" on public.product_variants
  for select to authenticated
  using (app_private.has_staff_role(null));

create policy "product_images_public_read_approved" on public.product_images
  for select to anon, authenticated
  using (
    active is true
    and approved is true
    and exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.status = 'ACTIVE'
    )
  );

create policy "product_images_staff_read_all" on public.product_images
  for select to authenticated
  using (app_private.has_staff_role(null));

create policy "store_settings_public_read" on public.store_settings
  for select to anon, authenticated
  using (public_readable is true);

create policy "store_settings_staff_admin_read" on public.store_settings
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

create policy "customers_staff_read" on public.customers
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

create policy "orders_staff_read" on public.orders
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

create policy "order_items_staff_read" on public.order_items
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

create policy "order_status_history_staff_read" on public.order_status_history
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

create policy "payment_transactions_staff_read" on public.payment_transactions
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'ORDER_MANAGER']::public.app_role[]
    )
  );

create policy "inventory_transactions_staff_read" on public.inventory_transactions
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'ORDER_MANAGER']::public.app_role[]
    )
  );

create policy "contact_messages_staff_read" on public.contact_messages
  for select to authenticated
  using (
    app_private.has_staff_role(
      array['OWNER', 'ADMIN', 'CUSTOMER_SUPPORT']::public.app_role[]
    )
  );

create policy "notifications_staff_admin_read" on public.notifications
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

create policy "audit_logs_staff_admin_read" on public.audit_logs
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));
