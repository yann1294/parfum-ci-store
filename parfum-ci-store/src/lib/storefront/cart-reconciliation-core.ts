import { z } from "zod";

import { CART_MAX_ITEMS, CART_MAX_QUANTITY } from "@/lib/storefront/cart-constants";

export const reconcileCartItemSchema = z
  .object({
    productId: z.uuid(),
    variantId: z.uuid(),
    quantity: z.number().int().min(1).max(CART_MAX_QUANTITY),
  })
  .strict();

export const reconcileCartRequestSchema = z
  .object({
    items: z.array(reconcileCartItemSchema).max(CART_MAX_ITEMS),
  })
  .strict();

export type ReconcileCartItemInput = z.infer<typeof reconcileCartItemSchema>;

export type CartItemAvailability =
  | "AVAILABLE"
  | "LOW_STOCK"
  | "STOCK_NOT_CONFIGURED"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE";

export type CartItemNoticeCode =
  | "CART_ITEM_UNAVAILABLE"
  | "CART_QUANTITY_REDUCED"
  | "CART_PRICE_UPDATED";

export type ReconciledCartLine = {
  productId: string;
  productSlug: string | null;
  productName: string;
  brandName: string | null;
  variantId: string;
  variantLabel: string;
  sizeMl: number | null;
  concentration: string | null;
  imageUrl: string | null;
  imageAlt: string;
  unitPriceXof: number | null;
  compareAtPriceXof: number | null;
  availability: CartItemAvailability;
  orderable: boolean;
  unavailableReason: string | null;
  requestedQuantity: number;
  adjustedQuantity: number;
  maxQuantity: number;
  notices: CartItemNoticeCode[];
};

export type ReconciledCart = {
  lines: ReconciledCartLine[];
  subtotalXof: number;
  readiness:
    | "READY"
    | "EMPTY"
    | "VALIDATING"
    | "HAS_UNAVAILABLE_ITEMS"
    | "HAS_QUANTITY_ADJUSTMENTS"
    | "VALIDATION_FAILED";
  validatedAt: string;
};

type ProductRow = {
  id: string | null;
  name: string | null;
  slug: string | null;
  brand_name: string | null;
};

type VariantRow = {
  id: string | null;
  product_id: string | null;
  size_ml: number | null;
  concentration: string | null;
  price_xof: number | null;
  compare_at_price_xof: number | null;
  available_quantity: number | null;
  availability_status: string | null;
};

type ImageRow = {
  product_id: string | null;
  object_path: string | null;
  alt_text: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
};

export type CartReconciliationRows = {
  products: ProductRow[];
  variants: VariantRow[];
  images: ImageRow[];
  imageUrl: (objectPath: string) => string;
  validatedAt?: string;
};

function mergeRequestedItems(items: ReconcileCartItemInput[]) {
  const merged = new Map<string, ReconcileCartItemInput>();
  for (const item of items) {
    const existing = merged.get(item.variantId);
    merged.set(item.variantId, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.min((existing?.quantity ?? 0) + item.quantity, CART_MAX_QUANTITY),
    });
  }
  return [...merged.values()];
}

function availabilityFromStatus(status: string | null, availableQuantity: number) {
  if (status === "UNCONFIGURED") return "STOCK_NOT_CONFIGURED";
  if (status === "OUT_OF_STOCK" || availableQuantity <= 0) return "OUT_OF_STOCK";
  if (status === "LOW_STOCK") return "LOW_STOCK";
  return "AVAILABLE";
}

