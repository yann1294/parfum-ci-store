"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function ProductsError() {
  return (
    <ErrorState
      title="Catalogue indisponible"
      description="Les produits n'ont pas pu être chargés. Réessayez depuis l'administration."
    />
  );
}
