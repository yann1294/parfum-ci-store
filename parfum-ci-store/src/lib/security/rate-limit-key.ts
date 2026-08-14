import "server-only";

import { createHash } from "node:crypto";

export function hashRateLimitKey(namespace: string, material: string) {
  const digest = createHash("sha256").update(material.trim().toLowerCase()).digest("hex");
  return `${namespace}:${digest}`;
}

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
