export function dashboardPercentage(value: number, total: number) {
  if (!Number.isInteger(value) || value < 0 || !Number.isInteger(total) || total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

export function formatDashboardDate(value: string, timezone: string, withTime = false) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

export function formatBucketDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export function messageSourceLabel(source: string) {
  return (
    {
      WEBSITE: "Site web",
      INSTAGRAM: "Instagram",
      FACEBOOK: "Facebook",
      TIKTOK: "TikTok",
      WHATSAPP: "WhatsApp",
      PHONE: "Téléphone",
      EMAIL: "E-mail",
      OTHER: "Autre",
    }[source] ?? "Autre"
  );
}

export function messageStatusLabel(status: string) {
  return (
    {
      NEW: "Nouveau",
      OPEN: "En cours",
      RESOLVED: "Résolu",
      SPAM: "Indésirable",
    }[status] ?? "Statut inconnu"
  );
}
