/** Dozwolone nazwy nadawców SMS — muszą być ACTIVE w panelu SMSAPI. */
export const SMS_SENDER_NAMES = ["W&GDOM", "W&G-Dawid", "W&G-Pawel", "W&G-Stan"] as const;

export type SmsSenderName = (typeof SMS_SENDER_NAMES)[number];

export function senderNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Domyślna nazwa nadawcy SMS dla zalogowanego użytkownika. */
export function smsFromForDisplayName(displayName: string): SmsSenderName {
  const first = displayName.trim().split(/\s+/)[0] || "";
  const ascii = first
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  if (ascii === "dawid") return "W&G-Dawid";
  if (ascii === "pawel") return "W&G-Pawel";
  if (ascii === "stanislaw") return "W&G-Stan";
  return "W&GDOM";
}

export function pickDefaultSmsFrom(displayName: string, activeNames: string[]): SmsSenderName {
  const preferred = smsFromForDisplayName(displayName);
  const activeKeys = new Set(activeNames.map(senderNameKey));
  if (activeKeys.has(senderNameKey(preferred))) return preferred;
  for (const name of SMS_SENDER_NAMES) {
    if (activeKeys.has(senderNameKey(name))) return name;
  }
  return preferred;
}

export function isActiveSmsSender(name: string, activeNames: string[]): boolean {
  const key = senderNameKey(name);
  return activeNames.some((a) => senderNameKey(a) === key);
}
