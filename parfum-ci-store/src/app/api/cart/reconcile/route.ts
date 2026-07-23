import { NextResponse } from "next/server";

import { getPublicProductImageUrl } from "@/lib/catalogue/public-images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  reconcileCartRequestSchema,
  reconcileCartRows,
  type CartReconciliationRows,
} from "@/lib/storefront/cart-reconciliation-core";

export const dynamic = "force-dynamic";

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

function safeError() {
  return NextResponse.json(
    {
      error: {
        code: "CART_VALIDATION_FAILED",
        message: "Le panier n'a pas pu être vérifié pour le moment.",
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return safeError();
  }

  const parsed = reconcileCartRequestSchema.safeParse(body);
  if (!parsed.success) return safeError();

  const items = parsed.data.items;
  if (items.length === 0) {
    return NextResponse.json(
      reconcileCartRows([], { products: [], variants: [], images: [], imageUrl: getPublicProductImageUrl }),
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const variantIds = [...new Set(items.map((item) => item.variantId))];

  try {
    const supabase = (await createSupabaseServerClient()) as unknown as PublicCartClient;
    const [{ data: products, error: productError }, { data: variants, error: variantError }] =
      await Promise.all([
        supabase
          .from("public_catalogue_products")
          .select("id, name, slug, brand_name")
          .in("id", productIds),
        supabase
          .from("public_catalogue_variants")
          .select(
            "id, product_id, size_ml, concentration, price_xof, compare_at_price_xof, available_quantity, availability_status",
          )
          .in("id", variantIds),
      ]);

    if (productError || variantError) return safeError();

    const publicProductIds = [...new Set((products ?? []).flatMap((product) => (product.id ? [product.id] : [])))];
    const { data: images, error: imageError } =
      publicProductIds.length > 0
        ? await supabase
            .from("public_catalogue_images")
            .select("product_id, object_path, alt_text, is_primary, sort_order")
            .in("product_id", publicProductIds)
        : { data: [], error: null };

    if (imageError) return safeError();

    return NextResponse.json(
      reconcileCartRows(items, {
        products: products ?? [],
        variants: variants ?? [],
        images: images ?? [],
        imageUrl: getPublicProductImageUrl,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return safeError();
  }
}
