export const DEFAULT_PRODUCT_RETURN_PATH = "/admin/produits";

export function getSafeProductReturnPath(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }

  let decoded = value;
  try {
    decoded = value.includes("%") ? decodeURIComponent(value) : value;
  } catch {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }

  try {
    const url = new URL(decoded, "https://admin.local");
    if (url.origin !== "https://admin.local" || url.pathname !== DEFAULT_PRODUCT_RETURN_PATH) {
      return DEFAULT_PRODUCT_RETURN_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }
}
