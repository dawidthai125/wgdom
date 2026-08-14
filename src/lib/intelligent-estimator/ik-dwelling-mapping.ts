/**
 * IK-MIGRATION-01 P2.75 — MULTI-BOQ → dwelling / address mapping orchestration.
 *
 * REUSE SSOT: multi-dwelling documentToDwelling · confirmDwelling · mapDocumentToDwelling
 * · multi-boq compose / merge KEEP ONE.
 *
 * HARD: filename / street / lok. = EVIDENCE only — NEVER silent authoritative map.
 * ZERO new dwelling model · ZERO parser · ZERO cloud persist.
 */

import type { DwellingCostArtifactRef } from "@/lib/multi-boq";
import {
  confirmDwelling,
  enableMultiDwellingMode,
  getTenderPackage,
  mapDocumentToDwelling,
  type TenderPackage,
} from "@/lib/multi-dwelling";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

export type IkDwellingMappingCandidateKind = "dwelling_hint" | "shared_or_common" | "ambiguous" | "unknown";

/** Filename evidence for Owner — never written as SSOT without Owner apply. */
export type IkDwellingMappingCandidate = {
  documentId: string;
  filename: string;
  kind: IkDwellingMappingCandidateKind;
  /** Display-only suggested label (street/lok.) — NOT dwellingId SSOT. */
  suggestedLabelPl: string | null;
  /** Evidence tokens extracted from filename (audit only). */
  evidenceTokens: string[];
  authoritative: false;
  needsOwner: true;
};

export type IkDwellingCoverageRow = {
  documentId: string;
  filename: string;
  dwellingId: string | null;
  mapped: boolean;
  kind: IkDwellingMappingCandidateKind;
};

export type IkDwellingMappingAssessment = {
  artifactCount: number;
  mappedCount: number;
  unmappedCount: number;
  sharedCandidateCount: number;
  ambiguousCount: number;
  complete: boolean;
  /** True only when every cost artifact has Owner documentToDwelling. */
  allMapped: boolean;
  ownerMapRequired: boolean;
  reasons: string[];
  candidates: IkDwellingMappingCandidate[];
  coverage: IkDwellingCoverageRow[];
  dwellings: Array<{
    dwellingId: string;
    labelPl: string;
    sourceDocumentIds: string[];
  }>;
};

export type IkLineIntegrityReport = {
  sourceLineCount: number;
  composedLineCount: number;
  keepOneCollapses: number;
  explainedLoss: number;
  unexplainedLoss: number;
  unexplainedDuplication: number;
  ok: boolean;
  reasons: string[];
};

export type IkExplicitOwnerDwelling = {
  dwellingId: string;
  labelPl: string;
};

export type IkExplicitOwnerMapping = {
  documentId: string;
  dwellingId: string;
};

export type IkApplyOwnerMapResult =
  | {
      ok: true;
      package: TenderPackage;
      mappedBy: "owner_explicit";
      mappingCount: number;
      dwellingCount: number;
    }
  | { ok: false; reason: string };

const SHARED_RE =
  /wentylac|wsp[oó]ln|common|og[oó]ln|cz[eę][sś]ci\s*wsp|infrastruktur/i;

/** Street / address-ish tokens — EVIDENCE only. */
const STREET_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /kotlarsk/i, label: "Kotlarska" },
  { re: /nasturcjow/i, label: "Nasturcjowa" },
  { re: /ptasi/i, label: "Ptasia" },
  { re: /[zż]ernick/i, label: "Żernicka" },
];

function baseName(filename: string): string {
  const f = String(filename ?? "").trim();
  const slash = Math.max(f.lastIndexOf("/"), f.lastIndexOf("\\"));
  return slash >= 0 ? f.slice(slash + 1) : f;
}

/**
 * Build Owner-facing candidates from artifact filenames.
 * NEVER persists · NEVER auto-Accept · authoritative always false.
 */
