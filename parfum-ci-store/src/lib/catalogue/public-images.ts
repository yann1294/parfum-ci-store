import { PRODUCT_IMAGES_BUCKET } from "@/lib/catalogue/constants";
import { getPublicEnv } from "@/lib/env/public";

export function getPublicProductImageUrl(objectPath: string) {
  const publicEnv = getPublicEnv();
  const baseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encodedPath}`;
}
