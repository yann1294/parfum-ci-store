import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeCoteDIvoirePhone } from "@/lib/orders/guest-order-contract";
import {
  deliveryMethodLabel,
  maskPhone,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders/display";

const orderNumberSchema = z
  .string()
  .trim()
  .min(6)
  .max(32)
  .regex(/^CMD-[0-9]{4}-[A-Za-z0-9]{6}$/);

export const trackOrderRequestSchema = z
  .object({
    orderNumber: orderNumberSchema,
    phone: z.string().trim().min(1).max(40),
    honeypot: z.string().max(0).optional().default(""),
  })
  .strict();

export type TrackOrderRequest = z.infer<typeof trackOrderRequestSchema>;

export type PublicOrderTrackingResult = {
  found: boolean;
  order?: {
    orderNumber: string;
    statusLabel: string;
    paymentStatusLabel: string;
    createdAt: string;
    lastUpdatedAt: string;
    maskedPhone: string;
    deliveryMethodLabel: string;
    paymentMethodLabel: string;
    subtotalXof: number;
    deliveryFeePending: boolean;
    items: Array<{
      productName: string;
      variantLabel: string | null;
      quantity: number;
    }>;
    timeline: Array<{
      label: string;
      createdAt: string;
    }>;
  };
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  customer_phone: string | null;
  delivery_method: string | null;
  payment_method: string | null;
  subtotal_xof: number;
  delivery_fee_xof: number;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  product_name: string;
  variant_name: string | null;
  quantity: number;
};

type HistoryRow = {
  to_status: string;
  created_at: string;
};

type TrackingClient = {
  from(table: "orders"): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: OrderRow | null; error: { code?: string; message?: string } | null }>;
      };
    };
  };
} & {
  from(table: "order_items"): {
    select(columns: string): {
      eq(column: "order_id", value: string): {
        order(column: "created_at", options: { ascending: boolean }): Promise<{
          data: OrderItemRow[] | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };
} & {
  from(table: "order_status_history"): {
    select(columns: string): {
      eq(column: "order_id", value: string): {
        order(column: "created_at", options: { ascending: boolean }): Promise<{
          data: HistoryRow[] | null;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };
};

export function trackingRateLimitKey(request: Request, orderNumber?: string, normalizedPhone?: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  const material = `${orderNumber ?? "unknown"}:${normalizedPhone ?? "unknown"}`;
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `tracking:${ip}:${hash}`.slice(0, 240);
}

export function normalizeTrackingRequest(input: TrackOrderRequest) {
  const phone = normalizeCoteDIvoirePhone(input.phone);
  if (!phone) throw new Error("ORDER_INVALID_PHONE");
  return {
    orderNumber: input.orderNumber.trim().toUpperCase(),
    phone,
  };
}

function notFound(): PublicOrderTrackingResult {
  return { found: false };
}

export async function lookupOrderForTracking(input: TrackOrderRequest): Promise<PublicOrderTrackingResult> {
  let normalized: ReturnType<typeof normalizeTrackingRequest>;
  try {
    normalized = normalizeTrackingRequest(input);
  } catch {
    return notFound();
  }

  try {
    const supabase = createSupabaseAdminClient() as unknown as TrackingClient;
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, customer_phone, delivery_method, payment_method, subtotal_xof, delivery_fee_xof, created_at, updated_at",
      )
      .eq("order_number", normalized.orderNumber)
      .maybeSingle();

    if (error || !order || order.customer_phone !== normalized.phone) return notFound();

    const [{ data: items, error: itemError }, { data: history, error: historyError }] = await Promise.all([
      supabase
        .from("order_items")
        .select("product_name, variant_name, quantity, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_status_history")
        .select("to_status, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
    ]);

    if (itemError || historyError) return notFound();

    return {
      found: true,
      order: {
        orderNumber: order.order_number,
        statusLabel: orderStatusLabel(order.status),
        paymentStatusLabel: paymentStatusLabel(order.payment_status),
        createdAt: order.created_at,
        lastUpdatedAt: order.updated_at,
        maskedPhone: maskPhone(order.customer_phone),
        deliveryMethodLabel: deliveryMethodLabel(order.delivery_method),
        paymentMethodLabel: paymentMethodLabel(order.payment_method),
        subtotalXof: order.subtotal_xof,
        deliveryFeePending: order.delivery_fee_xof === 0,
        items: (items ?? []).map((item) => ({
          productName: item.product_name,
          variantLabel: item.variant_name,
          quantity: item.quantity,
        })),
        timeline: (history ?? []).map((entry) => ({
          label: orderStatusLabel(entry.to_status),
          createdAt: entry.created_at,
        })),
      },
    };
  } catch {
    console.error("ORDER_TRACKING_LOOKUP_FAILED");
    return notFound();
  }
}

