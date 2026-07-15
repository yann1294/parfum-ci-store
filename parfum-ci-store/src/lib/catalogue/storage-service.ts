import "server-only";

import { auditCatalogueEvent } from "@/lib/audit/catalogue";
import { requireActiveStaff } from "@/lib/auth/server";
import { canManageProducts as canManageProductsForStaff } from "@/lib/auth/permissions";
import {
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_BUCKET,
  type ProductImageMimeType,
} from "@/lib/catalogue/constants";
import { CatalogueError } from "@/lib/catalogue/errors";
import {
  assertSafeProductImageObjectPath,
  assertSupportedProductImageMimeType,
  createProductImageObjectPath,
  readBlobBytes,
  validateImageBytes,
  validateProductImageByteSize,
} from "@/lib/catalogue/images";
import {
  finalizeImageUploadSchema,
  prepareImageUploadSchema,
  type FinalizeImageUploadInput,
  type PrepareImageUploadInput,
} from "@/lib/catalogue/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryError = { message: string; code?: string } | null;
type QueryResult<T> = { data: T; error: QueryError };
type EqChain<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: unknown): EqChain<T>;
};
type SelectChain<T> = {
  eq(column: string, value: unknown): SelectChain<T>;
  maybeSingle(): Promise<QueryResult<T | null>>;
  single(): Promise<QueryResult<T>>;
};
type MutationSelect<T> = {
  select(columns: string): {
    single(): Promise<QueryResult<T>>;
  };
};
type MigrationTable = {
  insert(values: Record<string, unknown>): MutationSelect<Record<string, unknown>>;
  update(values: Record<string, unknown>): EqChain<null>;
  select(columns: string): SelectChain<unknown>;
  delete(): EqChain<null>;
};
type MigrationSupabaseClient = {
  from(table: string): MigrationTable;
};

type PendingUploadRow = {
  id: string;
  product_id: string;
  bucket_id: string;
  object_path: string;
  declared_mime_type: ProductImageMimeType;
  declared_byte_size: number;
  status: "PENDING" | "FINALIZED" | "FAILED" | "CANCELLED";
  created_by: string | null;
  expires_at: string;
};

type ProductForImageUpload = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

function asAnyClient(client: unknown) {
  return client as MigrationSupabaseClient;
}

function assertCanManageProducts(activeStaff: Awaited<ReturnType<typeof requireActiveStaff>>) {
  if (!canManageProductsForStaff(activeStaff)) {
    throw new CatalogueError("FORBIDDEN", "Vous n'êtes pas autorisé à gérer les images produit.");
  }
}

async function getProductForImageUpload(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string,
) {
  const { data, error } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new CatalogueError("PRODUCT_LOOKUP_FAILED", "Impossible de vérifier le produit.");
  }

  if (!data) {
    throw new CatalogueError("PRODUCT_NOT_FOUND", "Produit introuvable.");
  }

  if ((data as ProductForImageUpload).status === "ARCHIVED") {
    throw new CatalogueError("PRODUCT_ARCHIVED", "Les produits archivés ne peuvent pas recevoir d'images.");
  }

  return data as ProductForImageUpload;
}

async function deleteStorageObjectSafely(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  objectPath: string,
) {
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
  return !error;
}

export async function prepareProductImageUpload(input: PrepareImageUploadInput) {
  const parsed = prepareImageUploadSchema.parse(input);
  const staff = await requireActiveStaff();
  assertCanManageProducts(staff);

  const supabase = await createSupabaseServerClient();
  await getProductForImageUpload(supabase, parsed.productId);

  const declaredMimeType = assertSupportedProductImageMimeType(parsed.declaredMimeType);
  validateProductImageByteSize(parsed.declaredByteSize);
  const objectPath = createProductImageObjectPath(parsed.productId, declaredMimeType);
  assertSafeProductImageObjectPath(parsed.productId, objectPath);

  const { data: pendingUpload, error: pendingError } = await asAnyClient(supabase)
    .from("product_image_uploads")
    .insert({
      product_id: parsed.productId,
      bucket_id: PRODUCT_IMAGES_BUCKET,
      object_path: objectPath,
      declared_mime_type: declaredMimeType,
      declared_byte_size: parsed.declaredByteSize,
      created_by: staff.id,
    })
    .select("id, object_path")
    .single();

  if (pendingError || !pendingUpload) {
    throw new CatalogueError("PENDING_UPLOAD_FAILED", "Impossible de préparer l'envoi de l'image.");
  }

  const createdPendingUpload = pendingUpload as { id: string };

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(objectPath, { upsert: false });

  if (error || !data) {
    await asAnyClient(supabase)
      .from("product_image_uploads")
      .update({ status: "FAILED" })
      .eq("id", createdPendingUpload.id);
    throw new CatalogueError("SIGNED_UPLOAD_FAILED", "Impossible de créer l'URL d'envoi.");
  }

  return {
    pendingUploadId: createdPendingUpload.id,
    bucketId: PRODUCT_IMAGES_BUCKET,
    objectPath: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
    maxBytes: PRODUCT_IMAGE_MAX_BYTES,
    contentType: declaredMimeType,
  };
}

