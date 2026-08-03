import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderDetail } from "@/components/admin/orders/order-detail";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { canManageOrders } from "@/lib/auth/permissions";
import { getAdminOrderDetail, requireOrderReadAccess } from "@/lib/orders/admin";

function safeReturnPath(value: string | undefined) {
  if (!value) return "/admin/commandes";
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/admin/commandes") && !decoded.startsWith("//") ? decoded : "/admin/commandes";
  } catch {
    return "/admin/commandes";
  }
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const staff = await requireOrderReadAccess();
  const order = await getAdminOrderDetail(id);

  if (!order) notFound();

  const returnPath = safeReturnPath(query.retour);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Commandes"
        title={order.orderNumber}
        description="Détail opérationnel de la commande, avec snapshots, paiement, timeline et cycle stock."
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={returnPath} className={buttonVariants({ variant: "outline" })}>
          Retour
        </Link>
      </div>
      <div className="mt-8">
        <OrderDetail order={order} returnPath={returnPath} canManage={canManageOrders(staff)} />
      </div>
    </PageContainer>
  );
}
