do $$
declare
  missing_table_count integer;
  exposed_without_rls_count integer;
begin
  select count(*)
  into missing_table_count
  from (
    values
      ('profiles'),
      ('brands'),
      ('categories'),
      ('products'),
      ('product_variants'),
      ('product_images'),
      ('customers'),
      ('orders'),
      ('order_items'),
      ('order_status_history'),
      ('payment_transactions'),
      ('inventory_transactions'),
      ('contact_messages'),
      ('notifications'),
      ('store_settings'),
      ('audit_logs')
  ) as expected(table_name)
  where not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = expected.table_name
  );

  if missing_table_count <> 0 then
    raise exception 'Missing expected public tables: %', missing_table_count;
  end if;

  select count(*)
  into exposed_without_rls_count
  from pg_class
  join pg_namespace on pg_namespace.oid = pg_class.relnamespace
  where pg_namespace.nspname = 'public'
    and pg_class.relkind = 'r'
    and pg_class.relname in (
      'profiles',
      'brands',
      'categories',
      'products',
      'product_variants',
      'product_images',
      'customers',
      'orders',
      'order_items',
      'order_status_history',
      'payment_transactions',
      'inventory_transactions',
      'contact_messages',
      'notifications',
      'store_settings',
      'audit_logs'
    )
    and pg_class.relrowsecurity is not true;

  if exposed_without_rls_count <> 0 then
    raise exception 'Expected all exposed tables to have RLS enabled; missing count: %',
      exposed_without_rls_count;
  end if;

  if not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'app_private'
      and pg_proc.proname = 'has_staff_role'
      and pg_proc.prosecdef is true
      and pg_proc.proconfig @> array['search_path=']
  ) then
    raise exception 'Expected app_private.has_staff_role to be SECURITY DEFINER with empty search_path';
  end if;
end $$;
