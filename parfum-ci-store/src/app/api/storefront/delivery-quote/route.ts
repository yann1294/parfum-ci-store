import { NextResponse } from "next/server";

import { deliveryQuoteRequestSchema, quoteDelivery } from "@/lib/settings/delivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4_000) throw new Error("INVALID");
    const parsed = deliveryQuoteRequestSchema.safeParse(JSON.parse(raw));
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
