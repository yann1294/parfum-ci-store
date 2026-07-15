"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TextField, TextareaField, NativeSelectField } from "@/components/admin/catalogue/catalogue-form-fields";
import {
  createBrandFromForm,
  createCategoryFromForm,
  updateBrandFromForm,
  updateCategoryFromForm,
} from "@/app/admin/catalogue-actions";
import type { AdminBrand, AdminCategory, PaginatedResult } from "@/lib/catalogue/admin";

type Props =
  | {
      type: "brand";
      result: PaginatedResult<AdminBrand>;
      categories?: never;
      canMutate: boolean;
      searchParams: Record<string, string | undefined>;
    }
  | {
      type: "category";
      result: PaginatedResult<AdminCategory>;
      categories: AdminCategory[];
      canMutate: boolean;
      searchParams: Record<string, string | undefined>;
    };

function titleCase(value: string) {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function buildPageHref(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  params.set("page", String(page));
  return `${basePath}?${params.toString()}`;
}

export function EntityManager(props: Props) {
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const title = props.type === "brand" ? "marque" : "catégorie";
  const basePath = props.type === "brand" ? "/admin/marques" : "/admin/categories";
  const editingItem = useMemo(
    () => props.result.items.find((item) => item.id === editingId) ?? null,
    [editingId, props.result.items],
  );

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result =
        props.type === "brand"
          ? await createBrandFromForm(formData)
          : await createCategoryFromForm(formData);

      if (result.ok) {
        toast.success(`${titleCase(title)} créée`);
        setCreateOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function submitUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result =
        props.type === "brand"
          ? await updateBrandFromForm(id, formData)
          : await updateCategoryFromForm(id, formData);

      if (result.ok) {
        toast.success("Mise à jour enregistrée");
        setEditingId(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-4">
      <form action={basePath} className="grid gap-3 rounded-lg border bg-surface p-4 md:grid-cols-5">
        <label className="grid gap-1 text-sm">
          Recherche
          <input
            name="q"
            defaultValue={props.searchParams.q}
            className="h-10 rounded-lg border border-input bg-background px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Statut
          <select
            name="status"
            defaultValue={props.searchParams.status ?? "ALL"}
            className="h-10 rounded-lg border border-input bg-background px-3"
          >
            <option value="ALL">Tous</option>
            <option value="ACTIVE">Actifs</option>
            <option value="INACTIVE">Inactifs</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Tri
          <select
            name="sort"
            defaultValue={props.searchParams.sort ?? "name_asc"}
            className="h-10 rounded-lg border border-input bg-background px-3"
          >
            <option value="name_asc">Nom A-Z</option>
            <option value="name_desc">Nom Z-A</option>
            <option value="newest">Plus récentes</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Taille page
          <input
            name="pageSize"
            type="number"
            min={1}
            max={100}
            defaultValue={props.searchParams.pageSize ?? props.result.pageSize}
            className="h-10 rounded-lg border border-input bg-background px-3"
          />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          {props.canMutate ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button type="button" />}>
                Ajouter une {title}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une {title}</DialogTitle>
                  <DialogDescription>Le slug peut être laissé vide pour être généré côté serveur.</DialogDescription>
                </DialogHeader>
                <EntityForm
                  type={props.type}
                  categories={props.type === "category" ? props.categories : []}
                  action={submitCreate}
                  pending={pending}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </form>

      {props.result.items.length === 0 ? (
        <EmptyState title={`Aucune ${title}`} description="Aucun résultat ne correspond aux filtres." />
      ) : (
        <>
          <div className="hidden rounded-lg border bg-surface md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.result.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>/{item.slug}</TableCell>
                    <TableCell>
                      <Badge variant={item.active ? "default" : "secondary"}>
                        {item.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.productCount}</TableCell>
                    <TableCell>
                      {props.canMutate ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(item.id)}>
                          Modifier
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {props.result.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="grid gap-2 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">/{item.slug}</p>
                    </div>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.productCount} produit(s)</p>
                  {props.canMutate ? (
                    <Button type="button" variant="outline" onClick={() => setEditingId(item.id)}>
                      Modifier
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {props.result.page} sur {props.result.totalPages} · {props.result.total} résultat(s)
        </span>
        <div className="flex gap-2">
          <Link
            href={buildPageHref(basePath, props.searchParams, Math.max(props.result.page - 1, 1))}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={props.result.page <= 1}
          >
            Précédent
          </Link>
          <Link
            href={buildPageHref(
              basePath,
              props.searchParams,
              Math.min(props.result.page + 1, props.result.totalPages),
            )}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={props.result.page >= props.result.totalPages}
          >
            Suivant
          </Link>
        </div>
      </div>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingItem?.name}</DialogTitle>
            <DialogDescription>Confirmez les changements avant d&apos;enregistrer.</DialogDescription>
          </DialogHeader>
          {editingItem ? (
            <EntityForm
              type={props.type}
              item={editingItem}
              categories={props.type === "category" ? props.categories : []}
              action={(formData) => submitUpdate(editingItem.id, formData)}
              pending={pending}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntityForm({
  type,
  item,
  categories,
  action,
  pending,
}: {
  type: "brand" | "category";
  item?: AdminBrand | AdminCategory;
  categories: AdminCategory[];
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="grid gap-4">
      {type === "category" ? (
        <NativeSelectField label="Parent" name="parentId" defaultValue={(item as AdminCategory | undefined)?.parentId}>
          <option value="none">Aucun parent</option>
          {categories
            .filter((category) => category.id !== item?.id)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </NativeSelectField>
      ) : null}
      <TextField label="Nom" name="name" defaultValue={item?.name ?? ""} required />
      <TextField label="Slug" name="slug" defaultValue={item?.slug ?? ""} />
      <TextField label="Ordre" name="sortOrder" type="number" min={0} defaultValue={item?.sortOrder ?? 0} />
      <TextareaField label="Description" name="description" defaultValue={item?.description ?? ""} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
        Actif
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
