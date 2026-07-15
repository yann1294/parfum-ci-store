"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextField, TextareaField, NativeSelectField } from "@/components/admin/catalogue/catalogue-form-fields";
import {
  createBrandFromForm,
  createCategoryFromForm,
  updateBrandFromForm,
  updateCategoryFromForm,
} from "@/app/admin/catalogue-actions";
import type { AdminBrand, AdminCategory } from "@/lib/catalogue/admin";

type Props =
  | { type: "brand"; items: AdminBrand[]; categories?: never; canMutate: boolean }
  | { type: "category"; items: AdminCategory[]; categories: AdminCategory[]; canMutate: boolean };

export function EntityManager(props: Props) {
  const [pending, startTransition] = useTransition();
  const title = props.type === "brand" ? "marque" : "catégorie";

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      const result =
        props.type === "brand"
          ? await createBrandFromForm(formData)
          : await createCategoryFromForm(formData);

      if (result.ok) toast.success(`${title[0].toUpperCase()}${title.slice(1)} créée`);
      else toast.error(result.message);
    });
  }

  function submitUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result =
        props.type === "brand"
          ? await updateBrandFromForm(id, formData)
          : await updateCategoryFromForm(id, formData);

      if (result.ok) toast.success("Mise à jour enregistrée");
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-6">
      {props.canMutate ? (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={submitCreate} className="grid gap-4 md:grid-cols-2">
              {props.type === "category" ? (
                <NativeSelectField label="Parent" name="parentId">
                  <option value="none">Aucun parent</option>
                  {props.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelectField>
              ) : null}
              <TextField label="Nom" name="name" required />
              <TextField label="Slug explicite" name="slug" />
              <TextField label="Ordre" name="sortOrder" type="number" defaultValue="0" min={0} />
              <div className="md:col-span-2">
                <TextareaField label="Description" name="description" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked />
                Actif
              </label>
              <div className="flex justify-end md:col-span-2">
                <Button type="submit" disabled={pending}>
                  Créer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {props.items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{item.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">/{item.slug}</p>
              </div>
              <Badge variant={item.active ? "default" : "secondary"}>
                {item.active ? "Actif" : "Inactif"}
              </Badge>
            </CardHeader>
            <CardContent>
              <form action={(formData) => submitUpdate(item.id, formData)} className="grid gap-4 md:grid-cols-2">
                {props.type === "category" ? (
                  <NativeSelectField label="Parent" name="parentId" defaultValue={(item as AdminCategory).parentId}>
                    <option value="none">Aucun parent</option>
                    {props.categories
                      .filter((category) => category.id !== item.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </NativeSelectField>
                ) : null}
                <TextField label="Nom" name="name" defaultValue={item.name} disabled={!props.canMutate} />
                <TextField label="Slug" name="slug" defaultValue={item.slug} disabled={!props.canMutate} />
                <TextField label="Ordre" name="sortOrder" type="number" defaultValue={item.sortOrder} min={0} disabled={!props.canMutate} />
                <div className="md:col-span-2">
                  <TextareaField label="Description" name="description" defaultValue={item.description ?? ""} disabled={!props.canMutate} />
                </div>
                <p className="text-sm text-muted-foreground">{item.productCount} produit(s) associé(s)</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={item.active} disabled={!props.canMutate} />
                  Actif
                </label>
                {props.canMutate ? (
                  <div className="flex justify-end md:col-span-2">
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
    </div>
  );
}
