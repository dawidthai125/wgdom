/**
 * Pass-9 OCR + Semantic AI — DI ranking contract (AMEND-6 compatible).
 *
 * IK-OCR-PHASE-01 MVP-B1 runtime lives in ocr-run-b1.ts (browser/local provider).
 * DI keeps this stub for ranking: scan → not_configured until text exists.
 * Do NOT break analyzeDocumentIntelligence consumers.
 */

export type OcrContractStatus = "not_configured" | "missing_text" | "ok" | "n_a";

export type SemanticContractStatus = "not_configured" | "deferred";

export function resolveOcrContract(input: {
  isPdf?: boolean;
  hasTextLayer?: boolean | null;
  textLen: number;
}): { status: OcrContractStatus; confidence: number | null } {
  if (input.isPdf === false) {
    return { status: "n_a", confidence: null };
  }
  if (input.hasTextLayer === false || (input.textLen === 0 && input.isPdf !== false)) {
    // DI pre-OCR selection stub — runtime B1 OCR is separate (parseDocumentToKosztorys).
    return { status: "not_configured", confidence: null };
  }
  if (input.textLen > 0) {
    return { status: "ok", confidence: null };
  }
  return { status: "missing_text", confidence: null };
}

export function resolveSemanticContract(): SemanticContractStatus {
  return "not_configured";
}
