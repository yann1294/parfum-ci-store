import { Badge } from "@/components/ui/badge";
import type { NotificationChannel, NotificationStatus } from "@/lib/notifications/admin";

export function notificationStatusLabel(status: NotificationStatus | string) {
  return {
    PENDING: "En attente",
    PROCESSING: "Traitement",
    SENT: "Envoyée",
    FAILED: "Échec",
    CANCELLED: "Annulée",
  }[status] ?? "Statut notification";
}

export function notificationChannelLabel(channel: NotificationChannel | string) {
  return {
    EMAIL: "E-mail",
    IN_APP: "Interne",
  }[channel] ?? "Canal";
}

export function NotificationStatusBadge({ status }: { status: NotificationStatus | string }) {
  const variant = status === "SENT" ? "default" : status === "FAILED" ? "destructive" : status === "CANCELLED" ? "secondary" : "outline";
  return <Badge variant={variant}>{notificationStatusLabel(status)}</Badge>;
}
