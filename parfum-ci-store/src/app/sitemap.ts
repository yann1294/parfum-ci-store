import type { MetadataRoute } from "next";

import { listActiveProducts } from "@/lib/catalogue/products";
import { absoluteUrl } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/catalogue", "/a-propos", "/livraison", "/contact"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
  }));
  const products = await listActiveProducts({ page: 1, pageSize: 48 });

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: absoluteUrl(`/parfums/${product.slug}`),
      lastModified: new Date(),
    })),
  ];
}
