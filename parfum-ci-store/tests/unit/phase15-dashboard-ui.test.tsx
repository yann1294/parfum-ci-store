import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { Dashboard, DashboardRangeSelector } from "@/components/admin/dashboard/dashboard";
import type { DashboardData } from "@/lib/analytics/service";

function data(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
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
      grossPaidRevenueXof: 15000,
      paidOrderCount: 1,
      pendingConfirmation: 1,
      paymentsAwaitingVerification: 1,
      preparingOrders: 1,
      lowStockVariants: 1,
      newMessages: 1,
      failedNotifications: 1,
    },
    salesTrend: [{ date: "2026-08-14", paidOrderCount: 1, revenueXof: 15000 }],
    ordersBySource: [{ source: "WEBSITE", orderCount: 2 }],
    topProducts: [],
    paymentDistribution: [{ method: "WAVE", orderCount: 2 }],
    recentOrders: [],
    lowStock: [],
    recentMessages: [],
    ...overrides,
  };
}

describe("Phase 15 dashboard UI", () => {
  it("encodes the selected range in accessible shareable links", () => {
    render(<DashboardRangeSelector range="30d" />);
    expect(screen.getByRole("link", { name: "30 jours" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "7 jours" }).getAttribute("href")).toBe(
      "/admin?range=7d",
    );
    expect(screen.getByRole("link", { name: "90 jours" }).getAttribute("href")).toBe(
      "/admin?range=90d",
    );
  });

  it("provides textual chart data and operational deep links", () => {
    render(<Dashboard data={data()} />);
    expect(screen.getByText("Afficher les données de la tendance")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Chiffre d’affaires" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /À confirmer/ }).getAttribute("href")).toBe(
      "/admin/commandes?status=PENDING_CONFIRMATION",
    );
    expect(screen.getByRole("link", { name: /Notifications en échec/ }).getAttribute("href")).toBe(
      "/admin/notifications?status=FAILED",
    );
  });

  it("does not render financial or payment analytics for customer support", () => {
    render(
      <Dashboard
        data={data({
          role: "CUSTOMER_SUPPORT",
          permissions: {
            orders: true,
            financials: false,
            inventory: false,
            messages: true,
            notifications: false,
          },
          summary: { ordersToday: 2, pendingConfirmation: 1, preparingOrders: 1, newMessages: 1 },
          salesTrend: [],
          paymentDistribution: [],
        })}
      />,
    );
    expect(screen.queryByText("Chiffre d’affaires brut payé")).toBeNull();
    expect(screen.queryByText("Modes de paiement choisis")).toBeNull();
    expect(screen.getByText("Messages récents")).toBeTruthy();
  });
});
