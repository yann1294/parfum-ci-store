"use client";

import { useTransition } from "react";

import { logoutAction } from "@/app/admin/actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function AdminLogoutMenuItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      nativeButton
      closeOnClick={false}
      disabled={pending}
      render={
        <button
          type="button"
          className="w-full"
          onClick={() => startTransition(() => logoutAction())}
        />
      }
    >
      {pending ? "Déconnexion..." : "Déconnexion"}
    </DropdownMenuItem>
  );
}
