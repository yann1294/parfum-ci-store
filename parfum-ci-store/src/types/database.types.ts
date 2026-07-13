export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Enums: {
      app_role: "OWNER" | "ADMIN" | "INVENTORY_MANAGER" | "ORDER_MANAGER" | "CUSTOMER_SUPPORT";
      product_status: "DRAFT" | "ACTIVE" | "ARCHIVED";
      inventory_transaction_type:
        "RECEIVED" | "RESERVED" | "RELEASED" | "SOLD" | "RETURNED" | "DAMAGED" | "ADJUSTMENT";
      order_status:
        | "PENDING_CONFIRMATION"
        | "CONFIRMED"
        | "PREPARING"
        | "READY_FOR_PICKUP"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
        | "RETURNED";
      payment_status: "UNPAID" | "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
      payment_method:
        | "CASH_ON_DELIVERY"
        | "ORANGE_MONEY"
        | "MTN_MOMO"
        | "WAVE"
        | "MOOV_MONEY"
        | "BANK_TRANSFER"
        | "PAY_IN_STORE";
      order_source:
        | "WEBSITE"
        | "INSTAGRAM"
        | "FACEBOOK"
        | "TIKTOK"
        | "WHATSAPP"
        | "PHONE"
        | "PHYSICAL_STORE"
        | "OTHER";
      message_status: "NEW" | "OPEN" | "RESOLVED" | "SPAM";
      message_source:
        "WEBSITE" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WHATSAPP" | "PHONE" | "EMAIL" | "OTHER";
      notification_channel: "EMAIL" | "IN_APP";
      notification_status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
    };
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
