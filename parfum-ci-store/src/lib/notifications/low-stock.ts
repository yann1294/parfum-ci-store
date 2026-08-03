import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function adminRecipient() {
  const { data } = await createSupabaseAdminClient()
    .from("store_settings")
    .select("notification_email, contact_email")
    .eq("id", true)
    .single();
  return process.env.ADMIN_NOTIFICATION_EMAIL || data?.notification_email || data?.contact_email || null;
}

export async function evaluateLowStockForVariants(variantIds: string[]) {
  const ids = [...new Set(variantIds)].filter(Boolean);
  if (ids.length === 0) return;
  const recipient = await adminRecipient();
  if (!recipient) return;

  const supabase = createSupabaseAdminClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, stock_on_hand, reserved_quantity, low_stock_threshold, inventory_initialized_at, active, products(name, status)")
    .in("id", ids);

  for (const variant of variants ?? []) {
    const initialized = Boolean(variant.inventory_initialized_at);
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    const eligible = initialized && variant.active && product?.status === "ACTIVE";
    const available = variant.stock_on_hand - variant.reserved_quantity;
    const below = eligible && available <= variant.low_stock_threshold;

    const { data: state } = await (supabase as never as {
      from(table: string): {
        select(columns: string): {
          eq(column: string, value: unknown): {
            maybeSingle(): Promise<{ data: { below_threshold: boolean; cycle: number } | null }>;
          };
        };
      };
    }).from("low_stock_alert_states").select("below_threshold, cycle").eq("variant_id", variant.id).maybeSingle();

    if (!below) {
      await (supabase as never as {
        from(table: string): {
          upsert(values: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
        };
      }).from("low_stock_alert_states").upsert({
        variant_id: variant.id,
        below_threshold: false,
        recovered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "variant_id" });
      continue;
    }

    if (state?.below_threshold) continue;
    const cycle = (state?.cycle ?? 0) + 1;
    const idempotencyKey = `low_stock:${variant.id}:${cycle}`;
    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        channel: "EMAIL",
        status: "PENDING",
        recipient,
        subject: `Stock faible - ${product?.name ?? "Variante"}`,
        template_key: "low_stock",
        payload: { variant_id: variant.id, available_quantity: available, threshold: variant.low_stock_threshold },
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    await (supabase as never as {
      from(table: string): {
        upsert(values: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
      };
    }).from("low_stock_alert_states").upsert({
      variant_id: variant.id,
      below_threshold: true,
      cycle,
      last_notification_id: notification?.id ?? null,
      last_crossed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "variant_id" });
  }
}

export async function evaluateLowStockForOrder(orderId: string) {
  const { data } = await createSupabaseAdminClient()
    .from("order_items")
    .select("variant_id")
    .eq("order_id", orderId);
  await evaluateLowStockForVariants((data ?? []).map((item) => item.variant_id).filter((id): id is string => Boolean(id)));
}
