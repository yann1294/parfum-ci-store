import Link from "next/link";

import {
  CancelNotificationDialog,
  RetryNotificationButton,
} from "@/components/admin/notifications/notification-actions";
import {
  notificationChannelLabel,
  NotificationStatusBadge,
} from "@/components/admin/notifications/notification-status";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  normalizeNotificationFilters,
  type NotificationFilters,
  type PaginatedNotifications,
} from "@/lib/notifications/admin";

function buildQuery(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function NotificationFiltersForm({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = normalizeNotificationFilters(searchParams);
  return (
    <form
      className="grid gap-3 rounded-lg border bg-surface p-4 lg:grid-cols-6"
      action="/admin/notifications"
    >
      <label className="grid gap-1 text-sm lg:col-span-2">
        Recherche
        <input
          name="q"
          defaultValue={filters.q}
          className="h-10 rounded-lg border border-input bg-background px-3"
          placeholder="Destinataire, sujet, modele"
        />
      </label>
      <Select
        name="status"
        label="Statut"
        value={filters.status}
        options={[
        ["ALL", "Tous"],
        ["PENDING", "En attente"],
        ["PROCESSING", "Traitement"],
        ["SENT", "Envoyee"],
        ["FAILED", "Echec"],
        ["CANCELLED", "Annulee"],
        ]}
      />
      <Select
        name="channel"
        label="Canal"
        value={filters.channel}
        options={[
          ["ALL", "Tous"],
          ["EMAIL", "E-mail"],
          ["IN_APP", "Interne"],
        ]}
      />
      <label className="grid gap-1 text-sm">
        Modele
        <input
          name="template"
          defaultValue={filters.template}
          className="h-10 rounded-lg border border-input bg-background px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Fournisseur
        <input
          name="provider"
          defaultValue={filters.provider}
          className="h-10 rounded-lg border border-input bg-background px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Depuis
        <input
          type="date"
          name="dateFrom"
          defaultValue={filters.dateFrom}
          className="h-10 rounded-lg border border-input bg-background px-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Jusqu&apos;à
        <input
          type="date"
          name="dateTo"
          defaultValue={filters.dateTo}
          className="h-10 rounded-lg border border-input bg-background px-3"
        />
      </label>
      <Select
        name="sort"
        label="Tri"
        value={filters.sort}
        options={[
          ["created_desc", "Plus recentes"],
          ["created_asc", "Plus anciennes"],
          ["next_attempt_asc", "Prochaine tentative"],
        ]}
      />
      <input type="hidden" name="page" value="1" />
      <div className="flex items-end gap-2 lg:col-span-6">
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        <Link href="/admin/notifications" className={buttonVariants({ variant: "ghost" })}>
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="h-10 rounded-lg border border-input bg-background px-3"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function canRetry(status: string) {
  return status === "FAILED";
}

function canCancel(status: string) {
  return status === "PENDING" || status === "FAILED";
}

export function NotificationList({
  result,
  searchParams,
}: {
  result: PaginatedNotifications;
  filters: NotificationFilters;
  searchParams: Record<string, string | undefined>;
}) {
  if (result.items.length === 0) {
    return (
      <EmptyState
        title="Aucune notification"
        description="Aucune notification ne correspond aux filtres actuels."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="hidden min-w-0 rounded-lg border bg-surface xl:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[86rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Modele</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Tentatives</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Erreur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.createdAt).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="font-medium">
                    {entry.templateKey ?? "Notification"}
                  </TableCell>
                  <TableCell>{notificationChannelLabel(entry.channel)}</TableCell>
                  <TableCell>{entry.maskedRecipient}</TableCell>
                  <TableCell>{entry.relatedOrderNumber ?? "-"}</TableCell>
                  <TableCell>
                    <NotificationStatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell>
                    {entry.attemptCount}/{entry.maxAttempts}
                  </TableCell>
                  <TableCell>{entry.provider ?? "-"}</TableCell>
                  <TableCell>{entry.lastErrorCode ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/notifications/${entry.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Ouvrir
                      </Link>
                      <RetryNotificationButton
                        notificationId={entry.id}
                        disabled={!canRetry(entry.status)}
                      />
                      <CancelNotificationDialog
                        notificationId={entry.id}
                        disabled={!canCancel(entry.status)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {result.items.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-medium">{entry.templateKey ?? "Notification"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <NotificationStatusBadge status={entry.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Canal" value={notificationChannelLabel(entry.channel)} />
                <Info label="Destinataire" value={entry.maskedRecipient} />
                <Info label="Commande" value={entry.relatedOrderNumber ?? "-"} />
                <Info label="Tentatives" value={`${entry.attemptCount}/${entry.maxAttempts}`} />
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/notifications/${entry.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Ouvrir
                </Link>
                <RetryNotificationButton
                  notificationId={entry.id}
                  disabled={!canRetry(entry.status)}
                />
                <CancelNotificationDialog
                  notificationId={entry.id}
                  disabled={!canCancel(entry.status)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} sur {result.totalPages} · {result.total} notification(s)
        </span>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              href={buildQuery("/admin/notifications", searchParams, result.page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Précédent
            </Link>
          ) : null}
          {result.page < result.totalPages ? (
            <Link
              href={buildQuery("/admin/notifications", searchParams, result.page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Suivant
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
