import "server-only";

import { redirect } from "next/navigation";

import { authDiagnostic, getAuthDiagnosticRequestId } from "@/lib/auth/diagnostics";
import {
  AuthenticationError,
  AuthorizationError,
  InactiveStaffError,
  StaffProfileLookupError,
  StaffProfileMissingError,
} from "@/lib/auth/errors";
import {
  hasRole,
  canManageInventory as canManageInventoryForStaff,
  canManageMessages as canManageMessagesForStaff,
  canManageOrders as canManageOrdersForStaff,
  canManageProducts as canManageProductsForStaff,
  canManageSettings as canManageSettingsForStaff,
  type AppRole,
  type StaffProfile,
} from "@/lib/auth/permissions";
import { getLoginPath, getSafeReturnPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RequireOptions = {
  mode?: "throw" | "redirect";
  returnPath?: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
};

function toStaffProfile(profile: ProfileRow): StaffProfile {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    active: profile.active,
  };
}

function handleUnauthenticated(options?: RequireOptions): never {
  if (options?.mode === "redirect") {
    redirect(getLoginPath(getSafeReturnPath(options.returnPath)));
  }

  throw new AuthenticationError();
}

function handleDenied(options?: RequireOptions): never {
  if (options?.mode === "redirect") {
    redirect("/acces-refuse");
  }

  throw new AuthorizationError();
}

export async function requireAuthenticatedUser(options?: RequireOptions) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || !subject) {
    handleUnauthenticated(options);
  }

  return {
    id: subject,
    claims: data.claims,
  };
}

export async function requireActiveStaff(options?: RequireOptions) {
  const requestId = getAuthDiagnosticRequestId();
  const user = await requireAuthenticatedUser(options);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    authDiagnostic("STAFF_PROFILE_LOOKUP_FAILED", { requestId });
    throw new StaffProfileLookupError();
  }

  if (!data) {
    if (options?.mode === "redirect") {
      redirect("/acces-refuse");
    }

    throw new StaffProfileMissingError();
  }

  const staff = toStaffProfile(data);

  if (!staff.active) {
    authDiagnostic("STAFF_PROFILE_INACTIVE", { requestId });
    if (options?.mode === "redirect") {
      redirect("/acces-refuse");
    }

    throw new InactiveStaffError();
  }

  authDiagnostic("STAFF_PROFILE_FOUND", { requestId });
  return staff;
}

export async function requireRole(roles: AppRole[], options?: RequireOptions) {
  const staff = await requireActiveStaff(options);

  if (!hasRole(staff, roles)) {
    handleDenied(options);
  }

  return staff;
}

export async function canManageProducts(options?: RequireOptions) {
  const staff = await requireActiveStaff(options);
  return canManageProductsForStaff(staff);
}

export async function canManageInventory(options?: RequireOptions) {
  const staff = await requireActiveStaff(options);
  return canManageInventoryForStaff(staff);
}

export async function canManageOrders(options?: RequireOptions) {
  const staff = await requireActiveStaff(options);
  return canManageOrdersForStaff(staff);
}

export async function canManageMessages(options?: RequireOptions) {
  const staff = await requireActiveStaff(options);
  return canManageMessagesForStaff(staff);
}

export async function canManageSettings(options?: RequireOptions) {
  const staff = await requireActiveStaff(options);
  return canManageSettingsForStaff(staff);
}
