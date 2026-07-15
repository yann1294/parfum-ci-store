-- Phase 4 verification. Run after applying 20260714000100_catalogue_storage_domain.sql.
-- This script checks schema and policy shape without mutating business data.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'product-images'
      and name = 'product-images'
      and public is true
      and file_size_limit = 5242880
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'product-images bucket is missing or misconfigured';
  end if;
end $$;

do $$
declare
  required_policies text[] := array[
    'product_images_storage_staff_select',
    'product_images_storage_staff_insert',
    'product_images_storage_staff_update',
    'product_images_storage_staff_delete'
  ];
  policy_name text;
begin
  foreach policy_name in array required_policies loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = policy_name
        and roles = array['authenticated']
    ) then
      raise exception 'missing storage policy: %', policy_name;
    end if;
  end loop;
end $$;

do $$
begin
  if has_column_privilege('anon', 'public.product_variants', 'cost_price_xof', 'select') then
    raise exception 'anon can select product_variants.cost_price_xof';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'public_catalogue_products',
        'public_catalogue_variants',
        'public_catalogue_images'
      )
      and column_name = 'cost_price_xof'
  ) then
    raise exception 'public catalogue views expose cost_price_xof';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'product_images_one_primary_per_product_uidx'
  ) then
    raise exception 'missing primary image partial unique index';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname in (
      'products_validate_active_requirements',
      'product_variants_preserve_active_product_requirements',
      'product_images_preserve_active_product_requirements'
    )
    having count(*) = 3
  ) then
    raise exception 'missing active product invariant triggers';
  end if;
end $$;

select 'phase4_catalogue_storage verification passed' as result;
