import {
  inventoryRowsToCsv,
  listInventoryVariants,
  requireInventoryAccess,
} from "@/lib/inventory/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireInventoryAccess();
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const result = await listInventoryVariants({ ...params, page: "1" });
  const csv = inventoryRowsToCsv(result.items);

  return new Response(`\uFEFF${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventaire-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
