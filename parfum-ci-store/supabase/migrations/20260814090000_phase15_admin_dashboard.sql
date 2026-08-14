-- Phase 15: role-aware operational dashboard aggregates.
-- Forward-only. This does not add a parallel analytics event system.

alter table public.store_settings
  add column if not exists business_timezone text not null default 'Africa/Abidjan';

alter table public.store_settings
  drop constraint if exists store_settings_business_timezone_supported,
  add constraint store_settings_business_timezone_supported
    check (business_timezone = 'Africa/Abidjan');

create index if not exists payment_transactions_paid_order_verified_idx
  on public.payment_transactions(order_id, verified_at, created_at, id)
  include (amount_xof, method)
  where status = 'PAID'::public.payment_status and verified_at is not null;

create index if not exists order_items_order_variant_idx
  on public.order_items(order_id, variant_id);

create or replace function app_private.get_admin_dashboard(request jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_actor_id uuid := nullif(request->>'actorId', '')::uuid;
  v_range text := lower(btrim(coalesce(request->>'range', '')));
  v_range_start timestamptz := nullif(request->>'rangeStart', '')::timestamptz;
  v_range_end timestamptz := nullif(request->>'rangeEnd', '')::timestamptz;
  v_today_start timestamptz := nullif(request->>'todayStart', '')::timestamptz;
  v_today_end timestamptz := nullif(request->>'todayEnd', '')::timestamptz;
  v_timezone text;
  v_role public.app_role;
  v_can_read_orders boolean;
  v_can_read_financials boolean;
  v_can_read_inventory boolean;
  v_can_read_messages boolean;
  v_can_read_notifications boolean;
  v_expected_range_days integer;
  v_summary jsonb := '{}'::jsonb;
  v_sales_trend jsonb := '[]'::jsonb;
  v_orders_by_source jsonb := '[]'::jsonb;
  v_top_products jsonb := '[]'::jsonb;
  v_payment_distribution jsonb := '[]'::jsonb;
  v_recent_orders jsonb := '[]'::jsonb;
  v_low_stock jsonb := '[]'::jsonb;
  v_recent_messages jsonb := '[]'::jsonb;
begin
  select profiles.role, store_settings.business_timezone
  into v_role, v_timezone
  from public.profiles
  cross join public.store_settings
  where profiles.id = v_actor_id
    and profiles.active is true
    and store_settings.id is true;

  if not found then
    raise exception 'DASHBOARD_FORBIDDEN' using errcode = 'P0001';
  end if;

  v_expected_range_days := (jsonb_build_object('7d', 7, '30d', 30, '90d', 90)->>v_range)::integer;

  if v_range not in ('7d', '30d', '90d')
    or v_range_start is null
    or v_range_end is null
    or v_today_start is null
    or v_today_end is null
    or v_range_start >= v_range_end
    or v_today_start >= v_today_end
    or timezone(v_timezone, v_range_start)::time <> time '00:00:00'
    or timezone(v_timezone, v_range_end)::time <> time '00:00:00'
    or timezone(v_timezone, v_today_start)::time <> time '00:00:00'
    or timezone(v_timezone, v_today_end)::time <> time '00:00:00'
    or timezone(v_timezone, v_range_end)::date - timezone(v_timezone, v_range_start)::date
      <> v_expected_range_days
    or timezone(v_timezone, v_today_end)::date - timezone(v_timezone, v_today_start)::date <> 1
  then
    raise exception 'DASHBOARD_INVALID_RANGE' using errcode = 'P0001';
  end if;

  v_can_read_orders := v_role in (
    'OWNER'::public.app_role,
    'ADMIN'::public.app_role,
    'ORDER_MANAGER'::public.app_role,
    'CUSTOMER_SUPPORT'::public.app_role
  );
  v_can_read_financials := v_role in (
    'OWNER'::public.app_role,
    'ADMIN'::public.app_role,
    'ORDER_MANAGER'::public.app_role
  );
  v_can_read_inventory := v_role in (
    'OWNER'::public.app_role,
    'ADMIN'::public.app_role,
    'INVENTORY_MANAGER'::public.app_role
  );
  v_can_read_messages := v_role in (
    'OWNER'::public.app_role,
    'ADMIN'::public.app_role,
    'CUSTOMER_SUPPORT'::public.app_role
  );
  v_can_read_notifications := v_role in (
    'OWNER'::public.app_role,
    'ADMIN'::public.app_role,
    'ORDER_MANAGER'::public.app_role
  );

  if v_can_read_orders then
    v_summary := v_summary || jsonb_build_object(
      'ordersToday', (
        select count(*) from public.orders
        where created_at >= v_today_start and created_at < v_today_end
      ),
      'pendingConfirmation', (
        select count(*) from public.orders
        where status = 'PENDING_CONFIRMATION'::public.order_status
      ),
      'preparingOrders', (
        select count(*) from public.orders
        where status = 'PREPARING'::public.order_status
      )
    );

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', recent.id,
      'orderNumber', recent.order_number,
      'customerName', recent.customer_name,
      'createdAt', recent.created_at,
      'totalXof', recent.total_xof,
      'paymentStatus', recent.payment_status,
      'status', recent.status,
      'source', recent.source
    ) order by recent.created_at desc, recent.id desc), '[]'::jsonb)
    into v_recent_orders
    from (
      select id, order_number, customer_name, created_at, total_xof, payment_status, status, source
      from public.orders
      where created_at >= v_range_start and created_at < v_range_end
      order by created_at desc, id desc
      limit 8
    ) recent;

    select coalesce(jsonb_agg(jsonb_build_object(
      'source', grouped.source,
      'orderCount', grouped.order_count
    ) order by grouped.order_count desc, grouped.source), '[]'::jsonb)
    into v_orders_by_source
    from (
      select orders.source::text as source, count(*) as order_count
      from public.orders
      where created_at >= v_range_start and created_at < v_range_end
      group by orders.source
    ) grouped;
  end if;

  if v_can_read_financials then
    with paid_economic_events as (
      select distinct on (payment_transactions.order_id)
        payment_transactions.order_id,
        payment_transactions.amount_xof,
        payment_transactions.method,
        payment_transactions.verified_at as paid_at
      from public.payment_transactions
      where payment_transactions.status = 'PAID'::public.payment_status
        and payment_transactions.verified_at is not null
      order by payment_transactions.order_id, payment_transactions.verified_at,
        payment_transactions.created_at, payment_transactions.id
    )
    select v_summary || jsonb_build_object(
      'grossPaidRevenueXof', coalesce(sum(amount_xof), 0),
      'paidOrderCount', count(*)
    )
    into v_summary
    from paid_economic_events
    where paid_at >= v_range_start and paid_at < v_range_end;

    v_summary := v_summary || jsonb_build_object(
      'paymentsAwaitingVerification', (
        select count(*)
        from public.orders
        where payment_status = 'PENDING'::public.payment_status
          and payment_method in (
            'ORANGE_MONEY'::public.payment_method,
            'MTN_MOMO'::public.payment_method,
            'WAVE'::public.payment_method,
            'MOOV_MONEY'::public.payment_method,
            'BANK_TRANSFER'::public.payment_method
          )
      )
    );

    with paid_economic_events as (
      select distinct on (payment_transactions.order_id)
        payment_transactions.order_id,
        payment_transactions.amount_xof,
        payment_transactions.verified_at as paid_at
      from public.payment_transactions
      where payment_transactions.status = 'PAID'::public.payment_status
        and payment_transactions.verified_at is not null
      order by payment_transactions.order_id, payment_transactions.verified_at,
        payment_transactions.created_at, payment_transactions.id
    ), daily as (
      select
        series.local_date,
        count(paid_economic_events.order_id) as paid_order_count,
        coalesce(sum(paid_economic_events.amount_xof), 0) as revenue_xof
      from (
        select generated::date as local_date
        from generate_series(
          timezone(v_timezone, v_range_start)::date,
          timezone(v_timezone, v_range_end)::date - 1,
          interval '1 day'
        ) generated
      ) series
      left join paid_economic_events
        on timezone(v_timezone, paid_economic_events.paid_at)::date = series.local_date
        and paid_economic_events.paid_at >= v_range_start
        and paid_economic_events.paid_at < v_range_end
      group by series.local_date
      order by series.local_date
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', to_char(daily.local_date, 'YYYY-MM-DD'),
      'paidOrderCount', daily.paid_order_count,
      'revenueXof', daily.revenue_xof
    ) order by daily.local_date), '[]'::jsonb)
    into v_sales_trend
    from daily;

    select coalesce(jsonb_agg(jsonb_build_object(
      'method', grouped.method,
      'orderCount', grouped.order_count
    ) order by grouped.order_count desc, grouped.method), '[]'::jsonb)
    into v_payment_distribution
    from (
      select orders.payment_method::text as method, count(*) as order_count
      from public.orders
      where created_at >= v_range_start and created_at < v_range_end
      group by orders.payment_method
    ) grouped;
  end if;

  if v_can_read_inventory then
    v_summary := v_summary || jsonb_build_object(
      'lowStockVariants', (
        select count(*)
        from public.product_variants
        where inventory_initialized_at is not null
          and active is true
          and stock_on_hand - reserved_quantity <= low_stock_threshold
      )
    );

    select coalesce(jsonb_agg(jsonb_build_object(
      'variantId', urgent.variant_id,
      'productName', urgent.product_name,
      'variantLabel', urgent.variant_label,
      'sku', urgent.sku,
      'availableQuantity', urgent.available_quantity,
      'lowStockThreshold', urgent.low_stock_threshold,
      'stockState', urgent.stock_state
    ) order by urgent.out_of_stock desc, urgent.availability_ratio,
      urgent.updated_at, urgent.variant_id), '[]'::jsonb)
    into v_low_stock
    from (
      select
        product_variants.id as variant_id,
        products.name as product_name,
        concat(
          product_variants.size_ml,
          ' ml',
          coalesce(' · ' || product_variants.concentration, '')
        ) as variant_label,
        product_variants.sku,
        product_variants.stock_on_hand - product_variants.reserved_quantity as available_quantity,
        product_variants.low_stock_threshold,
        (array['LOW_STOCK', 'OUT_OF_STOCK'])[
          ((product_variants.stock_on_hand - product_variants.reserved_quantity = 0)::integer + 1)
        ] as stock_state,
        product_variants.stock_on_hand - product_variants.reserved_quantity = 0 as out_of_stock,
        (product_variants.stock_on_hand - product_variants.reserved_quantity)::numeric
          / greatest(product_variants.low_stock_threshold, 1) as availability_ratio,
        product_variants.updated_at
      from public.product_variants
      join public.products on products.id = product_variants.product_id
      where product_variants.inventory_initialized_at is not null
        and product_variants.active is true
        and product_variants.stock_on_hand - product_variants.reserved_quantity
          <= product_variants.low_stock_threshold
      order by out_of_stock desc, availability_ratio, product_variants.updated_at,
        product_variants.id
      limit 8
    ) urgent;

    select coalesce(jsonb_agg(jsonb_build_object(
      'productId', sold.product_id,
      'productName', sold.product_name,
      'unitsSold', sold.units_sold
    ) order by sold.units_sold desc, sold.product_name, sold.product_key), '[]'::jsonb)
    into v_top_products
    from (
      select
        coalesce(order_items.product_id::text, 'snapshot:' || order_items.product_name) as product_key,
        (array_agg(order_items.product_id order by inventory_transactions.created_at desc,
          order_items.id) filter (where order_items.product_id is not null))[1] as product_id,
        (array_agg(order_items.product_name order by inventory_transactions.created_at desc,
          order_items.id))[1] as product_name,
        sum(-inventory_transactions.quantity_delta) as units_sold
      from public.inventory_transactions
      join public.order_items
        on order_items.order_id = inventory_transactions.order_id
        and order_items.variant_id = inventory_transactions.variant_id
      where inventory_transactions.type = 'SOLD'::public.inventory_transaction_type
        and inventory_transactions.created_at >= v_range_start
        and inventory_transactions.created_at < v_range_end
      group by coalesce(order_items.product_id::text, 'snapshot:' || order_items.product_name)
      order by units_sold desc, product_name, product_key
      limit 8
    ) sold;
  end if;

  if v_can_read_messages then
    v_summary := v_summary || jsonb_build_object(
      'newMessages', (
        select count(*) from public.contact_messages
        where status = 'NEW'::public.message_status
      )
    );

    select coalesce(jsonb_agg(jsonb_build_object(
      'id', recent.id,
      'senderName', recent.customer_name,
      'source', recent.source,
      'subject', recent.subject,
      'excerpt', recent.excerpt,
      'status', recent.status,
      'receivedAt', recent.created_at,
      'assigneeName', recent.assignee_name
    ) order by recent.created_at desc, recent.id desc), '[]'::jsonb)
    into v_recent_messages
    from (
      select
        contact_messages.id,
        contact_messages.customer_name,
        contact_messages.source,
        coalesce(contact_messages.subject, 'Message client') as subject,
        left(contact_messages.body, 160) as excerpt,
        contact_messages.status,
        contact_messages.created_at,
        profiles.full_name as assignee_name
      from public.contact_messages
      left join public.profiles on profiles.id = contact_messages.assigned_to
      order by contact_messages.created_at desc, contact_messages.id desc
      limit 6
    ) recent;
  end if;

  if v_can_read_notifications then
    v_summary := v_summary || jsonb_build_object(
      'failedNotifications', (
        select count(*) from public.notifications
        where status = 'FAILED'::public.notification_status
      )
    );
  end if;

  return jsonb_build_object(
    'range', v_range,
    'timezone', v_timezone,
    'generatedAt', now(),
    'role', v_role,
    'permissions', jsonb_build_object(
      'orders', v_can_read_orders,
      'financials', v_can_read_financials,
      'inventory', v_can_read_inventory,
      'messages', v_can_read_messages,
      'notifications', v_can_read_notifications
    ),
    'summary', v_summary,
    'salesTrend', v_sales_trend,
    'ordersBySource', v_orders_by_source,
    'topProducts', v_top_products,
    'paymentDistribution', v_payment_distribution,
    'recentOrders', v_recent_orders,
    'lowStock', v_low_stock,
    'recentMessages', v_recent_messages
  );
exception
  when invalid_text_representation or datetime_field_overflow then
    raise exception 'DASHBOARD_INVALID_REQUEST' using errcode = 'P0001';
end;
$$;

revoke all on function app_private.get_admin_dashboard(jsonb) from public, anon, authenticated;
grant execute on function app_private.get_admin_dashboard(jsonb) to service_role;

create or replace function public.get_admin_dashboard_server(request jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.get_admin_dashboard(request);
$$;

revoke all on function public.get_admin_dashboard_server(jsonb) from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_server(jsonb) to service_role;

comment on function public.get_admin_dashboard_server(jsonb) is
  'Service-role-only Phase 15 dashboard aggregate. Rechecks active staff role and omits unauthorized operational/financial sections.';
