"use server";

import { z } from "zod";

import { addMessageNote, assignMessage, createManualMessage, transitionMessageStatus } from "@/lib/messages/admin";

const statusActionSchema = z.object({
  messageId: z.uuid(),
  targetStatus: z.enum(["NEW", "OPEN", "RESOLVED", "SPAM"]),
  reason: z.string().trim().max(300).optional(),
});

const assignActionSchema = z.object({
  messageId: z.uuid(),
  assignedTo: z.string().trim().optional(),
});

const noteActionSchema = z.object({
  messageId: z.uuid(),
  note: z.string().trim().min(1).max(2000),
});

export async function updateMessageStatusAction(input: unknown) {
  const parsed = statusActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "MESSAGE_INVALID_REQUEST", message: "Demande invalide." };
  return transitionMessageStatus(parsed.data);
}

export async function assignMessageAction(input: unknown) {
  const parsed = assignActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "MESSAGE_INVALID_REQUEST", message: "Demande invalide." };
  return assignMessage({ messageId: parsed.data.messageId, assignedTo: parsed.data.assignedTo || null });
}

export async function addMessageNoteAction(input: unknown) {
  const parsed = noteActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "MESSAGE_INVALID_REQUEST", message: "Note invalide." };
  return addMessageNote(parsed.data);
}

export async function createManualMessageAction(input: unknown) {
  return createManualMessage(input);
}
