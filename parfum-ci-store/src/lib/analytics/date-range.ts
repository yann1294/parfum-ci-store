import { z } from "zod";

export const dashboardRanges = ["7d", "30d", "90d"] as const;
export type DashboardRange = (typeof dashboardRanges)[number];

const rangeSchema = z.enum(dashboardRanges);
const rangeDays: Record<DashboardRange, number> = { "7d": 7, "30d": 30, "90d": 90 };

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function normalizeDashboardRange(value: unknown): DashboardRange {
  const candidate = typeof value === "string" ? value : undefined;
  const parsed = rangeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : "30d";
}

function zonedParts(date: Date, timezone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function timezoneOffsetMs(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function businessLocalDateTimeToUtc(parts: LocalDateTime, timezone: string) {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let candidate = new Date(localAsUtc);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    candidate = new Date(localAsUtc - timezoneOffsetMs(candidate, timezone));
  }
  return candidate;
}

function shiftLocalDate(parts: Pick<LocalDateTime, "year" | "month" | "day">, days: number) {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function localMidnight(parts: Pick<LocalDateTime, "year" | "month" | "day">, timezone: string) {
  return businessLocalDateTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timezone);
}

export function getBusinessDateRange({
  range,
  timezone,
  now = new Date(),
}: {
  range: DashboardRange;
  timezone: string;
  now?: Date;
}) {
  const localNow = zonedParts(now, timezone);
  const today = { year: localNow.year, month: localNow.month, day: localNow.day };
  const tomorrow = shiftLocalDate(today, 1);
  const rangeStartDate = shiftLocalDate(today, -(rangeDays[range] - 1));
  const todayStart = localMidnight(today, timezone);
  const todayEnd = localMidnight(tomorrow, timezone);
  const rangeStart = localMidnight(rangeStartDate, timezone);

  return {
    range,
    timezone,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: todayEnd.toISOString(),
    todayStart: todayStart.toISOString(),
    todayEnd: todayEnd.toISOString(),
    days: rangeDays[range],
  };
}
