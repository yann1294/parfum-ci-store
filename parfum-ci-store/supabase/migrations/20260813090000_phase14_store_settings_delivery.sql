-- Phase 14: centralized operational settings, safe projections, delivery zones,
-- authoritative delivery quotes and order-time delivery snapshots.
-- Forward-only. Do not edit applied migrations.

alter table public.store_settings
  add column if not exists logo_url text,
  add column if not exists primary_address text,
  add column if not exists secondary_address text,
  add column if not exists support_email extensions.citext,
  add column if not exists business_hours jsonb not null default '[]'::jsonb,
  add column if not exists response_time_guidance text,
  add column if not exists delivery_method_configs jsonb not null default '{}'::jsonb,
  add column if not exists default_delivery_fee_xof bigint,
  add column if not exists pickup_fee_xof bigint not null default 0,
  add column if not exists free_delivery_enabled boolean not null default false,
  add column if not exists free_delivery_threshold_xof bigint,
  add column if not exists delivery_estimated_min_days integer,
  add column if not exists delivery_estimated_max_days integer,
  add column if not exists site_title text,
  add column if not exists site_description text,
  add column if not exists og_image_url text,
  add column if not exists canonical_site_url text,
  add column if not exists accepting_orders boolean not null default true,
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists maintenance_message text,
  add column if not exists expected_reopening_at timestamptz,
  add column if not exists settings_revision bigint not null default 1;

alter table public.store_settings
  drop constraint if exists store_settings_business_hours_array,
  add constraint store_settings_business_hours_array check (jsonb_typeof(business_hours) = 'array'),
  drop constraint if exists store_settings_delivery_method_configs_object,
  add constraint store_settings_delivery_method_configs_object check (jsonb_typeof(delivery_method_configs) = 'object'),
  drop constraint if exists store_settings_delivery_amounts_nonnegative,
  add constraint store_settings_delivery_amounts_nonnegative check (
    (default_delivery_fee_xof is null or default_delivery_fee_xof >= 0)
    and pickup_fee_xof >= 0
    and (free_delivery_threshold_xof is null or free_delivery_threshold_xof >= 0)
  ),
  drop constraint if exists store_settings_delivery_estimate_ordered,
  add constraint store_settings_delivery_estimate_ordered check (
    (delivery_estimated_min_days is null or delivery_estimated_min_days >= 0)
    and (delivery_estimated_max_days is null or delivery_estimated_max_days >= 0)
    and (
      delivery_estimated_min_days is null
      or delivery_estimated_max_days is null
      or delivery_estimated_max_days >= delivery_estimated_min_days
    )
  ),
  drop constraint if exists store_settings_revision_positive,
  add constraint store_settings_revision_positive check (settings_revision > 0),
  drop constraint if exists store_settings_site_title_length,
  add constraint store_settings_site_title_length check (site_title is null or char_length(site_title) <= 80),
  drop constraint if exists store_settings_site_description_length,
  add constraint store_settings_site_description_length check (site_description is null or char_length(site_description) <= 320),
  drop constraint if exists store_settings_maintenance_message_length,
  add constraint store_settings_maintenance_message_length check (maintenance_message is null or char_length(maintenance_message) <= 500);

-- One-time continuity backfill: only fill missing operational values from the
-- Phase 6.5 content records. Existing store_settings values always win.
update public.store_settings s set
  primary_address = coalesce(s.primary_address, nullif(btrim(c.content->>'address'), '')),
  contact_phone = coalesce(s.contact_phone, nullif(btrim(c.content->>'telephone'), '')),
  whatsapp_number = coalesce(s.whatsapp_number, nullif(btrim(c.content->>'whatsappNumber'), '')),
  contact_email = coalesce(s.contact_email, nullif(btrim(c.content->>'email'), '')::extensions.citext),
  business_hours = case when s.business_hours = '[]'::jsonb then coalesce(c.content->'openingHours', '[]'::jsonb) else s.business_hours end
from public.store_content c
where s.id is true and c.page_key = 'contact';

