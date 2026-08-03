import Link from "next/link";

import { InventoryFiltersForm, InventoryList } from "@/components/admin/inventory/inventory-list";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { listInventoryVariants, normalizeInventoryFilters, requireInventoryAccess } from "@/lib/inventory/admin";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  await requireInventoryAccess();
  const filters = normalizeInventoryFilters(params);
  const result = await listInventoryVariants(params);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Opérations"
        title="Inventaire"
        description="Consultez les stocks physiques, réservés et disponibles. Les corrections passent par un ledger transactionnel."
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/inventaire/stock-faible" className={buttonVariants({ variant: "outline" })}>
          Stock faible
        </Link>
        <Link href="/admin/inventaire/export" className={buttonVariants({ variant: "outline" })}>
          Export CSV inventaire
        </Link>
      </div>
      <div className="mt-8 grid gap-6">
        <InventoryFiltersForm searchParams={params} />
        <InventoryList result={result} filters={filters} searchParams={params} />
      </div>
    </PageContainer>
  );
}
