import "server-only";

import { z } from "zod";

import { formatXof } from "@/lib/catalogue/format";
import { deliveryMethodLabel, orderStatusLabel, paymentInstructionForMethod, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders/display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCheckoutSettings } from "@/lib/settings/service";
import type { Database } from "@/types/database.types";

export const notificationTemplateKeys = [
  "admin_order_created",
  "customer_order_received",
  "order_confirmed",
  "order_preparing",
  "order_ready_for_pickup",
  "order_out_for_delivery",
  "order_delivered",
  "order_cancelled",
  "order_returned",
  "order_payment_status_changed",
  "low_stock",
  "contact_message_received",
] as const;

export type NotificationTemplateKey = (typeof notificationTemplateKeys)[number];

export type RenderedNotification = {
  subject: string;
  html: string;
  text: string;
  summary: string;
};

const notificationPayloadSchema = z.object({
  order_id: z.uuid().optional(),
  order_number: z.string().trim().max(40).optional(),
  status: z.string().trim().max(40).optional(),
  payment_status: z.string().trim().max(40).optional(),
  variant_id: z.uuid().optional(),
  message_id: z.uuid().optional(),
}).passthrough();

type OrderSnapshot = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  city: string;
  commune: string | null;
  deliveryMethod: string;
  paymentMethod: Database["public"]["Enums"]["payment_method"];
  paymentStatus: Database["public"]["Enums"]["payment_status"];
  orderStatus: Database["public"]["Enums"]["order_status"];
  subtotalXof: number;
  deliveryFeeXof: number;
  totalXof: number;
  items: Array<{ productName: string; variantLabel: string; quantity: number; unitPriceXof: number; totalPriceXof: number }>;
};

type ContactMessageSnapshot = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  source: string;
  subject: string | null;
  body: string;
  orderNumber: string | null;
  productSnapshot: Record<string, unknown>;
  createdAt: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(siteUrl: string, path: string) {
  return new URL(path, siteUrl).toString();
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="fr"><body><main style="font-family:Arial,sans-serif;line-height:1.5;color:#171717;max-width:640px"><h1>${escapeHtml(title)}</h1>${body}<hr><p style="font-size:12px;color:#666">Parfum CI - message transactionnel.</p></main></body></html>`;
}

async function loadOrderSnapshot(orderId: string | undefined, orderNumber: string | undefined): Promise<OrderSnapshot | null> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, delivery_city, delivery_area, delivery_method, payment_method, payment_status, status, subtotal_xof, delivery_fee_xof, total_xof")
    .limit(1);
  if (orderId) query = query.eq("id", orderId);
  else if (orderNumber) query = query.eq("order_number", orderNumber);
  else return null;

  const { data: order, error } = await query.single();
  if (error || !order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, variant_name, size_ml, concentration, quantity, unit_price_xof, total_price_xof")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return {
    id: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    city: order.delivery_city,
    commune: order.delivery_area,
    deliveryMethod: order.delivery_method,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    orderStatus: order.status,
    subtotalXof: order.subtotal_xof,
    deliveryFeeXof: order.delivery_fee_xof,
    totalXof: order.total_xof,
    items: (items ?? []).map((item) => ({
      productName: item.product_name,
      variantLabel: item.variant_name || [item.size_ml ? `${item.size_ml} ml` : null, item.concentration].filter(Boolean).join(" · "),
      quantity: item.quantity,
      unitPriceXof: item.unit_price_xof,
      totalPriceXof: item.total_price_xof,
    })),
  };
}

function orderLines(order: OrderSnapshot) {
  return order.items
    .map((item) => `- ${item.quantity} x ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""}: ${formatXof(item.totalPriceXof)}`)
    .join("\n");
}

function orderHtml(order: OrderSnapshot, adminUrl?: string) {
  const items = order.items.map((item) => `<li>${escapeHtml(item.quantity)} x ${escapeHtml(item.productName)}${item.variantLabel ? ` (${escapeHtml(item.variantLabel)})` : ""} - ${escapeHtml(formatXof(item.totalPriceXof))}</li>`).join("");
  return [
    `<p>Commande <strong>${escapeHtml(order.orderNumber)}</strong></p>`,
    `<p>Statut: ${escapeHtml(orderStatusLabel(order.orderStatus))}<br>Paiement: ${escapeHtml(paymentStatusLabel(order.paymentStatus))}</p>`,
    `<ul>${items}</ul>`,
    `<p>Sous-total: ${escapeHtml(formatXof(order.subtotalXof))}<br>Livraison: ${escapeHtml(formatXof(order.deliveryFeeXof))}<br>Total: ${escapeHtml(formatXof(order.totalXof))}</p>`,
    adminUrl ? `<p><a href="${escapeHtml(adminUrl)}">Ouvrir la commande dans l'administration</a></p>` : "",
  ].join("");
}

