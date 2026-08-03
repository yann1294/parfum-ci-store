import { notFound } from "next/navigation";
import Link from "next/link";

import { InventoryDetail } from "@/components/admin/inventory/inventory-detail";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { getInventoryVariant, listInventoryLedger, requireInventoryAccess } from "@/lib/inventory/admin";

function safeReturnPath(value: string | undefined) {
  if (!value) return "/admin/inventaire";
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/admin/inventaire") && !decoded.startsWith("//") ? decoded : "/admin/inventaire";
  } catch {
    return "/admin/inventaire";
  }
}

export default async function InventoryVariantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ variantId }, query] = await Promise.all([params, searchParams]);
  await requireInventoryAccess();
  const [variant, ledger] = await Promise.all([
    getInventoryVariant(variantId),
    listInventoryLedger(variantId, query),
  ]);

  if (!variant) notFound();

  const returnPath = safeReturnPath(query.retour);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Inventaire"
        title="Détail variante"
        description="Consultez l'état actuel et le ledger immutable de la variante."
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={returnPath} className={buttonVariants({ variant: "outline" })}>
          Retour
        </Link>
        <Link href={`/admin/inventaire/${variant.variantId}/export`} className={buttonVariants({ variant: "outline" })}>
          Export CSV ledger
        </Link>
      </div>
      <div className="mt-8">
        <InventoryDetail variant={variant} ledger={ledger} returnPath={returnPath} />
      </div>
    </PageContainer>
  );
}
