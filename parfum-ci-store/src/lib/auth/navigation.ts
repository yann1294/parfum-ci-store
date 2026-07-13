import {
  canManageInventory,
  canManageMessages,
  canManageOrders,
  canManageSettings,
  canReadOrders,
  canReadProducts,
  type StaffProfile,
} from "@/lib/auth/permissions";

export type AdminNavigationItem = {
  label: string;
  href: string;
  module:
    | "dashboard"
    | "products"
    | "inventory"
    | "orders"
    | "customers"
    | "payments"
    | "messages"
    | "analytics"
    | "design-system"
    | "settings";
};

const adminNavigation: AdminNavigationItem[] = [
  { label: "Tableau de bord", href: "/admin", module: "dashboard" },
  { label: "Catalogue", href: "/admin/catalogue", module: "products" },
  { label: "Inventaire", href: "/admin/inventaire", module: "inventory" },
  { label: "Commandes", href: "/admin/commandes", module: "orders" },
  { label: "Clients", href: "/admin/clients", module: "customers" },
  { label: "Paiements", href: "/admin/paiements", module: "payments" },
  { label: "Messages", href: "/admin/messages", module: "messages" },
  { label: "Analytics", href: "/admin/analytics", module: "analytics" },
  { label: "Design system", href: "/admin/design-system", module: "design-system" },
  { label: "Paramètres", href: "/admin/parametres", module: "settings" },
];

export function getAdminNavigation(staff: StaffProfile) {
  return adminNavigation.filter((item) => {
    switch (item.module) {
      case "dashboard":
      case "analytics":
      case "design-system":
        return staff.active;
      case "products":
        return canReadProducts(staff);
      case "inventory":
        return canManageInventory(staff);
      case "orders":
        return canReadOrders(staff) || canManageOrders(staff);
      case "customers":
      case "payments":
        return canManageOrders(staff);
      case "messages":
        return canManageMessages(staff);
      case "settings":
        return canManageSettings(staff);
    }
  });
}
