-- Phase 6.5 follow-up: public catalogue views run with security_invoker.
-- The view may expose only derived availability, but invoker roles still need
-- column-level permission on every base column referenced by the view.

grant select (inventory_initialized_at)
  on public.product_variants to anon, authenticated;
