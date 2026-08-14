-- Read-only representative Phase 16 query-plan review.

explain (costs true, format text)
select id, order_number, status, payment_status, created_at
from public.orders
where status = 'PENDING_CONFIRMATION'::public.order_status
order by created_at desc
limit 20;

explain (costs true, format text)
select id, status, created_at
from public.contact_messages
where status = 'NEW'::public.message_status
order by created_at desc
limit 20;

explain (costs true, format text)
select id, status, created_at
from public.notifications
where status = 'FAILED'::public.notification_status
order by created_at desc
limit 20;

explain (costs true, format text)
select id, name, slug
from public.public_catalogue_products
order by created_at desc
limit 24;
