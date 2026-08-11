-- Phase 13: customer messages, manual inbox, status/assignment history and
-- transactional notification intents.

alter table public.contact_messages
  add column if not exists normalized_phone text,
  add column if not exists normalized_whatsapp text,
  add column if not exists preferred_contact_method text,
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists order_number text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists source_reference text,
  add column if not exists external_handle text,
  add column if not exists source_page text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists consent_accepted_at timestamptz,
  add column if not exists consent_version text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.contact_messages
  add constraint contact_messages_name_length check (char_length(btrim(customer_name)) between 2 and 100) not valid,
  add constraint contact_messages_subject_length check (subject is null or char_length(btrim(subject)) between 3 and 160) not valid,
  add constraint contact_messages_body_length check (char_length(btrim(body)) between 10 and 4000) not valid,
  add constraint contact_messages_source_reference_length check (source_reference is null or char_length(source_reference) <= 180) not valid,
  add constraint contact_messages_external_handle_length check (external_handle is null or char_length(external_handle) <= 120) not valid,
  add constraint contact_messages_preferred_contact_known check (
    preferred_contact_method is null or preferred_contact_method in ('PHONE', 'EMAIL', 'WHATSAPP')
  ) not valid,
  add constraint contact_messages_product_snapshot_object check (jsonb_typeof(product_snapshot) = 'object') not valid;

create index if not exists contact_messages_source_idx on public.contact_messages(source);
create index if not exists contact_messages_assigned_to_idx on public.contact_messages(assigned_to);
create index if not exists contact_messages_customer_id_idx on public.contact_messages(customer_id);
create index if not exists contact_messages_order_id_idx on public.contact_messages(order_id);
create index if not exists contact_messages_product_id_idx on public.contact_messages(product_id);
create index if not exists contact_messages_normalized_phone_idx on public.contact_messages(normalized_phone);

create table if not exists public.contact_message_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  from_status public.message_status,
  to_status public.message_status not null,
  actor_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint contact_message_status_reason_length check (reason is null or char_length(reason) <= 300)
);

create table if not exists public.contact_message_assignment_history (
  id uuid primary key default extensions.gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  from_assignee uuid references public.profiles(id) on delete set null,
  to_assignee uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_message_internal_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint contact_message_internal_notes_note_length check (char_length(btrim(note)) between 1 and 2000)
);

create table if not exists app_private.contact_message_idempotency (
  id uuid primary key default extensions.gen_random_uuid(),
  operation text not null,
  idempotency_key text not null,
  request_fingerprint text not null,
  message_id uuid references public.contact_messages(id) on delete set null,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  constraint contact_message_idempotency_operation_not_blank check (length(btrim(operation)) > 0),
  constraint contact_message_idempotency_key_not_blank check (length(btrim(idempotency_key)) >= 32),
  constraint contact_message_idempotency_fingerprint_format check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint contact_message_idempotency_status_known check (status = 'COMPLETED')
);

create unique index if not exists contact_message_idempotency_operation_key_idx
  on app_private.contact_message_idempotency(operation, idempotency_key);

create index if not exists contact_message_status_history_message_created_idx
  on public.contact_message_status_history(message_id, created_at desc);
create index if not exists contact_message_assignment_history_message_created_idx
  on public.contact_message_assignment_history(message_id, created_at desc);
create index if not exists contact_message_internal_notes_message_created_idx
  on public.contact_message_internal_notes(message_id, created_at desc);

alter table public.contact_message_status_history enable row level security;
alter table public.contact_message_assignment_history enable row level security;
alter table public.contact_message_internal_notes enable row level security;

drop policy if exists "contact_message_status_history_staff_read" on public.contact_message_status_history;
create policy "contact_message_status_history_staff_read" on public.contact_message_status_history
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN', 'CUSTOMER_SUPPORT']::public.app_role[]));

drop policy if exists "contact_message_assignment_history_staff_read" on public.contact_message_assignment_history;
create policy "contact_message_assignment_history_staff_read" on public.contact_message_assignment_history
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN', 'CUSTOMER_SUPPORT']::public.app_role[]));

