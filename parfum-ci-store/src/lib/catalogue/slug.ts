const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "catalogue",
  "connexion",
  "contact",
  "images",
  "produits",
]);

export function normalizeSlugSource(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function assertSafeSlug(slug: string) {
  if (!slug || RESERVED_SLUGS.has(slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid catalogue slug");
  }

  return slug;
}

export function generateProductSlug(name: string) {
  return assertSafeSlug(normalizeSlugSource(name));
}

export async function resolveSlugCollision(
  desiredSlug: string,
  exists: (candidate: string) => Promise<boolean>,
) {
  const baseSlug = assertSafeSlug(desiredSlug);

  if (!(await exists(baseSlug))) {
    return baseSlug;
  }

  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve catalogue slug collision");
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
