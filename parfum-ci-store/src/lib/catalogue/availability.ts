import type { AvailabilityStatus } from "@/lib/catalogue/types";

export function getAvailableQuantity(stockOnHand: number, reservedQuantity: number) {
  return Math.max(stockOnHand - reservedQuantity, 0);
}

export function getAvailabilityStatus(
  stockOnHand: number,
  reservedQuantity: number,
  lowStockThreshold: number,
): AvailabilityStatus {
  const availableQuantity = getAvailableQuantity(stockOnHand, reservedQuantity);

  if (availableQuantity === 0) {
    return "OUT_OF_STOCK";
  }

  if (availableQuantity <= lowStockThreshold) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}
