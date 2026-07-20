"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { changeProductStatus } from "@/app/admin/catalogue-actions";
import { getPublicationReadiness } from "@/lib/catalogue/publication-readiness";
import type { AdminProduct } from "@/lib/catalogue/admin";

export function PublicationControls({
  product,
  canMutate,
}: {
  product: AdminProduct;
  canMutate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const checks = getPublicationReadiness(product);
  const ready = checks.every((check) => check.ok);
  const hasVariants = product.variants.length > 0;
  const hasActiveVariant = product.variants.some((variant) => variant.active);

  function setStatus(status: "DRAFT" | "ACTIVE" | "ARCHIVED") {
    startTransition(async () => {
      const result = await changeProductStatus(product.id, status);
      if (result.ok) toast.success("Statut mis à jour");
      else toast.error(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publication</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert variant={ready ? "default" : "destructive"}>
          <AlertTitle>{ready ? "Prêt pour activation" : "Activation incomplète"}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 grid gap-1">
              {checks.map((check) => (
                <li key={check.label}>
                  {check.ok ? "OK" : "Manquant"} - {check.label}
                </li>
              ))}
            </ul>
            {hasVariants && !hasActiveVariant ? (
              <p className="mt-3 font-medium">
                Activez au moins une variante avant de publier ce produit.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
        {canMutate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setStatus("ACTIVE")} disabled={pending || !ready}>
              Activer
            </Button>
            <Button type="button" variant="outline" onClick={() => setStatus("DRAFT")} disabled={pending}>
              Repasser en brouillon
            </Button>
            <Button type="button" variant="destructive" onClick={() => setStatus("ARCHIVED")} disabled={pending}>
              Archiver
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