export async function finalizeProductImageUpload(input: FinalizeImageUploadInput) {
  const parsed = finalizeImageUploadSchema.parse(input);
  const staff = await requireActiveStaff();
  assertCanManageProducts(staff);

  const supabase = await createSupabaseServerClient();
  await getProductForImageUpload(supabase, parsed.productId);

  const { data: pendingUpload, error: pendingError } = await asAnyClient(supabase)
    .from("product_image_uploads")
    .select(
      "id, product_id, bucket_id, object_path, declared_mime_type, declared_byte_size, status, created_by, expires_at",
    )
    .eq("id", parsed.pendingUploadId)
    .eq("product_id", parsed.productId)
    .maybeSingle();

  if (pendingError) {
    throw new CatalogueError("PENDING_UPLOAD_LOOKUP_FAILED", "Impossible de vérifier l'envoi.");
  }

  const upload = pendingUpload as PendingUploadRow | null;

  if (!upload || upload.status !== "PENDING") {
    throw new CatalogueError("PENDING_UPLOAD_INVALID", "L'envoi d'image est introuvable ou déjà traité.");
  }

  if (upload.created_by !== staff.id || new Date(upload.expires_at).getTime() < Date.now()) {
    throw new CatalogueError("PENDING_UPLOAD_EXPIRED", "L'envoi d'image a expiré.");
  }

  const objectPath = assertSafeProductImageObjectPath(parsed.productId, upload.object_path);
  const { data: exists, error: existsError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .exists(objectPath);

  if (existsError || !exists) {
    throw new CatalogueError("STORAGE_OBJECT_MISSING", "Le fichier envoyé est introuvable.");
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .download(objectPath);

  if (downloadError || !blob) {
    throw new CatalogueError("STORAGE_DOWNLOAD_FAILED", "Impossible de valider l'image envoyée.");
  }

  const bytes = await readBlobBytes(blob);

  try {
    validateProductImageByteSize(bytes.byteLength);
    validateImageBytes(bytes, upload.declared_mime_type);
  } catch (error) {
    await deleteStorageObjectSafely(supabase, objectPath);
    await asAnyClient(supabase)
      .from("product_image_uploads")
      .update({ status: "FAILED" })
      .eq("id", upload.id);
    throw error;
  }

  const { data: image, error: insertError } = await asAnyClient(supabase)
    .from("product_images")
    .insert({
      product_id: parsed.productId,
      bucket_id: PRODUCT_IMAGES_BUCKET,
      object_path: objectPath,
      storage_path: objectPath,
      image_url: null,
      alt_text: parsed.altText,
      sort_order: parsed.sortOrder,
      approved: true,
      active: true,
      is_primary: parsed.isPrimary,
      mime_type: upload.declared_mime_type,
      byte_size: bytes.byteLength,
      created_by: staff.id,
    })
    .select("id, product_id, object_path")
    .single();

  if (insertError || !image) {
    await deleteStorageObjectSafely(supabase, objectPath);
    throw new CatalogueError("IMAGE_RECORD_FAILED", "Impossible d'enregistrer l'image produit.");
  }

  const createdImage = image as { id: string };

  await asAnyClient(supabase)
    .from("product_image_uploads")
    .update({ status: "FINALIZED", finalized_at: new Date().toISOString() })
    .eq("id", upload.id);

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_IMAGE_FINALIZED",
    resourceType: "product_image",
    resourceId: createdImage.id,
    metadata: {
      product_id: parsed.productId,
      bucket_id: PRODUCT_IMAGES_BUCKET,
      mime_type: upload.declared_mime_type,
      byte_size: bytes.byteLength,
    },
  });

  return {
    imageId: createdImage.id,
    productId: parsed.productId,
    bucketId: PRODUCT_IMAGES_BUCKET,
    objectPath,
  };
}

