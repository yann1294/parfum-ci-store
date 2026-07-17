import Link from "next/link";
import type { ComponentType } from "react";
import {
  BarChart3,
  Boxes,
  FolderTree,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  MessageSquare,
  Palette,
  FileText,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

import type { AdminNavigationItem } from "@/lib/auth/navigation";

const navIcons: Record<AdminNavigationItem["module"], ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  products: Tags,
  brands: ShieldCheck,
  categories: FolderTree,
  inventory: Boxes,
  orders: ClipboardList,
  customers: Users,
  payments: CreditCard,
  messages: MessageSquare,
  analytics: BarChart3,
  "design-system": Palette,
  content: FileText,
  settings: Settings,
};

export function AdminSidebar({ items }: { items: AdminNavigationItem[] }) {
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
        {items.map((item) => {
          const Icon = navIcons[item.module];
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
