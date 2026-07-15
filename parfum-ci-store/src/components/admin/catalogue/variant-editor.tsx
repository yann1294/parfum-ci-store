"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextField } from "@/components/admin/catalogue/catalogue-form-fields";
import { createVariantFromForm, updateVariantFromForm } from "@/app/admin/catalogue-actions";
import { formatXof } from "@/lib/catalogue/format";
import type { AdminProduct } from "@/lib/catalogue/admin";

export function VariantEditor({
  product,
  canMutate,
  canViewCostPrice,
}: {
  product: AdminProduct;
  canMutate: boolean;
  canViewCostPrice: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createVariantFromForm(product.id, formData);
      if (result.ok) toast.success("Variante créée");
      else toast.error(result.message);
    });
  }

  function submitUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateVariantFromForm(id, product.id, formData);
      if (result.ok) toast.success("Variante mise à jour");
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-4">
      {canMutate ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle variante</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitCreate} className="grid gap-4 md:grid-cols-4">
              <TextField label="SKU" name="sku" required />
              <TextField label="Taille ml" name="sizeMl" type="number" min={1} required />
              <TextField label="Concentration" name="concentration" />
              <TextField label="Prix de vente XOF" name="priceXof" inputMode="numeric" required />
              <TextField label="Prix barré XOF" name="compareAtPriceXof" inputMode="numeric" />
              {canViewCostPrice ? <TextField label="Coût XOF" name="costPriceXof" inputMode="numeric" /> : null}
              <TextField label="Seuil stock bas" name="lowStockThreshold" type="number" min={0} defaultValue="0" />
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" name="active" defaultChecked />
                Active
              </label>
              <div className="flex justify-end md:col-span-4">
                <Button type="submit" disabled={pending}>
                  Ajouter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          Les ajustements de stock seront disponibles dans le module Inventaire.
        </p>
      )}

      {product.variants.map((variant) => (
        <Card key={variant.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle>{variant.sku}</CardTitle>
            <Badge variant={variant.active ? "default" : "secondary"}>
              {variant.active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent>
            <form action={(formData) => submitUpdate(variant.id, formData)} className="grid gap-4 md:grid-cols-4">
              <TextField label="SKU" name="sku" defaultValue={variant.sku} disabled={!canMutate} />
              <TextField label="Taille ml" name="sizeMl" type="number" defaultValue={variant.sizeMl} disabled={!canMutate} />
              <TextField label="Concentration" name="concentration" defaultValue={variant.concentration ?? ""} disabled={!canMutate} />
              <TextField label="Prix de vente XOF" name="priceXof" defaultValue={variant.priceXof} disabled={!canMutate} />
              <TextField label="Prix barré XOF" name="compareAtPriceXof" defaultValue={variant.compareAtPriceXof ?? ""} disabled={!canMutate} />
              {canViewCostPrice ? (
                <TextField label="Coût XOF" name="costPriceXof" defaultValue={variant.costPriceXof ?? ""} disabled={!canMutate} />
              ) : null}
              <TextField label="Seuil stock bas" name="lowStockThreshold" type="number" defaultValue={variant.lowStockThreshold} disabled={!canMutate} />
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Disponibilité</span>
                <span>{variant.availableQuantity} disponible(s)</span>
                <span className="text-xs text-muted-foreground">
                  Stock: {variant.stockOnHand}, réservé: {variant.reservedQuantity}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={variant.active} disabled={!canMutate} />
                Active
              </label>
              <p className="text-sm text-muted-foreground">{formatXof(variant.priceXof)}</p>
              {canMutate ? (
                <div className="flex justify-end md:col-span-4">
                  <Button type="submit" variant="outline" disabled={pending}>
                    Enregistrer
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
