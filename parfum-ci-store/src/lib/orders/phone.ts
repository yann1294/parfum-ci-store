export type PhoneNormalizationResult =
  | { ok: true; value: string }
  | { ok: false; code: "ORDER_INVALID_PHONE" };

const CI_LOCAL_PREFIX = /^(01|05|07|21|25|27)/;

export function normalizeCoteDIvoirePhoneResult(value: string, required = true): PhoneNormalizationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? { ok: false, code: "ORDER_INVALID_PHONE" } : { ok: true, value: "" };
  }

  const compact = trimmed
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/[\s().\-\u2010-\u2015]/g, "");
  if (/[^0-9+]/.test(compact)) return { ok: false, code: "ORDER_INVALID_PHONE" };
  if (compact.includes("+") && (!compact.startsWith("+") || compact.slice(1).includes("+"))) {
    return { ok: false, code: "ORDER_INVALID_PHONE" };
  }

  let localDigits: string;
  if (compact.startsWith("+225")) {
    localDigits = compact.slice(4);
  } else if (compact.startsWith("00225")) {
    localDigits = compact.slice(5);
  } else if (compact.startsWith("225")) {
    localDigits = compact.slice(3);
  } else if (compact.startsWith("+") || compact.startsWith("00")) {
    return { ok: false, code: "ORDER_INVALID_PHONE" };
  } else {
    localDigits = compact;
  }

  if (!/^[0-9]{10}$/.test(localDigits)) return { ok: false, code: "ORDER_INVALID_PHONE" };
  if (!CI_LOCAL_PREFIX.test(localDigits)) return { ok: false, code: "ORDER_INVALID_PHONE" };

  return { ok: true, value: `+225${localDigits}` };
}

export function normalizeCoteDIvoirePhone(value: string, required = true) {
  const result = normalizeCoteDIvoirePhoneResult(value, required);
  if (!result.ok) throw new Error(result.code);
  return result.value || undefined;
}
