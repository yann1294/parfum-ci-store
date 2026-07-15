-- Phase 4: catalogue domain hardening and product image storage.
-- Forward-only migration. Do not remove existing storage objects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.product_images
  add column if not exists bucket_id text not null default 'product-images',
  add column if not exists object_path text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists mime_type text,
  add column if not exists byte_size bigint,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

update public.product_images
set object_path = storage_path
where object_path is null
  and storage_path is not null;

alter table public.product_images
  drop constraint if exists product_images_one_source,
  add constraint product_images_one_source check (
    object_path is not null or storage_path is not null or image_url is not null
  ),
  drop constraint if exists product_images_bucket_fixed,
  add constraint product_images_bucket_fixed check (bucket_id = 'product-images'),
  drop constraint if exists product_images_sort_nonnegative,
  add constraint product_images_sort_nonnegative check (sort_order >= 0),
  drop constraint if exists product_images_object_path_safe,
  add constraint product_images_object_path_safe check (
    object_path is null
    or (
      object_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
      and object_path !~ '(^/|\\|(^|/)\.\.(/|$)|%2e|%2f|%5c)'
    )
  ),
  drop constraint if exists product_images_mime_allowed,
  add constraint product_images_mime_allowed check (
    mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  drop constraint if exists product_images_byte_size_valid,
  add constraint product_images_byte_size_valid check (
    byte_size is null or (byte_size > 0 and byte_size <= 5242880)
  ),
  drop constraint if exists product_images_dimensions_positive,
  add constraint product_images_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  );

create unique index if not exists product_images_bucket_object_path_uidx
  on public.product_images(bucket_id, object_path)
  where object_path is not null;

create unique index if not exists product_images_one_primary_per_product_uidx
  on public.product_images(product_id)
  where is_primary is true and active is true;

create index if not exists product_images_product_sort_idx
  on public.product_images(product_id, sort_order, created_at);

create unique index if not exists products_slug_lower_uidx
  on public.products(lower(slug));

create index if not exists products_status_created_at_idx
  on public.products(status, created_at desc);

create index if not exists products_featured_active_idx
  on public.products(created_at desc)
  where status = 'ACTIVE' and featured is true;

create index if not exists products_brand_id_idx
  on public.products(brand_id);

create index if not exists products_category_id_idx
  on public.products(category_id);

create index if not exists product_variants_product_active_price_idx
  on public.product_variants(product_id, active, price_xof);

