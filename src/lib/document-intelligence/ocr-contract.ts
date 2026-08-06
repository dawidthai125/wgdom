/**
 * Pass-9 OCR + Semantic AI — contract stubs ONLY (OUT Phase A engines).
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
    // Engine OUT — stub only
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
