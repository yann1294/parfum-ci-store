"use client";

import { z } from "zod";

export type AttributionDto = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  capturedAt: string;
  expiresAt: string;
};

const STORAGE_KEY = "parfum-ci:first-touch";
const MAX_LENGTH = 120;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const attributionSchema = z
  .object({
    utmSource: z.string().trim().min(1).max(MAX_LENGTH).optional(),
    utmMedium: z.string().trim().min(1).max(MAX_LENGTH).optional(),
    utmCampaign: z.string().trim().min(1).max(MAX_LENGTH).optional(),
    utmTerm: z.string().trim().min(1).max(MAX_LENGTH).optional(),
    utmContent: z.string().trim().min(1).max(MAX_LENGTH).optional(),
    capturedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
  })
  .strict()
  .refine((value) => new Date(value.expiresAt).getTime() >= Date.now());

const allowed = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_term: "utmTerm",
  utm_content: "utmContent",
} as const;

function normalize(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, MAX_LENGTH);
  return /[\u0000-\u001f\u007f]/.test(trimmed) || !trimmed ? undefined : trimmed;
}

export function readAttribution() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = attributionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const value = parsed.data;
    if (new Date(value.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function captureFirstTouch(search: string) {
  if (readAttribution()) return null;
  const params = new URLSearchParams(search);
  const captured: Partial<AttributionDto> = {};

  for (const [queryKey, dtoKey] of Object.entries(allowed)) {
    const value = normalize(params.get(queryKey));
    if (value) {
      captured[dtoKey as keyof AttributionDto] = value;
    }
  }

  if (Object.keys(captured).length === 0) return null;
  const now = new Date();
  const dto: AttributionDto = {
    ...captured,
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dto));
  return dto;
}

export function clearAttributionForTests() {
  window.localStorage.removeItem(STORAGE_KEY);
}
