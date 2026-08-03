import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelNotificationDialog, RetryNotificationButton } from "@/components/admin/notifications/notification-actions";
import { notificationChannelLabel, NotificationStatusBadge } from "@/components/admin/notifications/notification-status";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNotificationDetail, requireNotificationReadAccess } from "@/lib/notifications/admin";

export default async function AdminNotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireNotificationReadAccess();
  const { id } = await params;
  const notification = await getNotificationDetail(id);
  if (!notification) notFound();

  return (
    <PageContainer>
      <div className="mb-6">
        <Link href="/admin/notifications" className={buttonVariants({ variant: "ghost", size: "sm" })}>Retour aux notifications</Link>
      </div>
      <SectionHeading
        eyebrow={notificationChannelLabel(notification.channel)}
        title={notification.templateKey ?? "Notification"}
        description="Detail de livraison avec donnees sensibles reduites."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Identite</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label="Statut" value={<NotificationStatusBadge status={notification.status} />} />
            <Info label="Destinataire" value={notification.maskedRecipient} />
            <Info label="Sujet" value={notification.subject ?? "-"} />
            <Info label="Commande" value={notification.relatedOrderNumber ?? "-"} />
            <Info label="Fournisseur" value={notification.provider ?? "-"} />
            <Info label="ID fournisseur" value={notification.providerMessageId ?? "-"} />
            <Info label="Tentatives" value={`${notification.attemptCount}/${notification.maxAttempts}`} />
            <Info label="Prochaine tentative" value={notification.nextAttemptAt ? new Date(notification.nextAttemptAt).toLocaleString("fr-FR") : "-"} />
            <Info label="Envoyee le" value={notification.processedAt ? new Date(notification.processedAt).toLocaleString("fr-FR") : "-"} />
            <Info label="Erreur" value={notification.lastErrorCode ?? "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <RetryNotificationButton notificationId={notification.id} disabled={!["PENDING", "FAILED"].includes(notification.status)} />
            <CancelNotificationDialog notificationId={notification.id} disabled={!["PENDING", "FAILED"].includes(notification.status)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé payload</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {Object.entries(notification.payloadSummary).filter(([, value]) => value !== undefined).map(([key, value]) => (
              <Info key={key} label={key} value={String(value)} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique des tentatives</CardTitle>
          </CardHeader>
          <CardContent>
            {notification.attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tentative.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[42rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Erreur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notification.attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>{new Date(attempt.createdAt).toLocaleString("fr-FR")}</TableCell>
                        <TableCell>{attempt.provider}</TableCell>
                        <TableCell><NotificationStatusBadge status={attempt.status} /></TableCell>
                        <TableCell>{attempt.errorCode ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}
