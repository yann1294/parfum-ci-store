import { NotificationFiltersForm, NotificationList } from "@/components/admin/notifications/notification-list";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { listNotifications, normalizeNotificationFilters, requireNotificationReadAccess } from "@/lib/notifications/admin";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  await requireNotificationReadAccess();
  const filters = normalizeNotificationFilters(params);
  const result = await listNotifications(params);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Opérations"
        title="Notifications"
        description="Suivez les envois transactionnels, les tentatives et les erreurs fournisseur sans exposer les données sensibles."
      />
      <div className="mt-8 grid gap-6">
        <NotificationFiltersForm searchParams={params} />
        <NotificationList result={result} filters={filters} searchParams={params} />
      </div>
    </PageContainer>
  );
}
