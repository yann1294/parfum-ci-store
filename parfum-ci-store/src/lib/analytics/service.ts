import "server-only";

import { z } from "zod";

import {
  canManageInventory,
  canManageMessages,
  canManageOrders,
  canReadOrders,
  hasRole,
  type StaffProfile,
} from "@/lib/auth/permissions";
import {
  getBusinessDateRange,
  normalizeDashboardRange,
  type DashboardRange,
} from "@/lib/analytics/date-range";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const nonnegativeInteger = z.number().int().nonnegative();
const summarySchema = z
  .object({
    ordersToday: nonnegativeInteger.optional(),
    grossPaidRevenueXof: nonnegativeInteger.optional(),
    paidOrderCount: nonnegativeInteger.optional(),
    pendingConfirmation: nonnegativeInteger.optional(),
    paymentsAwaitingVerification: nonnegativeInteger.optional(),
    preparingOrders: nonnegativeInteger.optional(),
    lowStockVariants: nonnegativeInteger.optional(),
    newMessages: nonnegativeInteger.optional(),
    failedNotifications: nonnegativeInteger.optional(),
  })
  .strict();

const rawDashboardSchema = z
  .object({
    range: z.enum(["7d", "30d", "90d"]),
    timezone: z.string().min(1).max(100),
    generatedAt: z.string(),
    role: z.enum(["OWNER", "ADMIN", "ORDER_MANAGER", "CUSTOMER_SUPPORT", "INVENTORY_MANAGER"]),
    permissions: z.object({
      orders: z.boolean(),
      financials: z.boolean(),
      inventory: z.boolean(),
      messages: z.boolean(),
      notifications: z.boolean(),
    }),
    summary: summarySchema,
    salesTrend: z.array(
      z.object({
        date: z.string(),
        paidOrderCount: nonnegativeInteger,
        revenueXof: nonnegativeInteger,
      }),
    ),
    ordersBySource: z.array(z.object({ source: z.string(), orderCount: nonnegativeInteger })),
    topProducts: z.array(
      z.object({
        productId: z.string().nullable().optional(),
        productName: z.string(),
        unitsSold: nonnegativeInteger,
      }),
    ),
    paymentDistribution: z.array(z.object({ method: z.string(), orderCount: nonnegativeInteger })),
    recentOrders: z.array(
      z.object({
        id: z.uuid(),
        orderNumber: z.string(),
        customerName: z.string(),
        createdAt: z.string(),
        totalXof: nonnegativeInteger,
        paymentStatus: z.string(),
        status: z.string(),
        source: z.string(),
      }),
    ),
    lowStock: z.array(
      z.object({
        variantId: z.uuid(),
        productName: z.string(),
        variantLabel: z.string(),
        sku: z.string(),
        availableQuantity: nonnegativeInteger,
        lowStockThreshold: nonnegativeInteger,
        stockState: z.enum(["LOW_STOCK", "OUT_OF_STOCK"]),
      }),
    ),
    recentMessages: z.array(
      z.object({
        id: z.uuid(),
        senderName: z.string(),
        source: z.string(),
        subject: z.string(),
        excerpt: z.string().max(160),
        status: z.string(),
        receivedAt: z.string(),
        assigneeName: z.string().nullable().optional(),
      }),
    ),
  })
  .strict();

export type DashboardSummary = z.infer<typeof summarySchema>;
export type SalesTrendPoint = z.infer<typeof rawDashboardSchema>["salesTrend"][number];
export type SourceDistributionItem = z.infer<typeof rawDashboardSchema>["ordersBySource"][number];
export type PaymentDistributionItem = z.infer<
  typeof rawDashboardSchema
>["paymentDistribution"][number];
export type DashboardData = Omit<z.infer<typeof rawDashboardSchema>, "permissions"> & {
  permissions: {
    orders: boolean;
    financials: boolean;
    inventory: boolean;
    messages: boolean;
    notifications: boolean;
  };
};

