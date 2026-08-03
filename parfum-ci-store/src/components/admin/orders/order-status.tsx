import { Badge } from "@/components/ui/badge";
import {
  orderSourceLabel,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  type OrderSource,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders/admin";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variant = status === "CANCELLED" ? "destructive" : status === "DELIVERED" ? "default" : "secondary";
  return <Badge variant={variant}>{orderStatusLabel(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant = status === "PAID" ? "default" : status === "FAILED" || status === "REFUNDED" ? "destructive" : "secondary";
  return <Badge variant={variant}>{paymentStatusLabel(status)}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: string }) {
  return <Badge variant="outline">{paymentMethodLabel(method)}</Badge>;
}

export function OrderSourceBadge({ source }: { source: OrderSource }) {
  return <Badge variant="outline">{orderSourceLabel(source)}</Badge>;
}
