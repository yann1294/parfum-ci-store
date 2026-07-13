const allowedReturnPathPattern = /^\/(?!\/)[\w\-./?=&%]*$/;

export function getSafeReturnPath(value: string | null | undefined, fallback = "/admin") {
  if (!value) {
    return fallback;
  }

  if (!allowedReturnPathPattern.test(value)) {
    return fallback;
  }

  if (value.startsWith("/connexion") || value.startsWith("/acces-refuse")) {
    return fallback;
  }

  return value;
}

export function getLoginPath(returnPath: string) {
  return `/connexion?retour=${encodeURIComponent(getSafeReturnPath(returnPath))}`;
}