update public.store_settings s set
  instagram_url = coalesce(s.instagram_url, nullif(btrim(c.content->>'instagramUrl'), '')),
  facebook_url = coalesce(s.facebook_url, nullif(btrim(c.content->>'facebookUrl'), '')),
  tiktok_url = coalesce(s.tiktok_url, nullif(btrim(c.content->>'tiktokUrl'), '')),
  whatsapp_number = coalesce(s.whatsapp_number, nullif(btrim(c.content->>'whatsappNumber'), ''))
from public.store_content c
where s.id is true and c.page_key = 'social';

create or replace function app_private.normalize_delivery_location(input text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(
    translate(
      lower(btrim(input)),
      'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  );
$$;

revoke all on function app_private.normalize_delivery_location(text) from public, anon, authenticated;
grant execute on function app_private.normalize_delivery_location(text) to service_role;

create table if not exists public.delivery_zones (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  city text not null,
  commune text not null,
  normalized_city text generated always as (app_private.normalize_delivery_location(city)) stored,
  normalized_commune text generated always as (app_private.normalize_delivery_location(commune)) stored,
  fee_xof bigint not null,
  estimated_min_days integer,
  estimated_max_days integer,
  enabled boolean not null default true,
  display_order integer not null default 50,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint delivery_zones_name_not_blank check (char_length(btrim(name)) between 1 and 120),
  constraint delivery_zones_city_not_blank check (char_length(btrim(city)) between 1 and 120),
  constraint delivery_zones_commune_not_blank check (char_length(btrim(commune)) between 1 and 120),
  constraint delivery_zones_fee_nonnegative check (fee_xof >= 0),
  constraint delivery_zones_display_order_bounded check (display_order between 0 and 10000),
  constraint delivery_zones_estimate_ordered check (
    (estimated_min_days is null or estimated_min_days >= 0)
    and (estimated_max_days is null or estimated_max_days >= 0)
    and (estimated_min_days is null or estimated_max_days is null or estimated_max_days >= estimated_min_days)
  )
);

create unique index if not exists delivery_zones_active_location_key
  on public.delivery_zones(normalized_city, normalized_commune)
  where enabled is true;

create index if not exists delivery_zones_public_order_idx
  on public.delivery_zones(enabled, display_order, name);

drop trigger if exists delivery_zones_set_updated_at on public.delivery_zones;
create trigger delivery_zones_set_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

drop policy if exists "delivery_zones_staff_admin_read" on public.delivery_zones;
create policy "delivery_zones_staff_admin_read" on public.delivery_zones
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN']::public.app_role[]));

revoke all on table public.delivery_zones from public, anon, authenticated;
grant select on table public.delivery_zones to authenticated;
grant select, insert, update on table public.delivery_zones to service_role;

alter table public.orders
  add column if not exists delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  add column if not exists delivery_zone_name text,
  add column if not exists delivery_estimated_min_days integer,
  add column if not exists delivery_estimated_max_days integer,
  add column if not exists delivery_quote_status text not null default 'PENDING_CONFIRMATION',
  add column if not exists delivery_rule_snapshot jsonb not null default '{}'::jsonb;

alter table public.orders
  drop constraint if exists orders_delivery_quote_status_known,
  add constraint orders_delivery_quote_status_known check (
    delivery_quote_status in ('AVAILABLE', 'PENDING_CONFIRMATION')
  ),
  drop constraint if exists orders_delivery_snapshot_object,
  add constraint orders_delivery_snapshot_object check (jsonb_typeof(delivery_rule_snapshot) = 'object'),
  drop constraint if exists orders_delivery_estimate_ordered,
  add constraint orders_delivery_estimate_ordered check (
    (delivery_estimated_min_days is null or delivery_estimated_min_days >= 0)
    and (delivery_estimated_max_days is null or delivery_estimated_max_days >= 0)
    and (
      delivery_estimated_min_days is null
      or delivery_estimated_max_days is null
      or delivery_estimated_max_days >= delivery_estimated_min_days
    )
  );

create table if not exists app_private.store_settings_mutations (
  mutation_id uuid primary key,
  request_fingerprint text not null,
  settings_revision bigint not null,
  result jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint store_settings_mutation_fingerprint check (request_fingerprint ~ '^[a-f0-9]{64}$')
);

revoke all on app_private.store_settings_mutations from public, anon, authenticated;
grant select, insert on app_private.store_settings_mutations to service_role;

create or replace function app_private.quote_delivery(
  requested_method text,
  requested_city text,
  requested_commune text,
  requested_subtotal_xof bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings_row public.store_settings%rowtype;
  zone_row public.delivery_zones%rowtype;
  normalized_city_value text;
  normalized_commune_value text;
  fee_value bigint;
  min_days integer;
  max_days integer;
  free_applied boolean := false;
begin
  if requested_subtotal_xof < 0 then
    raise exception 'DELIVERY_INVALID_SUBTOTAL' using errcode = 'P0001';
  end if;

  select * into settings_row from public.store_settings where id is true;
  if not found then
    return jsonb_build_object('status', 'UNAVAILABLE', 'reason', 'SETTINGS_UNAVAILABLE');
  end if;

  if requested_method not in ('HOME_DELIVERY', 'PICKUP')
    or not requested_method = any(settings_row.enabled_delivery_methods) then
    return jsonb_build_object('status', 'UNAVAILABLE', 'reason', 'METHOD_DISABLED');
  end if;

  if requested_method = 'PICKUP' then
    fee_value := settings_row.pickup_fee_xof;
    min_days := settings_row.delivery_estimated_min_days;
    max_days := settings_row.delivery_estimated_max_days;
  else
    normalized_city_value := app_private.normalize_delivery_location(coalesce(requested_city, ''));
    normalized_commune_value := app_private.normalize_delivery_location(coalesce(requested_commune, ''));

    select * into zone_row
    from public.delivery_zones
    where enabled is true
      and normalized_city = normalized_city_value
      and normalized_commune = normalized_commune_value
    order by display_order, id
    limit 1;

    if found then
      fee_value := zone_row.fee_xof;
      min_days := coalesce(zone_row.estimated_min_days, settings_row.delivery_estimated_min_days);
      max_days := coalesce(zone_row.estimated_max_days, settings_row.delivery_estimated_max_days);
    else
      fee_value := settings_row.default_delivery_fee_xof;
      min_days := settings_row.delivery_estimated_min_days;
      max_days := settings_row.delivery_estimated_max_days;
    end if;

    if fee_value is null then
      return jsonb_build_object('status', 'UNAVAILABLE', 'reason', 'AREA_UNSUPPORTED');
    end if;

    if settings_row.free_delivery_enabled is true
      and settings_row.free_delivery_threshold_xof is not null
      and requested_subtotal_xof >= settings_row.free_delivery_threshold_xof then
      fee_value := 0;
      free_applied := true;
    end if;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'status', 'AVAILABLE',
    'feeXof', fee_value,
    'deliveryMethod', requested_method,
    'matchedZoneId', zone_row.id,
    'matchedZoneName', zone_row.name,
    'estimatedMinDays', min_days,
    'estimatedMaxDays', max_days,
    'freeDeliveryApplied', free_applied,
    'freeDeliveryReason', case when free_applied then 'THRESHOLD' else null end
  ));
end;
$$;

revoke all on function app_private.quote_delivery(text, text, text, bigint) from public, anon, authenticated;
grant execute on function app_private.quote_delivery(text, text, text, bigint) to service_role;

create or replace function public.quote_delivery_server(
  requested_method text,
  requested_city text,
  requested_commune text,
  requested_subtotal_xof bigint
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.quote_delivery(requested_method, requested_city, requested_commune, requested_subtotal_xof);
$$;

revoke all on function public.quote_delivery_server(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.quote_delivery_server(text, text, text, bigint) to service_role;

create or replace function app_private.apply_order_operational_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings_row public.store_settings%rowtype;
  quote jsonb;
begin
  select * into settings_row from public.store_settings where id is true for share;
  if not found then
    raise exception 'ORDER_STORE_SETTINGS_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if settings_row.accepting_orders is not true or settings_row.maintenance_mode is true then
    raise exception 'ORDER_ACCEPTANCE_DISABLED' using errcode = 'P0001';
  end if;

  quote := app_private.quote_delivery(new.delivery_method, new.delivery_city, new.delivery_commune, new.subtotal_xof);
  if quote->>'status' <> 'AVAILABLE' then
    raise exception 'ORDER_DELIVERY_AREA_UNAVAILABLE' using errcode = 'P0001';
  end if;

  new.delivery_fee_xof := (quote->>'feeXof')::bigint;
  new.total_xof := new.subtotal_xof + new.delivery_fee_xof - new.discount_xof;
  new.delivery_zone_id := nullif(quote->>'matchedZoneId', '')::uuid;
  new.delivery_zone_name := nullif(quote->>'matchedZoneName', '');
  new.delivery_estimated_min_days := nullif(quote->>'estimatedMinDays', '')::integer;
  new.delivery_estimated_max_days := nullif(quote->>'estimatedMaxDays', '')::integer;
  new.delivery_quote_status := 'AVAILABLE';
  new.delivery_rule_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'delivery_method', new.delivery_method,
    'fee_xof', new.delivery_fee_xof,
    'zone_id', new.delivery_zone_id,
    'zone_name', new.delivery_zone_name,
    'estimated_min_days', new.delivery_estimated_min_days,
    'estimated_max_days', new.delivery_estimated_max_days,
    'free_delivery_applied', coalesce((quote->>'freeDeliveryApplied')::boolean, false),
    'settings_revision', settings_row.settings_revision
  ));
  return new;
end;
$$;

revoke all on function app_private.apply_order_operational_settings() from public, anon, authenticated;

drop trigger if exists orders_apply_operational_settings on public.orders;
create trigger orders_apply_operational_settings
  before insert on public.orders
  for each row execute function app_private.apply_order_operational_settings();

create or replace function app_private.public_store_settings_projection()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'storeName', s.store_name,
    'legalName', s.legal_name,
    'logoUrl', case when s.logo_url ~* '^https://' then s.logo_url else null end,
    'contactEmail', s.contact_email,
    'supportEmail', s.support_email,
    'contactPhone', s.contact_phone,
    'whatsappNumber', s.whatsapp_number,
    'primaryAddress', s.primary_address,
    'secondaryAddress', s.secondary_address,
    'businessHours', s.business_hours,
    'responseTimeGuidance', s.response_time_guidance,
    'socialLinks', jsonb_build_object(
      'instagram', case when s.instagram_url ~* '^https://([^/]+\.)?instagram\.com/' then s.instagram_url else null end,
      'facebook', case when s.facebook_url ~* '^https://([^/]+\.)?(facebook|fb)\.com/' then s.facebook_url else null end,
      'tiktok', case when s.tiktok_url ~* '^https://([^/]+\.)?tiktok\.com/' then s.tiktok_url else null end
    ),
    'enabledPaymentMethods', s.enabled_payment_methods,
    'paymentMethodConfigs', coalesce((
      select jsonb_object_agg(config.key, config.value)
      from jsonb_each(s.payment_method_configs) config
      where config.key in (select unnest(s.enabled_payment_methods)::text)
    ), '{}'::jsonb),
    'enabledDeliveryMethods', s.enabled_delivery_methods,
    'deliveryMethodConfigs', s.delivery_method_configs,
    'defaultDeliveryFeeXof', s.default_delivery_fee_xof,
    'pickupFeeXof', s.pickup_fee_xof,
    'freeDeliveryEnabled', s.free_delivery_enabled,
    'freeDeliveryThresholdXof', s.free_delivery_threshold_xof,
    'deliveryEstimatedMinDays', s.delivery_estimated_min_days,
    'deliveryEstimatedMaxDays', s.delivery_estimated_max_days,
    'seo', jsonb_build_object(
      'siteTitle', s.site_title,
      'siteDescription', s.site_description,
      'ogImageUrl', case when s.og_image_url ~* '^https://' then s.og_image_url else null end,
      'canonicalSiteUrl', case when s.canonical_site_url ~* '^https://' then s.canonical_site_url else null end
    ),
    'acceptingOrders', s.accepting_orders,
    'maintenanceMode', s.maintenance_mode,
    'maintenanceMessage', s.maintenance_message,
    'expectedReopeningAt', s.expected_reopening_at
  ))
  from public.store_settings s
  where s.id is true and s.public_readable is true;
