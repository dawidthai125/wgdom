/** Tymczasowo wyłącza privacy shield (np. gdy otwarty systemowy wybór pliku — blur okna). */
let suppressUntil = 0;

export function suppressPrivacyShieldBriefly(ms = 12000): void {
  suppressUntil = Date.now() + ms;
}

export function isPrivacyShieldSuppressed(): boolean {
  return Date.now() < suppressUntil;
}
