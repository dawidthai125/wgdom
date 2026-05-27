/** 9 cyfr numeru PL (bez +48) — spójne z logowaniem pracownika. */
export function normalizePhone9(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.slice(-9);
}

/** E.164 dla wysyłki SMS (+48XXXXXXXXX). */
export function normalizePhoneE164(phone: string): string | null {
  const nine = normalizePhone9(phone);
  return nine ? `+48${nine}` : null;
}

/** SMSAPI / niektóre bramki: 48XXXXXXXXX bez plusa. */
export function normalizePhoneSmsApi(phone: string): string | null {
  const nine = normalizePhone9(phone);
  return nine ? `48${nine}` : null;
}
