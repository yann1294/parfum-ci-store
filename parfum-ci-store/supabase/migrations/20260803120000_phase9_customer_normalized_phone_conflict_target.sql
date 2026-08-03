-- Phase 9 repair: provide a non-partial arbiter for guest-order customer upserts.
-- Forward-only. Do not edit applied migrations.

create unique index if not exists customers_normalized_phone_unique_idx
  on public.customers(normalized_phone);

comment on index public.customers_normalized_phone_unique_idx is
  'Allows the Phase 8 guest-order customer upsert to infer a unique arbiter for normalized_phone even when PL/pgSQL conflict predicate resolution is strict. PostgreSQL unique indexes still allow multiple null normalized_phone values.';
