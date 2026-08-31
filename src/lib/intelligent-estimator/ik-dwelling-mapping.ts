/**
 * IK-MIGRATION-01 P2.75 — MULTI-BOQ → dwelling / address mapping orchestration.
 *
 * REUSE SSOT: multi-dwelling documentToDwelling · confirmDwelling · mapDocumentToDwelling
 * · multi-boq compose / merge KEEP ONE.
 *
 * HARD: filename / street / lok. = EVIDENCE by default — NEVER invent.
 * Owner GO exception: unambiguous street+building+unit in filename MAY apply
 * via existing applyExplicitOwnerDwellingMap (LS package only · ZERO cloud).
 * Ambiguous / incomplete → HOLD.
 *
 * ZERO new dwelling model · ZERO parser · ZERO cloud persist.
 */

import type { DwellingCostArtifactRef } from "@/lib/multi-boq";
import { countExtractableLinesFromArtifacts } from "@/lib/multi-boq/merge";
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
      mappedBy: "owner_explicit" | "deterministic_filename_unambiguous";
      mappingCount: number;
      dwellingCount: number;
    }
  | { ok: false; reason: string };

/** Lightweight ref for pure filename→dwelling proposals (snapshot optional). */
export type IkDwellingFilenameRef = {
  documentId: string;
  filename: string;
};

export type IkDeterministicDwellingParse = {
  streetLabelPl: string;
  streetSlug: string;
  building: string;
  unit: string;
  dwellingId: string;
  labelPl: string;
  confidence: "unambiguous";
};

export type IkDeterministicDwellingMapProposal =
  | {
      status: "ready";
      reason: null;
      dwellings: IkExplicitOwnerDwelling[];
      mappings: IkExplicitOwnerMapping[];
      perFile: Array<{
        documentId: string;
        filename: string;
        parse: IkDeterministicDwellingParse;
      }>;
    }
  | {
      status: "hold";
      reason: string;
      dwellings: IkExplicitOwnerDwelling[];
      mappings: IkExplicitOwnerMapping[];
      perFile: Array<{
        documentId: string;
        filename: string;
        parse: IkDeterministicDwellingParse | null;
        holdReason: string;
      }>;
    };

export type IkEnsureDeterministicMapResult =
  | {
      ok: true;
      applied: true;
      package: TenderPackage;
      mappedBy: "deterministic_filename_unambiguous";
      mappingCount: number;
      dwellingCount: number;
      proposal: Extract<IkDeterministicDwellingMapProposal, { status: "ready" }>;
    }
  | {
      ok: true;
      applied: false;
      package: TenderPackage | null;
      reason: string;
      proposal: IkDeterministicDwellingMapProposal | null;
    }
  | { ok: false; reason: string; package: TenderPackage | null };

const SHARED_RE =
  /wentylac|wsp[oó]ln|common|og[oó]ln|cz[eę][sś]ci\s*wsp|infrastruktur/i;

type StreetHint = { re: RegExp; label: string; slug: string };

/**
 * Street tokens — EVIDENCE for UI hints; also used by deterministic parser.
 * Deterministic apply requires street + building + unit (never street-only).
 */
const STREET_HINTS: StreetHint[] = [
  { re: /wygodna/i, label: "Wygodna", slug: "wygodna" },
  { re: /prusa/i, label: "Prusa", slug: "prusa" },
  { re: /dubois/i, label: "Dubois", slug: "dubois" },
  { re: /kotlarska/i, label: "Kotlarska", slug: "kotlarska" },
  { re: /nasturcjowa/i, label: "Nasturcjowa", slug: "nasturcjowa" },
  { re: /ptasia/i, label: "Ptasia", slug: "ptasia" },
  { re: /[zż]ernicka/i, label: "Żernicka", slug: "zernicka" },
];

function baseName(filename: string): string {
  const f = String(filename ?? "").trim();
  const slash = Math.max(f.lastIndexOf("/"), f.lastIndexOf("\\"));
  return slash >= 0 ? f.slice(slash + 1) : f;
}

