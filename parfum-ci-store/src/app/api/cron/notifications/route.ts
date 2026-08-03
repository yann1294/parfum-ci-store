import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getNotificationConfig } from "@/lib/notifications/config";
import { processNotifications } from "@/lib/notifications/processor";

export const dynamic = "force-dynamic";

function safeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const config = getNotificationConfig();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!config.cronSecret || !safeEquals(token, config.cronSecret)) {
    return NextResponse.json(
      { ok: false, code: "CRON_UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const summary = await processNotifications(config.batchSize);
  return NextResponse.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return NextResponse.json(
    { ok: false, code: "METHOD_NOT_ALLOWED" },
    { status: 405, headers: { "Cache-Control": "no-store" } },
  );
}
