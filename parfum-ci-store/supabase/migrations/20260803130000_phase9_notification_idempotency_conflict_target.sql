-- Phase 9 repair: provide a non-partial arbiter for guest-order notification outbox inserts.
-- Forward-only. Do not edit applied migrations.

create unique index if not exists notifications_idempotency_key_unique_idx
  on public.notifications(idempotency_key);

comment on index public.notifications_idempotency_key_unique_idx is
  'Allows Phase 8 guest-order notification inserts to use ON CONFLICT (idempotency_key) DO NOTHING reliably. PostgreSQL unique indexes still allow multiple null idempotency_key values.';