function foldAscii(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function slugPart(raw: string): string {
  return foldAscii(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Pure: unambiguous street + building + unit from filename.
 * Examples: Wygodna_10_6_PRZEDMIAR.pdf → Wygodna 10/6
 *           Dubois_22A_21_PRZEDMIAR.pdf → Dubois 22A/21
 * Ambiguous / incomplete → null (HOLD — never invent).
 */
export function parseUnambiguousDwellingFromFilename(
  filename: string,
): IkDeterministicDwellingParse | null {
  const name = baseName(filename);
  if (!name || SHARED_RE.test(name)) return null;

  const streetHits = STREET_HINTS.filter((h) => h.re.test(name));
  if (streetHits.length !== 1) return null;
  const street = streetHits[0]!;

  // Street_10_6 · Street_22A_21 · Street 10/6 · Street_10_lok_6 · Street_10 lok. 6
  // NOTE: do NOT use \\b after unit — '_' is a word char in JS, breaks Wygodna_10_6_PRZEDMIAR.
  const patterns: RegExp[] = [
    new RegExp(
      `${street.re.source}[_\\s./-]+(\\d+[A-Za-z]?)[_\\s./-]+(?:lok\\.?\\s*)?(\\d+)(?![0-9])`,
      "i",
    ),
    new RegExp(
      `${street.re.source}[_\\s./-]+(\\d+[A-Za-z]?)[_\\s./-]+m\\.?\\s*(\\d+)(?![0-9])`,
      "i",
    ),
  ];

  let building: string | null = null;
  let unit: string | null = null;
  for (const re of patterns) {
    const m = name.match(re);
    if (m?.[1] && m?.[2]) {
      building = m[1];
      unit = m[2];
      break;
    }
  }
  if (!building || !unit) return null;

  const dwellingId = normalizeDwellingId(
    `${street.slug}-${slugPart(building)}-${slugPart(unit)}`,
  );
  const labelPl = `${street.label} ${building}/${unit}`;

  return {
    streetLabelPl: street.label,
    streetSlug: street.slug,
    building,
    unit,
    dwellingId,
    labelPl,
    confidence: "unambiguous",
  };
}

/**
 * Pure proposal: every artifact must parse unambiguously to a UNIQUE dwelling.
 * Any miss / collision / shared → HOLD (no partial invent).
 */
export function proposeDeterministicDwellingMap(
  artifacts: Array<IkDwellingFilenameRef | DwellingCostArtifactRef>,
): IkDeterministicDwellingMapProposal {
  const perFile: Extract<
    IkDeterministicDwellingMapProposal,
    { status: "hold" }
  >["perFile"] = [];
  const dwellingsById = new Map<string, IkExplicitOwnerDwelling>();
  const mappings: IkExplicitOwnerMapping[] = [];
  const dwellingOwners = new Map<string, string>(); // dwellingId → documentId

  if (!artifacts.length) {
    return {
      status: "hold",
      reason: "NO_ARTIFACTS",
      dwellings: [],
      mappings: [],
      perFile: [],
    };
  }

  let holdReason: string | null = null;

  for (const a of artifacts) {
    const filename = a.filename || a.documentId;
    const documentId = String(a.documentId || filename).trim();
    const parse = parseUnambiguousDwellingFromFilename(filename);
    if (!parse) {
      const streetHits = STREET_HINTS.filter((h) =>
        h.re.test(baseName(filename)),
      );
      const why =
        SHARED_RE.test(baseName(filename))
          ? "SHARED_SCOPE_CANDIDATE"
          : streetHits.length > 1
            ? "AMBIGUOUS_MULTI_STREET"
            : streetHits.length === 1
              ? "STREET_WITHOUT_BUILDING_UNIT"
              : "NO_STREET_HINT";
      holdReason = holdReason ?? why;
      perFile.push({ documentId, filename, parse: null, holdReason: why });
      continue;
    }
    const prev = dwellingOwners.get(parse.dwellingId);
    if (prev && prev !== documentId) {
      holdReason = "DWELLING_COLLISION";
      perFile.push({
        documentId,
        filename,
        parse,
        holdReason: `DWELLING_COLLISION with ${prev}`,
      });
      continue;
    }
    dwellingOwners.set(parse.dwellingId, documentId);
    dwellingsById.set(parse.dwellingId, {
      dwellingId: parse.dwellingId,
      labelPl: parse.labelPl,
    });
    mappings.push({ documentId, dwellingId: parse.dwellingId });
    perFile.push({
      documentId,
      filename,
      parse,
      holdReason: "",
    });
  }

  if (holdReason || perFile.some((p) => !p.parse)) {
    return {
      status: "hold",
      reason: holdReason ?? "INCOMPLETE_DETERMINISTIC_MAP",
      dwellings: [...dwellingsById.values()],
      mappings,
      perFile: perFile.map((p) => ({
        documentId: p.documentId,
        filename: p.filename,
        parse: p.parse,
        holdReason: p.holdReason || holdReason || "HOLD",
      })),
    };
  }

  return {
    status: "ready",
    reason: null,
    dwellings: [...dwellingsById.values()],
    mappings,
    perFile: perFile.map((p) => ({
      documentId: p.documentId,
      filename: p.filename,
      parse: p.parse!,
    })),
  };
}

/**
 * Apply deterministic filename map via existing Owner map store APIs.
 * Only when proposeDeterministicDwellingMap = ready. LS-only · ZERO cloud.
 */
export function ensureDeterministicFilenameDwellingMap(opts: {
  tenderId: string;
  artifacts: Array<IkDwellingFilenameRef | DwellingCostArtifactRef>;
  package?: TenderPackage | null;
}): IkEnsureDeterministicMapResult {
  const tenderId = String(opts.tenderId ?? "").trim();
  if (!tenderId) {
    return { ok: false, reason: "MISSING_TENDER_ID", package: null };
  }

  const existing = opts.package ?? getTenderPackage(tenderId);
  const coverage = assessDwellingMappingCoverage({
    artifacts: opts.artifacts as DwellingCostArtifactRef[],
    package: existing,
  });
  if (coverage.allMapped && existing?.mode === "multi") {
    return {
      ok: true,
      applied: false,
      package: existing,
      reason: "ALREADY_MAPPED",
      proposal: null,
    };
  }

  const proposal = proposeDeterministicDwellingMap(opts.artifacts);
  if (proposal.status !== "ready") {
    return {
      ok: true,
      applied: false,
      package: existing,
      reason: proposal.reason,
      proposal,
    };
  }

  const applied = applyExplicitOwnerDwellingMap({
    tenderId,
    dwellings: proposal.dwellings,
    mappings: proposal.mappings,
    expectedDwellingCount: proposal.dwellings.length,
  });
  if (!applied.ok) {
    return { ok: false, reason: applied.reason, package: existing };
  }

  return {
    ok: true,
    applied: true,
    package: applied.package,
    mappedBy: "deterministic_filename_unambiguous",
    mappingCount: applied.mappingCount,
    dwellingCount: applied.dwellingCount,
    proposal,
  };
}

/**
 * Build Owner-facing candidates from artifact filenames.
 * NEVER persists · NEVER auto-Accept · authoritative always false on candidates.
 */
export function buildDwellingMappingCandidates(
  artifacts: Array<IkDwellingFilenameRef | DwellingCostArtifactRef>,
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

    const deterministic = parseUnambiguousDwellingFromFilename(filename);
    if (deterministic) {
      evidenceTokens.push(deterministic.labelPl);
      evidenceTokens.push("deterministic_unambiguous");
    }

    let kind: IkDwellingMappingCandidateKind = "unknown";
    let suggestedLabelPl: string | null = null;

    if (SHARED_RE.test(name)) {
      kind = "shared_or_common";
      suggestedLabelPl = "Zakres wspólny / wentylacja (wymaga decyzji Owner)";
      evidenceTokens.push("shared_scope_candidate");
    } else if (streetHits.length > 1) {
      kind = "ambiguous";
      suggestedLabelPl = streetHits.map((h) => h.label).join(" / ");
    } else if (deterministic) {
      kind = "dwelling_hint";
      suggestedLabelPl = deterministic.labelPl;
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
  return countExtractableLinesFromArtifacts(artifacts);
}
