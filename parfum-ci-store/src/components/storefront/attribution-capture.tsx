"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { captureFirstTouch } from "@/lib/storefront/attribution";

export function AttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureFirstTouch(searchParams.toString());
  }, [searchParams]);

  return null;
}
