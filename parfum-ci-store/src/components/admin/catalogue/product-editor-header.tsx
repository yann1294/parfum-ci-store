"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminProduct } from "@/lib/catalogue/admin";

type ProductDirtyEvent = CustomEvent<{ dirty: boolean }>;

function statusLabel(status: AdminProduct["status"]) {
  return {
    DRAFT: "Brouillon",
    ACTIVE: "Actif",
    ARCHIVED: "Archivé",
  }[status];
}

export function ProductEditorHeader({
  product,
  returnPath,
}: {
  product: AdminProduct;
  returnPath: string;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const onDirtyChange = (event: Event) => {
      setDirty((event as ProductDirtyEvent).detail.dirty);
    };

    window.addEventListener("product-editor-dirty-change", onDirtyChange);
    return () => window.removeEventListener("product-editor-dirty-change", onDirtyChange);
  }, []);

  function goBack() {
    if (dirty && !window.confirm("Des modifications non enregistrées seront perdues. Continuer ?")) {
      return;
    }

    router.push(returnPath);
  }

  return (
    <header className="grid gap-4">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>Produits</li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{product.name}</li>
        </ol>
      </nav>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-fit gap-2"
            onClick={goBack}
            aria-label="Retour aux produits"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Retour aux produits
          </Button>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Catalogue</p>
            <h1 className="font-heading text-4xl text-foreground">{product.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Slug: /{product.slug}</p>
          </div>
        </div>
        <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
          {statusLabel(product.status)}
        </Badge>
      </div>
    </header>
  );
}