type DashboardClient = {
  from(table: "store_settings"): {
    select(columns: "business_timezone"): {
      eq(
        column: "id",
        value: true,
      ): {
        maybeSingle(): Promise<{
          data: { business_timezone: string } | null;
          error: { code?: string } | null;
        }>;
      };
    };
  };
  rpc(
    name: "get_admin_dashboard_server",
    args: { request: Record<string, unknown> },
  ): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

export class DashboardError extends Error {
  constructor(readonly code: "DASHBOARD_SETTINGS_FAILED" | "DASHBOARD_QUERY_FAILED") {
    super(code);
  }
}

export function getDashboardPermissions(staff: StaffProfile) {
  return {
    orders: canReadOrders(staff) || canManageOrders(staff),
    financials: hasRole(staff, ["OWNER", "ADMIN", "ORDER_MANAGER"]),
    inventory: canManageInventory(staff),
    messages: canManageMessages(staff),
    notifications: hasRole(staff, ["OWNER", "ADMIN", "ORDER_MANAGER"]),
  };
}

function requireExpectedSummary(
  summary: DashboardSummary,
  permissions: ReturnType<typeof getDashboardPermissions>,
) {
  const required = [
    ...(permissions.orders ? ["ordersToday", "pendingConfirmation", "preparingOrders"] : []),
    ...(permissions.financials
      ? ["grossPaidRevenueXof", "paidOrderCount", "paymentsAwaitingVerification"]
      : []),
    ...(permissions.inventory ? ["lowStockVariants"] : []),
    ...(permissions.messages ? ["newMessages"] : []),
    ...(permissions.notifications ? ["failedNotifications"] : []),
  ] as Array<keyof DashboardSummary>;
  if (required.some((key) => summary[key] === undefined)) {
    throw new DashboardError("DASHBOARD_QUERY_FAILED");
  }
}

export function projectDashboardForRole(input: unknown, staff: StaffProfile): DashboardData {
  const parsed = rawDashboardSchema.parse(input);
  const permissions = getDashboardPermissions(staff);
  const summary: DashboardSummary = {};
  if (permissions.orders) {
    summary.ordersToday = parsed.summary.ordersToday;
    summary.pendingConfirmation = parsed.summary.pendingConfirmation;
    summary.preparingOrders = parsed.summary.preparingOrders;
  }
  if (permissions.financials) {
    summary.grossPaidRevenueXof = parsed.summary.grossPaidRevenueXof;
    summary.paidOrderCount = parsed.summary.paidOrderCount;
    summary.paymentsAwaitingVerification = parsed.summary.paymentsAwaitingVerification;
  }
  if (permissions.inventory) summary.lowStockVariants = parsed.summary.lowStockVariants;
  if (permissions.messages) summary.newMessages = parsed.summary.newMessages;
  if (permissions.notifications) summary.failedNotifications = parsed.summary.failedNotifications;
  requireExpectedSummary(summary, permissions);
  return {
    ...parsed,
    role: staff.role,
    permissions,
    summary,
    salesTrend: permissions.financials ? parsed.salesTrend : [],
    ordersBySource: permissions.orders ? parsed.ordersBySource : [],
    topProducts: permissions.inventory ? parsed.topProducts : [],
    paymentDistribution: permissions.financials ? parsed.paymentDistribution : [],
    recentOrders: permissions.orders ? parsed.recentOrders : [],
    lowStock: permissions.inventory ? parsed.lowStock : [],
    recentMessages: permissions.messages ? parsed.recentMessages : [],
  };
}

async function getBusinessTimezone(client: DashboardClient) {
  const { data, error } = await client
    .from("store_settings")
    .select("business_timezone")
    .eq("id", true)
    .maybeSingle();
  if (error || data?.business_timezone !== "Africa/Abidjan") {
    throw new DashboardError("DASHBOARD_SETTINGS_FAILED");
  }
  return data.business_timezone;
}

export async function getDashboardData({
  staff,
  range: inputRange,
  now = new Date(),
}: {
  staff: StaffProfile;
  range?: DashboardRange | unknown;
  now?: Date;
}): Promise<DashboardData> {
  const range = normalizeDashboardRange(inputRange);
  const client = createSupabaseAdminClient() as unknown as DashboardClient;
  const timezone = await getBusinessTimezone(client);
  const boundaries = getBusinessDateRange({ range, timezone, now });
  const { data, error } = await client.rpc("get_admin_dashboard_server", {
    request: {
      actorId: staff.id,
      range,
      rangeStart: boundaries.rangeStart,
      rangeEnd: boundaries.rangeEnd,
      todayStart: boundaries.todayStart,
      todayEnd: boundaries.todayEnd,
    },
  });
  if (error || !data) {
    console.error("DASHBOARD_QUERY_FAILED", { dbCode: error?.code ?? "unknown", range });
    throw new DashboardError("DASHBOARD_QUERY_FAILED");
  }
  return projectDashboardForRole(data, staff);
}
