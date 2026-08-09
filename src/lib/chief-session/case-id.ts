/**
 * Deterministyczny caseId dla Session (AUDIT §3.2).
 * Q12 FIX DF — Case identity = content-stable across reloads;
 * wall-clock assembly time is not an identity source.
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

/**
 * Stable stamp for builtAtIso + nowIso (LOCKED Q12 FIX DF §3.1).
 * Prefer persisted dossier SSOT; never wall-clock / item.updatedAt.
 */
export function resolveStableCaseStamp(opts: {
  kosztorysParsedAt?: string | null;
  tenderDossierBuiltAt?: string | null;
  recomputeToken?: string | null;
  parserVersionNum?: number | null;
}): string {
  const parsed = opts.kosztorysParsedAt?.trim();
  if (parsed) return parsed;
  const built = opts.tenderDossierBuiltAt?.trim();
  if (built) return built;
  const token = opts.recomputeToken?.trim() || "0";
  const pv =
    opts.parserVersionNum != null && Number.isFinite(opts.parserVersionNum)
      ? String(opts.parserVersionNum)
      : "0";
  return `content:${token}|pv:${pv}`;
}

/**
 * Content-stable fingerprint (LOCKED Q12 FIX DF §3.2):
 * recomputeToken|parserVersionNum|stableCaseStamp
 *
 * OUT: assemble wall-clock builtAt · separate lineCount · updatedAt ·
 * timestamps stuffed into parserVersion slot.
 */
export function buildChiefSessionFingerprint(opts: {
  recomputeToken?: string | null;
  parserVersionNum?: number | null;
  stableCaseStamp: string;
}): string {
  const token = opts.recomputeToken ?? "";
  const pv =
    opts.parserVersionNum != null && Number.isFinite(opts.parserVersionNum)
      ? String(opts.parserVersionNum)
      : "";
  return [token, pv, opts.stableCaseStamp].join("|");
}
