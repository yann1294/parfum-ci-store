import Link from "next/link";

import { InventoryFiltersForm, InventoryList } from "@/components/admin/inventory/inventory-list";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { listLowStockVariants, normalizeInventoryFilters, requireInventoryAccess } from "@/lib/inventory/admin";

export default async function LowStockInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  await requireInventoryAccess();
  const result = await listLowStockVariants(params);
  const filters = normalizeInventoryFilters({
    ...params,
    initialized: "INITIALIZED",
    status: params.status ?? "LOW_OR_OUT",
  });

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Inventaire"
        title="Stock faible"
        description="Variantes initialisées dont le disponible est faible ou nul. Le stock non configuré reste séparé."
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/inventaire" className={buttonVariants({ variant: "outline" })}>
          Tout l&apos;inventaire
        </Link>
        <Link href="/admin/inventaire/export" className={buttonVariants({ variant: "outline" })}>
          Export CSV inventaire
        </Link>
      </div>
      <div className="mt-8 grid gap-6">
        <InventoryFiltersForm searchParams={params} basePath="/admin/inventaire/stock-faible" lowStockMode />
        <InventoryList
          result={result}
          filters={filters}
          searchParams={params}
          basePath="/admin/inventaire/stock-faible"
        />
      </div>
    </PageContainer>
  );
}
