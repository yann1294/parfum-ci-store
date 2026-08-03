import { OrderFiltersForm, OrderList } from "@/components/admin/orders/order-list";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { listAdminOrders, normalizeOrderFilters, requireOrderReadAccess } from "@/lib/orders/admin";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  await requireOrderReadAccess();
  const filters = normalizeOrderFilters(params);
  const result = await listAdminOrders(params);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Opérations"
        title="Commandes"
        description="Suivez les commandes, paiements et étapes de préparation. Les transitions stock passent par le moteur transactionnel."
      />
      <div className="mt-8 grid gap-6">
        <OrderFiltersForm searchParams={params} />
        <OrderList result={result} filters={filters} searchParams={params} />
      </div>
    </PageContainer>
  );
}