drop policy if exists "contact_message_internal_notes_staff_read" on public.contact_message_internal_notes;
create policy "contact_message_internal_notes_staff_read" on public.contact_message_internal_notes
  for select to authenticated
  using (app_private.has_staff_role(array['OWNER', 'ADMIN', 'CUSTOMER_SUPPORT']::public.app_role[]));

revoke insert, update, delete on public.contact_message_status_history from anon, authenticated;
revoke insert, update, delete on public.contact_message_assignment_history from anon, authenticated;
revoke insert, update, delete on public.contact_message_internal_notes from anon, authenticated;
revoke all on app_private.contact_message_idempotency from public, anon, authenticated;

grant select on public.contact_message_status_history to authenticated;
grant select on public.contact_message_assignment_history to authenticated;
grant select on public.contact_message_internal_notes to authenticated;
grant select, insert, update on public.contact_messages to service_role;
grant select, insert on public.contact_message_status_history to service_role;
grant select, insert on public.contact_message_assignment_history to service_role;
grant select, insert on public.contact_message_internal_notes to service_role;
grant select, insert, update on app_private.contact_message_idempotency to service_role;

create or replace function app_private.active_message_actor(p_actor_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_row public.profiles%rowtype;
begin
  select *
  into actor_row
  from public.profiles p
  where p.id = p_actor_id
    and p.active is true
    and p.role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role, 'CUSTOMER_SUPPORT'::public.app_role);
  if not found then
    raise exception 'MESSAGE_UNAUTHORIZED';
  end if;
  return actor_row;
end;
$$;

create or replace function app_private.contact_message_public_result(p_message_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'message', 'Votre message a bien été envoyé. Notre équipe vous répondra dès que possible.',
    'reference', left(replace(p_message_id::text, '-', ''), 10)
  );
$$;

