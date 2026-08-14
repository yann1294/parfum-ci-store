import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dashboardPercentage,
  formatBucketDate,
  formatDashboardDate,
  messageSourceLabel,
  messageStatusLabel,
} from "@/lib/analytics/display";
import type {
  DashboardData,
  PaymentDistributionItem,
  SalesTrendPoint,
  SourceDistributionItem,
} from "@/lib/analytics/service";
import { formatXof } from "@/lib/catalogue/format";
import {
  orderSourceLabel,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/orders/admin";

const rangeLabels = { "7d": "7 jours", "30d": "30 jours", "90d": "90 jours" } as const;

type SummaryCard = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
};

function summaryCards(data: DashboardData): SummaryCard[] {
  const cards: SummaryCard[] = [];
  if (data.permissions.orders) {
    cards.push(
      {
        label: "Commandes créées aujourd’hui",
        value: data.summary.ordersToday ?? 0,
        detail: "Volume, tous statuts confondus",
        href: "/admin/commandes",
      },
      {
        label: "À confirmer",
        value: data.summary.pendingConfirmation ?? 0,
        detail: "Commandes en attente",
        href: "/admin/commandes?status=PENDING_CONFIRMATION",
      },
      {
        label: "En préparation",
        value: data.summary.preparingOrders ?? 0,
        detail: "Statut PREPARING uniquement",
        href: "/admin/commandes?status=PREPARING",
      },
    );
  }
  if (data.permissions.financials) {
    cards.push(
      {
        label: "Chiffre d’affaires brut payé",
        value: formatXof(data.summary.grossPaidRevenueXof ?? 0),
        detail: `${data.summary.paidOrderCount ?? 0} paiement(s) · ${rangeLabels[data.range]}`,
        href: "/admin/commandes?paymentStatus=PAID",
      },
      {
        label: "Paiements à vérifier",
        value: data.summary.paymentsAwaitingVerification ?? 0,
        detail: "Paiements manuels en attente",
        href: "/admin/commandes?paymentStatus=PENDING",
      },
    );
  }
  if (data.permissions.inventory) {
    cards.push({
      label: "Variantes en stock faible",
      value: data.summary.lowStockVariants ?? 0,
      detail: "Disponibilité après réservations",
      href: "/admin/inventaire/stock-faible",
    });
  }
  if (data.permissions.messages) {
    cards.push({
      label: "Nouveaux messages",
      value: data.summary.newMessages ?? 0,
      detail: "Statut NEW",
      href: "/admin/messages?status=NEW",
    });
  }
  if (data.permissions.notifications) {
    cards.push({
      label: "Notifications en échec",
      value: data.summary.failedNotifications ?? 0,
      detail: "Échecs nécessitant une attention",
      href: "/admin/notifications?status=FAILED",
    });
  }
  return cards;
}

