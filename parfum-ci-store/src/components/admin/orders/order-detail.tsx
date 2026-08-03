import Link from "next/link";

import { InternalNoteDialog, OrderTransitionDialog, PaymentStatusDialog } from "@/components/admin/orders/order-action-dialogs";
import { OrderSourceBadge, OrderStatusBadge, PaymentMethodBadge, PaymentStatusBadge } from "@/components/admin/orders/order-status";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatXof } from "@/lib/catalogue/format";
import {
  deliveryMethodLabel,
  getAllowedOrderTransitions,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type AdminOrderDetail,
} from "@/lib/orders/admin";

function telHref(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

function whatsappHref(value: string | null, orderNumber: string) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const message = encodeURIComponent(`Bonjour, je vous contacte au sujet de la commande ${orderNumber}.`);
  return `https://wa.me/${digits}?text=${message}`;
}

export function OrderDetail({
  order,
  canManage,
  returnPath,
}: {
  order: AdminOrderDetail;
  canManage: boolean;
  returnPath: string;
}) {
  const nextStatuses = canManage ? getAllowedOrderTransitions(order.status, order.deliveryMethod) : [];
  const reservedQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const tel = telHref(order.customerPhone);
  const whatsapp = whatsappHref(order.customerWhatsapp ?? order.customerPhone, order.orderNumber);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={returnPath} className={buttonVariants({ variant: "outline" })}>
          Retour aux commandes
        </Link>
        <div className="flex flex-wrap gap-2">
          {canManage ? nextStatuses.map((status) => (
            <OrderTransitionDialog
              key={status}
              orderId={order.id}
              currentStatus={order.status}
              targetStatus={status}
              itemCount={order.items.length}
              reservedQuantity={reservedQuantity}
            />
          )) : null}
          {canManage && order.paymentStatus !== "PAID" ? (
            <PaymentStatusDialog orderId={order.id} paymentMethod={order.paymentMethod} />
          ) : null}
          <InternalNoteDialog orderId={order.id} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{order.orderNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">Créée le {new Date(order.createdAt).toLocaleString("fr-FR")}</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <PaymentMethodBadge method={order.paymentMethod} />
            <OrderSourceBadge source={order.source} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Livraison" value={deliveryMethodLabel(order.deliveryMethod)} />
            <Info label="Paiement" value={paymentMethodLabel(order.paymentMethod)} />
            <Info label="Statut paiement" value={paymentStatusLabel(order.paymentStatus)} />
            <Info label="Source" value={order.source} />
            <Info label="Sous-total" value={formatXof(order.subtotalXof)} />
            <Info label="Frais de livraison" value={order.deliveryFeeXof === 0 ? "À confirmer" : formatXof(order.deliveryFeeXof)} />
            <Info label="Remise" value={formatXof(order.discountXof)} />
            <Info label="Total" value={order.deliveryFeeXof === 0 ? "À confirmer" : formatXof(order.totalXof)} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Snapshot client</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid gap-3 text-sm">
              <Info label="Nom complet" value={order.customerName} />
              <Info label="Téléphone" value={tel ? <a className="underline-offset-4 hover:underline" href={tel}>{order.customerPhone}</a> : order.customerPhone ?? "Non renseigné"} />
              <Info label="WhatsApp" value={whatsapp ? <a className="underline-offset-4 hover:underline" href={whatsapp} target="_blank" rel="noreferrer">Contacter sur WhatsApp</a> : "Non renseigné"} />
              <Info label="E-mail" value={order.customerEmail ?? "Non renseigné"} />
              <Info label="Ville" value={order.city} />
              <Info label="Commune ou quartier" value={order.commune ?? "Non renseigné"} />
              <Info label="Adresse" value={order.deliveryAddress} />
              <Info label="Point de repère" value={order.deliveryLandmark ?? "Non renseigné"} />
              <Info label="Instructions" value={order.deliveryInstructions ?? "Aucune"} />
              <Info label="Note client" value={order.customerNote ?? "Aucune"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes internes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {order.notes.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aucune note interne.</p>
            ) : order.notes.map((note) => (
              <div key={note.id} className="rounded-lg border p-3 text-sm">
                <p>{note.note}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.actorName ?? "Personnel"} · {new Date(note.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden min-w-0 overflow-x-auto md:block">
            <Table className="min-w-[58rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Total ligne</TableHead>
                  <TableHead>Inventaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.brandName ?? "Sans marque"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-48 break-all">{item.sku ?? "Non renseigné"}</TableCell>
                    <TableCell>{item.sizeMl ? `${item.sizeMl} ml` : item.variantName ?? "Variante"} · {item.concentration ?? "Non renseignée"}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatXof(item.unitPriceXof)}</TableCell>
                    <TableCell>{formatXof(item.totalPriceXof)}</TableCell>
                    <TableCell>
                      {item.variantId ? (
                        <Link href={`/admin/inventaire/${item.variantId}`} className="text-sm underline-offset-4 hover:underline">
                          Voir le stock
                        </Link>
                      ) : "Variante supprimée"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <p className="font-medium">{item.productName}</p>
                <p className="break-all text-sm text-muted-foreground">{item.sku ?? "SKU non renseigné"}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Variante" value={`${item.sizeMl ?? "-"} ml · ${item.concentration ?? "Non renseignée"}`} />
                  <Info label="Quantité" value={item.quantity} />
                  <Info label="Prix" value={formatXof(item.unitPriceXof)} />
                  <Info label="Total" value={formatXof(item.totalPriceXof)} />
                </dl>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <TimelineCard title="Timeline commande">
          {order.history.map((entry) => (
            <TimelineEntry
              key={entry.id}
              label={orderStatusLabel(entry.toStatus)}
              detail={`${entry.fromStatus ? `${orderStatusLabel(entry.fromStatus)} → ` : ""}${orderStatusLabel(entry.toStatus)}`}
              meta={`${entry.actorName ?? "Système"} · ${new Date(entry.createdAt).toLocaleString("fr-FR")}`}
              note={entry.note}
            />
          ))}
        </TimelineCard>
        <TimelineCard title="Historique paiement">
          {order.payments.length === 0 ? <EmptyLine text="Aucun paiement enregistré." /> : order.payments.map((entry) => (
            <TimelineEntry
              key={entry.id}
              label={paymentStatusLabel(entry.status)}
              detail={`${paymentMethodLabel(entry.method)} · ${formatXof(entry.amountXof)}`}
              meta={`${entry.verifiedByName ?? "Système"} · ${new Date(entry.createdAt).toLocaleString("fr-FR")}`}
              note={entry.providerReference ? `Référence: ${entry.providerReference}` : null}
            />
          ))}
        </TimelineCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <TimelineCard title="Cycle inventaire">
          {order.inventoryLifecycle.length === 0 ? <EmptyLine text="Aucun mouvement stock lié." /> : order.inventoryLifecycle.map((entry) => (
            <TimelineEntry
              key={entry.id}
              label={entry.type}
              detail={`Delta ${entry.quantityDelta} · stock ${entry.stockBefore} → ${entry.stockAfter} · réservé ${entry.reservedBefore} → ${entry.reservedAfter}`}
              meta={`${entry.actorName ?? "Système"} · ${new Date(entry.createdAt).toLocaleString("fr-FR")}`}
              note={entry.reason}
            />
          ))}
        </TimelineCard>
        <TimelineCard title="Notifications">
          {order.notifications.length === 0 ? <EmptyLine text="Aucune notification." /> : order.notifications.map((entry) => (
            <TimelineEntry
              key={entry.id}
              label={`${entry.channel} · ${entry.status}`}
              detail={entry.templateKey ?? entry.subject ?? "Notification"}
              meta={new Date(entry.createdAt).toLocaleString("fr-FR")}
              note={entry.processedAt ? `Traitée le ${new Date(entry.processedAt).toLocaleString("fr-FR")}` : null}
            />
          ))}
        </TimelineCard>
        <TimelineCard title="Audit">
          {order.audits.length === 0 ? <EmptyLine text="Aucun audit visible." /> : order.audits.map((entry) => (
            <TimelineEntry
              key={entry.id}
              label={entry.action}
              detail="Résumé audit borné"
              meta={new Date(entry.createdAt).toLocaleString("fr-FR")}
            />
          ))}
        </TimelineCard>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function TimelineCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function TimelineEntry({ label, detail, meta, note }: { label: string; detail: string; meta: string; note?: string | null }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{detail}</p>
      {note ? <p className="mt-2">{note}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</p>;
}
