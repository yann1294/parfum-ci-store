import { NextResponse } from "next/server";

import { readBoundedJson } from "@/lib/http/read-bounded-json";
import { deliveryQuoteRequestSchema, quoteDelivery } from "@/lib/settings/delivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = deliveryQuoteRequestSchema.safeParse(await readBoundedJson(request, 4_000));
    if (!parsed.success) throw new Error("INVALID");
    const quote = await quoteDelivery(parsed.data);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { status: "UNAVAILABLE", reason: "SETTINGS_UNAVAILABLE" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
