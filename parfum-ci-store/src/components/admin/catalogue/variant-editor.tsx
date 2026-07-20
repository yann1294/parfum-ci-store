"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelectField, TextField } from "@/components/admin/catalogue/catalogue-form-fields";
import {
  createVariantFromForm,
  initializeVariantInventoryFromForm,
  updateVariantFromForm,
} from "@/app/admin/catalogue-actions";
import { formatXof } from "@/lib/catalogue/format";
import type { AdminProduct, AdminVariant, PaginatedResult } from "@/lib/catalogue/admin";

type VariantEditorProps = {
  product: AdminProduct;
  variants: PaginatedResult<AdminVariant>;
  canMutate: boolean;
  canViewCostPrice: boolean;
  canInitializeInventory?: boolean;
  searchParams: Record<string, string | undefined>;
};

export function variantStateLabel(variant: Pick<AdminVariant, "active">) {
  return variant.active ? "Active" : "Inactive";
}

export function inventoryStateLabel(
  variant: Pick<AdminVariant, "availabilityStatus" | "inventoryInitialized">,
) {
  if (!variant.inventoryInitialized || variant.availabilityStatus === "UNCONFIGURED") {
    return "Stock non configuré";
  }

  if (variant.availabilityStatus === "OUT_OF_STOCK") {
    return "Rupture de stock";
  }

  if (variant.availabilityStatus === "LOW_STOCK") {
    return "Stock faible";
  }

  return "En stock";
}

function variantStateBadge(variant: AdminVariant) {
  return <Badge variant={variant.active ? "default" : "secondary"}>{variantStateLabel(variant)}</Badge>;
}

function inventoryBadge(variant: AdminVariant) {
  const label = inventoryStateLabel(variant);
  if (label === "Rupture de stock") {
    return <Badge variant="destructive">{label}</Badge>;
  }

  if (label === "Stock faible" || label === "Stock non configuré") {
    return <Badge variant="secondary">{label}</Badge>;
  }

  return <Badge>{label}</Badge>;
}

function buildPageHref(productId: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key.startsWith("variant")) {
      params.set(key, value);
    }
  }

  params.set("variantPage", String(page));
  return `/admin/produits/${productId}?${params.toString()}`;
}

