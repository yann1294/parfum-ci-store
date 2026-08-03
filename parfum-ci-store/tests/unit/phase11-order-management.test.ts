import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createOrderTransitionFingerprint,
  createPaymentStatusFingerprint,
  getAllowedOrderTransitions,
  maskEmail,
  maskPhone,
  normalizeOrderFilters,
  orderStatusLabel,
  orderTransitionSchema,
  paymentStatusLabel,
  paymentStatusUpdateSchema,
  transitionActionLabel,
} from "@/lib/orders/admin";

const orderId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";

function transition(overrides: Record<string, unknown> = {}) {
  return {
    orderId,
    expectedStatus: "PENDING_CONFIRMATION",
    targetStatus: "CONFIRMED",
    idempotencyKey: "order-transition-idempotency-key-1234567890",
    ...overrides,
  };
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    orderId,
    targetPaymentStatus: "PAID",
    reference: "OM-123",
    idempotencyKey: "payment-status-idempotency-key-1234567890",
    ...overrides,
  };
}

describe("Phase 11 order management contracts", () => {
  it("uses delivery-method-dependent transition maps and rejects terminal states", () => {
    expect(getAllowedOrderTransitions("PENDING_CONFIRMATION", "HOME_DELIVERY")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(getAllowedOrderTransitions("PREPARING", "HOME_DELIVERY")).toEqual(["OUT_FOR_DELIVERY", "CANCELLED"]);
    expect(getAllowedOrderTransitions("PREPARING", "PICKUP")).toEqual(["READY_FOR_PICKUP", "CANCELLED"]);
    expect(getAllowedOrderTransitions("CANCELLED", "HOME_DELIVERY")).toEqual([]);
    expect(getAllowedOrderTransitions("RETURNED", "HOME_DELIVERY")).toEqual([]);
  });

  it("validates transition and payment request schemas", () => {
    expect(orderTransitionSchema.safeParse(transition()).success).toBe(true);
    expect(orderTransitionSchema.safeParse(transition({ targetStatus: "DELIVERED" })).success).toBe(true);
    expect(orderTransitionSchema.safeParse(transition({ targetStatus: "CANCELLED", reason: "" })).success).toBe(false);
    expect(orderTransitionSchema.safeParse(transition({ targetStatus: "RETURNED", reason: "Retour client" })).success).toBe(true);
    expect(orderTransitionSchema.safeParse(transition({ targetStatus: "DROP" })).success).toBe(false);

    expect(paymentStatusUpdateSchema.safeParse(payment()).success).toBe(true);
    expect(paymentStatusUpdateSchema.safeParse(payment({ targetPaymentStatus: "FAILED", reason: "" })).success).toBe(false);
    expect(paymentStatusUpdateSchema.safeParse(payment({ targetPaymentStatus: "UNPAID" })).success).toBe(false);
  });

  it("creates stable idempotency fingerprints and changes for material differences", () => {
    const parsedTransition = orderTransitionSchema.parse(transition({ reason: "OK" }));
    const transitionFingerprint = createOrderTransitionFingerprint({ ...parsedTransition, actorId });

    expect(transitionFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(transitionFingerprint).toBe(createOrderTransitionFingerprint({ ...parsedTransition, actorId }));
    expect(transitionFingerprint).not.toBe(
      createOrderTransitionFingerprint({ ...parsedTransition, targetStatus: "CANCELLED", reason: "Annulation", actorId }),
    );
    expect(transitionFingerprint).not.toBe(
      createOrderTransitionFingerprint({ ...parsedTransition, expectedStatus: "CONFIRMED", actorId }),
    );

    const parsedPayment = paymentStatusUpdateSchema.parse(payment());
    expect(createPaymentStatusFingerprint({ ...parsedPayment, actorId })).toMatch(/^[a-f0-9]{64}$/);
    expect(createPaymentStatusFingerprint({ ...parsedPayment, actorId })).not.toBe(
      createPaymentStatusFingerprint({ ...parsedPayment, reference: "OM-456", actorId }),
    );
  });

  it("normalizes order URL filters safely", () => {
    expect(
      normalizeOrderFilters({
        q: "  CMD-2026  ",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: "WAVE",
        deliveryMethod: "PICKUP",
        source: "WEBSITE",
        dateFrom: "2026-08-01",
        dateTo: "bad",
        sort: "total_desc",
        page: "3",
      }),
    ).toMatchObject({
      q: "CMD-2026",
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentMethod: "WAVE",
      deliveryMethod: "PICKUP",
      source: "WEBSITE",
      dateFrom: "2026-08-01",
      dateTo: undefined,
      sort: "total_desc",
      page: 3,
    });

    expect(normalizeOrderFilters({ status: "SQL", page: "-1" })).toMatchObject({
      status: "ALL",
      page: 1,
    });
  });

  it("uses customer-safe French labels and masks list contact data", () => {
    expect(orderStatusLabel("PENDING_CONFIRMATION")).toBe("En attente de confirmation");
    expect(paymentStatusLabel("PARTIALLY_REFUNDED")).toBe("Partiellement remboursé");
    expect(transitionActionLabel("OUT_FOR_DELIVERY")).toBe("Marquer en livraison");
    expect(maskPhone("+2250708209830")).toContain("**");
    expect(maskEmail("client@example.com")).toBe("c***@example.com");
  });

  it("ships private transactional order and payment functions with stock lifecycle protections", () => {
    const sql = readFileSync("supabase/migrations/20260803153000_phase11_order_management.sql", "utf8");

    expect(sql).toContain("create table if not exists app_private.order_transition_idempotency");
    expect(sql).toContain("create table if not exists app_private.payment_status_idempotency");
    expect(sql).toContain("create table if not exists public.order_internal_notes");
    expect(sql).toContain("create or replace function app_private.transition_order(request jsonb)");
    expect(sql).toContain("for update");
    expect(sql).toContain("'RELEASED'::public.inventory_transaction_type");
    expect(sql).toContain("'SOLD'::public.inventory_transaction_type");
    expect(sql).toContain("stock_on_hand = product_variants.stock_on_hand - line_record.quantity");
    expect(sql).toContain("reserved_quantity = product_variants.reserved_quantity - line_record.quantity");
    expect(sql).toContain("create or replace function app_private.record_order_payment(request jsonb)");
    expect(sql).toContain("insert into public.payment_transactions");
    expect(sql).toContain("revoke update, delete on public.order_status_history from anon, authenticated");
    expect(sql).toContain("grant execute on function public.transition_order_server(jsonb) to service_role");
    expect(sql).toContain("grant execute on function public.record_order_payment_server(jsonb) to service_role");

    const repairSql = readFileSync("supabase/migrations/20260804103000_phase11_order_transition_expected_status.sql", "utf8");
    expect(repairSql).toContain("v_expected_status");
    expect(repairSql).toContain("ORDER_TRANSITION_STALE_STATE");
    expect(repairSql).toContain("order_row.status <> v_expected_status");
  });
});