$$;

revoke all on function app_private.public_store_settings_projection() from public, anon, authenticated;
grant execute on function app_private.public_store_settings_projection() to service_role;

create or replace function public.get_public_store_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.public_store_settings_projection();
$$;

revoke all on function public.get_public_store_settings() from public;
grant execute on function public.get_public_store_settings() to anon, authenticated, service_role;

create or replace function public.get_public_delivery_zones()
returns table (
  name text,
  city text,
  commune text,
  fee_xof bigint,
  estimated_min_days integer,
  estimated_max_days integer,
  display_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select z.name, z.city, z.commune, z.fee_xof, z.estimated_min_days, z.estimated_max_days, z.display_order
  from public.delivery_zones z
  where z.enabled is true
  order by z.display_order, z.name;
$$;

revoke all on function public.get_public_delivery_zones() from public;
grant execute on function public.get_public_delivery_zones() to anon, authenticated, service_role;

-- Direct reads exposed private recipient and legacy operational columns. Public
-- consumers must use the explicit projection above; server/admin code uses the
-- service-role client and explicit column lists.
revoke select on table public.store_settings from anon, authenticated;

comment on function public.get_public_store_settings() is
  'Public-safe Phase 14 settings projection; excludes notification routing, audit fields, revision and legacy private columns.';
comment on function public.quote_delivery_server(text, text, text, bigint) is
  'Service-role-only authoritative delivery quote used by checkout, admin preview and the order insert trigger.';
comment on column public.orders.delivery_rule_snapshot is
  'Immutable order-time delivery economics snapshot. Later settings or zone edits do not rewrite it.';

create or replace function app_private.update_store_settings(request jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_id_value uuid := nullif(request->>'actorId', '')::uuid;
  mutation_id_value uuid := nullif(request->>'mutationId', '')::uuid;
  fingerprint_value text := btrim(coalesce(request->>'requestFingerprint', ''));
  section_value text := btrim(coalesce(request->>'section', ''));
  expected_revision_value bigint := nullif(request->>'expectedRevision', '')::bigint;
  value_payload jsonb := coalesce(request->'value', '{}'::jsonb);
  settings_row public.store_settings%rowtype;
  existing_mutation app_private.store_settings_mutations%rowtype;
  enabled_payments public.payment_method[];
  enabled_deliveries text[];
  zone_payload jsonb;
  zone_id_value uuid;
  changed_fields text[];
  result_value jsonb;
begin
  if mutation_id_value is null or fingerprint_value !~ '^[a-f0-9]{64}$' then
    raise exception 'SETTINGS_INVALID_REQUEST' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = actor_id_value and p.active is true and p.role in ('OWNER', 'ADMIN')
  ) then
    raise exception 'SETTINGS_FORBIDDEN' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('store_settings:' || mutation_id_value::text, 0));
  select * into existing_mutation
  from app_private.store_settings_mutations m
  where m.mutation_id = mutation_id_value;

  if found then
    if existing_mutation.request_fingerprint <> fingerprint_value then
      raise exception 'SETTINGS_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return existing_mutation.result;
  end if;

  select * into settings_row
  from public.store_settings
  where id is true
  for update;

  if not found then
    raise exception 'SETTINGS_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if expected_revision_value is null or settings_row.settings_revision <> expected_revision_value then
    raise exception 'SETTINGS_STALE_VERSION' using errcode = 'P0001';
  end if;

  case section_value
    when 'identity' then
      update public.store_settings set
        store_name = value_payload->>'storeName',
        legal_name = nullif(value_payload->>'legalName', ''),
        logo_url = nullif(value_payload->>'logoUrl', ''),
        primary_address = nullif(value_payload->>'primaryAddress', ''),
        secondary_address = nullif(value_payload->>'secondaryAddress', ''),
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['store_name', 'legal_name', 'logo_url', 'primary_address', 'secondary_address'];

    when 'contact' then
      update public.store_settings set
        support_email = nullif(value_payload->>'supportEmail', '')::extensions.citext,
        contact_email = nullif(value_payload->>'contactEmail', '')::extensions.citext,
        contact_phone = nullif(value_payload->>'contactPhone', ''),
        whatsapp_number = nullif(value_payload->>'whatsappNumber', ''),
        business_hours = coalesce(value_payload->'businessHours', '[]'::jsonb),
        response_time_guidance = nullif(value_payload->>'responseTimeGuidance', ''),
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['support_email', 'contact_email', 'contact_phone', 'whatsapp_number', 'business_hours', 'response_time_guidance'];

    when 'social' then
      update public.store_settings set
        instagram_url = nullif(value_payload->>'instagramUrl', ''),
        facebook_url = nullif(value_payload->>'facebookUrl', ''),
        tiktok_url = nullif(value_payload->>'tiktokUrl', ''),
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['instagram_url', 'facebook_url', 'tiktok_url'];

    when 'payments' then
      select coalesce(array_agg(item::public.payment_method), array[]::public.payment_method[])
      into enabled_payments
      from jsonb_array_elements_text(coalesce(value_payload->'enabledPaymentMethods', '[]'::jsonb)) item;
      if cardinality(enabled_payments) = 0 or jsonb_typeof(value_payload->'paymentMethodConfigs') <> 'object' then
        raise exception 'SETTINGS_INVALID_REQUEST' using errcode = 'P0001';
      end if;
      update public.store_settings set
        enabled_payment_methods = enabled_payments,
        payment_method_configs = value_payload->'paymentMethodConfigs',
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['enabled_payment_methods', 'payment_method_configs'];

    when 'delivery' then
      select coalesce(array_agg(item), array[]::text[])
      into enabled_deliveries
      from jsonb_array_elements_text(coalesce(value_payload->'enabledDeliveryMethods', '[]'::jsonb)) item;
      if cardinality(enabled_deliveries) = 0
        or not enabled_deliveries <@ array['HOME_DELIVERY', 'PICKUP']::text[]
        or jsonb_typeof(coalesce(value_payload->'zones', '[]'::jsonb)) <> 'array' then
        raise exception 'SETTINGS_INVALID_REQUEST' using errcode = 'P0001';
      end if;

      update public.store_settings set
        enabled_delivery_methods = enabled_deliveries,
        delivery_method_configs = coalesce(value_payload->'deliveryMethodConfigs', '{}'::jsonb),
        default_delivery_fee_xof = nullif(value_payload->>'defaultDeliveryFeeXof', '')::bigint,
        pickup_fee_xof = coalesce(nullif(value_payload->>'pickupFeeXof', '')::bigint, 0),
        free_delivery_enabled = coalesce((value_payload->>'freeDeliveryEnabled')::boolean, false),
        free_delivery_threshold_xof = nullif(value_payload->>'freeDeliveryThresholdXof', '')::bigint,
        delivery_estimated_min_days = nullif(value_payload->>'deliveryEstimatedMinDays', '')::integer,
        delivery_estimated_max_days = nullif(value_payload->>'deliveryEstimatedMaxDays', '')::integer,
        settings_revision = settings_revision + 1
      where id is true;

      update public.delivery_zones set enabled = false where enabled is true;
      for zone_payload in select value from jsonb_array_elements(coalesce(value_payload->'zones', '[]'::jsonb)) loop
        zone_id_value := coalesce(nullif(zone_payload->>'id', '')::uuid, extensions.gen_random_uuid());
        insert into public.delivery_zones (
          id, name, city, commune, fee_xof, estimated_min_days, estimated_max_days, enabled, display_order
        ) values (
          zone_id_value,
          zone_payload->>'name',
          zone_payload->>'city',
          zone_payload->>'commune',
          (zone_payload->>'feeXof')::bigint,
          nullif(zone_payload->>'estimatedMinDays', '')::integer,
          nullif(zone_payload->>'estimatedMaxDays', '')::integer,
          coalesce((zone_payload->>'enabled')::boolean, true),
          coalesce(nullif(zone_payload->>'displayOrder', '')::integer, 50)
        )
        on conflict (id) do update set
          name = excluded.name,
          city = excluded.city,
          commune = excluded.commune,
          fee_xof = excluded.fee_xof,
          estimated_min_days = excluded.estimated_min_days,
          estimated_max_days = excluded.estimated_max_days,
          enabled = excluded.enabled,
          display_order = excluded.display_order;
      end loop;
      changed_fields := array['enabled_delivery_methods', 'delivery_method_configs', 'default_delivery_fee_xof', 'pickup_fee_xof', 'free_delivery_threshold_xof', 'delivery_estimates', 'delivery_zones'];

    when 'seo' then
      update public.store_settings set
        site_title = nullif(value_payload->>'siteTitle', ''),
        site_description = nullif(value_payload->>'siteDescription', ''),
        og_image_url = nullif(value_payload->>'ogImageUrl', ''),
        canonical_site_url = nullif(value_payload->>'canonicalSiteUrl', ''),
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['site_title', 'site_description', 'og_image_url', 'canonical_site_url'];

    when 'notifications' then
      update public.store_settings set
        notification_email = nullif(value_payload->>'notificationEmail', '')::extensions.citext,
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['notification_email'];

    when 'availability' then
      update public.store_settings set
        accepting_orders = coalesce((value_payload->>'acceptingOrders')::boolean, false),
        maintenance_mode = coalesce((value_payload->>'maintenanceMode')::boolean, false),
        maintenance_message = nullif(value_payload->>'maintenanceMessage', ''),
        expected_reopening_at = nullif(value_payload->>'expectedReopeningAt', '')::timestamptz,
        settings_revision = settings_revision + 1
      where id is true;
      changed_fields := array['accepting_orders', 'maintenance_mode', 'maintenance_message', 'expected_reopening_at'];

    else
      raise exception 'SETTINGS_INVALID_SECTION' using errcode = 'P0001';
  end case;

  select jsonb_build_object(
    'revision', s.settings_revision,
    'updatedAt', s.updated_at,
    'section', section_value
  ) into result_value
  from public.store_settings s where s.id is true;

  insert into public.audit_logs(actor_id, action, resource_type, metadata)
  values (
    actor_id_value,
    'STORE_SETTINGS_UPDATED',
    'store_settings',
    jsonb_build_object('section', section_value, 'changed_fields', to_jsonb(changed_fields), 'revision', result_value->'revision')
  );

  insert into app_private.store_settings_mutations(mutation_id, request_fingerprint, settings_revision, result)
  values (mutation_id_value, fingerprint_value, (result_value->>'revision')::bigint, result_value);

  return result_value;
end;
$$;

revoke all on function app_private.update_store_settings(jsonb) from public, anon, authenticated;
grant execute on function app_private.update_store_settings(jsonb) to service_role;

create or replace function public.update_store_settings_server(request jsonb)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select app_private.update_store_settings(request);
$$;

revoke all on function public.update_store_settings_server(jsonb) from public, anon, authenticated;
grant execute on function public.update_store_settings_server(jsonb) to service_role;

comment on function public.update_store_settings_server(jsonb) is
  'Service-role-only, role-checked, revision-checked and idempotent Phase 14 settings mutation boundary.';
