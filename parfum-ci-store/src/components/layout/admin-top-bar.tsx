import { Bell, UserCircle } from "lucide-react";

import { logoutAction } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleLabel, type StaffProfile } from "@/lib/auth/permissions";

export function AdminTopBar({ staff }: { staff: StaffProfile }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Espace administrateur</p>
          <p className="font-heading text-xl font-semibold">Opérations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-4" aria-hidden="true" />
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" aria-label="Compte admin" />}
            >
              <UserCircle className="size-4" aria-hidden="true" />
              {staff.fullName}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block text-sm font-medium">{staff.fullName}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {getRoleLabel(staff.role)}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <form action={logoutAction}>
                  <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                    Déconnexion
                  </DropdownMenuItem>
                </form>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
