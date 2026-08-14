import { Dashboard, DashboardRangeSelector } from "@/components/admin/dashboard/dashboard";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { normalizeDashboardRange } from "@/lib/analytics/date-range";
import { getDashboardData } from "@/lib/analytics/service";
import { requireActiveStaff } from "@/lib/auth/server";
import { connection } from "next/server";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const range = normalizeDashboardRange(params.range);
  const staff = await requireActiveStaff({ mode: "redirect", returnPath: `/admin?range=${range}` });
  const data = await getDashboardData({ staff, range });

  return (
    <PageContainer>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="Vue opérationnelle"
          title="Tableau de bord"
          description={`Indicateurs autorisés pour votre rôle. Journées calculées dans le fuseau ${data.timezone}.`}
        />
        <DashboardRangeSelector range={data.range} />
      </div>
      <Dashboard data={data} />
      <p className="mt-6 text-xs text-muted-foreground">
        Données générées le{" "}
        {new Intl.DateTimeFormat("fr-FR", {
          timeZone: data.timezone,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(data.generatedAt))}
        . Le chiffre d’affaires est brut et fondé sur le premier paiement confirmé de chaque
        commande.
      </p>
    </PageContainer>
  );
}