create or replace function app_private.create_contact_message(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idempotency_key text := btrim(coalesce(request->>'idempotencyKey', ''));
  v_fingerprint text := btrim(coalesce(request->>'requestFingerprint', ''));
  v_source public.message_source := coalesce(nullif(request->>'source', ''), 'WEBSITE')::public.message_source;
  v_actor_id uuid := nullif(request->>'actorId', '')::uuid;
  v_name text := btrim(coalesce(request->>'name', ''));
  v_email text := nullif(lower(btrim(coalesce(request->>'email', ''))), '');
  v_phone text := nullif(btrim(coalesce(request->>'phone', '')), '');
  v_whatsapp text := nullif(btrim(coalesce(request->>'whatsapp', '')), '');
  v_subject text := nullif(btrim(coalesce(request->>'subject', '')), '');
  v_body text := btrim(coalesce(request->>'message', ''));
  v_preferred text := nullif(btrim(coalesce(request->>'preferredContactMethod', '')), '');
  v_consent boolean := coalesce((request->>'consent')::boolean, false);
  v_source_page text := nullif(left(btrim(coalesce(request->>'sourcePage', '')), 240), '');
  v_source_reference text := nullif(left(btrim(coalesce(request->>'sourceReference', '')), 180), '');
  v_external_handle text := nullif(left(btrim(coalesce(request->>'externalHandle', '')), 120), '');
  v_product_id uuid := nullif(request#>>'{productContext,productId}', '')::uuid;
  v_variant_id uuid := nullif(request#>>'{productContext,variantId}', '')::uuid;
  v_order_number text := nullif(upper(btrim(coalesce(request->>'orderNumber', ''))), '');
  v_assigned_to uuid := nullif(request->>'assignedTo', '')::uuid;
  v_customer_id uuid;
  v_order_id uuid;
  v_product_snapshot jsonb := '{}'::jsonb;
  v_message_id uuid;
  v_result jsonb;
  existing_row app_private.contact_message_idempotency%rowtype;
  settings_row public.store_settings%rowtype;
begin
  if v_idempotency_key !~ '^[A-Za-z0-9._:-]{32,180}$' or v_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'MESSAGE_INVALID_REQUEST';
  end if;
  if v_source = 'WEBSITE'::public.message_source and v_consent is not true then
    raise exception 'MESSAGE_CONSENT_REQUIRED';
  end if;
  if v_source <> 'WEBSITE'::public.message_source then
    perform app_private.active_message_actor(v_actor_id);
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'MESSAGE_INVALID_REQUEST';
  end if;
  if v_subject is null or char_length(v_subject) < 3 or char_length(v_subject) > 160 then
    raise exception 'MESSAGE_INVALID_REQUEST';
  end if;
  if char_length(v_body) < 10 or char_length(v_body) > 4000 then
    raise exception 'MESSAGE_INVALID_REQUEST';
  end if;
  if v_email is null and v_phone is null and v_whatsapp is null and v_external_handle is null then
    raise exception 'MESSAGE_CONTACT_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('contact_message:' || v_idempotency_key, 0));

  select *
  into existing_row
  from app_private.contact_message_idempotency i
  where i.operation = 'contact_message'
    and i.idempotency_key = v_idempotency_key
  for update;

  if found then
    if existing_row.request_fingerprint <> v_fingerprint then
      raise exception 'MESSAGE_IDEMPOTENCY_CONFLICT';
    end if;
    return existing_row.result;
  end if;

  if v_phone is not null then
    select c.id
    into v_customer_id
    from public.customers c
    where c.normalized_phone = v_phone
    order by c.created_at
    limit 1;
  end if;

  if v_customer_id is null and v_email is not null then
    select c.id
    into v_customer_id
    from public.customers c
    where lower(c.email::text) = v_email
    order by c.created_at
    limit 1;
  end if;

  if v_order_number is not null then
    select o.id
    into v_order_id
    from public.orders o
    where o.order_number = v_order_number
      and (
        (v_phone is not null and o.customer_phone = v_phone)
        or (v_email is not null and lower(o.customer_email::text) = v_email)
      )
    limit 1;
  end if;

  if v_product_id is not null then
    select jsonb_build_object(
      'productName', p.name,
      'productSlug', p.slug,
      'variantLabel', case
        when v.id is null then null
        else concat(v.size_ml::text, ' ml', case when v.concentration is null then '' else concat(' · ', v.concentration) end)
      end
    )
    into v_product_snapshot
    from public.products p
    left join public.product_variants v on v.id = v_variant_id and v.product_id = p.id
    where p.id = v_product_id
      and p.status = 'ACTIVE'::public.product_status
      and (v_variant_id is null or v.id is not null);

    if v_product_snapshot is null then
      v_product_id := null;
      v_variant_id := null;
      v_product_snapshot := '{}'::jsonb;
    end if;
  end if;

  if v_assigned_to is not null then
    perform app_private.active_message_actor(v_assigned_to);
  end if;

  insert into public.contact_messages (
    customer_name,
    customer_email,
    customer_phone,
    customer_whatsapp,
    normalized_phone,
    normalized_whatsapp,
    source,
    subject,
    body,
    status,
    assigned_to,
    preferred_contact_method,
    product_id,
    variant_id,
    product_snapshot,
    order_id,
    order_number,
    customer_id,
    source_reference,
    external_handle,
    source_page,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    consent_accepted_at,
    consent_version,
    created_by
  )
  values (
    v_name,
    v_email,
    v_phone,
    v_whatsapp,
    v_phone,
    v_whatsapp,
    v_source,
    v_subject,
    v_body,
    'NEW'::public.message_status,
    v_assigned_to,
    v_preferred,
    v_product_id,
    v_variant_id,
    coalesce(v_product_snapshot, '{}'::jsonb),
    v_order_id,
    v_order_number,
    v_customer_id,
    v_source_reference,
    v_external_handle,
    v_source_page,
    nullif(left(btrim(coalesce(request#>>'{attribution,utmSource}', '')), 120), ''),
    nullif(left(btrim(coalesce(request#>>'{attribution,utmMedium}', '')), 120), ''),
    nullif(left(btrim(coalesce(request#>>'{attribution,utmCampaign}', '')), 120), ''),
    nullif(left(btrim(coalesce(request#>>'{attribution,utmTerm}', '')), 120), ''),
    nullif(left(btrim(coalesce(request#>>'{attribution,utmContent}', '')), 120), ''),
    case when v_consent then timezone('utc', now()) else null end,
    case when v_consent then 'contact-response-v1' else null end,
    v_actor_id
  )
  returning id into v_message_id;

  insert into public.contact_message_status_history (message_id, from_status, to_status, actor_id, reason)
  values (v_message_id, null, 'NEW'::public.message_status, v_actor_id, 'Message créé');

  if v_assigned_to is not null then
    insert into public.contact_message_assignment_history (message_id, from_assignee, to_assignee, actor_id)
    values (v_message_id, null, v_assigned_to, v_actor_id);
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    v_actor_id,
    case when v_source = 'WEBSITE'::public.message_source then 'CONTACT_MESSAGE_CREATED' else 'CONTACT_MESSAGE_MANUAL_CREATED' end,
    'contact_message',
    v_message_id,
    jsonb_build_object('source', v_source, 'subject', left(coalesce(v_subject, ''), 80), 'has_order_link', v_order_id is not null)
  );

  select * into settings_row from public.store_settings where id is true;

  insert into public.notifications (channel, status, recipient, subject, template_key, payload, idempotency_key)
  values
    (
      'IN_APP'::public.notification_channel,
      'PENDING'::public.notification_status,
      'staff:messages',
      'Nouveau message client',
      'contact_message_received',
      jsonb_build_object('message_id', v_message_id, 'source', v_source, 'subject', v_subject),
      'contact_message:' || v_idempotency_key || ':in_app'
    ),
    (
      'EMAIL'::public.notification_channel,
      'PENDING'::public.notification_status,
      coalesce(settings_row.notification_email::text, settings_row.contact_email::text, 'staff:messages'),
      'Nouveau message client',
      'contact_message_received',
      jsonb_build_object('message_id', v_message_id, 'source', v_source, 'subject', v_subject),
      'contact_message:' || v_idempotency_key || ':email'
    )
  on conflict (idempotency_key) do nothing;

  v_result := app_private.contact_message_public_result(v_message_id);

  insert into app_private.contact_message_idempotency (operation, idempotency_key, request_fingerprint, message_id, result)
  values ('contact_message', v_idempotency_key, v_fingerprint, v_message_id, v_result);

  return v_result;
end;
$$;

create or replace function public.create_contact_message_server(request jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.create_contact_message(request);
$$;

create or replace function app_private.transition_contact_message(
  p_message_id uuid,
  p_target_status public.message_status,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_row public.profiles%rowtype;
  message_row public.contact_messages%rowtype;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
begin
  actor_row := app_private.active_message_actor(p_actor_id);

  select *
  into message_row
  from public.contact_messages m
  where m.id = p_message_id
  for update;
  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  if message_row.status = p_target_status then
    return jsonb_build_object('messageId', p_message_id, 'status', p_target_status, 'idempotent', true);
  end if;

  if not (
    (message_row.status = 'NEW'::public.message_status and p_target_status in ('OPEN'::public.message_status, 'SPAM'::public.message_status))
    or (message_row.status = 'OPEN'::public.message_status and p_target_status in ('RESOLVED'::public.message_status, 'SPAM'::public.message_status))
    or (message_row.status = 'SPAM'::public.message_status and p_target_status = 'OPEN'::public.message_status)
    or (message_row.status = 'RESOLVED'::public.message_status and p_target_status = 'OPEN'::public.message_status)
  ) then
    raise exception 'MESSAGE_INVALID_TRANSITION';
  end if;

  if p_target_status in ('SPAM'::public.message_status, 'RESOLVED'::public.message_status)
    and v_reason is null then
    raise exception 'MESSAGE_REASON_REQUIRED';
  end if;

  update public.contact_messages m
  set status = p_target_status, updated_at = timezone('utc', now())
  where m.id = p_message_id;

  insert into public.contact_message_status_history (message_id, from_status, to_status, actor_id, reason)
  values (p_message_id, message_row.status, p_target_status, p_actor_id, v_reason);

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (p_actor_id, 'CONTACT_MESSAGE_STATUS_CHANGED', 'contact_message', p_message_id, jsonb_build_object('from', message_row.status, 'to', p_target_status, 'reason', v_reason));

  return jsonb_build_object('messageId', p_message_id, 'status', p_target_status);
end;
$$;

create or replace function public.transition_contact_message_server(
  message_id uuid,
  target_status public.message_status,
  actor_id uuid,
  reason text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.transition_contact_message($1, $2, $3, $4);
$$;

create or replace function app_private.assign_contact_message(
  p_message_id uuid,
  p_assigned_to uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_row public.profiles%rowtype;
  assignee_row public.profiles%rowtype;
  message_row public.contact_messages%rowtype;
begin
  actor_row := app_private.active_message_actor(p_actor_id);

  if p_assigned_to is not null then
    assignee_row := app_private.active_message_actor(p_assigned_to);
  end if;

  select *
  into message_row
  from public.contact_messages m
  where m.id = p_message_id
  for update;
  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  if message_row.assigned_to is not distinct from p_assigned_to then
    return jsonb_build_object('messageId', p_message_id, 'assignedTo', p_assigned_to, 'idempotent', true);
  end if;

  update public.contact_messages m
  set assigned_to = p_assigned_to, updated_at = timezone('utc', now())
  where m.id = p_message_id;

  insert into public.contact_message_assignment_history (message_id, from_assignee, to_assignee, actor_id)
  values (p_message_id, message_row.assigned_to, p_assigned_to, p_actor_id);

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (p_actor_id, 'CONTACT_MESSAGE_ASSIGNED', 'contact_message', p_message_id, jsonb_build_object('from', message_row.assigned_to, 'to', p_assigned_to));

  return jsonb_build_object('messageId', p_message_id, 'assignedTo', p_assigned_to);
end;
$$;

create or replace function public.assign_contact_message_server(
  message_id uuid,
  assigned_to uuid,
  actor_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.assign_contact_message($1, $2, $3);
$$;

create or replace function app_private.add_contact_message_note(
  p_message_id uuid,
  p_actor_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_row public.profiles%rowtype;
  v_note text := btrim(coalesce(p_note, ''));
  v_note_id uuid;
begin
  actor_row := app_private.active_message_actor(p_actor_id);
  if char_length(v_note) < 1 or char_length(v_note) > 2000 then
    raise exception 'MESSAGE_NOTE_INVALID';
  end if;
  if not exists (select 1 from public.contact_messages m where m.id = p_message_id) then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  insert into public.contact_message_internal_notes (message_id, actor_id, note)
  values (p_message_id, p_actor_id, v_note)
  returning id into v_note_id;

  update public.contact_messages m
  set updated_at = timezone('utc', now())
  where m.id = p_message_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (p_actor_id, 'CONTACT_MESSAGE_NOTE_ADDED', 'contact_message', p_message_id, jsonb_build_object('note_id', v_note_id));

  return jsonb_build_object('messageId', p_message_id, 'noteId', v_note_id);
end;
$$;

create or replace function public.add_contact_message_note_server(
  message_id uuid,
  actor_id uuid,
  note text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.add_contact_message_note($1, $2, $3);
$$;

revoke all on function app_private.active_message_actor(uuid) from public, anon, authenticated;
revoke all on function app_private.create_contact_message(jsonb) from public, anon, authenticated;
revoke all on function public.create_contact_message_server(jsonb) from public, anon, authenticated;
revoke all on function app_private.transition_contact_message(uuid, public.message_status, uuid, text) from public, anon, authenticated;
revoke all on function public.transition_contact_message_server(uuid, public.message_status, uuid, text) from public, anon, authenticated;
revoke all on function app_private.assign_contact_message(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.assign_contact_message_server(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.add_contact_message_note(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.add_contact_message_note_server(uuid, uuid, text) from public, anon, authenticated;

grant execute on function app_private.create_contact_message(jsonb) to service_role;
grant execute on function public.create_contact_message_server(jsonb) to service_role;
grant execute on function app_private.transition_contact_message(uuid, public.message_status, uuid, text) to service_role;
grant execute on function public.transition_contact_message_server(uuid, public.message_status, uuid, text) to service_role;
grant execute on function app_private.assign_contact_message(uuid, uuid, uuid) to service_role;
grant execute on function public.assign_contact_message_server(uuid, uuid, uuid) to service_role;
grant execute on function app_private.add_contact_message_note(uuid, uuid, text) to service_role;
grant execute on function public.add_contact_message_note_server(uuid, uuid, text) to service_role;
