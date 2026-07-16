"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField, TextareaField, NativeSelectField } from "@/components/admin/catalogue/catalogue-form-fields";
import { createProductFromForm, updateProductFromForm } from "@/app/admin/catalogue-actions";
import { formatNotes } from "@/lib/catalogue/format";
import type { AdminBrand, AdminCategory, AdminProduct } from "@/lib/catalogue/admin";
import { fragranceFamilyOptions, targetAudienceOptions } from "@/lib/catalogue/validation";

type ProductFormProps = {
  product?: AdminProduct;
  brands: AdminBrand[];
  categories: AdminCategory[];
  canMutate: boolean;
};

export function ProductForm({ product, brands, categories, canMutate }: ProductFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(product);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("product-editor-dirty-change", { detail: { dirty } }));

    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <form
      ref={formRef}
      className="grid gap-6"
      onChange={() => setDirty(true)}
      action={(formData) => {
        startTransition(async () => {
          const result = product
            ? await updateProductFromForm(product.id, formData)
            : await createProductFromForm(formData);

          if (result.ok) {
            setDirty(false);
            toast.success(product ? "Produit mis à jour" : "Produit créé en brouillon");
            const id = product?.id ?? (result.data as { id: string }).id;
            router.push(`/admin/produits/${id}`);
            router.refresh();
            return;
          }

          toast.error(result.message);
        });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <TextField label="Nom" name="name" defaultValue={product?.name} disabled={!canMutate} required />
          <TextField label="Slug explicite" name="slug" defaultValue={product?.slug} disabled={!canMutate} />
          <NativeSelectField label="Marque" name="brandId" defaultValue={product?.brandId} disabled={!canMutate}>
            <option value="none">Aucune marque</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectField
            label="Catégorie"
            name="categoryId"
            defaultValue={product?.categoryId}
            disabled={!canMutate}
          >
            <option value="none">Aucune catégorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelectField>
          <NativeSelectField
            label="Public cible"
            name="genderCategory"
            defaultValue={product?.genderCategory}
            disabled={!canMutate}
          >
            <option value="none">Non renseigné</option>
            {targetAudienceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelectField>
          <div className="grid gap-2">
            <NativeSelectField
              label="Famille olfactive"
              name="fragranceFamily"
              defaultValue={product?.fragranceFamily}
              disabled={!canMutate}
            >
              <option value="none">Non renseignée</option>
              {fragranceFamilyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelectField>
            <p className="text-sm text-muted-foreground">
              Décrit la famille de senteurs dominante du parfum.
            </p>
          </div>
          <div className="md:col-span-2">
            <TextareaField
              label="Description courte"
              name="shortDescription"
              defaultValue={product?.shortDescription ?? ""}
              disabled={!canMutate}
            />
          </div>
          <div className="md:col-span-2">
            <TextareaField
              label="Description complète"
              name="description"
              defaultValue={product?.description ?? ""}
              disabled={!canMutate}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes et SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <TextareaField label="Notes de tête" name="topNotes" defaultValue={formatNotes(product?.topNotes ?? [])} disabled={!canMutate} />
          <TextareaField label="Notes de coeur" name="heartNotes" defaultValue={formatNotes(product?.heartNotes ?? [])} disabled={!canMutate} />
          <TextareaField label="Notes de fond" name="baseNotes" defaultValue={formatNotes(product?.baseNotes ?? [])} disabled={!canMutate} />
          <TextField label="Titre SEO" name="seoTitle" defaultValue={product?.seoTitle ?? ""} disabled={!canMutate} />
          <TextField label="Description SEO" name="seoDescription" defaultValue={product?.seoDescription ?? ""} disabled={!canMutate} />
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} disabled={!canMutate} />
            Mettre en avant
          </label>
        </CardContent>
      </Card>

      {canMutate ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le brouillon"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
