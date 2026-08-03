import Link from "next/link";

import { OrderSourceBadge, OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "@/components/admin/orders/order-status";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatXof } from "@/lib/catalogue/format";
import {
  deliveryMethodLabel,
  normalizeOrderFilters,
  orderSourceLabel,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type AdminOrderListItem,
  type OrderFilters,
  type PaginatedOrders,
} from "@/lib/orders/admin";

function buildQuery(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

function detailHref(orderId: string, searchParams: Record<string, string | undefined>, page: number) {
  return `/admin/commandes/${orderId}?retour=${encodeURIComponent(buildQuery("/admin/commandes", searchParams, page))}`;
}

export function OrderFiltersForm({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const filters = normalizeOrderFilters(searchParams);
  return (
    <form className="grid gap-3 rounded-lg border bg-surface p-4 lg:grid-cols-6" action="/admin/commandes">
      <label className="grid gap-1 text-sm lg:col-span-2">
        Recherche
        <input
          name="q"
          defaultValue={filters.q}
          className="h-10 rounded-lg border border-input bg-background px-3"
          placeholder="Commande, client, téléphone"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Statut
        <select name="status" defaultValue={filters.status} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Tous</option>
          {(["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"] as const).map((status) => (
            <option key={status} value={status}>{orderStatusLabel(status)}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Paiement
        <select name="paymentStatus" defaultValue={filters.paymentStatus} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Tous</option>
          {(["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const).map((status) => (
            <option key={status} value={status}>{paymentStatusLabel(status)}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Mode paiement
        <select name="paymentMethod" defaultValue={filters.paymentMethod} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Tous</option>
          {(["CASH_ON_DELIVERY", "ORANGE_MONEY", "MTN_MOMO", "WAVE", "MOOV_MONEY", "BANK_TRANSFER", "PAY_IN_STORE"] as const).map((method) => (
            <option key={method} value={method}>{paymentMethodLabel(method)}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Livraison
        <select name="deliveryMethod" defaultValue={filters.deliveryMethod} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Toutes</option>
          <option value="HOME_DELIVERY">{deliveryMethodLabel("HOME_DELIVERY")}</option>
          <option value="PICKUP">{deliveryMethodLabel("PICKUP")}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Source
        <select name="source" defaultValue={filters.source} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Toutes</option>
          {(["WEBSITE", "WHATSAPP", "PHONE", "PHYSICAL_STORE", "INSTAGRAM", "FACEBOOK", "TIKTOK", "OTHER"] as const).map((source) => (
            <option key={source} value={source}>{orderSourceLabel(source)}</option>
          ))}
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
      <label className="grid gap-1 text-sm">
        Tri
        <select name="sort" defaultValue={filters.sort} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="created_desc">Plus récentes</option>
          <option value="created_asc">Plus anciennes</option>
          <option value="updated_desc">Dernière mise à jour</option>
          <option value="total_desc">Total décroissant</option>
        </select>
      </label>
      <input type="hidden" name="page" value="1" />
      <div className="flex items-end gap-2 lg:col-span-6">
        <Button type="submit" variant="outline">Filtrer</Button>
        <Link href="/admin/commandes" className={buttonVariants({ variant: "ghost" })}>Réinitialiser</Link>
      </div>
    </form>
  );
}

export function OrderList({
  result,
  searchParams,
}: {
  result: PaginatedOrders<AdminOrderListItem>;
  filters: OrderFilters;
  searchParams: Record<string, string | undefined>;
}) {
  if (result.items.length === 0) {
    return <EmptyState title="Aucune commande" description="Aucune commande ne correspond aux filtres actuels." />;
  }

  return (
    <div className="grid gap-4">
      <div className="hidden min-w-0 rounded-lg border bg-surface xl:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[88rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Commande</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Livraison</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <div className="grid gap-1 text-sm">
                      <span>{order.maskedPhone || "Téléphone masqué"}</span>
                      {order.maskedEmail ? <span className="text-muted-foreground">{order.maskedEmail}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell>{order.city}{order.commune ? ` · ${order.commune}` : ""}</TableCell>
                  <TableCell>{deliveryMethodLabel(order.deliveryMethod)}</TableCell>
                  <TableCell>{formatXof(order.totalXof)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <PaymentMethodBadge method={order.paymentMethod} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </TableCell>
                  <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                  <TableCell><OrderSourceBadge source={order.source} /></TableCell>
                  <TableCell>{order.itemCount}</TableCell>
                  <TableCell className="text-right">
                    <Link href={detailHref(order.id, searchParams, result.page)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Ouvrir
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {result.items.map((order) => (
          <Card key={order.id}>
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                  <p className="text-sm">{order.customerName}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Contact" value={order.maskedPhone || "Masqué"} />
                <Info label="Zone" value={`${order.city}${order.commune ? ` · ${order.commune}` : ""}`} />
                <Info label="Livraison" value={deliveryMethodLabel(order.deliveryMethod)} />
                <Info label="Total" value={formatXof(order.totalXof)} />
                <Info label="Paiement" value={paymentStatusLabel(order.paymentStatus)} />
                <Info label="Articles" value={order.itemCount} />
              </dl>
              <Link href={detailHref(order.id, searchParams, result.page)} className={buttonVariants({ variant: "outline" })}>
                Ouvrir
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {result.page} sur {result.totalPages} · {result.total} commande(s)</span>
        <div className="flex gap-2">
          {result.page > 1 ? <Link href={buildQuery("/admin/commandes", searchParams, result.page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Précédent</Link> : null}
          {result.page < result.totalPages ? <Link href={buildQuery("/admin/commandes", searchParams, result.page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Suivant</Link> : null}
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