export function buildDwellingMappingCandidates(
  artifacts: DwellingCostArtifactRef[],
): IkDwellingMappingCandidate[] {
  return artifacts.map((a) => {
    const filename = a.filename || a.documentId;
    const name = baseName(filename);
    const evidenceTokens: string[] = [];
    const streetHits = STREET_HINTS.filter((h) => h.re.test(name));
    for (const h of streetHits) evidenceTokens.push(h.label);
    const lok = name.match(/lok\.?\s*(\d+)/i);
    if (lok) evidenceTokens.push(`lok. ${lok[1]}`);
    const num = name.match(/\b(\d{1,4})\b/);
    if (num && !lok) evidenceTokens.push(num[1]!);

    let kind: IkDwellingMappingCandidateKind = "unknown";
    let suggestedLabelPl: string | null = null;

    if (SHARED_RE.test(name)) {
      kind = "shared_or_common";
      suggestedLabelPl = "Zakres wspólny / wentylacja (wymaga decyzji Owner)";
      evidenceTokens.push("shared_scope_candidate");
    } else if (streetHits.length > 1) {
      kind = "ambiguous";
      suggestedLabelPl = streetHits.map((h) => h.label).join(" / ");
    } else if (streetHits.length === 1) {
      kind = "dwelling_hint";
      const street = streetHits[0]!.label;
      suggestedLabelPl = lok ? `${street} lok. ${lok[1]}` : street;
    }

    return {
      documentId: a.documentId,
      filename,
      kind,
      suggestedLabelPl,
      evidenceTokens,
      authoritative: false as const,
      needsOwner: true as const,
    };
  });
}

export function assessDwellingMappingCoverage(opts: {
  artifacts: DwellingCostArtifactRef[];
  package?: TenderPackage | null;
}): IkDwellingMappingAssessment {
  const artifacts = opts.artifacts ?? [];
  const pkg = opts.package ?? null;
  const candidates = buildDwellingMappingCandidates(artifacts);
  const map = pkg?.mode === "multi" ? (pkg.documentToDwelling ?? {}) : {};
  const reasons: string[] = [];

  const coverage: IkDwellingCoverageRow[] = candidates.map((c) => {
    const dwellingId = map[c.documentId]
      ? normalizeDwellingId(map[c.documentId]!)
      : null;
    return {
      documentId: c.documentId,
      filename: c.filename,
      dwellingId,
      mapped: Boolean(dwellingId),
      kind: c.kind,
    };
  });

  const mappedCount = coverage.filter((c) => c.mapped).length;
  const unmappedCount = coverage.length - mappedCount;
  const sharedCandidateCount = coverage.filter(
    (c) => !c.mapped && c.kind === "shared_or_common",
  ).length;
  const ambiguousCount = coverage.filter(
    (c) => !c.mapped && c.kind === "ambiguous",
  ).length;

  const multiNeeded = artifacts.length > 1;
  const allMapped = artifacts.length > 0 && unmappedCount === 0;
  const complete = !multiNeeded || (pkg?.mode === "multi" && allMapped);

  if (multiNeeded && (!pkg || pkg.mode !== "multi")) {
    reasons.push("OWNER_MAP_REQUIRED — multi źródła; brak package.mode=multi.");
  }
  if (multiNeeded && unmappedCount > 0) {
    reasons.push(
      `MULTI_SOURCE_NO_DWELLING_MAP — ${unmappedCount}/${artifacts.length} artefaktów bez Owner map.`,
    );
  }
  if (sharedCandidateCount > 0) {
    reasons.push(
      `SHARED_SCOPE_CANDIDATE — ${sharedCandidateCount} artefakt(ów) wygląda na zakres wspólny; Owner musi zdecydować (nie invent allocation).`,
    );
  }
  if (ambiguousCount > 0) {
    reasons.push(
      `AMBIGUOUS_FILENAME_HINT — ${ambiguousCount} artefakt(ów); nie auto-Accept.`,
    );
  }
  if (complete && multiNeeded) {
    reasons.push("DWELLING_MAP_COMPLETE — Owner documentToDwelling pokrywa wszystkie artefakty kosztowe.");
  }

  const dwellings = (pkg?.dwellings ?? [])
    .filter((d) => (d.sourceDocumentIds?.length ?? 0) > 0)
    .map((d) => ({
      dwellingId: d.dwellingId,
      labelPl: d.labelPl,
      sourceDocumentIds: [...(d.sourceDocumentIds ?? [])],
    }));

  return {
    artifactCount: artifacts.length,
    mappedCount,
    unmappedCount,
    sharedCandidateCount,
    ambiguousCount,
    complete,
    allMapped,
    ownerMapRequired: multiNeeded && !allMapped,
    reasons,
    candidates,
    coverage,
    dwellings,
  };
}

/**
 * Apply EXPLICIT Owner decisions via existing store APIs.
 * Does NOT accept filename as dwellingId. Does NOT invent dwellings from hints.
 */
