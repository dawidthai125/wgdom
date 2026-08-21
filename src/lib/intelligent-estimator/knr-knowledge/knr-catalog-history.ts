/**
 * KL-7-P1 — append-only KNR catalog history (cap 50).
 * No PLN · no OUR RATE · no workId · no auto-VERIFIED.
 */

import type { KnrVerificationStatus } from "./types";

export const KNR_CATALOG_HISTORY_CAP = 50 as const;

export type KnrCatalogHistoryKind =
  | "VERIFY_APPROVE"
  | "VERIFY_REJECT"
  | "PROPOSED_UPDATE"
  | "OWNER_REVIEW"
  | "IDENTITY_TOUCH"
  | "NORMS_TOUCH"
  | "SOURCE_TOUCH"
  | "SUPERSEDE";

export type KnrCatalogDiffFlags = {
  normsR?: boolean;
  normsM?: boolean;
  normsS?: boolean;
  unit?: boolean;
  identity?: boolean;
  family?: boolean;
  source?: boolean;
  verification?: boolean;
};

export type KnrCatalogHistoryEntry = {
  version: number;
  at: string;
  actorId?: string;
  actorDisplayName?: string;
  kind: KnrCatalogHistoryKind;
  contentHash: string;
  previousContentHash?: string | null;
  verificationStatusBefore?: KnrVerificationStatus | null;
  verificationStatusAfter?: KnrVerificationStatus | null;
  diffFlags?: KnrCatalogDiffFlags;
  sourceRefs?: {
    evidenceRefId?: string;
    sourceIdentifier?: string;
  };
  snapshot?: {
    unit?: string;
    normsSummary?: string;
    identityKeyV2?: string;
  };
};

/** Offline proposed update bag — NEVER authority VERIFIED. */
export type KnrCatalogProposedUpdateBag = {
  proposedAt: string;
  proposedBy?: string;
  actorDisplayName?: string;
  compareStatus: "SAME_HASH" | "DIFF_REVIEW" | "CONFLICT";
  /** Nested entry — normalized by catalog store. */
  proposedEntry: unknown;
  currentContentHash: string;
  proposedContentHash: string;
  diffFlags: KnrCatalogDiffFlags;
  reasonsPl: string[];
};

const VALID_KINDS: readonly KnrCatalogHistoryKind[] = [
  "VERIFY_APPROVE",
  "VERIFY_REJECT",
  "PROPOSED_UPDATE",
  "OWNER_REVIEW",
  "IDENTITY_TOUCH",
  "NORMS_TOUCH",
  "SOURCE_TOUCH",
  "SUPERSEDE",
];

function isHistoryKind(v: unknown): v is KnrCatalogHistoryKind {
  return typeof v === "string" && (VALID_KINDS as readonly string[]).includes(v);
}

