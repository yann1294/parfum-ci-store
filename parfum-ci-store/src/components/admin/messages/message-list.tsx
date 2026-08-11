import Link from "next/link";

import { MessageSourceBadge, MessageStatusBadge } from "@/components/admin/messages/message-status";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  messageSourceLabel,
  messageStatusLabel,
  normalizeMessageFilters,
  type MessageFilters,
  type PaginatedMessages,
} from "@/lib/messages/admin";

function buildQuery(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function detailHref(id: string, searchParams: Record<string, string | undefined>, page: number) {
  return `/admin/messages/${id}?retour=${encodeURIComponent(buildQuery("/admin/messages", searchParams, page))}`;
}

export function MessageFiltersForm({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const filters = normalizeMessageFilters(searchParams);
  return (
    <form className="grid gap-3 rounded-lg border bg-surface p-4 lg:grid-cols-6" action="/admin/messages">
      <label className="grid gap-1 text-sm lg:col-span-2">
        Recherche
        <input name="q" defaultValue={filters.q} className="h-10 rounded-lg border border-input bg-background px-3" placeholder="Nom, sujet, contact, commande" />
      </label>
      <label className="grid gap-1 text-sm">
        Statut
        <select name="status" defaultValue={filters.status} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Tous</option>
          {(["NEW", "OPEN", "RESOLVED", "SPAM"] as const).map((status) => <option key={status} value={status}>{messageStatusLabel(status)}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Source
        <select name="source" defaultValue={filters.source} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Toutes</option>
          {(["WEBSITE", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "TIKTOK", "PHONE", "EMAIL", "OTHER"] as const).map((source) => <option key={source} value={source}>{messageSourceLabel(source)}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Assignation
        <select name="assigned" defaultValue={filters.assigned} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Toutes</option>
          <option value="UNASSIGNED">Non assignées</option>
          <option value="MINE">Mes messages</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Tri
        <select name="sort" defaultValue={filters.sort} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="created_desc">Plus récents</option>
          <option value="created_asc">Plus anciens</option>
          <option value="updated_desc">Dernière activité</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Depuis
        <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="h-10 rounded-lg border border-input bg-background px-3" />
      </label>
      <label className="grid gap-1 text-sm">
        Jusqu&apos;à
        <input type="date" name="dateTo" defaultValue={filters.dateTo} className="h-10 rounded-lg border border-input bg-background px-3" />
      </label>
      <input type="hidden" name="page" value="1" />
      <div className="flex items-end gap-2 lg:col-span-6">
        <Button type="submit" variant="outline">Filtrer</Button>
        <Link href="/admin/messages" className={buttonVariants({ variant: "ghost" })}>Réinitialiser</Link>
      </div>
    </form>
  );
}

export function MessageList({
  result,
  searchParams,
}: {
  result: PaginatedMessages;
  filters: MessageFilters;
  searchParams: Record<string, string | undefined>;
}) {
  if (result.items.length === 0) {
    return <EmptyState title="Aucun message" description="Aucun message ne correspond aux filtres actuels." />;
  }

  return (
    <div className="grid gap-4">
      <div className="hidden min-w-0 rounded-lg border bg-surface xl:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[86rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Contexte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Assigné</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>{new Date(message.createdAt).toLocaleString("fr-FR")}</TableCell>
                  <TableCell><MessageSourceBadge source={message.source} /></TableCell>
                  <TableCell className="font-medium">{message.customerName}</TableCell>
                  <TableCell>{message.maskedContact}</TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <p className="font-medium">{message.subject}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{message.excerpt}</p>
                    </div>
                  </TableCell>
                  <TableCell>{message.orderNumber ?? message.productName ?? "-"}</TableCell>
                  <TableCell><MessageStatusBadge status={message.status} /></TableCell>
                  <TableCell>{message.assignedName ?? "Non assigné"}</TableCell>
                  <TableCell className="text-right">
                    <Link href={detailHref(message.id, searchParams, result.page)} className={buttonVariants({ variant: "outline", size: "sm" })}>Ouvrir</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {result.items.map((message) => (
          <Card key={message.id}>
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{message.subject}</p>
                  <p className="text-sm text-muted-foreground">{new Date(message.createdAt).toLocaleString("fr-FR")}</p>
                </div>
                <MessageStatusBadge status={message.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Source" value={messageSourceLabel(message.source)} />
                <Info label="Client" value={message.customerName} />
                <Info label="Contact" value={message.maskedContact} />
                <Info label="Assigné" value={message.assignedName ?? "Non assigné"} />
              </dl>
              <p className="text-sm text-muted-foreground">{message.excerpt}</p>
              <Link href={detailHref(message.id, searchParams, result.page)} className={buttonVariants({ variant: "outline" })}>Ouvrir</Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {result.page} sur {result.totalPages} · {result.total} message(s)</span>
        <div className="flex gap-2">
          {result.page > 1 ? <Link href={buildQuery("/admin/messages", searchParams, result.page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Précédent</Link> : null}
          {result.page < result.totalPages ? <Link href={buildQuery("/admin/messages", searchParams, result.page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Suivant</Link> : null}
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
