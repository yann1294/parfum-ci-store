import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
};

export function GET() {
  return NextResponse.json({ status: "ok" }, { headers });
}

export function HEAD() {
  return new Response(null, { status: 200, headers });
}
