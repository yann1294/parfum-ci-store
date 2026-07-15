import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditMetadata } from "@/lib/catalogue/types";

export type CatalogueAuditAction =
  | "CATALOGUE_BRAND_CREATED"
  | "CATALOGUE_BRAND_UPDATED"
  | "CATALOGUE_CATEGORY_CREATED"
  | "CATALOGUE_CATEGORY_UPDATED"
  | "CATALOGUE_PRODUCT_CREATED"
  | "CATALOGUE_PRODUCT_UPDATED"
  | "CATALOGUE_PRODUCT_ACTIVATED"
  | "CATALOGUE_PRODUCT_ARCHIVED"
  | "CATALOGUE_VARIANT_CREATED"
  | "CATALOGUE_VARIANT_UPDATED"
  | "CATALOGUE_VARIANT_DEACTIVATED"
  | "CATALOGUE_IMAGE_FINALIZED"
  | "CATALOGUE_IMAGE_REPLACED"
  | "CATALOGUE_IMAGE_DELETED"
  | "CATALOGUE_IMAGE_CLEANUP_FAILED";

type CatalogueAuditEvent = {
  actorId: string;
  action: CatalogueAuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: AuditMetadata;
};

export async function auditCatalogueEvent(event: CatalogueAuditEvent) {
  try {
    await createSupabaseAdminClient()
      .from("audit_logs")
      .insert({
        actor_id: event.actorId,
        action: event.action,
        resource_type: event.resourceType,
        resource_id: event.resourceId ?? null,
        metadata: event.metadata ?? {},
      });
  } catch {
    // Optional audit logging must not leak sensitive values or break catalogue flows.
  }
}