create table if not exists public.product_image_uploads (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  bucket_id text not null default 'product-images',
  object_path text not null unique,
  declared_mime_type text not null,
  declared_byte_size bigint not null,
  status text not null default 'PENDING',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '10 minutes',
  finalized_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_image_uploads_bucket_fixed check (bucket_id = 'product-images'),
  constraint product_image_uploads_mime_allowed check (
    declared_mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint product_image_uploads_byte_size_valid check (
    declared_byte_size > 0 and declared_byte_size <= 5242880
  ),
  constraint product_image_uploads_status_valid check (
    status in ('PENDING', 'FINALIZED', 'FAILED', 'CANCELLED')
  ),
  constraint product_image_uploads_object_path_safe check (
    object_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and object_path !~ '(^/|\\|(^|/)\.\.(/|$)|%2e|%2f|%5c)'
  )
);

create trigger product_image_uploads_set_updated_at before update on public.product_image_uploads
  for each row execute function public.set_updated_at();

create index if not exists product_image_uploads_product_status_idx
  on public.product_image_uploads(product_id, status, created_at desc);

create index if not exists product_image_uploads_expires_at_idx
  on public.product_image_uploads(expires_at);

alter table public.product_image_uploads enable row level security;

-- SECURITY DEFINER justification:
-- Product activation invariants must be enforced inside triggers even when a
-- mutation is attempted through a restricted role. The helper only reads
-- catalogue tables, lives outside exposed schemas, uses an empty search_path,
-- fully qualifies relations, and is not executable by PUBLIC.
create or replace function app_private.product_meets_active_requirements(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products
    where products.id = target_product_id
      and length(btrim(products.name)) > 0
      and length(btrim(coalesce(products.description, ''))) > 0
      and exists (
        select 1
        from public.product_variants
        where product_variants.product_id = products.id
          and product_variants.active is true
          and product_variants.price_xof > 0
      )
      and exists (
        select 1
        from public.product_images
        where product_images.product_id = products.id
          and product_images.active is true
          and product_images.approved is true
          and product_images.object_path is not null
          and product_images.mime_type in ('image/jpeg', 'image/png', 'image/webp')
          and product_images.byte_size between 1 and 5242880
      )
  );
$$;

revoke all on function app_private.product_meets_active_requirements(uuid) from public;
revoke all on function app_private.product_meets_active_requirements(uuid) from anon;
revoke all on function app_private.product_meets_active_requirements(uuid) from authenticated;

create or replace function app_private.ensure_product_active_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ACTIVE'::public.product_status then
    if length(btrim(new.name)) = 0
      or length(btrim(coalesce(new.description, ''))) = 0
      or not exists (
        select 1
        from public.product_variants
        where product_variants.product_id = new.id
          and product_variants.active is true
          and product_variants.price_xof > 0
      )
      or not exists (
        select 1
        from public.product_images
        where product_images.product_id = new.id
          and product_images.active is true
          and product_images.approved is true
          and product_images.object_path is not null
          and product_images.mime_type in ('image/jpeg', 'image/png', 'image/webp')
          and product_images.byte_size between 1 and 5242880
      ) then
      raise exception 'ACTIVE products require a description, at least one valid active variant, and at least one valid approved image'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.ensure_product_active_requirements() from public;
revoke all on function app_private.ensure_product_active_requirements() from anon;
revoke all on function app_private.ensure_product_active_requirements() from authenticated;

create or replace function app_private.prevent_invalid_active_product_after_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  if exists (
    select 1
    from public.products
    where products.id = target_product_id
      and products.status = 'ACTIVE'::public.product_status
  ) and not app_private.product_meets_active_requirements(target_product_id) then
    raise exception 'Mutation would leave an ACTIVE product without required variant or image data'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_invalid_active_product_after_child_change() from public;
revoke all on function app_private.prevent_invalid_active_product_after_child_change() from anon;
revoke all on function app_private.prevent_invalid_active_product_after_child_change() from authenticated;

drop trigger if exists products_validate_active_requirements on public.products;
create trigger products_validate_active_requirements
  before insert or update of name, description, status on public.products
  for each row execute function app_private.ensure_product_active_requirements();

drop trigger if exists product_variants_preserve_active_product_requirements on public.product_variants;
create trigger product_variants_preserve_active_product_requirements
  after insert or update or delete on public.product_variants
  for each row execute function app_private.prevent_invalid_active_product_after_child_change();

drop trigger if exists product_images_preserve_active_product_requirements on public.product_images;
create trigger product_images_preserve_active_product_requirements
  after insert or update or delete on public.product_images
  for each row execute function app_private.prevent_invalid_active_product_after_child_change();

drop policy if exists "brands_staff_manage" on public.brands;
create policy "brands_staff_manage" on public.brands
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "categories_staff_manage" on public.categories;
create policy "categories_staff_manage" on public.categories
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "products_staff_manage" on public.products;
create policy "products_staff_manage" on public.products
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "product_variants_staff_manage" on public.product_variants;
create policy "product_variants_staff_manage" on public.product_variants
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "product_images_staff_manage" on public.product_images;
create policy "product_images_staff_manage" on public.product_images
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "product_image_uploads_staff_manage" on public.product_image_uploads;
create policy "product_image_uploads_staff_manage" on public.product_image_uploads
  for all to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]))
  with check (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

drop policy if exists "product_images_storage_staff_select" on storage.objects;
create policy "product_images_storage_staff_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-images'
    and app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[])
  );

