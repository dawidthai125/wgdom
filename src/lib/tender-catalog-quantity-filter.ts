/**
 * P3-AUDIT-001-FIX-B — odfiltrowanie wierszy formularza SWZ/XLSX z katalogu ilości.
 * Nie trafiają do klasyfikacji ani wyceny katalogowej.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";

const CATALOG_QUANTITY_NOISE_RES: RegExp[] = [
  /^nr\s+krs\b/i,
  /^nr\s+regon\b/i,
  /^formularz oferty/i,
  /^adres e-mail/i,
  /^nr telefonu/i,
  /^https?:\/\//i,
  /^rodzaj przedsiebiorstwa/i,
  /^oswiadczam/i,
  /^tajemnice przedsiebiorstwa/i,
  /^w odpowiedzi na ogloszenie/i,
  /^oferujemy realizacje zamowienia/i,
  /^akceptujemy projektowane postanowienia/i,
  /^oferte sklada sie pod rygorem/i,
  /podpis osobisty/i,
  /^rodzaj \(nazwa\) informacji/i,
  /^w postepowaniu o udzielenie zamowienia/i,
  /^przedmiot zamowienia$/i,
  /^remont i przebudowa/i,
  /^w postepowaniu prowadzonym w trybie/i,
  /^zakres przedmiotu zamowienia/i,
  /^etap i\b/i,
  /^dokumentacja projektowa/i,
  /^wykonanie robot budowlanych/i,
  /^oferujemy okres gwarancji/i,
  /^okres gwarancji \d+/i,
  /^zamawiajacy ustala minimalny wymagany okres gwarancji/i,
  /^deklarujemy, ze do realizacji zamowienia/i,
  /bezrobotn/i,
  /^uzasadnienia zastrzezenia dokumentow/i,
  /^wm\/tp\//i,
];

/** Czy opis wygląda na pozycję roboczą (a nie klauzulę formularza ofertowego). */
export function isLikelyCatalogQuantityRow(description: string): boolean {
  const raw = (description || "").trim();
  if (!raw || raw.length < 4) return false;
  if (/^https?:\/\//i.test(raw)) return false;
  const folded = foldPolishText(raw);
  if (!folded) return false;
  for (const re of CATALOG_QUANTITY_NOISE_RES) {
    if (re.test(folded)) return false;
  }
  return true;
}
