import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  businessLocalDateTimeToUtc,
  getBusinessDateRange,
  normalizeDashboardRange,
} from "@/lib/analytics/date-range";
import { dashboardPercentage } from "@/lib/analytics/display";
import { getDashboardPermissions, projectDashboardForRole } from "@/lib/analytics/service";
import type { StaffProfile } from "@/lib/auth/permissions";

const baseDashboard = {
  range: "30d",
  timezone: "Africa/Abidjan",
  generatedAt: "2026-08-14T12:00:00.000Z",
  role: "OWNER",
  permissions: {
    orders: true,
    financials: true,
    inventory: true,
    messages: true,
    notifications: true,
  },
  summary: {
    ordersToday: 2,
    grossPaidRevenueXof: 9876543,
    paidOrderCount: 1,
    pendingConfirmation: 1,
    paymentsAwaitingVerification: 1,
    preparingOrders: 0,
    lowStockVariants: 3,
    newMessages: 4,
    failedNotifications: 5,
  },
  salesTrend: [{ date: "2026-08-14", paidOrderCount: 1, revenueXof: 9876543 }],
  ordersBySource: [{ source: "WEBSITE", orderCount: 2 }],
  topProducts: [{ productId: null, productName: "Snapshot parfum", unitsSold: 2 }],
  paymentDistribution: [{ method: "WAVE", orderCount: 2 }],
  recentOrders: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      orderNumber: "PCI-TEST",
      customerName: "Client test",
      createdAt: "2026-08-14T10:00:00.000Z",
      totalXof: 125000,
      paymentStatus: "PAID",
      status: "CONFIRMED",
      source: "WEBSITE",
    },
  ],
  lowStock: [
    {
      variantId: "22222222-2222-4222-8222-222222222222",
      productName: "Parfum",
      variantLabel: "50 ml",
      sku: "SKU-1",
      availableQuantity: 1,
      lowStockThreshold: 2,
      stockState: "LOW_STOCK",
    },
  ],
  recentMessages: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      senderName: "Client",
      source: "WEBSITE",
      subject: "Question",
      excerpt: "Extrait sûr",
      status: "NEW",
      receivedAt: "2026-08-14T11:00:00.000Z",
      assigneeName: null,
    },
  ],
} as const;

function staff(role: StaffProfile["role"]): StaffProfile {
  return { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", fullName: "Staff", role, active: true };
}

describe("Phase 15 dashboard ranges", () => {
  it("falls back to 30 days for invalid or repeated URL values", () => {
    expect(normalizeDashboardRange("invalid")).toBe("30d");
    expect(normalizeDashboardRange(["7d", "90d"])).toBe("30d");
    expect(normalizeDashboardRange(undefined)).toBe("30d");
  });

  it.each([
    ["7d", "2026-08-08T00:00:00.000Z"],
    ["30d", "2026-07-16T00:00:00.000Z"],
    ["90d", "2026-05-17T00:00:00.000Z"],
  ] as const)("creates an inclusive %s range using Abidjan midnight", (range, expectedStart) => {
    const result = getBusinessDateRange({
      range,
      timezone: "Africa/Abidjan",
      now: new Date("2026-08-14T15:30:00.000Z"),
    });
    expect(result.rangeStart).toBe(expectedStart);
    expect(result.rangeEnd).toBe("2026-08-15T00:00:00.000Z");
    expect(result.todayStart).toBe("2026-08-14T00:00:00.000Z");
    expect(result.todayEnd).toBe("2026-08-15T00:00:00.000Z");
  });

  it("converts a business-local midnight once instead of using host timezone", () => {
    expect(
      businessLocalDateTimeToUtc(
        { year: 2026, month: 8, day: 14, hour: 0, minute: 0, second: 0 },
        "Africa/Abidjan",
      ).toISOString(),
    ).toBe("2026-08-14T00:00:00.000Z");
  });
});

describe("Phase 15 role projection", () => {
  it("returns complete operational data to OWNER", () => {
    const projected = projectDashboardForRole(baseDashboard, staff("OWNER"));
    expect(projected.summary.grossPaidRevenueXof).toBe(9876543);
    expect(projected.recentOrders).toHaveLength(1);
    expect(projected.lowStock).toHaveLength(1);
    expect(projected.recentMessages).toHaveLength(1);
  });

  it("omits financial and inventory values entirely for CUSTOMER_SUPPORT", () => {
    const projected = projectDashboardForRole(baseDashboard, staff("CUSTOMER_SUPPORT"));
    const serialized = JSON.stringify(projected);
    expect(projected.permissions.financials).toBe(false);
    expect(projected.permissions.inventory).toBe(false);
    expect(serialized).not.toContain("grossPaidRevenueXof");
    expect(serialized).not.toContain("paidOrderCount");
    expect(serialized).not.toContain("paymentsAwaitingVerification");
    expect(serialized).not.toContain("9876543");
    expect(projected.salesTrend).toEqual([]);
    expect(projected.paymentDistribution).toEqual([]);
    expect(projected.lowStock).toEqual([]);
    expect(projected.recentMessages).toHaveLength(1);
  });

  it("limits INVENTORY_MANAGER to inventory and top-product data", () => {
    const projected = projectDashboardForRole(baseDashboard, staff("INVENTORY_MANAGER"));
    expect(projected.recentOrders).toEqual([]);
    expect(projected.recentMessages).toEqual([]);
    expect(projected.paymentDistribution).toEqual([]);
    expect(projected.topProducts).toHaveLength(1);
    expect(projected.summary).toEqual({ lowStockVariants: 3 });
  });

  it("keeps ORDER_MANAGER financial access aligned with existing order policy", () => {
    expect(getDashboardPermissions(staff("ORDER_MANAGER"))).toEqual({
      orders: true,
      financials: true,
      inventory: false,
      messages: false,
      notifications: true,
    });
  });

  it("handles zero totals without NaN or Infinity", () => {
    expect(dashboardPercentage(0, 0)).toBe(0);
    expect(dashboardPercentage(2, 3)).toBe(67);
  });
});

describe("Phase 15 migration contract", () => {
  const sql = readFileSync(
    "supabase/migrations/20260814090000_phase15_admin_dashboard.sql",
    "utf8",
  );

  it("uses a fixed business timezone and service-role-only aggregate boundary", () => {
    expect(sql).toContain("business_timezone text not null default 'Africa/Abidjan'");
    expect(sql).toContain("v_expected_range_days :=");
    expect(sql).not.toContain("<> case v_range");
    expect(sql).toContain(
      "grant execute on function public.get_admin_dashboard_server(jsonb) to service_role",
    );
    expect(sql).toContain(
      "revoke all on function public.get_admin_dashboard_server(jsonb) from public, anon, authenticated",
    );
  });

  it("deduplicates paid economic events by order and uses verification time", () => {
    expect(sql).toContain("select distinct on (payment_transactions.order_id)");
    expect(sql).toContain("payment_transactions.verified_at as paid_at");
    expect(sql).not.toContain("sum(orders.total_xof)");
  });

  it("reuses authoritative inventory SOLD and low-stock rules", () => {
    expect(sql).toContain("stock_on_hand - reserved_quantity <= low_stock_threshold");
    expect(sql).toContain(
      "inventory_transactions.type = 'SOLD'::public.inventory_transaction_type",
    );
    expect(sql).toContain("order_items.product_name");
  });
});