export async function deleteProductImage(input: { productId: string; imageId: string }) {
  const staff = await requireActiveStaff();
  assertCanManageProducts(staff);
  const supabase = await createSupabaseServerClient();

  const { data: image, error } = await asAnyClient(supabase)
    .from("product_images")
    .select("id, product_id, bucket_id, object_path, storage_path, active, approved")
    .eq("id", input.imageId)
    .eq("product_id", input.productId)
    .maybeSingle();

  if (error) {
    throw new CatalogueError("IMAGE_LOOKUP_FAILED", "Impossible de vérifier l'image.");
  }

  if (!image) {
    throw new CatalogueError("IMAGE_NOT_FOUND", "Image introuvable.");
  }

  const loadedImage = image as {
    object_path: string | null;
    storage_path: string | null;
  };
  const objectPath = loadedImage.object_path ?? loadedImage.storage_path;

  if (!objectPath) {
    throw new CatalogueError("IMAGE_OBJECT_MISSING", "L'image n'a pas de chemin de stockage.");
  }

  await getProductForImageUpload(supabase, input.productId);

  const removed = await deleteStorageObjectSafely(supabase, objectPath);

  if (!removed) {
    await auditCatalogueEvent({
      actorId: staff.id,
      action: "CATALOGUE_IMAGE_CLEANUP_FAILED",
      resourceType: "product_image",
      resourceId: input.imageId,
      metadata: { product_id: input.productId, bucket_id: PRODUCT_IMAGES_BUCKET },
    });
    throw new CatalogueError("IMAGE_DELETE_FAILED", "Impossible de supprimer le fichier image.");
  }

  const { error: deleteError } = await asAnyClient(supabase)
    .from("product_images")
    .delete()
    .eq("id", input.imageId)
    .eq("product_id", input.productId);

  if (deleteError) {
    throw new CatalogueError("IMAGE_RECORD_DELETE_FAILED", "Impossible de supprimer la référence image.");
  }

  await auditCatalogueEvent({
    actorId: staff.id,
    action: "CATALOGUE_IMAGE_DELETED",
    resourceType: "product_image",
    resourceId: input.imageId,
    metadata: { product_id: input.productId, bucket_id: PRODUCT_IMAGES_BUCKET },
  });

  return { imageId: input.imageId, deleted: true };
}

export async function replaceProductImage(input: {
  productId: string;
  oldImageId: string;
  pendingUploadId: string;
  altText: string;
  sortOrder?: number;
  isPrimary?: boolean;
}) {
  const newImage = await finalizeProductImageUpload({
    productId: input.productId,
    pendingUploadId: input.pendingUploadId,
    altText: input.altText,
    sortOrder: input.sortOrder ?? 0,
    isPrimary: input.isPrimary ?? false,
  });

  try {
    await deleteProductImage({ productId: input.productId, imageId: input.oldImageId });
  } catch {
    const staff = await requireActiveStaff();
    await auditCatalogueEvent({
      actorId: staff.id,
      action: "CATALOGUE_IMAGE_CLEANUP_FAILED",
      resourceType: "product_image",
      resourceId: input.oldImageId,
      metadata: { product_id: input.productId, replacement_image_id: newImage.imageId },
    });
  }

  return newImage;
}

export async function getProductImagePublicUrl(objectPath: string) {
  const extension = objectPath.split(".").pop();

  if (!extension || !Object.values(PRODUCT_IMAGE_EXTENSIONS).includes(extension as "jpg" | "png" | "webp")) {
    throw new CatalogueError("IMAGE_PATH_INVALID", "Chemin d'image invalide.");
  }

  const supabase = await createSupabaseServerClient();
  return supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}
