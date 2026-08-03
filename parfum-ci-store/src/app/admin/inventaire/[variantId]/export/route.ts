import { notFound } from "next/navigation";

import {
  getInventoryVariant,
  ledgerRowsToCsv,
  listInventoryLedger,
  requireInventoryAccess,
} from "@/lib/inventory/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ variantId: string }> },
) {
  const [{ variantId }] = await Promise.all([context.params, requireInventoryAccess()]);
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const [variant, ledger] = await Promise.all([
    getInventoryVariant(variantId),
    listInventoryLedger(variantId, { ...params, page: "1" }),
  ]);

  if (!variant) notFound();

  const csv = ledgerRowsToCsv(variant, ledger.items);
  return new Response(`\uFEFF${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-${variant.sku.replace(/[^A-Za-z0-9_-]+/g, "-")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