drop policy if exists "product_images_storage_staff_insert" on storage.objects;
create policy "product_images_storage_staff_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[])
  );

drop policy if exists "product_images_storage_staff_update" on storage.objects;
create policy "product_images_storage_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[])
  )
  with check (
    bucket_id = 'product-images'
    and app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[])
  );

drop policy if exists "product_images_storage_staff_delete" on storage.objects;
create policy "product_images_storage_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[])
  );

create or replace view public.public_catalogue_products
with (security_invoker = true)
as
select
  products.id,
  products.name,
  products.slug,
  products.short_description,
  products.description,
  products.fragrance_family,
  products.top_notes,
  products.heart_notes,
  products.base_notes,
  products.gender_category,
  products.featured,
  products.created_at,
  brands.id as brand_id,
  brands.name as brand_name,
  brands.slug as brand_slug,
  categories.id as category_id,
  categories.name as category_name,
  categories.slug as category_slug
from public.products
left join public.brands on brands.id = products.brand_id and brands.active is true
left join public.categories on categories.id = products.category_id and categories.active is true
where products.status = 'ACTIVE'::public.product_status;

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
    when greatest(product_variants.stock_on_hand - product_variants.reserved_quantity, 0) = 0 then 'OUT_OF_STOCK'
    when greatest(product_variants.stock_on_hand - product_variants.reserved_quantity, 0) <= product_variants.low_stock_threshold then 'LOW_STOCK'
    else 'IN_STOCK'
  end as availability_status
from public.product_variants
join public.products on products.id = product_variants.product_id
where product_variants.active is true
  and product_variants.price_xof > 0
  and products.status = 'ACTIVE'::public.product_status;

create or replace view public.public_catalogue_images
with (security_invoker = true)
as
select
  product_images.id,
  product_images.product_id,
  product_images.bucket_id,
  product_images.object_path,
  product_images.alt_text,
  product_images.sort_order,
  product_images.is_primary,
  product_images.mime_type,
  product_images.byte_size,
  product_images.width,
  product_images.height,
  product_images.created_at
from public.product_images
join public.products on products.id = product_images.product_id
where product_images.active is true
  and product_images.approved is true
  and product_images.object_path is not null
  and products.status = 'ACTIVE'::public.product_status;

revoke all on public.public_catalogue_products from public;
revoke all on public.public_catalogue_variants from public;
revoke all on public.public_catalogue_images from public;
grant select on public.public_catalogue_products to anon, authenticated;
grant select on public.public_catalogue_variants to anon, authenticated;
grant select on public.public_catalogue_images to anon, authenticated;

revoke select on public.brands from anon, authenticated;
revoke select on public.categories from anon, authenticated;
revoke select on public.products from anon, authenticated;
revoke select on public.product_variants from anon, authenticated;
revoke select on public.product_images from anon, authenticated;

grant select (id, name, slug, description, image_url, active, sort_order, created_at, updated_at)
  on public.brands to anon, authenticated;
grant select (id, parent_id, name, slug, description, active, sort_order, created_at, updated_at)
  on public.categories to anon, authenticated;
grant select (
  id, brand_id, category_id, name, slug, short_description, description, fragrance_family,
  top_notes, heart_notes, base_notes, gender_category, status, featured, seo_title,
  seo_description, created_at, updated_at
) on public.products to anon, authenticated;
grant select (
  id, product_id, sku, size_ml, concentration, price_xof, compare_at_price_xof,
  stock_on_hand, reserved_quantity, low_stock_threshold, active, created_at, updated_at
) on public.product_variants to anon, authenticated;
grant select (
  id, product_id, bucket_id, object_path, storage_path, image_url, alt_text, sort_order,
  approved, active, is_primary, mime_type, byte_size, width, height, created_at, updated_at
) on public.product_images to anon, authenticated;
