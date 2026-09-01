/**
 * IK BOM Technology Research — Identity Gate.
 * ZERO invent workId · mismatch → HOLD before any ETICS/BOM contamination.
 */

export type IkBomIdentityGateStatus =
  | "OK"
  | "NO_WORK_ID"
  | "NO_DWELLING"
  | "NO_LINE"
  | "IDENTITY_MISMATCH"
  | "SUSPECT_CATEGORY_HEURISTIC";

export type IkBomIdentityGateResult = {
  status: IkBomIdentityGateStatus;
  workId: string | null;
  dwellingId: string;
  lineId: string;
  mismatchReasons: string[];
  suggestedNextActionPl: string;
  /** Extracted for diagnostics only — NEVER used as invented workId. */
  descriptionSignals: string[];
};

const ETICS_WORK_RE = /\betics\b|cw\.etics\./i;
const ELECTRICAL_DESC_RE =
  /demonta[żz].*ł[aą]cznik|wyłącznik|gniazd|r[oó][żz]nicowo|przeciwpora[żz]|rcd|instalacj\w*\s+elektr/i;
const ETICS_DESC_RE =
  /tynk\s+elew|ocieplen|eps\b|xps\b|siatk\w*\s+zbroj|klej\w*\s+do\s+płyt/i;
const PAINT_WORK_RE = /malowanie|paint|cw\.paint|legacy-malowanie/i;
const MEASURE_DESC_RE = /badanie|pomiar|pr[oó]ba\b|kontrola\b|regulacj/i;

/**
 * Hard gate: block BOM research when trusted workId contradicts line description.
 */
export function runIkBomIdentityGate(opts: {
  workId: string | null | undefined;
  dwellingId: string | null | undefined;
  lineId: string | null | undefined;
  description: string | null | undefined;
}): IkBomIdentityGateResult {
  const workId = String(opts.workId ?? "").trim() || null;
  const dwellingId = String(opts.dwellingId ?? "").trim();
  const lineId = String(opts.lineId ?? "").trim();
  const description = String(opts.description ?? "").trim();
  const signals: string[] = [];
  const mismatchReasons: string[] = [];

  if (ELECTRICAL_DESC_RE.test(description)) signals.push("DESC_ELECTRICAL");
  if (ETICS_DESC_RE.test(description)) signals.push("DESC_ETICS");
  if (MEASURE_DESC_RE.test(description)) signals.push("DESC_MEASURE_TEST");
  if (/\b\d{3,4}-\d{2}\b/.test(description)) signals.push("DESC_HAS_TABLE_CODE");

  if (!dwellingId) {
    return {
      status: "NO_DWELLING",
      workId,
      dwellingId,
      lineId,
      mismatchReasons: ["MISSING_DWELLING_ID"],
      suggestedNextActionPl: "Uzupełnij multi-dwelling map.",
      descriptionSignals: signals,
    };
  }
  if (!lineId) {
    return {
      status: "NO_LINE",
      workId,
      dwellingId,
      lineId,
      mismatchReasons: ["MISSING_LINE_ID"],
      suggestedNextActionPl: "Brak lineId — HOLD.",
      descriptionSignals: signals,
    };
  }
  if (!workId) {
    return {
      status: "NO_WORK_ID",
      workId: null,
      dwellingId,
      lineId,
      mismatchReasons: ["MISSING_WORK_ID"],
      suggestedNextActionPl:
        "Identity research / Owner map — BOM research zabroniony bez trusted workId.",
      descriptionSignals: signals,
    };
  }

  if (ETICS_WORK_RE.test(workId) && ELECTRICAL_DESC_RE.test(description)) {
    mismatchReasons.push("WORK_ETICS_VS_DESC_ELECTRICAL");
  }
  if (ETICS_WORK_RE.test(workId) && !ETICS_DESC_RE.test(description) && ELECTRICAL_DESC_RE.test(description)) {
    mismatchReasons.push("ETICS_PACK_FORBIDDEN_FOR_ELECTRICAL_LINE");
  }
  if (PAINT_WORK_RE.test(workId) && ELECTRICAL_DESC_RE.test(description)) {
    mismatchReasons.push("WORK_PAINT_VS_DESC_ELECTRICAL");
  }
  if (ETICS_WORK_RE.test(workId) && MEASURE_DESC_RE.test(description) && ELECTRICAL_DESC_RE.test(description)) {
    mismatchReasons.push("WORK_ETICS_VS_DESC_RCD_TEST");
  }

  if (mismatchReasons.length > 0) {
    return {
      status: "IDENTITY_MISMATCH",
      workId,
      dwellingId,
      lineId,
      mismatchReasons,
      suggestedNextActionPl:
        "Napraw identity (KNR/podstawa → trusted workId). NIE używaj BOM z błędnego workId (np. ETICS).",
      descriptionSignals: signals,
    };
  }

  return {
    status: "OK",
    workId,
    dwellingId,
    lineId,
    mismatchReasons: [],
    suggestedNextActionPl: "Identity OK — kontynuuj BOM research.",
    descriptionSignals: signals,
  };
}
