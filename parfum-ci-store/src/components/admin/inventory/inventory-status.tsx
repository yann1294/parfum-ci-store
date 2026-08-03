import { Badge } from "@/components/ui/badge";
import {
  inventoryOperationLabel,
  inventoryStatusLabel,
  productStatusLabel,
  variantStateLabel,
  type InventoryStatus,
  type InventoryTransactionType,
  type ProductStatus,
} from "@/lib/inventory/admin";

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  if (status === "OUT_OF_STOCK") return <Badge variant="destructive">{inventoryStatusLabel(status)}</Badge>;
  if (status === "LOW_STOCK" || status === "UNCONFIGURED") {
    return <Badge variant="secondary">{inventoryStatusLabel(status)}</Badge>;
  }
  return <Badge>{inventoryStatusLabel(status)}</Badge>;
}

export function VariantStateBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "default" : "secondary"}>{variantStateLabel(active)}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>{productStatusLabel(status)}</Badge>;
}

export function MovementTypeBadge({ type }: { type: InventoryTransactionType }) {
  const variant = type === "DAMAGED" || type === "SOLD" ? "destructive" : type === "RESERVED" ? "secondary" : "default";
  return <Badge variant={variant}>{inventoryOperationLabel(type)}</Badge>;
}