export function normalizeKnrCatalogHistoryEntry(raw: unknown): KnrCatalogHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isHistoryKind(row.kind)) return null;
  const at = typeof row.at === "string" ? row.at.trim() : "";
  const contentHash = typeof row.contentHash === "string" ? row.contentHash.trim() : "";
  if (!at || !contentHash) return null;
  const version = Number(row.version);
  if (!Number.isFinite(version) || version < 0) return null;

  const diffRaw = row.diffFlags;
  let diffFlags: KnrCatalogDiffFlags | undefined;
  if (diffRaw && typeof diffRaw === "object") {
    const d = diffRaw as Record<string, unknown>;
    diffFlags = {
      normsR: d.normsR === true ? true : undefined,
      normsM: d.normsM === true ? true : undefined,
      normsS: d.normsS === true ? true : undefined,
      unit: d.unit === true ? true : undefined,
      identity: d.identity === true ? true : undefined,
      family: d.family === true ? true : undefined,
      source: d.source === true ? true : undefined,
      verification: d.verification === true ? true : undefined,
    };
  }

  const srcRaw = row.sourceRefs;
  let sourceRefs: KnrCatalogHistoryEntry["sourceRefs"];
  if (srcRaw && typeof srcRaw === "object") {
    const s = srcRaw as Record<string, unknown>;
    sourceRefs = {
      evidenceRefId: typeof s.evidenceRefId === "string" ? s.evidenceRefId : undefined,
      sourceIdentifier:
        typeof s.sourceIdentifier === "string" ? s.sourceIdentifier : undefined,
    };
  }

  const snapRaw = row.snapshot;
  let snapshot: KnrCatalogHistoryEntry["snapshot"];
  if (snapRaw && typeof snapRaw === "object") {
    const s = snapRaw as Record<string, unknown>;
    snapshot = {
      unit: typeof s.unit === "string" ? s.unit : undefined,
      normsSummary: typeof s.normsSummary === "string" ? s.normsSummary : undefined,
      identityKeyV2: typeof s.identityKeyV2 === "string" ? s.identityKeyV2 : undefined,
    };
  }

  return {
    version,
    at,
    actorId: typeof row.actorId === "string" ? row.actorId : undefined,
    actorDisplayName:
      typeof row.actorDisplayName === "string" ? row.actorDisplayName : undefined,
    kind: row.kind,
    contentHash,
    previousContentHash:
      typeof row.previousContentHash === "string"
        ? row.previousContentHash
        : row.previousContentHash === null
          ? null
          : undefined,
    verificationStatusBefore:
      typeof row.verificationStatusBefore === "string"
        ? (row.verificationStatusBefore as KnrVerificationStatus)
        : row.verificationStatusBefore === null
          ? null
          : undefined,
    verificationStatusAfter:
      typeof row.verificationStatusAfter === "string"
        ? (row.verificationStatusAfter as KnrVerificationStatus)
        : row.verificationStatusAfter === null
          ? null
          : undefined,
    diffFlags,
    sourceRefs,
    snapshot,
  };
}

export function capKnrCatalogHistory(
  entries: readonly KnrCatalogHistoryEntry[],
  cap = KNR_CATALOG_HISTORY_CAP,
): KnrCatalogHistoryEntry[] {
  if (entries.length <= cap) return [...entries];
  return entries.slice(entries.length - cap);
}

export function normalizeKnrCatalogHistory(raw: unknown): KnrCatalogHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: KnrCatalogHistoryEntry[] = [];
  for (const row of raw) {
    const e = normalizeKnrCatalogHistoryEntry(row);
    if (e) out.push(e);
  }
  return capKnrCatalogHistory(out);
}

/** Append-only — never mutates previous array in place. */
export function appendKnrCatalogHistory(
  previous: readonly KnrCatalogHistoryEntry[] | undefined,
  entry: KnrCatalogHistoryEntry,
): KnrCatalogHistoryEntry[] {
  return capKnrCatalogHistory([...(previous ?? []), entry]);
}

/** Merge two histories for cloud reconcile — sort by at, dedupe key, then cap. */
export function mergeKnrCatalogHistories(
  a: readonly KnrCatalogHistoryEntry[] | undefined,
  b: readonly KnrCatalogHistoryEntry[] | undefined,
): KnrCatalogHistoryEntry[] {
  const map = new Map<string, KnrCatalogHistoryEntry>();
  for (const e of [...(a ?? []), ...(b ?? [])]) {
    const key = `${e.at}|${e.kind}|${e.contentHash}|${e.version}|${e.actorId ?? ""}`;
    if (!map.has(key)) map.set(key, e);
  }
  const merged = [...map.values()].sort((x, y) => {
    const tx = Date.parse(x.at) || 0;
    const ty = Date.parse(y.at) || 0;
    if (tx !== ty) return tx - ty;
    return x.version - y.version;
  });
  return capKnrCatalogHistory(merged);
}

export function knrHistoryKindLabelPl(kind: KnrCatalogHistoryKind): string {
  switch (kind) {
    case "VERIFY_APPROVE":
      return "Weryfikacja — zatwierdzenie";
    case "VERIFY_REJECT":
      return "Weryfikacja — odrzucenie";
    case "PROPOSED_UPDATE":
      return "Propozycja aktualizacji";
    case "OWNER_REVIEW":
      return "Przegląd Ownera";
    case "IDENTITY_TOUCH":
      return "Zmiana tożsamości";
    case "NORMS_TOUCH":
      return "Zmiana norm";
    case "SOURCE_TOUCH":
      return "Zmiana źródła";
    case "SUPERSEDE":
      return "Nowa wersja authority";
    default:
      return String(kind);
  }
}