export function applyExplicitOwnerDwellingMap(opts: {
  tenderId: string;
  dwellings: IkExplicitOwnerDwelling[];
  mappings: IkExplicitOwnerMapping[];
  expectedDwellingCount?: number;
}): IkApplyOwnerMapResult {
  const tenderId = String(opts.tenderId ?? "").trim();
  if (!tenderId) return { ok: false, reason: "MISSING_TENDER_ID" };
  if (!opts.dwellings?.length) return { ok: false, reason: "MISSING_DWELLINGS" };
  if (!opts.mappings?.length) return { ok: false, reason: "MISSING_MAPPINGS" };

  const enabled = enableMultiDwellingMode(tenderId, {
    expectedDwellingCount:
      opts.expectedDwellingCount ?? opts.dwellings.length,
  });
  if (!enabled) return { ok: false, reason: "ENABLE_MULTI_FAILED" };

  for (const d of opts.dwellings) {
    const existing = enabled.dwellings.find(
      (x) => normalizeDwellingId(x.dwellingId) === normalizeDwellingId(d.dwellingId),
    );
    if (existing) continue;
    const created = confirmDwelling({
      tenderId,
      dwellingId: d.dwellingId,
      labelPl: d.labelPl,
    });
    if (!created.ok) return { ok: false, reason: created.reason };
  }

  let mappingCount = 0;
  let lastPkg: TenderPackage | null = getTenderPackage(tenderId);
  for (const m of opts.mappings) {
    const mapped = mapDocumentToDwelling({
      tenderId,
      documentId: m.documentId,
      dwellingId: m.dwellingId,
    });
    if (!mapped.ok) return { ok: false, reason: mapped.reason };
    mappingCount += 1;
    lastPkg = mapped.package;
  }

  if (!lastPkg) return { ok: false, reason: "PACKAGE_MISSING_AFTER_MAP" };
  return {
    ok: true,
    package: lastPkg,
    mappedBy: "owner_explicit",
    mappingCount,
    dwellingCount: lastPkg.dwellings.length,
  };
}

/**
 * Compare source extracted lines vs composed Master BOQ lines.
 * KEEP ONE collapses (identical contentHash) are explained loss — not FAIL.
 */
export function computeCompositionLineIntegrity(opts: {
  sourceLineCount: number;
  composedLineCount: number;
  /** Number of raw lines removed by KEEP ONE (sum of (groupSize-1)). */
  keepOneCollapsedRawLines?: number;
  keepOneWarningCount?: number;
}): IkLineIntegrityReport {
  const source = Math.max(0, Math.floor(opts.sourceLineCount));
  const composed = Math.max(0, Math.floor(opts.composedLineCount));
  const keepOneCollapses = Math.max(
    0,
    Math.floor(
      opts.keepOneCollapsedRawLines
        ?? opts.keepOneWarningCount
        ?? 0,
    ),
  );
  const explainedLoss = keepOneCollapses;
  const expectedMin = Math.max(0, source - explainedLoss);
  const reasons: string[] = [];

  let unexplainedLoss = 0;
  let unexplainedDuplication = 0;

  if (composed < expectedMin) {
    unexplainedLoss = expectedMin - composed;
    reasons.push(
      `UNEXPLAINED_LINE_LOSS source=${source} composed=${composed} keepOneExplained=${explainedLoss} gap=${unexplainedLoss}`,
    );
  } else if (composed > source) {
    unexplainedDuplication = composed - source;
    reasons.push(
      `UNEXPLAINED_DUPLICATION source=${source} composed=${composed} extra=${unexplainedDuplication}`,
    );
  } else if (composed !== source && explainedLoss > 0) {
    reasons.push(
      `KEEP_ONE_EXPLAINED source=${source} composed=${composed} collapsed=${explainedLoss}`,
    );
  } else if (composed === source) {
    reasons.push(`LINE_COUNT_MATCH source=composed=${source}`);
  }

  const ok = unexplainedLoss === 0 && unexplainedDuplication === 0;
  return {
    sourceLineCount: source,
    composedLineCount: composed,
    keepOneCollapses,
    explainedLoss,
    unexplainedLoss,
    unexplainedDuplication,
    ok,
    reasons,
  };
}

/** Count raw lines that KEEP ONE folded away from merge warnings. */
export function countKeepOneCollapsedFromWarnings(warnings: string[]): number {
  let collapsed = 0;
  for (const w of warnings) {
    const m = String(w).match(/^KEEP ONE contentHash=\S+ sources=(.+)$/);
    if (!m) continue;
    const n = m[1]!.split(",").map((s) => s.trim()).filter(Boolean).length;
    if (n > 1) collapsed += n - 1;
  }
  return collapsed;
}

export function countSourceLinesInArtifacts(
  artifacts: DwellingCostArtifactRef[],
): number {
  let n = 0;
  for (const a of artifacts) {
    const rows = a.snapshot?.rows;
    if (Array.isArray(rows) && rows.length > 0) {
      n += rows.length;
      continue;
    }
    const cq = a.snapshot?.catalogQuantities;
    if (Array.isArray(cq)) n += cq.length;
  }
  return n;
}