export function DashboardRangeSelector({ range }: Pick<DashboardData, "range">) {
  return (
    <nav aria-label="Période du tableau de bord" className="flex flex-wrap gap-2">
      {Object.entries(rangeLabels).map(([value, label]) => (
        <Link
          key={value}
          href={`/admin?range=${value}`}
          aria-current={range === value ? "page" : undefined}
          className={buttonVariants({
            variant: range === value ? "default" : "outline",
            size: "sm",
          })}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const cards = summaryCards(data);
  return (
    <div className="mt-8 grid min-w-0 gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardHeader>
                <CardTitle>{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data.permissions.financials ? (
        <SalesTrend data={data.salesTrend} timezone={data.timezone} />
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        {data.permissions.orders ? <OrdersBySource data={data.ordersBySource} /> : null}
        {data.permissions.financials ? (
          <PaymentDistribution data={data.paymentDistribution} />
        ) : null}
      </div>

      {data.permissions.orders ? <RecentOrders data={data} /> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        {data.permissions.inventory ? <LowStock data={data} /> : null}
        {data.permissions.inventory ? <TopProducts data={data} /> : null}
        {data.permissions.messages ? <RecentMessages data={data} /> : null}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {href ? (
          <CardAction>
            <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Voir tout
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  );
}

function SalesTrend({ data, timezone }: { data: SalesTrendPoint[]; timezone: string }) {
  if (data.every((point) => point.revenueXof === 0)) {
    return (
      <SectionCard title="Tendance des ventes" description="Paiements confirmés, par jour local">
        <p className="rounded-lg bg-muted/50 p-5 text-sm text-muted-foreground">
          Aucun paiement enregistré sur cette période.
        </p>
      </SectionCard>
    );
  }
  const maximum = Math.max(...data.map((point) => point.revenueXof), 1);
  return (
    <SectionCard
      title="Tendance des ventes"
      description="Chiffre d’affaires brut payé et commandes payées, par jour local"
    >
      <div className="overflow-x-auto pb-2" aria-hidden="true">
        <div className="flex h-48 min-w-max items-end gap-1 border-b border-border px-1 pt-4">
          {data.map((point) => (
            <div
              key={point.date}
              className="flex h-full w-4 items-end sm:w-5"
              title={`${formatBucketDate(point.date, timezone)} · ${point.paidOrderCount} commande(s) · ${formatXof(point.revenueXof)}`}
            >
              <div
                className="w-full min-h-px rounded-t-sm bg-chart-1"
                style={{ height: `${Math.max((point.revenueXof / maximum) * 100, 1)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <DataDetails label="Afficher les données de la tendance">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Commandes payées</TableHead>
              <TableHead className="text-right">Chiffre d’affaires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((point) => (
              <TableRow key={point.date}>
                <TableCell>{formatBucketDate(point.date, timezone)}</TableCell>
                <TableCell>{point.paidOrderCount}</TableCell>
                <TableCell className="text-right">{formatXof(point.revenueXof)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataDetails>
    </SectionCard>
  );
}

function DistributionBars({
  items,
}: {
  items: Array<{ key: string; label: string; count: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const percentage = dashboardPercentage(item.count, total);
        return (
          <div key={item.key} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 font-medium">
                {item.count} · {percentage} %
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-chart-2" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdersBySource({ data }: { data: SourceDistributionItem[] }) {
  if (data.length === 0)
    return (
      <SectionCard title="Commandes par canal" description="Canal d’entrée de la commande">
        <p className="text-sm text-muted-foreground">Aucune commande sur cette période.</p>
      </SectionCard>
    );
  const items = data.map((item) => ({
    key: item.source,
    label: orderSourceLabel(item.source),
    count: item.orderCount,
  }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <SectionCard
      title="Commandes par canal"
      description="Canal de commande, distinct de l’attribution marketing"
    >
      <DistributionBars items={items} />
      <DistributionTable label="Afficher les données des canaux" items={items} total={total} />
    </SectionCard>
  );
}

function PaymentDistribution({ data }: { data: PaymentDistributionItem[] }) {
  if (data.length === 0)
    return (
      <SectionCard title="Modes de paiement choisis" description="Nombre de commandes par mode">
        <p className="text-sm text-muted-foreground">Aucune commande sur cette période.</p>
      </SectionCard>
    );
  const items = data.map((item) => ({
    key: item.method,
    label: paymentMethodLabel(item.method),
    count: item.orderCount,
  }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <SectionCard
      title="Modes de paiement choisis"
      description="Nombre de commandes, payées ou non, par mode sélectionné"
    >
      <DistributionBars items={items} />
      <DistributionTable
        label="Afficher les données des modes de paiement"
        items={items}
        total={total}
      />
    </SectionCard>
  );
}

function DistributionTable({
  label,
  items,
  total,
}: {
  label: string;
  items: Array<{ key: string; label: string; count: number }>;
  total: number;
}) {
  return (
    <DataDetails label={label}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Libellé</TableHead>
            <TableHead>Commandes</TableHead>
            <TableHead>Part</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.key}>
              <TableCell>{item.label}</TableCell>
              <TableCell>{item.count}</TableCell>
              <TableCell>{dashboardPercentage(item.count, total)} %</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataDetails>
  );
}

function DataDetails({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mt-5 border-t pt-4">
      <summary className="cursor-pointer text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label}
      </summary>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

function RecentOrders({ data }: { data: DashboardData }) {
  return (
    <SectionCard
      title="Commandes récentes"
      description="Les huit commandes les plus récentes de la période"
      href="/admin/commandes"
    >
      {data.recentOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune commande enregistrée.</p>
      ) : (
        <div className="grid gap-3">
          {data.recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/commandes/${order.id}`}
              className="grid min-w-0 gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {order.orderNumber} · {order.customerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDashboardDate(order.createdAt, data.timezone, true)} ·{" "}
                  {orderSourceLabel(order.source)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{orderStatusLabel(order.status)}</Badge>
                <Badge variant="outline">{paymentStatusLabel(order.paymentStatus)}</Badge>
              </div>
              <p className="font-semibold sm:text-right">{formatXof(order.totalXof)}</p>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function LowStock({ data }: { data: DashboardData }) {
  return (
    <SectionCard
      title="Stock à surveiller"
      description="Ruptures puis disponibilités les plus basses"
      href="/admin/inventaire/stock-faible"
    >
      {data.lowStock.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun article en stock faible.</p>
      ) : (
        <div className="grid gap-3">
          {data.lowStock.map((item) => (
            <Link
              key={item.variantId}
              href={`/admin/inventaire/${item.variantId}`}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {item.productName} · {item.variantLabel}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {item.sku} · seuil {item.lowStockThreshold}
                </p>
              </div>
              <Badge variant={item.stockState === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
                {item.availableQuantity} disponible(s)
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TopProducts({ data }: { data: DashboardData }) {
  return (
    <SectionCard
      title="Produits les plus vendus"
      description="Unités SOLD issues des instantanés de commande"
    >
      {data.topProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune unité vendue sur cette période.</p>
      ) : (
        <ol className="grid gap-3">
          {data.topProducts.map((item, index) => (
            <li
              key={`${item.productId ?? "snapshot"}-${item.productName}`}
              className="flex items-center justify-between gap-4 rounded-lg border p-3"
            >
              <span className="min-w-0 truncate">
                <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                {item.productName}
              </span>
              <span className="shrink-0 font-medium">{item.unitsSold} unité(s)</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function RecentMessages({ data }: { data: DashboardData }) {
  return (
    <SectionCard
      title="Messages récents"
      description="Aperçus limités, sans charger le corps complet"
      href="/admin/messages"
    >
      {data.recentMessages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun nouveau message.</p>
      ) : (
        <div className="grid gap-3">
          {data.recentMessages.map((message) => (
            <Link
              key={message.id}
              href={`/admin/messages/${message.id}`}
              className="grid min-w-0 gap-1 rounded-lg border p-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate font-medium">
                  {message.senderName} · {message.subject}
                </p>
                <Badge variant={message.status === "NEW" ? "default" : "secondary"}>
                  {messageStatusLabel(message.status)}
                </Badge>
              </div>
              <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                {message.excerpt}
              </p>
              <p className="text-xs text-muted-foreground">
                {messageSourceLabel(message.source)} ·{" "}
                {formatDashboardDate(message.receivedAt, data.timezone, true)}
                {message.assigneeName ? ` · ${message.assigneeName}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
