export const PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE = 8;
export const PUBLIC_CATALOGUE_MAX_PAGE_SIZE = 32;

export type CataloguePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  rangeStart: number;
  rangeEnd: number;
};

export function normalizePublicCataloguePage(value: unknown) {
  const page = typeof value === "number" ? value : Number.parseInt(String(value ?? "1"), 10);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function normalizePublicCataloguePageSize(value: unknown) {
  const pageSize = typeof value === "number" ? value : Number.parseInt(String(value ?? PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE), 10);
  if (!Number.isFinite(pageSize) || pageSize < 1) return PUBLIC_CATALOGUE_DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), PUBLIC_CATALOGUE_MAX_PAGE_SIZE);
}

export function getPublicCataloguePagination(input: {
  page?: unknown;
  pageSize?: unknown;
  total: number;
}): CataloguePagination {
  const pageSize = normalizePublicCataloguePageSize(input.pageSize);
  const total = Math.max(Math.floor(input.total), 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(normalizePublicCataloguePage(input.page), totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return {
    page,
    pageSize,
    total,
    totalPages,
    from,
    to,
    rangeStart: total === 0 ? 0 : from + 1,
    rangeEnd: Math.min(to + 1, total),
  };
}

export function pageWindow(currentPage: number, totalPages: number, radius = 2) {
  const start = Math.max(1, currentPage - radius);
  const end = Math.min(totalPages, currentPage + radius);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
