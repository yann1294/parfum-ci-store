import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryStatusBadge, ProductStatusBadge, VariantStateBadge } from "@/components/admin/inventory/inventory-status";
import {
  inventoryOperationLabel,
  type InventoryFilters,
  type InventoryVariantRow,
  type PaginatedInventory,
} from "@/lib/inventory/admin";

function buildQuery(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function InventoryFiltersForm({
  searchParams,
  basePath = "/admin/inventaire",
  lowStockMode = false,
}: {
  searchParams: Record<string, string | undefined>;
  basePath?: string;
  lowStockMode?: boolean;
}) {
  return (
    <form className="grid gap-3 rounded-lg border bg-surface p-4 md:grid-cols-6" action={basePath}>
      <label className="grid gap-1 text-sm md:col-span-2">
        Recherche
        <input
          name="q"
          defaultValue={searchParams.q}
          className="h-10 rounded-lg border border-input bg-background px-3"
          placeholder="Produit, SKU, marque"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Variante
        <select name="active" defaultValue={searchParams.active ?? "ALL"} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Toutes</option>
          <option value="ACTIVE">Actives</option>
          <option value="INACTIVE">Inactives</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Initialisation
        <select
          name="initialized"
          defaultValue={lowStockMode ? "INITIALIZED" : searchParams.initialized ?? "ALL"}
          disabled={lowStockMode}
          className="h-10 rounded-lg border border-input bg-background px-3 disabled:opacity-60"
        >
          <option value="ALL">Toutes</option>
          <option value="INITIALIZED">Initialisées</option>
          <option value="UNINITIALIZED">Non configurées</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        État
        <select
          name="status"
          defaultValue={lowStockMode ? searchParams.status ?? "LOW_OR_OUT" : searchParams.status ?? "ALL"}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="ALL">Tous</option>
          {lowStockMode ? <option value="LOW_OR_OUT">Stock faible et rupture</option> : null}
          <option value="UNCONFIGURED">Stock non configuré</option>
          <option value="IN_STOCK">En stock</option>
          <option value="LOW_STOCK">Stock faible</option>
          <option value="OUT_OF_STOCK">Rupture de stock</option>
          <option value="RESERVED">Réservé présent</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Tri
        <select name="sort" defaultValue={searchParams.sort ?? "product_asc"} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="product_asc">Produit A-Z</option>
          <option value="sku_asc">SKU A-Z</option>
          <option value="available_asc">Disponible croissant</option>
          <option value="available_desc">Disponible décroissant</option>
          <option value="updated_desc">Mis à jour</option>
        </select>
      </label>
      <input type="hidden" name="page" value="1" />
      <div className="flex items-end gap-2 md:col-span-6">
        <Button type="submit" variant="outline">Filtrer</Button>
        <Link href={basePath} className={buttonVariants({ variant: "ghost" })}>Réinitialiser</Link>
      </div>
    </form>
  );
}

export function InventoryList({
  result,
  searchParams,
  basePath = "/admin/inventaire",
}: {
  result: PaginatedInventory<InventoryVariantRow>;
  filters: InventoryFilters;
  searchParams: Record<string, string | undefined>;
  basePath?: string;
}) {
  if (result.items.length === 0) {
    return <EmptyState title="Aucune variante" description="Aucune variante ne correspond aux filtres actuels." />;
  }

  return (
    <div className="grid gap-4">
      <div className="hidden min-w-0 rounded-lg border bg-surface xl:block">
        <div className="overflow-x-auto">
          <Table className="min-w-[86rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead>Publication</TableHead>
                <TableHead>État variante</TableHead>
                <TableHead>Initialisé</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Réservé</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Seuil</TableHead>
                <TableHead>État stock</TableHead>
                <TableHead>Dernier mouvement</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((item) => (
                <TableRow key={item.variantId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.brandName ?? "Sans marque"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-52 whitespace-normal break-all font-medium" title={item.sku}>{item.sku}</TableCell>
                  <TableCell>{item.sizeMl} ml · {item.concentration ?? "Non renseignée"}</TableCell>
                  <TableCell><ProductStatusBadge status={item.productStatus} /></TableCell>
                  <TableCell><VariantStateBadge active={item.variantActive} /></TableCell>
                  <TableCell>{item.stockInitialized ? "Oui" : "Non"}</TableCell>
                  <TableCell>{item.stockOnHand}</TableCell>
                  <TableCell>{item.reservedQuantity}</TableCell>
                  <TableCell>{item.availableQuantity}</TableCell>
                  <TableCell>{item.lowStockThreshold}</TableCell>
                  <TableCell><InventoryStatusBadge status={item.inventoryStatus} /></TableCell>
                  <TableCell>
                    {item.lastMovementType ? inventoryOperationLabel(item.lastMovementType) : "Aucun"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/inventaire/${item.variantId}?retour=${encodeURIComponent(buildQuery(basePath, searchParams, result.page))}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
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
        {result.items.map((item) => (
          <Card key={item.variantId}>
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  <p className="break-all text-sm text-muted-foreground" title={item.sku}>{item.sku}</p>
                  <p className="text-sm text-muted-foreground">{item.sizeMl} ml · {item.concentration ?? "Non renseignée"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <VariantStateBadge active={item.variantActive} />
                  <InventoryStatusBadge status={item.inventoryStatus} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Publication</dt><dd>{item.productStatus}</dd></div>
                <div><dt className="text-muted-foreground">Initialisé</dt><dd>{item.stockInitialized ? "Oui" : "Non"}</dd></div>
                <div><dt className="text-muted-foreground">Stock</dt><dd>{item.stockOnHand}</dd></div>
                <div><dt className="text-muted-foreground">Réservé</dt><dd>{item.reservedQuantity}</dd></div>
                <div><dt className="text-muted-foreground">Disponible</dt><dd>{item.availableQuantity}</dd></div>
                <div><dt className="text-muted-foreground">Seuil</dt><dd>{item.lowStockThreshold}</dd></div>
              </dl>
              <Link href={`/admin/inventaire/${item.variantId}?retour=${encodeURIComponent(buildQuery(basePath, searchParams, result.page))}`} className={buttonVariants({ variant: "outline" })}>
                Ouvrir
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {result.page} sur {result.totalPages} · {result.total} variante(s)</span>
        <div className="flex gap-2">
          {result.page > 1 ? <Link href={buildQuery(basePath, searchParams, result.page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Précédent</Link> : null}
          {result.page < result.totalPages ? <Link href={buildQuery(basePath, searchParams, result.page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>Suivant</Link> : null}
        </div>
      </div>
    </div>
  );
}
