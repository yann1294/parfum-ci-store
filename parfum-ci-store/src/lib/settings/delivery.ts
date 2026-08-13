import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const deliveryQuoteRequestSchema = z
  .object({
    deliveryMethod: z.enum(["HOME_DELIVERY", "PICKUP"]),
    city: z.string().trim().max(120).default(""),
    commune: z.string().trim().max(120).default(""),
    subtotalXof: z.number().int().min(0).max(9_000_000_000),
  })
  .strict();

export const deliveryQuoteSchema = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("AVAILABLE"),
      feeXof: z.number().int().min(0),
      deliveryMethod: z.enum(["HOME_DELIVERY", "PICKUP"]),
      matchedZoneId: z.uuid().optional(),
      matchedZoneName: z.string().max(120).optional(),
      estimatedMinDays: z.number().int().min(0).optional(),
      estimatedMaxDays: z.number().int().min(0).optional(),
      freeDeliveryApplied: z.boolean(),
      freeDeliveryReason: z.literal("THRESHOLD").optional(),
    })
    .strict(),
  z
    .object({
      status: z.literal("UNAVAILABLE"),
      reason: z.enum(["SETTINGS_UNAVAILABLE", "METHOD_DISABLED", "AREA_UNSUPPORTED"]),
    })
    .strict(),
  z.object({ status: z.literal("PENDING_CONFIRMATION") }).strict(),
]);

export type DeliveryQuote = z.infer<typeof deliveryQuoteSchema>;
export type DeliveryQuoteRequest = z.infer<typeof deliveryQuoteRequestSchema>;

type QuoteClient = {
  rpc(
    name: "quote_delivery_server",
    args: {
      requested_method: string;
      requested_city: string;
      requested_commune: string;
      requested_subtotal_xof: number;
    },
  ): Promise<{ data: unknown; error: { message?: string } | null }>;
};

export async function quoteDelivery(input: DeliveryQuoteRequest): Promise<DeliveryQuote> {
  const value = deliveryQuoteRequestSchema.parse(input);
  const client = createSupabaseAdminClient() as unknown as QuoteClient;
  const { data, error } = await client.rpc("quote_delivery_server", {
    requested_method: value.deliveryMethod,
    requested_city: value.city,
    requested_commune: value.commune,
    requested_subtotal_xof: value.subtotalXof,
  });
  if (error) throw new Error("DELIVERY_QUOTE_FAILED");
  return deliveryQuoteSchema.parse(data);
}
