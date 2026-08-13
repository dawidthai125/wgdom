/**
 * INGEST-01 — classify AFTER retain (non-blocking).
 */

import type { TenderDocumentClassHint } from "@/lib/tender-ingest/types";

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Hint only — NEVER used to drop documents on ingest. */
export function classifyDocumentHint(filename: string): TenderDocumentClassHint {
  const h = fold(filename);
  if (!h) return "UNKNOWN";
  if (/swz|formularz|oswiadcz|umowa|zalacznik\s*nr|ogloszenie/.test(h)) return "LEGAL";
  if (/przedmiar|kosztorys|obmiar|\.ath\b|\.nor\b|\.xml\b/.test(h)) return "COST";
  if (/projekt|schemat|rzut\b|rys\s|inwentaryz|stempel|arch-bud/.test(h)) return "PROJECT";
  if (/opinia|powierzchn|specyfik|\.jpe?g\b|\.png\b|thumbs\.db/.test(h)) return "SUPPORT";
  if (/\.pdf\b/.test(h)) return "UNKNOWN";
  return "UNKNOWN";
}

/** Cost parse eligibility — UNKNOWN PDF may still be queued if Owner marks / PDF przedmiar cues. */
export function isCostParseEligible(filename: string, classHint: TenderDocumentClassHint): boolean {
  if (classHint === "COST") return true;
  const h = fold(filename);
  if (/przedmiar|kosztorys|obmiar|\.ath\b|\.nor\b|\.xml\b|\.xlsx?\b/.test(h)) return true;
  return false;
}
