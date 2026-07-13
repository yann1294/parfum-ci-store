"use server";

import { auditAdminAuthEvent } from "@/lib/audit/admin-auth";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logoutAction() {
  const user = await requireAuthenticatedUser();
  await auditAdminAuthEvent({ actorId: user.id, action: "ADMIN_LOGOUT" });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

export async function assertCanManageProductsAction() {
  await requireRole(["OWNER", "ADMIN"]);
  return { ok: true };
}
