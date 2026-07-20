export type AdminEntityListFilters = {
  q?: string;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  sort?: "name_asc" | "name_desc" | "newest";
  page?: number;
  pageSize?: number;
};

export type AdminVariantListFilters = {
  q?: string;
  active?: "ALL" | "ACTIVE" | "INACTIVE";
  concentration?: string;
  sizeMl?: number;
  sort?: "sku_asc" | "sku_desc" | "size_asc" | "price_asc" | "price_desc" | "newest";
  page?: number;
  pageSize?: number;
};

export const ADMIN_SEARCH_MAX_LENGTH = 120;

export const ADMIN_ENTITY_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_VARIANT_DEFAULT_PAGE_SIZE = 10;
export const ADMIN_MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }

  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeAdminSearch(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return undefined;
  return trimmed.slice(0, ADMIN_SEARCH_MAX_LENGTH);
}

export function normalizeAdminEntityListFilters(
  input: Record<string, string | undefined> | AdminEntityListFilters = {},
): Required<Pick<AdminEntityListFilters, "status" | "sort" | "page" | "pageSize">> &
  Pick<AdminEntityListFilters, "q"> {
  const status = input.status === "ACTIVE" || input.status === "INACTIVE" ? input.status : "ALL";
  const sort =
    input.sort === "name_desc" || input.sort === "newest" || input.sort === "name_asc"
      ? input.sort
      : "name_asc";
  const page = parsePositiveInteger(input.page) ?? 1;
  const pageSize = Math.min(
    parsePositiveInteger(input.pageSize) ?? ADMIN_ENTITY_DEFAULT_PAGE_SIZE,
    ADMIN_MAX_PAGE_SIZE,
  );

  return {
    q: normalizeAdminSearch(input.q),
    status,
    sort,
    page,
    pageSize,
  };
}

export function normalizeAdminVariantListFilters(
  input: Record<string, string | undefined> | AdminVariantListFilters = {},
): Required<Pick<AdminVariantListFilters, "active" | "sort" | "page" | "pageSize">> &
  Pick<AdminVariantListFilters, "q" | "concentration" | "sizeMl"> {
  const active = input.active === "ACTIVE" || input.active === "INACTIVE" ? input.active : "ALL";
  const sort =
    input.sort === "sku_desc" ||
    input.sort === "size_asc" ||
    input.sort === "price_asc" ||
    input.sort === "price_desc" ||
    input.sort === "newest" ||
    input.sort === "sku_asc"
      ? input.sort
      : "sku_asc";
  const page = parsePositiveInteger(input.page) ?? 1;
  const pageSize = Math.min(
    parsePositiveInteger(input.pageSize) ?? ADMIN_VARIANT_DEFAULT_PAGE_SIZE,
    ADMIN_MAX_PAGE_SIZE,
  );
  const sizeMl = parsePositiveInteger(input.sizeMl);

  return {
    q: normalizeAdminSearch(input.q),
    active,
    concentration:
      typeof input.concentration === "string" && input.concentration.trim()
        ? input.concentration.trim()
        : undefined,
    sizeMl,
    sort,
    page,
    pageSize,
  };
}
