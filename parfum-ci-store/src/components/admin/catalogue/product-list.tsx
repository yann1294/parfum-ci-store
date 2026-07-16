import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatXof } from "@/lib/catalogue/format";
import type { AdminBrand, AdminCategory, AdminProduct } from "@/lib/catalogue/admin";

function statusLabel(status: AdminProduct["status"]) {
  return {
    DRAFT: "Brouillon",
    ACTIVE: "Actif",
    ARCHIVED: "Archivé",
  }[status];
}

function priceRange(product: AdminProduct) {
  const prices = product.variants.map((variant) => variant.priceXof).filter((price) => price > 0);

  if (prices.length === 0) {
    return "Aucun prix";
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatXof(min) : `${formatXof(min)} - ${formatXof(max)}`;
}

function availabilitySummary(product: AdminProduct) {
  const available = product.variants.reduce((sum, variant) => sum + variant.availableQuantity, 0);
  return available > 0 ? `${available} disponible(s)` : "Rupture";
}

export function ProductFilters({
  brands,
  categories,
  canMutate,
  searchParams,
}: {
  brands: AdminBrand[];
  categories: AdminCategory[];
  canMutate: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <form className="grid gap-3 rounded-lg border bg-surface p-4 md:grid-cols-5" action="/admin/produits">
      <label className="grid gap-1 text-sm">
        Recherche
        <input
          name="q"
          defaultValue={searchParams.q}
          className="h-10 rounded-lg border border-input bg-background px-3"
          placeholder="Nom, SKU, slug"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Statut
        <select name="status" defaultValue={searchParams.status ?? "ALL"} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="ALL">Tous</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ACTIVE">Actif</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Marque
        <select name="brandId" defaultValue={searchParams.brandId ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="">Toutes</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Catégorie
        <select name="categoryId" defaultValue={searchParams.categoryId ?? ""} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="">Toutes</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
        {canMutate ? (
          <Link href="/admin/produits/nouveau" className={buttonVariants()}>
            Nouveau
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function ProductList({
  products,
  page,
  totalPages,
  queryString,
  returnPath = "/admin/produits",
}: {
  products: AdminProduct[];
  page: number;
  totalPages: number;
  queryString?: (page: number) => string;
  returnPath?: string;
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="Aucun produit"
        description="Aucun produit ne correspond aux filtres actuels."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="hidden rounded-lg border bg-surface md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Disponibilité</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded-md bg-muted">
                      {product.images[0]?.publicUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0].publicUrl} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">/{product.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                    {statusLabel(product.status)}
                  </Badge>
                </TableCell>
                <TableCell>{product.brandName ?? "Sans marque"}</TableCell>
                <TableCell>{product.categoryName ?? "Sans catégorie"}</TableCell>
                <TableCell>{product.variants.length}</TableCell>
                <TableCell>{priceRange(product)}</TableCell>
                <TableCell>{availabilitySummary(product)}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/produits/${product.id}?retour=${encodeURIComponent(returnPath)}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Ouvrir
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="grid gap-3 p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.brandName ?? "Sans marque"} · {product.categoryName ?? "Sans catégorie"}
                  </p>
                </div>
                <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                  {statusLabel(product.status)}
                </Badge>
              </div>
              <p className="text-sm">{priceRange(product)}</p>
              <p className="text-sm text-muted-foreground">{availabilitySummary(product)}</p>
              <Link
                href={`/admin/produits/${product.id}?retour=${encodeURIComponent(returnPath)}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Ouvrir
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} sur {totalPages}
        </span>
        <div className="flex gap-2">
          <Link
            href={queryString?.(Math.max(page - 1, 1)) ?? `/admin/produits?page=${Math.max(page - 1, 1)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={page <= 1}
          >
            Précédent
          </Link>
          <Link
            href={queryString?.(Math.min(page + 1, totalPages)) ?? `/admin/produits?page=${Math.min(page + 1, totalPages)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={page >= totalPages}
          >
            Suivant
          </Link>
        </div>
      </div>
    </div>
  );
}