async function renderOrderTemplate(key: NotificationTemplateKey, payload: z.infer<typeof notificationPayloadSchema>, siteUrl: string): Promise<RenderedNotification> {
  const order = await loadOrderSnapshot(payload.order_id, payload.order_number);
  if (!order) throw new Error("NOTIFICATION_TEMPLATE_ORDER_NOT_FOUND");
  const adminUrl = absoluteUrl(siteUrl, `/admin/commandes/${encodeURIComponent(order.id)}`);
  const trackingUrl = absoluteUrl(siteUrl, "/suivi-commande");
  const checkoutSettings = await getCheckoutSettings();
  const paymentInstructions = paymentInstructionForMethod(order.paymentMethod, checkoutSettings, order.orderNumber) ?? [];

  const titles: Partial<Record<NotificationTemplateKey, string>> = {
    admin_order_created: `Nouvelle commande ${order.orderNumber}`,
    customer_order_received: `Commande recue ${order.orderNumber}`,
    order_confirmed: `Commande confirmee ${order.orderNumber}`,
    order_preparing: `Commande en preparation ${order.orderNumber}`,
    order_ready_for_pickup: `Commande prete a recuperer ${order.orderNumber}`,
    order_out_for_delivery: `Commande en livraison ${order.orderNumber}`,
    order_delivered: `Commande livree ${order.orderNumber}`,
    order_cancelled: `Commande annulee ${order.orderNumber}`,
    order_returned: `Commande retournee ${order.orderNumber}`,
    order_payment_status_changed: `Paiement mis a jour ${order.orderNumber}`,
    low_stock: "Stock faible",
  };

  const admin = key === "admin_order_created" || key === "order_payment_status_changed";
  const subject = titles[key] ?? `Notification ${order.orderNumber}`;
  const text = admin
    ? `${subject}\nClient: ${order.customerName}\nTelephone: ${order.customerPhone ?? "Non renseigne"}\nZone: ${order.city}${order.commune ? `, ${order.commune}` : ""}\nLivraison: ${deliveryMethodLabel(order.deliveryMethod)}\nPaiement: ${paymentMethodLabel(order.paymentMethod)} - ${paymentStatusLabel(order.paymentStatus)}\n${orderLines(order)}\nSous-total: ${formatXof(order.subtotalXof)}\nAdministration: connectez-vous puis recherchez ${order.orderNumber}.`
    : `${subject}\nVotre commande ${order.orderNumber} est au statut: ${orderStatusLabel(order.orderStatus)}.\n${orderLines(order)}\nSous-total: ${formatXof(order.subtotalXof)}\nFrais de livraison: ${formatXof(order.deliveryFeeXof)}\nTotal: ${formatXof(order.totalXof)}${paymentInstructions.length ? `\nInstructions de paiement:\n${paymentInstructions.join("\n")}` : ""}\nSuivi: ${trackingUrl}\nNe partagez jamais de PIN ou OTP.`;
  const instructionHtml = paymentInstructions.length ? `<h2>Instructions de paiement</h2>${paymentInstructions.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}` : "";
  const html = layout(subject, admin ? orderHtml(order, adminUrl) : `${orderHtml(order)}${instructionHtml}<p><a href="${escapeHtml(trackingUrl)}">Suivre ma commande</a></p><p>Ne partagez jamais de PIN ou OTP.</p>`);
  return { subject, html, text, summary: `${key}:${order.orderNumber}` };
}

async function renderLowStock(payload: z.infer<typeof notificationPayloadSchema>, siteUrl: string): Promise<RenderedNotification> {
  if (!payload.variant_id) throw new Error("NOTIFICATION_TEMPLATE_INVALID_PAYLOAD");
  const { data, error } = await createSupabaseAdminClient()
    .from("admin_inventory_variants")
    .select("variant_id, product_name, sku, size_ml, concentration, stock_on_hand, reserved_quantity, available_quantity, low_stock_threshold")
    .eq("variant_id", payload.variant_id)
    .single();
  if (error || !data) throw new Error("NOTIFICATION_TEMPLATE_VARIANT_NOT_FOUND");
  const subject = `Stock faible - ${data.product_name}`;
  const link = absoluteUrl(siteUrl, `/admin/inventaire/${data.variant_id}`);
  const text = `${subject}\nSKU: ${data.sku}\nDisponible: ${data.available_quantity}\nSeuil: ${data.low_stock_threshold}\nInventaire: ${link}`;
  const html = layout(subject, `<p>SKU: ${escapeHtml(data.sku)}</p><p>Disponible: ${escapeHtml(data.available_quantity)} / seuil ${escapeHtml(data.low_stock_threshold)}</p><p><a href="${escapeHtml(link)}">Ouvrir l'inventaire</a></p>`);
  return { subject, html, text, summary: `low_stock:${data.variant_id}` };
}

