import Link from "next/link";

import { InventoryOperationDialog } from "@/components/admin/inventory/inventory-operation-dialog";
import { InventoryStatusBadge, MovementTypeBadge, ProductStatusBadge, VariantStateBadge } from "@/components/admin/inventory/inventory-status";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InventoryLedgerRow, InventoryVariantRow, PaginatedInventory } from "@/lib/inventory/admin";

export function InventoryDetail({
  variant,
  ledger,
  returnPath,
}: {
  variant: InventoryVariantRow;
  ledger: PaginatedInventory<InventoryLedgerRow>;
  returnPath: string;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={returnPath} className={buttonVariants({ variant: "outline" })}>
          Retour à l&apos;inventaire
        </Link>
        <InventoryOperationDialog variant={variant} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{variant.productName}</CardTitle>
          <p className="break-all text-sm text-muted-foreground">{variant.sku}</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <ProductStatusBadge status={variant.productStatus} />
            <VariantStateBadge active={variant.variantActive} />
            <InventoryStatusBadge status={variant.inventoryStatus} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Marque" value={variant.brandName ?? "Sans marque"} />
            <Info label="Catégorie" value={variant.categoryName ?? "Sans catégorie"} />
            <Info label="Variante" value={`${variant.sizeMl} ml · ${variant.concentration ?? "Non renseignée"}`} />
            <Info label="Stock initialisé" value={variant.stockInitialized ? "Oui" : "Non"} />
            <Info label="Stock physique" value={variant.stockOnHand} />
            <Info label="Stock réservé" value={variant.reservedQuantity} />
            <Info label="Disponible calculé" value={variant.availableQuantity} />
            <Info label="Seuil stock bas" value={variant.lowStockThreshold} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger immuable</CardTitle>
          <p className="text-sm text-muted-foreground">
            Les corrections se font par nouveaux mouvements compensatoires, jamais par modification de l&apos;historique.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          {ledger.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Aucun mouvement enregistré.</div>
          ) : (
            <>
              <div className="hidden min-w-0 overflow-x-auto lg:block">
                <Table className="min-w-[72rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Stock avant/après</TableHead>
                      <TableHead>Réservé avant/après</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Acteur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.items.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>{new Date(movement.createdAt).toLocaleString("fr-FR")}</TableCell>
                        <TableCell><MovementTypeBadge type={movement.type} /></TableCell>
                        <TableCell>{movement.quantityDelta}</TableCell>
                        <TableCell>{movement.stockBefore} → {movement.stockAfter}</TableCell>
                        <TableCell>{movement.reservedBefore} → {movement.reservedAfter}</TableCell>
                        <TableCell className="max-w-72 whitespace-normal">{movement.reason}</TableCell>
                        <TableCell className="max-w-56 break-all">{typeof movement.metadata.reference === "string" ? movement.metadata.reference : movement.orderId ?? "Aucune"}</TableCell>
                        <TableCell>{movement.actorName ?? "Système"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-3 lg:hidden">
                {ledger.items.map((movement) => (
                  <div key={movement.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{new Date(movement.createdAt).toLocaleString("fr-FR")}</p>
                        <p className="text-sm text-muted-foreground">{movement.reason}</p>
                      </div>
                      <MovementTypeBadge type={movement.type} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <Info label="Delta" value={movement.quantityDelta} />
                      <Info label="Acteur" value={movement.actorName ?? "Système"} />
                      <Info label="Stock" value={`${movement.stockBefore} → ${movement.stockAfter}`} />
                      <Info label="Réservé" value={`${movement.reservedBefore} → ${movement.reservedAfter}`} />
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