export function VariantEditor({
  product,
  variants,
  canMutate,
  canViewCostPrice,
  canInitializeInventory = false,
  searchParams,
}: VariantEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initializingId, setInitializingId] = useState<string | null>(null);
  const editingVariant = variants.items.find((variant) => variant.id === editingId) ?? null;
  const initializingVariant = variants.items.find((variant) => variant.id === initializingId) ?? null;

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createVariantFromForm(product.id, formData);
      if (result.ok) {
        toast.success("Variante créée");
        setCreating(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function submitUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateVariantFromForm(id, product.id, formData);
      if (result.ok) {
        toast.success("Variante mise à jour");
        setEditingId(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function submitInitialize(variantId: string, formData: FormData) {
    startTransition(async () => {
      const result = await initializeVariantInventoryFromForm(variantId, product.id, formData);
      if (result.ok) {
        toast.success("Stock initialisé");
        setInitializingId(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Variantes</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Les quantités sont gérées depuis le module Inventaire.
            </p>
          </div>
          {canMutate ? (
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger render={<Button type="button" />}>Ajouter une variante</DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Ajouter une variante</DialogTitle>
                  <DialogDescription>
                    Le stock physique et réservé reste géré depuis le module Inventaire.
                  </DialogDescription>
                </DialogHeader>
                <VariantForm
                  canViewCostPrice={canViewCostPrice}
                  pending={pending}
                  submitLabel="Ajouter"
                  onSubmit={submitCreate}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4">
          <form action={`/admin/produits/${product.id}`} className="grid gap-3 md:grid-cols-5">
            <TextField
              label="Recherche SKU"
              name="variantQ"
              defaultValue={searchParams.variantQ ?? ""}
            />
            <NativeSelectField
              label="Statut"
              name="variantActive"
              defaultValue={searchParams.variantActive ?? "ALL"}
            >
              <option value="ALL">Tous</option>
              <option value="ACTIVE">Actives</option>
              <option value="INACTIVE">Inactives</option>
            </NativeSelectField>
            <TextField
              label="Concentration"
              name="variantConcentration"
              defaultValue={searchParams.variantConcentration ?? ""}
            />
            <TextField
              label="Taille ml"
              name="variantSizeMl"
              type="number"
              min={1}
              defaultValue={searchParams.variantSizeMl ?? ""}
            />
            <NativeSelectField
              label="Tri"
              name="variantSort"
              defaultValue={searchParams.variantSort ?? "sku_asc"}
            >
              <option value="sku_asc">SKU A-Z</option>
              <option value="sku_desc">SKU Z-A</option>
              <option value="size_asc">Taille</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="newest">Plus récentes</option>
            </NativeSelectField>
            <input type="hidden" name="variantPage" value="1" />
            <div className="flex items-end md:col-span-5">
              <Button type="submit" variant="outline">
                Filtrer
              </Button>
            </div>
          </form>

          {variants.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Aucune variante ne correspond aux filtres.
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Concentration</TableHead>
                      <TableHead>Prix</TableHead>
                      {canViewCostPrice ? <TableHead>Coût</TableHead> : null}
                      <TableHead>Stock physique</TableHead>
                      <TableHead>Réservé</TableHead>
                      <TableHead>Disponible</TableHead>
                      <TableHead>Seuil</TableHead>
                      <TableHead>Statut variante</TableHead>
                      <TableHead>État du stock</TableHead>
                      {canMutate ? <TableHead className="text-right">Action</TableHead> : null}
                      {!canMutate && canInitializeInventory ? <TableHead className="text-right">Inventaire</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.items.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.sku}</TableCell>
                        <TableCell>{variant.sizeMl} ml</TableCell>
                        <TableCell>{variant.concentration ?? "Non renseignée"}</TableCell>
                        <TableCell>{formatXof(variant.priceXof)}</TableCell>
                        {canViewCostPrice ? (
                          <TableCell>
                            {variant.costPriceXof === null ? "Non renseigné" : formatXof(variant.costPriceXof)}
                          </TableCell>
                        ) : null}
                        <TableCell>{variant.stockOnHand}</TableCell>
                        <TableCell>{variant.reservedQuantity}</TableCell>
                        <TableCell>{variant.availableQuantity}</TableCell>
                        <TableCell>{variant.lowStockThreshold}</TableCell>
                        <TableCell>{variantStateBadge(variant)}</TableCell>
                        <TableCell>{inventoryBadge(variant)}</TableCell>
                        {canMutate || canInitializeInventory ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canMutate ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingId(variant.id)}
                                >
                                  Modifier
                                </Button>
                              ) : null}
                              {canInitializeInventory && !variant.inventoryInitialized ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setInitializingId(variant.id)}
                                >
                                  Initialiser le stock
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {variants.items.map((variant) => (
                  <div key={variant.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{variant.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {variant.sizeMl} ml · {variant.concentration ?? "Non renseignée"}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {variantStateBadge(variant)}
                        {inventoryBadge(variant)}
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Prix</dt>
                        <dd>{formatXof(variant.priceXof)}</dd>
                      </div>
                      {canViewCostPrice ? (
                        <div>
                          <dt className="text-muted-foreground">Coût</dt>
                          <dd>{variant.costPriceXof === null ? "Non renseigné" : formatXof(variant.costPriceXof)}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-muted-foreground">Stock physique</dt>
                        <dd>{variant.stockOnHand}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Réservé</dt>
                        <dd>{variant.reservedQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Disponible</dt>
                        <dd>{variant.availableQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Seuil stock bas</dt>
                        <dd>{variant.lowStockThreshold}</dd>
                      </div>
                    </dl>
                    {canMutate ? (
                      <Button type="button" variant="outline" className="mt-4" onClick={() => setEditingId(variant.id)}>
                        Modifier
                      </Button>
                    ) : null}
                    {canInitializeInventory && !variant.inventoryInitialized ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setInitializingId(variant.id)}
                      >
                        Initialiser le stock
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Page {variants.page} sur {variants.totalPages} · {variants.total} variante(s)
            </span>
            <div className="flex gap-2">
              {variants.page > 1 ? (
                <Link
                  href={buildPageHref(product.id, searchParams, variants.page - 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Précédent
                </Link>
              ) : null}
              {variants.page < variants.totalPages ? (
                <Link
                  href={buildPageHref(product.id, searchParams, variants.page + 1)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Suivant
                </Link>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingVariant)} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifier la variante</DialogTitle>
            <DialogDescription>
              Les quantités sont gérées depuis le module Inventaire.
            </DialogDescription>
          </DialogHeader>
          {editingVariant ? (
            <VariantForm
              variant={editingVariant}
              canViewCostPrice={canViewCostPrice}
              pending={pending}
              submitLabel="Enregistrer"
              onSubmit={(formData) => submitUpdate(editingVariant.id, formData)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(initializingVariant)} onOpenChange={(open) => !open && setInitializingId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Initialiser le stock</DialogTitle>
            <DialogDescription>
              Cette opération crée un mouvement d&apos;inventaire et configure le stock initial.
            </DialogDescription>
          </DialogHeader>
          {initializingVariant ? (
            <form
              action={(formData) => submitInitialize(initializingVariant.id, formData)}
              className="grid gap-4"
            >
              <TextField label="Stock initial" name="initialStock" type="number" min={0} required />
              <TextField
                label="Motif"
                name="reason"
                defaultValue="Stock initial à la création de la variante"
                required
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? "Initialisation..." : "Initialiser"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VariantForm({
  variant,
  canViewCostPrice,
  pending,
  submitLabel,
  onSubmit,
}: {
  variant?: AdminVariant;
  canViewCostPrice: boolean;
  pending: boolean;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="grid gap-4 md:grid-cols-4">
      <TextField label="SKU" name="sku" defaultValue={variant?.sku} required />
      <TextField label="Taille ml" name="sizeMl" type="number" min={1} defaultValue={variant?.sizeMl} required />
      <TextField label="Concentration" name="concentration" defaultValue={variant?.concentration ?? ""} />
      <TextField label="Prix de vente XOF" name="priceXof" inputMode="numeric" defaultValue={variant?.priceXof} required />
      <TextField label="Prix barré XOF" name="compareAtPriceXof" inputMode="numeric" defaultValue={variant?.compareAtPriceXof ?? ""} />
      {canViewCostPrice ? (
        <TextField label="Coût XOF" name="costPriceXof" inputMode="numeric" defaultValue={variant?.costPriceXof ?? ""} />
      ) : null}
      <TextField
        label="Seuil stock bas"
        name="lowStockThreshold"
        type="number"
        min={0}
        defaultValue={variant?.lowStockThreshold ?? 0}
      />
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" name="active" defaultChecked={variant?.active ?? true} />
        Active
      </label>
      <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground md:col-span-4">
        Les champs de stock physique et réservé sont en lecture seule dans le catalogue.
      </p>
      <div className="flex justify-end md:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
