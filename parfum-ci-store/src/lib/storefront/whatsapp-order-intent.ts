import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { getPublicProductImageUrl } from "@/lib/catalogue/public-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CART_MAX_ITEMS, CART_MAX_QUANTITY } from "@/lib/storefront/cart";
import {
  reconcileCartItemSchema,
  reconcileCartRows,
  type CartReconciliationRows,
  type ReconcileCartItemInput,
  type ReconciledCart,
} from "@/lib/storefront/cart-reconciliation-core";

const attributionInputSchema = z
  .object({
    utmSource: z.string().trim().min(1).max(120).optional(),
    utmMedium: z.string().trim().min(1).max(120).optional(),
    utmCampaign: z.string().trim().min(1).max(120).optional(),
    utmTerm: z.string().trim().min(1).max(120).optional(),
    utmContent: z.string().trim().min(1).max(120).optional(),
    capturedAt: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .strict();

export const WHATSAPP_INTENT_MAX_BODY_BYTES = 16_000;

export const whatsappOrderIntentRequestSchema = z
  .object({
    intentKey: z.string().trim().min(32).max(180).regex(/^whatsapp-[A-Za-z0-9._:-]+$/),
    sourcePage: z.string().trim().max(120).regex(/^\/[A-Za-z0-9/?=&._%-]*$/).default("/panier"),
    items: z.array(reconcileCartItemSchema).min(1).max(CART_MAX_ITEMS),
    attribution: attributionInputSchema.optional(),
  })
  .strict();

export type WhatsAppOrderIntentRequest = z.infer<typeof whatsappOrderIntentRequestSchema>;

export type WhatsAppOrderIntentResult =
  | {
      ok: true;
      tracked: true;
      intentReference: string;
      snapshot: ReconciledCart;
    }
  | {
      ok: true;
      tracked: false;
      intentReference: null;
      snapshot: ReconciledCart;
    }
  | {
      ok: false;
      code: "WHATSAPP_INTENT_INVALID_REQUEST" | "WHATSAPP_INTENT_CART_NOT_READY" | "WHATSAPP_INTENT_VALIDATION_FAILED";
    };

type PublicCartClient = {
  from(table: "public_catalogue_products"): {
    select(columns: string): {
      in(column: string, values: string[]): Promise<{
        data: CartReconciliationRows["products"] | null;
        error: { code?: string; message?: string } | null;
      }>;
    };
  };
} & {
  from(table: "public_catalogue_variants"): {
    select(columns: string): {
      in(column: string, values: string[]): Promise<{
        data: CartReconciliationRows["variants"] | null;
        error: { code?: string; message?: string } | null;
      }>;
    };
  };
} & {
  from(table: "public_catalogue_images"): {
    select(columns: string): {
      in(column: string, values: string[]): Promise<{
        data: CartReconciliationRows["images"] | null;
        error: { code?: string; message?: string } | null;
      }>;
    };
  };
};

type IntentInsert = {
  channel: "WHATSAPP";
  status: "OPENED";
  intent_key: string;
  cart_fingerprint: string;
  subtotal_xof: number;
  currency: "XOF";
  source_page: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
};

type IntentItemInsert = {
  intent_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  product_slug?: string | null;
  brand_name?: string | null;
  variant_label: string;
  unit_price_xof: number;
  quantity: number;
  line_total_xof: number;
};

type IntentAdminClient = {
  from(table: "storefront_order_intents"): {
    insert(values: IntentInsert): {
      select(columns: "id"): {
        single(): Promise<{ data: { id: string } | null; error: { code?: string; message?: string } | null }>;
      };
    };
    select(columns: "id"): {
      eq(column: "channel" | "intent_key" | "cart_fingerprint", value: string): {
        eq(column: "channel" | "intent_key" | "cart_fingerprint", value: string): {
          eq(column: "channel" | "intent_key" | "cart_fingerprint", value: string): {
            maybeSingle(): Promise<{ data: { id: string } | null; error: { code?: string; message?: string } | null }>;
          };
        };
      };
    };
  };
} & {
  from(table: "storefront_order_intent_items"): {
    insert(values: IntentItemInsert[]): Promise<{ error: { code?: string; message?: string } | null }>;
  };
};

function normalizeIntentItems(items: ReconcileCartItemInput[]) {
  const merged = new Map<string, ReconcileCartItemInput>();
  for (const item of items) {
    const existing = merged.get(item.variantId);
    merged.set(item.variantId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.min((existing?.quantity ?? 0) + item.quantity, CART_MAX_QUANTITY),
    });
  }
  return [...merged.values()].sort((a, b) => a.variantId.localeCompare(b.variantId));
}

export function createWhatsAppCartFingerprint(items: ReconcileCartItemInput[]) {
  const normalized = normalizeIntentItems(items);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function publicIntentReference(intentId: string) {
  return `WA-${createHash("sha256").update(intentId).digest("hex").slice(0, 10).toUpperCase()}`;
}

async function reconcileIntentCart(items: ReconcileCartItemInput[]) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const variantIds = [...new Set(items.map((item) => item.variantId))];
  const supabase = (await createSupabaseServerClient()) as unknown as PublicCartClient;

  const [{ data: products, error: productError }, { data: variants, error: variantError }] = await Promise.all([
    supabase.from("public_catalogue_products").select("id, name, slug, brand_name").in("id", productIds),
    supabase
      .from("public_catalogue_variants")
      .select(
        "id, product_id, size_ml, concentration, price_xof, compare_at_price_xof, available_quantity, availability_status",
      )
      .in("id", variantIds),
  ]);

  if (productError || variantError) throw new Error("WHATSAPP_INTENT_VALIDATION_FAILED");

  const publicProductIds = [...new Set((products ?? []).flatMap((product) => (product.id ? [product.id] : [])))];
  const { data: images, error: imageError } =
    publicProductIds.length > 0
      ? await supabase
          .from("public_catalogue_images")
          .select("product_id, object_path, alt_text, is_primary, sort_order")
          .in("product_id", publicProductIds)
      : { data: [], error: null };

  if (imageError) throw new Error("WHATSAPP_INTENT_VALIDATION_FAILED");

  return reconcileCartRows(items, {
    products: products ?? [],
    variants: variants ?? [],
    images: images ?? [],
    imageUrl: getPublicProductImageUrl,
  });
}

async function findExistingIntent(admin: IntentAdminClient, input: IntentInsert) {
  const { data, error } = await admin
    .from("storefront_order_intents")
    .select("id")
    .eq("channel", input.channel)
    .eq("intent_key", input.intent_key)
    .eq("cart_fingerprint", input.cart_fingerprint)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

async function persistIntent(input: WhatsAppOrderIntentRequest, snapshot: ReconciledCart) {
  const admin = createSupabaseAdminClient() as unknown as IntentAdminClient;
  const cartFingerprint = createWhatsAppCartFingerprint(input.items);
  const intent: IntentInsert = {
    channel: "WHATSAPP",
    status: "OPENED",
    intent_key: input.intentKey,
    cart_fingerprint: cartFingerprint,
    subtotal_xof: snapshot.subtotalXof,
    currency: "XOF",
    source_page: input.sourcePage,
    utm_source: input.attribution?.utmSource ?? null,
    utm_medium: input.attribution?.utmMedium ?? null,
    utm_campaign: input.attribution?.utmCampaign ?? null,
    utm_term: input.attribution?.utmTerm ?? null,
    utm_content: input.attribution?.utmContent ?? null,
  };

  const { data, error } = await admin.from("storefront_order_intents").insert(intent).select("id").single();
  let intentId = data?.id ?? null;

  if (error) {
    intentId = await findExistingIntent(admin, intent);
    if (!intentId) throw error;
    return publicIntentReference(intentId);
  }

  if (!intentId) throw new Error("WHATSAPP_INTENT_PERSIST_FAILED");

  const items: IntentItemInsert[] = snapshot.lines.map((line) => ({
    intent_id: intentId,
    product_id: line.productId,
    variant_id: line.variantId,
    product_name: line.productName,
    product_slug: line.productSlug,
    brand_name: line.brandName,
    variant_label: line.variantLabel,
    unit_price_xof: line.unitPriceXof ?? 0,
    quantity: line.adjustedQuantity,
    line_total_xof: (line.unitPriceXof ?? 0) * line.adjustedQuantity,
  }));

  const itemResult = await admin.from("storefront_order_intent_items").insert(items);
  if (itemResult.error) throw itemResult.error;

  return publicIntentReference(intentId);
}

export async function createWhatsAppOrderIntent(input: WhatsAppOrderIntentRequest): Promise<WhatsAppOrderIntentResult> {
  let snapshot: ReconciledCart;

  try {
    snapshot = await reconcileIntentCart(normalizeIntentItems(input.items));
  } catch {
    return { ok: false, code: "WHATSAPP_INTENT_VALIDATION_FAILED" };
  }

  if (snapshot.readiness !== "READY") {
    return { ok: false, code: "WHATSAPP_INTENT_CART_NOT_READY" };
  }

  try {
    const intentReference = await persistIntent(input, snapshot);
    return { ok: true, tracked: true, intentReference, snapshot };
  } catch {
    console.error("WHATSAPP_INTENT_PERSIST_FAILED");
    return { ok: true, tracked: false, intentReference: null, snapshot };
  }
}
