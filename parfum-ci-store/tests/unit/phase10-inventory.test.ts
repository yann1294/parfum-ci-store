import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createInventoryAdjustmentFingerprint,
  escapeCsvCell,
  inventoryAdjustmentSchema,
  inventoryOperationLabel,
  inventoryRowsToCsv,
  inventoryStatusLabel,
  normalizeInventoryFilters,
  normalizeLedgerFilters,
  rowsToCsv,
  type InventoryVariantRow,
} from "@/lib/inventory/admin";

const variantId = "11111111-1111-4111-8111-111111111111";

function adjustment(overrides: Record<string, unknown> = {}) {
  return {
    variantId,
    operationType: "RECEIVED",
    quantity: 3,
    reason: "Réception fournisseur",
    idempotencyKey: "inventory-idempotency-key-1234567890",
    ...overrides,
  };
}

describe("Phase 10 inventory contracts", () => {
  it("validates manual operation schemas and rejects reserved/system operation selection", () => {
    expect(inventoryAdjustmentSchema.safeParse(adjustment()).success).toBe(true);
    expect(inventoryAdjustmentSchema.safeParse(adjustment({ operationType: "RESERVED" })).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse(adjustment({ quantity: 0 })).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse(adjustment({ operationType: "INITIALIZE", quantity: 0 })).success).toBe(true);
    expect(inventoryAdjustmentSchema.safeParse(adjustment({ operationType: "DAMAGED", reason: "" })).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse(adjustment({ operationType: "ADJUSTMENT", adjustmentDirection: undefined })).success).toBe(false);
  });

  it("creates stable idempotency fingerprints and changes for material operation differences", () => {
    const input = inventoryAdjustmentSchema.parse(adjustment());
    const actorId = "22222222-2222-4222-8222-222222222222";

    expect(createInventoryAdjustmentFingerprint({ ...input, actorId })).toMatch(/^[a-f0-9]{64}$/);
    expect(createInventoryAdjustmentFingerprint({ ...input, actorId })).toBe(
      createInventoryAdjustmentFingerprint({ ...input, actorId }),
    );
    expect(createInventoryAdjustmentFingerprint({ ...input, actorId })).not.toBe(
      createInventoryAdjustmentFingerprint({ ...input, quantity: 4, actorId }),
    );
  });

  it("normalizes inventory URL filters safely without throwing", () => {
    expect(
      normalizeInventoryFilters({
        q: "  Sauvage  ",
        active: "ACTIVE",
        initialized: "UNINITIALIZED",
        status: "RESERVED",
        productStatus: "ACTIVE",
        sort: "available_asc",
        page: "3",
        brandId: "bad",
      }),
    ).toMatchObject({
      q: "Sauvage",
      active: "ACTIVE",
      initialized: "UNINITIALIZED",
      status: "RESERVED",
      productStatus: "ACTIVE",
      sort: "available_asc",
      page: 3,
      brandId: undefined,
    });

    expect(normalizeInventoryFilters({ status: "LOW_OR_OUT" }).status).toBe("LOW_OR_OUT");

    expect(normalizeLedgerFilters({ operationType: "DROP", dateFrom: "bad", page: "2" })).toMatchObject({
      operationType: "ALL",
      dateFrom: undefined,
      page: 2,
    });
  });

  it("uses French inventory labels", () => {
    expect(inventoryStatusLabel("UNCONFIGURED")).toBe("Stock non configuré");
    expect(inventoryStatusLabel("LOW_STOCK")).toBe("Stock faible");
    expect(inventoryOperationLabel("DAMAGED")).toBe("Endommagé");
    expect(inventoryOperationLabel("RESERVED")).toBe("Réservation");
  });

  it("escapes CSV formula-like values and quotes French content", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escapeCsvCell("+2250700000000")).toBe("'+2250700000000");
    expect(rowsToCsv(["Motif"], [["Réception, fournisseur"]])).toBe('Motif\n"Réception, fournisseur"');
  });

  it("exports current inventory CSV without cost or customer data", () => {
    const row: InventoryVariantRow = {
      variantId,
      productId: "33333333-3333-4333-8333-333333333333",
      productName: "=Produit test",
      productSlug: "produit-test",
      productStatus: "ACTIVE",
      brandId: null,
      brandName: "@Brand",
      categoryId: null,
      categoryName: null,
      sku: "-SKU-1",
      sizeMl: 100,
      concentration: "EDP",
      variantActive: true,
      stockInitialized: true,
      inventoryInitializedAt: "2026-08-03T00:00:00.000Z",
      stockOnHand: 10,
      reservedQuantity: 2,
      availableQuantity: 8,
      lowStockThreshold: 5,
      inventoryStatus: "IN_STOCK",
      updatedAt: "2026-08-03T00:00:00.000Z",
      lastMovementAt: null,
      lastMovementType: null,
    };
    const csv = inventoryRowsToCsv([row]);

    expect(csv).toContain("'=Produit test");
    expect(csv).toContain("'@Brand");
    expect(csv).toContain("'-SKU-1");
    expect(csv).not.toContain("cost");
    expect(csv).not.toContain("customer");
  });

  it("ships a private transactional migration with grants, idempotency and ledger immutability", () => {
    const sql = readFileSync("supabase/migrations/20260803143000_phase10_inventory_adjustments.sql", "utf8");

    expect(sql).toContain("create table if not exists app_private.inventory_adjustment_idempotency");
    expect(sql).toContain("create or replace function app_private.adjust_inventory(request jsonb)");
    expect(sql).toContain("for update");
    expect(sql).toContain("variant_row.reserved_quantity > v_stock_after");
    expect(sql).toContain("insert into public.inventory_transactions");
    expect(sql).toContain("insert into public.audit_logs");
    expect(sql).toContain("revoke update, delete on public.inventory_transactions from anon, authenticated");
    expect(sql).toContain("grant execute on function public.adjust_inventory_server(jsonb) to service_role");
    expect(sql).not.toContain("'RESERVED'::public.inventory_transaction_type, v_delta");
  });
});