async function loadContactMessage(messageId: string | undefined): Promise<ContactMessageSnapshot | null> {
  if (!messageId) return null;
  const { data, error } = await (createSupabaseAdminClient() as never as {
    from(table: "contact_messages"): {
      select(columns: string): {
        eq(column: string, value: unknown): {
          single(): Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
        };
      };
    };
  })
    .from("contact_messages")
    .select("id, customer_name, customer_email, customer_phone, source, subject, body, order_number, product_snapshot, created_at")
    .eq("id", messageId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id as string,
    customerName: data.customer_name as string,
    customerEmail: data.customer_email as string | null,
    customerPhone: data.customer_phone as string | null,
    source: data.source as string,
    subject: data.subject as string | null,
    body: data.body as string,
    orderNumber: data.order_number as string | null,
    productSnapshot: ((data as { product_snapshot?: Record<string, unknown> | null }).product_snapshot ?? {}),
    createdAt: data.created_at as string,
  };
}

function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    WEBSITE: "Site web",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    WHATSAPP: "WhatsApp",
    PHONE: "Téléphone",
    EMAIL: "E-mail",
    OTHER: "Autre",
  };
  return labels[source] ?? "Message";
}

async function renderContactMessage(payload: z.infer<typeof notificationPayloadSchema>, siteUrl: string): Promise<RenderedNotification> {
  const message = await loadContactMessage(payload.message_id);
  if (!message) throw new Error("NOTIFICATION_TEMPLATE_MESSAGE_NOT_FOUND");
  const subject = `Nouveau message client - ${message.subject ?? sourceLabel(message.source)}`;
  const adminUrl = absoluteUrl(siteUrl, `/admin/messages/${encodeURIComponent(message.id)}`);
  const excerpt = message.body.slice(0, 500);
  const productName = typeof message.productSnapshot.productName === "string" ? message.productSnapshot.productName : null;
  const text = [
    subject,
    `Source: ${sourceLabel(message.source)}`,
    `Client: ${message.customerName}`,
    `Téléphone: ${message.customerPhone ?? "Non renseigné"}`,
    `E-mail: ${message.customerEmail ?? "Non renseigné"}`,
    message.orderNumber ? `Commande: ${message.orderNumber}` : null,
    productName ? `Produit: ${productName}` : null,
    `Message: ${excerpt}`,
    `Administration: ${adminUrl}`,
  ].filter(Boolean).join("\n");
  const html = layout(subject, [
    `<p>Source: ${escapeHtml(sourceLabel(message.source))}</p>`,
    `<p>Client: ${escapeHtml(message.customerName)}<br>Téléphone: ${escapeHtml(message.customerPhone ?? "Non renseigné")}<br>E-mail: ${escapeHtml(message.customerEmail ?? "Non renseigné")}</p>`,
    message.orderNumber ? `<p>Commande: ${escapeHtml(message.orderNumber)}</p>` : "",
    productName ? `<p>Produit: ${escapeHtml(productName)}</p>` : "",
    `<blockquote>${escapeHtml(excerpt)}</blockquote>`,
    `<p><a href="${escapeHtml(adminUrl)}">Ouvrir le message</a></p>`,
  ].join(""));
  return { subject, html, text, summary: `contact_message:${message.id}` };
}

export async function renderNotificationTemplate(input: {
  templateKey: string | null;
  payload: unknown;
  fallbackSubject: string | null;
  fallbackBody: string | null;
  siteUrl: string;
}): Promise<RenderedNotification> {
  const key = input.templateKey;
  const parsedPayload = notificationPayloadSchema.safeParse(input.payload);
  if (!parsedPayload.success) throw new Error("NOTIFICATION_TEMPLATE_INVALID_PAYLOAD");

  if (key && (notificationTemplateKeys as readonly string[]).includes(key)) {
    if (key === "low_stock") return renderLowStock(parsedPayload.data, input.siteUrl);
    if (key === "contact_message_received") return renderContactMessage(parsedPayload.data, input.siteUrl);
    return renderOrderTemplate(key as NotificationTemplateKey, parsedPayload.data, input.siteUrl);
  }

  const subject = input.fallbackSubject?.slice(0, 160) || "Notification Parfum CI";
  const text = input.fallbackBody?.slice(0, 2000) || subject;
  return { subject, text, html: layout(subject, `<p>${escapeHtml(text)}</p>`), summary: "fallback" };
}
