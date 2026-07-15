export function formatXof(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} F CFA`;
}

export function parseXofInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/[^\d]/g, "");
  return normalized ? Number.parseInt(normalized, 10) : 0;
}

export function parseNotes(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatNotes(notes: string[]) {
  return notes.join(", ");
}