export function reconcileCartRows(
  requestedItems: ReconcileCartItemInput[],
  rows: CartReconciliationRows,
): ReconciledCart {
  const products = new Map(rows.products.flatMap((product) => (product.id ? [[product.id, product]] : [])));
  const variants = new Map(rows.variants.flatMap((variant) => (variant.id ? [[variant.id, variant]] : [])));
  const imagesByProduct = new Map<string, ImageRow[]>();

  for (const image of rows.images) {
    if (!image.product_id || !image.object_path) continue;
    imagesByProduct.set(image.product_id, [...(imagesByProduct.get(image.product_id) ?? []), image]);
  }

  const lines = mergeRequestedItems(requestedItems).map((item): ReconciledCartLine => {
    const product = products.get(item.productId);
    const variant = variants.get(item.variantId);
    const validPublicMatch = Boolean(product?.id && variant?.id && variant.product_id === product.id);

    if (!validPublicMatch || !product || !variant) {
      return {
        productId: item.productId,
        productSlug: null,
        productName: "Article indisponible",
        brandName: null,
        variantId: item.variantId,
        variantLabel: "Variante indisponible",
        sizeMl: null,
        concentration: null,
        imageUrl: null,
        imageAlt: "Article indisponible",
        unitPriceXof: null,
        compareAtPriceXof: null,
        availability: "UNAVAILABLE",
        orderable: false,
        unavailableReason: "Indisponible",
        requestedQuantity: item.quantity,
        adjustedQuantity: item.quantity,
        maxQuantity: 0,
        notices: ["CART_ITEM_UNAVAILABLE"],
      };
    }

    const productId = product.id as string;
    const variantId = variant.id as string;
    const availableQuantity = Math.max(variant.available_quantity ?? 0, 0);
    const availability = availabilityFromStatus(variant.availability_status, availableQuantity);
    const maxQuantity =
      availability === "AVAILABLE" || availability === "LOW_STOCK"
        ? Math.min(availableQuantity, CART_MAX_QUANTITY)
        : 0;
    const adjustedQuantity = maxQuantity > 0 ? Math.min(item.quantity, maxQuantity) : item.quantity;
    const notices: CartItemNoticeCode[] = [];
    if (maxQuantity === 0) notices.push("CART_ITEM_UNAVAILABLE");
    if (maxQuantity > 0 && adjustedQuantity < item.quantity) notices.push("CART_QUANTITY_REDUCED");

    const image = (imagesByProduct.get(productId) ?? []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
    )[0];
    const sizeLabel = variant.size_ml ? `${variant.size_ml} ml` : "Taille non renseignée";
    const concentrationLabel = variant.concentration ?? "Parfum";

    return {
      productId,
      productSlug: product.slug,
      productName: product.name ?? "Article",
      brandName: product.brand_name,
      variantId,
      variantLabel: `${sizeLabel} · ${concentrationLabel}`,
      sizeMl: variant.size_ml,
      concentration: variant.concentration,
      imageUrl: image?.object_path ? rows.imageUrl(image.object_path) : null,
      imageAlt: image?.alt_text ?? product.name ?? "Article",
      unitPriceXof: variant.price_xof,
      compareAtPriceXof:
        variant.compare_at_price_xof && variant.price_xof && variant.compare_at_price_xof > variant.price_xof
          ? variant.compare_at_price_xof
          : null,
      availability,
      orderable: maxQuantity > 0 && Boolean(variant.price_xof && variant.price_xof > 0),
      unavailableReason:
        availability === "STOCK_NOT_CONFIGURED"
          ? "Stock non configuré"
          : availability === "OUT_OF_STOCK"
            ? "Rupture de stock"
            : null,
      requestedQuantity: item.quantity,
      adjustedQuantity,
      maxQuantity,
      notices,
    };
  });

  const subtotalXof = lines.reduce(
    (sum, line) => sum + (line.orderable && line.unitPriceXof ? line.unitPriceXof * line.adjustedQuantity : 0),
    0,
  );
  const hasUnavailable = lines.some((line) => !line.orderable);
  const hasAdjustments = lines.some((line) => line.adjustedQuantity !== line.requestedQuantity);

  return {
    lines,
    subtotalXof,
    readiness:
      lines.length === 0
        ? "EMPTY"
        : hasUnavailable
          ? "HAS_UNAVAILABLE_ITEMS"
          : hasAdjustments
            ? "HAS_QUANTITY_ADJUSTMENTS"
            : "READY",
    validatedAt: rows.validatedAt ?? new Date().toISOString(),
  };
}
