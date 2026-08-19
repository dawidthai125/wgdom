/**
 * MULTI-BOQ-01 — deterministic merge of Owner-mapped cost artifacts → dwelling lines.
 */

import {
  buildCatalogBasisFromRawCode,
  hasUsableCatalogQuantities,
} from "@/lib/tenders-bzp-brief";
import type { CatalogBasis, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  buildSourceLineKey,
  foldContentHash,
} from "@/lib/multi-boq/line-id";
import type {
  DwellingCostArtifactRef,
  DwellingCostBranchHint,
  DwellingCostSnapshotLine,
} from "@/lib/multi-boq/types";

function parseQty(q: string | undefined): number {
  if (!q?.trim()) return 0;
  const n = Number(String(q).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

type RawSourceLine = {
  sourceDocumentId: string;
  sourceArtifactId: string;
  indexInSourceDoc: number;
  lp: string;
  description: string;
  unit: string;
  quantityRaw: string;
  quantity: number;
  branchHint: DwellingCostBranchHint;
  sourceLineKey: string;
  contentHash: string;
  athUnitPricePln: number | null;
  athTotalPln: number | null;
  catalogBasis?: CatalogBasis | null;
};

function sanitizeSourceLp(raw: string | undefined, indexInSourceDoc: number): string {
  const t = String(raw ?? "").trim();
  // Corrupt XML/ATH LP (markup leaked into lp) → stable positional identity (no invent content).
  if (
    !t
    || t.length > 48
    || /[<>]|<\/|\bOpis\b|\bJednostka|\bPKatalog\b|\bPNumer\b|\bWaluta\b/i.test(t)
  ) {
    return String(indexInSourceDoc + 1);
  }
  return t;
}

function extractRawLines(
  ref: DwellingCostArtifactRef,
): RawSourceLine[] {
  const snap = ref.snapshot;
  const out: RawSourceLine[] = [];
  const branch = ref.branchHint;

  const push = (
    indexInSourceDoc: number,
    lp: string,
    description: string,
    unit: string,
    quantityRaw: string,
    athUnit: number | null,
    athTotal: number | null,
    catalogBasis?: CatalogBasis | null,
  ) => {
    const desc = String(description ?? "").trim();
    const safeLp = sanitizeSourceLp(lp, indexInSourceDoc);
    const sourceLineKey = buildSourceLineKey(safeLp, desc, indexInSourceDoc);
    const contentHash = foldContentHash([
      safeLp,
      desc.slice(0, 200),
      String(unit ?? "").trim(),
      String(quantityRaw ?? "").trim(),
    ]);
    out.push({
      sourceDocumentId: ref.documentId,
      sourceArtifactId: ref.artifactId,
      indexInSourceDoc,
      lp: safeLp,
      description: desc || "(bez opisu)",
      unit: String(unit ?? "").trim(),
      quantityRaw: String(quantityRaw ?? ""),
      quantity: parseQty(quantityRaw),
      branchHint: branch,
      sourceLineKey,
      contentHash,
      athUnitPricePln: athUnit,
      athTotalPln: athTotal,
      ...(catalogBasis ? { catalogBasis } : {}),
    });
  };

  if (hasUsableCatalogQuantities(snap.catalogQuantities)) {
    (snap.catalogQuantities ?? []).forEach((c, index) => {
      push(
        index,
        c.lp ?? "",
        c.description ?? "",
        c.unit ?? "",
        c.quantity ?? "",
        null,
        null,
        c.catalogBasis ?? null,
      );
    });
    return out;
  }

  (snap.rows ?? []).forEach((r, index) => {
    if (!r.description?.trim() && !r.lp?.trim()) return;
    const unitPrice = r.unitPrice
      ? Number(String(r.unitPrice).replace(/\s/g, "").replace(",", "."))
      : NaN;
    const total = r.total
      ? Number(String(r.total).replace(/\s/g, "").replace(",", "."))
      : NaN;
    push(
      index,
      r.lp ?? "",
      r.description ?? "",
      r.unit ?? "",
      r.quantity ?? "",
      Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : null,
      Number.isFinite(total) && total > 0 ? total : null,
      r.catalogBasis ?? buildCatalogBasisFromRawCode(r.code),
    );
  });
  return out;
}

export type MergeDwellingLinesResult = {
  lines: DwellingCostSnapshotLine[];
  warnings: string[];
  completeness: "ready" | "hold" | "conflict" | "empty";
};

/**
 * Deterministic compose policy (DF-MB-04…06):
 * - UNION different lines
 * - same LP + different branch → KEEP BOTH
 * - identical contentHash → KEEP ONE + provenance sources[]
 * - same LP + same branch + different content → CONFLICT HOLD
 * - no silent drop / double count
 */
export function mergeDwellingArtifactLines(
  artifacts: DwellingCostArtifactRef[],
): MergeDwellingLinesResult {
  const warnings: string[] = [];
  const allRaw: RawSourceLine[] = [];

  for (const ref of artifacts) {
    const extracted = extractRawLines(ref);
    if (extracted.length === 0) {
      warnings.push(`Artifact ${ref.documentId}: brak pozycji kosztorysu.`);
    }
    allRaw.push(...extracted);
  }

  if (allRaw.length === 0) {
    return { lines: [], warnings, completeness: "empty" };
  }

  // Intra+inter: KEEP ONE by contentHash (no double count).
  const byHash = new Map<string, RawSourceLine[]>();
  for (const line of allRaw) {
    const bucket = byHash.get(line.contentHash) ?? [];
    bucket.push(line);
    byHash.set(line.contentHash, bucket);
  }

  const collapsed: DwellingCostSnapshotLine[] = [];
  for (const [, group] of [...byHash.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const primary = group[0]!;
    const sourceDocumentIds = [...new Set(group.map((g) => g.sourceDocumentId))];
    const sourceArtifactIds = [...new Set(group.map((g) => g.sourceArtifactId))];
    if (group.length > 1) {
      warnings.push(
        `KEEP ONE contentHash=${primary.contentHash} sources=${sourceDocumentIds.join(",")}`,
      );
    }
    collapsed.push({
      sourceDocumentId: primary.sourceDocumentId,
      sourceArtifactId: primary.sourceArtifactId,
      sourceDocumentIds,
      sourceArtifactIds,
      sourceLineKey: primary.sourceLineKey,
      indexInSourceDoc: primary.indexInSourceDoc,
      lp: primary.lp,
      description: primary.description,
      unit: primary.unit,
      quantityRaw: primary.quantityRaw,
      quantity: primary.quantity,
      branchHint: primary.branchHint,
      contentHash: primary.contentHash,
      athUnitPricePln: primary.athUnitPricePln,
      athTotalPln: primary.athTotalPln,
      ...(primary.catalogBasis ? { catalogBasis: primary.catalogBasis } : {}),
    });
  }

  // Conflict: same LP + same branch + different contentHash (across remaining lines).
  const byLpBranch = new Map<string, DwellingCostSnapshotLine[]>();
  for (const line of collapsed) {
    const lp = line.lp.trim();
    if (!lp) continue;
    const key = `${lp}::${line.branchHint}`;
    const bucket = byLpBranch.get(key) ?? [];
    bucket.push(line);
    byLpBranch.set(key, bucket);
  }

  for (const [key, group] of byLpBranch) {
    const hashes = new Set(group.map((g) => g.contentHash));
    if (hashes.size > 1) {
      warnings.push(
        `CONFLICT ${key}: ${hashes.size} różne treści (same LP + branch) → HOLD`,
      );
      return { lines: collapsed, warnings, completeness: "conflict" };
    }
  }

  // Stable order: by sourceDocumentId, then indexInSourceDoc, then contentHash.
  collapsed.sort((a, b) => {
    const d = a.sourceDocumentId.localeCompare(b.sourceDocumentId);
    if (d !== 0) return d;
    if (a.indexInSourceDoc !== b.indexInSourceDoc) {
      return a.indexInSourceDoc - b.indexInSourceDoc;
    }
    return a.contentHash.localeCompare(b.contentHash);
  });

  return { lines: collapsed, warnings, completeness: "ready" };
}

/** Raw extractable line count (same path as merge) — for Master BOQ integrity. */
export function countExtractableLinesFromArtifacts(
  artifacts: DwellingCostArtifactRef[],
): number {
  let n = 0;
  for (const ref of artifacts) {
    n += extractRawLines(ref).length;
  }
  return n;
}

export function snapshotHasUsableLines(snapshot: TenderKosztorysSnapshot | null | undefined): boolean {
  if (!snapshot?.ok) return false;
  if (hasUsableCatalogQuantities(snapshot.catalogQuantities)) return true;
  return (snapshot.rows ?? []).some((r) => r.description?.trim());
}
