-- Phase 16: final least-privilege and notification retry hardening.
-- Forward-only migration. Do not edit applied migrations.

-- RLS does not apply to TRUNCATE. Remove the default destructive privileges from
-- browser-facing roles on every public base table.
revoke truncate on table
  public.profiles,
  public.brands,
  public.categories,
  public.products,
  public.product_variants,
  public.product_images,
  public.product_image_uploads,
  public.customers,
  public.orders,
  public.order_items,
  public.order_status_history,
  public.order_internal_notes,
  public.payment_transactions,
  public.inventory_transactions,
  public.notifications,
  public.notification_attempts,
  public.low_stock_alert_states,
  public.contact_messages,
  public.contact_message_status_history,
  public.contact_message_assignment_history,
  public.contact_message_internal_notes,
  public.store_settings,
  public.store_content,
  public.delivery_zones,
  public.storefront_order_intents,
  public.storefront_order_intent_items,
  public.audit_logs
from anon, authenticated;

revoke references, trigger on table
  public.profiles,
  public.brands,
  public.categories,
  public.products,
  public.product_variants,
  public.product_images,
  public.product_image_uploads,
  public.customers,
  public.orders,
  public.order_items,
  public.order_status_history,
  public.order_internal_notes,
  public.payment_transactions,
  public.inventory_transactions,
  public.notifications,
  public.notification_attempts,
  public.low_stock_alert_states,
  public.contact_messages,
  public.contact_message_status_history,
  public.contact_message_assignment_history,
  public.contact_message_internal_notes,
  public.store_settings,
  public.store_content,
  public.delivery_zones,
  public.storefront_order_intents,
  public.storefront_order_intent_items,
  public.audit_logs
from anon, authenticated;

-- Anonymous callers only need the explicitly granted safe read projections.
revoke insert, update, delete on table
  public.profiles,
  public.brands,
  public.categories,
  public.products,
  public.product_variants,
  public.product_images,
  public.product_image_uploads,
  public.customers,
  public.orders,
  public.order_items,
  public.order_status_history,
  public.order_internal_notes,
  public.payment_transactions,
  public.inventory_transactions,
  public.notifications,
  public.notification_attempts,
  public.low_stock_alert_states,
  public.contact_messages,
  public.contact_message_status_history,
  public.contact_message_assignment_history,
  public.contact_message_internal_notes,
  public.store_settings,
  public.store_content,
  public.delivery_zones,
  public.storefront_order_intents,
  public.storefront_order_intent_items,
  public.audit_logs
from anon;

-- Authenticated catalogue/content writes with dedicated RLS policies are kept.
-- All transactional and sensitive writes remain service/RPC controlled.
revoke insert, update, delete on table
  public.profiles,
  public.customers,
  public.orders,
  public.order_items,
  public.order_status_history,
  public.payment_transactions,
  public.inventory_transactions,
  public.notifications,
  public.notification_attempts,
  public.low_stock_alert_states,
  public.contact_messages,
  public.contact_message_status_history,
  public.contact_message_assignment_history,
  public.contact_message_internal_notes,
  public.store_settings,
  public.delivery_zones,
  public.storefront_order_intents,
  public.storefront_order_intent_items,
  public.audit_logs
from authenticated;

revoke all on function app_private.contact_message_public_result(uuid)
  from public, anon, authenticated;

create or replace function app_private.retry_notification(
  p_notification_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_row public.notifications%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_notification_id is null or p_actor_id is null then
    raise exception 'NOTIFICATION_INVALID_REQUEST';
  end if;

  perform 1
  from public.profiles p
  where p.id = p_actor_id
    and p.active is true
    and p.role in ('OWNER'::public.app_role, 'ADMIN'::public.app_role);

  if not found then
    raise exception 'NOTIFICATION_UNAUTHORIZED';
  end if;

  select *
  into notification_row
  from public.notifications n
  where n.id = p_notification_id
  for update;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  if notification_row.status <> 'FAILED'::public.notification_status then
    raise exception 'NOTIFICATION_NOT_RETRYABLE';
  end if;

  update public.notifications n
  set
    status = 'PENDING'::public.notification_status,
    next_attempt_at = v_now,
    retryable = true,
    max_attempts = greatest(notification_row.max_attempts, notification_row.attempt_count + 1),
    claim_token = null,
    claimed_at = null,
    last_error_code = null,
    last_error_message = null,
    updated_at = v_now
  where n.id = p_notification_id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    p_actor_id,
    'NOTIFICATION_RETRY_REQUESTED',
    'notification',
    p_notification_id,
    jsonb_build_object(
      'from_status', notification_row.status,
      'attempt_count', notification_row.attempt_count,
      'template_key', notification_row.template_key
    )
  );

  return jsonb_build_object('notificationId', p_notification_id, 'status', 'PENDING');
end;
$$;

create or replace function public.retry_notification_server(
  notification_id uuid,
  actor_id uuid
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.retry_notification($1, $2);
$$;

revoke all on function app_private.retry_notification(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.retry_notification_server(uuid, uuid)
  from public, anon, authenticated;

grant execute on function app_private.retry_notification(uuid, uuid) to service_role;
grant execute on function public.retry_notification_server(uuid, uuid) to service_role;
