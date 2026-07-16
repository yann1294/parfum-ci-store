"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteImageForProduct,
  finalizeImageUploadForProduct,
  prepareImageUploadForProduct,
} from "@/app/admin/catalogue-actions";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_MIME_TYPES } from "@/lib/catalogue/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminProduct } from "@/lib/catalogue/admin";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
  status: "PENDING" | "UPLOADING" | "FINALIZING" | "DONE" | "ERROR";
  error?: string;
};

function validateFile(file: File) {
  if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_MIME_TYPES)[number])) {
    return "Format non pris en charge. Utilisez JPEG, PNG ou WebP.";
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return "L'image dépasse 5 Mo.";
  }

  return null;
}

export function ImageManager({ product, canMutate }: { product: AdminProduct; canMutate: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;

    const nextItems = Array.from(files).map((file) => {
      const error = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        altText: product.name,
        status: error ? "ERROR" : "PENDING",
        error: error ?? undefined,
      } satisfies UploadItem;
    });

    setItems((current) => [...current, ...nextItems]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function uploadItem(item: UploadItem) {
    const validationError = validateFile(item.file);

    if (validationError) {
      updateItem(item.id, { status: "ERROR", error: validationError });
      return;
    }

    updateItem(item.id, { status: "UPLOADING", error: undefined });
    const prepared = await prepareImageUploadForProduct({
      productId: product.id,
      declaredMimeType: item.file.type as "image/jpeg" | "image/png" | "image/webp",
      declaredByteSize: item.file.size,
    });

    if (!prepared.ok) {
      updateItem(item.id, { status: "ERROR", error: prepared.message });
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from(prepared.data.bucketId)
      .uploadToSignedUrl(prepared.data.objectPath, prepared.data.token, item.file, {
        contentType: item.file.type,
        upsert: false,
      });

    if (uploadError) {
      updateItem(item.id, { status: "ERROR", error: "L'envoi direct vers Storage a échoué." });
      return;
    }

    updateItem(item.id, { status: "FINALIZING" });
    const finalized = await finalizeImageUploadForProduct({
      productId: product.id,
      pendingUploadId: prepared.data.pendingUploadId,
      altText: item.altText,
      sortOrder: product.images.length + items.indexOf(item),
      isPrimary: product.images.length === 0,
    });

    if (!finalized.ok) {
      updateItem(item.id, { status: "ERROR", error: finalized.message });
      return;
    }

    removeItem(item.id);
    router.refresh();
    toast.success("Image validée et enregistrée");
  }

  function deleteImage(imageId: string) {
    startTransition(async () => {
      const result = await deleteImageForProduct(product.id, imageId);
      if (result.ok) toast.success("Image supprimée");
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-4">
      {canMutate ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <label className="grid cursor-pointer gap-2 text-sm">
            <span className="font-medium">Ajouter des images</span>
            <span className="text-muted-foreground">JPEG, PNG ou WebP. 5 Mo maximum par fichier.</span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="rounded-lg border bg-background p-2"
              onChange={(event) => addFiles(event.currentTarget.files)}
            />
          </label>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" className="aspect-square rounded-md object-cover" />
                <input
                  value={item.altText}
                  onChange={(event) => updateItem(item.id, { altText: event.target.value })}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="Texte alternatif"
                />
                <p role="status" className="text-sm text-muted-foreground">
                  {item.status}
                </p>
                <p className="text-xs text-muted-foreground">{item.file.name}</p>
                {item.error ? <p className="text-sm text-destructive">{item.error}</p> : null}
                {item.status !== "DONE" ? (
                  <Button type="button" onClick={() => uploadItem(item)} disabled={item.status === "UPLOADING" || item.status === "FINALIZING"}>
                    {item.status === "ERROR" ? "Réessayer" : "Envoyer"}
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => removeItem(item.id)}>
                  Retirer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {product.images.map((image) => (
          <Card key={image.id}>
            <CardContent className="grid gap-3 p-3">
              {image.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.publicUrl} alt={image.altText} className="aspect-square rounded-md object-cover" />
              ) : (
                <div className="aspect-square rounded-md bg-muted" />
              )}
              <div>
                <p className="font-medium">{image.altText}</p>
                <p className="text-sm text-muted-foreground">
                  Ordre {image.sortOrder} {image.isPrimary ? "· Image principale" : ""}
                </p>
              </div>
              {canMutate ? (
                <Button type="button" variant="destructive" onClick={() => deleteImage(image.id)} disabled={pending}>
                  Supprimer
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
