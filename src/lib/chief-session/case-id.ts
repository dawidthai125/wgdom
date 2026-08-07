/**
 * Deterministyczny caseId dla Session (AUDIT §3.2).
 * Bez KV · bez persist.
 */

export function buildChiefSessionCaseId(opts: {
  tenderPipelineItemId: string;
  fingerprint: string;
}): string {
  const id = opts.tenderPipelineItemId.trim() || "unknown";
  const fp = opts.fingerprint.trim() || "0";
  return `chief:${id}:${fp}`;
}

/** Lekki fingerprint RO (linie + token / builtAt) — invalidate przy zmianie przedmiaru. */
export function buildChiefSessionFingerprint(opts: {
  offerBoqLineCount: number;
  recomputeToken?: string | null;
  builtAt?: string | null;
  parserVersion?: string | number | null;
}): string {
  const parts = [
    String(opts.offerBoqLineCount),
    opts.recomputeToken ?? "",
    opts.builtAt ?? "",
    opts.parserVersion != null ? String(opts.parserVersion) : "",
  ];
  return parts.join("|");
}
