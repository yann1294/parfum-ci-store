import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Home,
  LayoutDashboard,
  MessageSquare,
  Palette,
  Settings,
  Tags,
} from "lucide-react";

const adminItems = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Catalogue", href: "/admin/catalogue", icon: Tags },
  { label: "Inventaire", href: "/admin/inventaire", icon: Boxes },
  { label: "Commandes", href: "/admin/commandes", icon: ClipboardList },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Design system", href: "/admin/design-system", icon: Palette },
  { label: "Paramètres", href: "/admin/parametres", icon: Settings },
];

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-heading text-2xl font-semibold"
        >
          <Home className="size-5" aria-hidden="true" />
          Parfum CI
        </Link>
      </div>
      <nav className="grid gap-1 p-4" aria-label="Navigation admin">
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
