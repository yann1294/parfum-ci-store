import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  return {
    rules: isProduction
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/connexion", "/auth", "/panier"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
