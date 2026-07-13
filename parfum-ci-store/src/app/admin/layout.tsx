import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopBar } from "@/components/layout/admin-top-bar";
import { canAccessAdminPath, getAdminNavigation } from "@/lib/auth/navigation";
import { requireActiveStaff } from "@/lib/auth/server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentPath = (await headers()).get("x-current-path") ?? "/admin";
  const staff = await requireActiveStaff({ mode: "redirect", returnPath: currentPath });
  const pathname = currentPath.split("?")[0] ?? "/admin";

  if (!canAccessAdminPath(staff, pathname)) {
    redirect("/acces-refuse");
  }

  const navigation = getAdminNavigation(staff);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar items={navigation} />
      <div className="min-h-screen lg:pl-72">
        <AdminTopBar staff={staff} />
        <main id="contenu" className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
