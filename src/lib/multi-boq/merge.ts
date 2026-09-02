/**
 * MULTI-BOQ-01 — deterministic merge of Owner-mapped cost artifacts → dwelling lines.
 */

import {
  hasUsableCatalogQuantities,
  resolveCatalogBasisFromSourceRow,
} from "@/lib/tenders-bzp-brief";
import type { CatalogBasis, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  normalizeBoqPositionLp,
  resolveQuantityExpressionFromPrzedmiar,
} from "@/lib/intelligent-estimator/boq-expression-source-seam";
import {
  buildCanonicalFieldsForReconciledPair,
  canReconcileAthPdfPair,
  inferBoqLineSourceKind,
  normalizeBoqLineForMerge,
  pickPrimaryBoqSourceLine,
  type BoqLineSourceKind,
  type NormalizedBoqLine,
} from "@/lib/multi-boq/boq-line-normalize";
import {
  buildSourceLineKey,
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
  quantityExpressionRaw?: string | null;
  branchHint: DwellingCostBranchHint;
  sourceKind: BoqLineSourceKind;
  sourceLineKey: string;
  contentHash: string;
  normalized: NormalizedBoqLine;
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
  const sourceKind = inferBoqLineSourceKind(ref.filename || ref.documentId);

  const expressionsByLp = snap.quantityExpressionsByLp ?? null;

  const resolveExpression = (
    lp: string,
    fromCatalog?: string | null,
    przedmiar?: { quantity: string; formula?: string }[] | null,
  ): string | null => {
    const fromCat = String(fromCatalog ?? "").trim();
    if (fromCat) return fromCat;
    const fromPrzedmiar = resolveQuantityExpressionFromPrzedmiar(przedmiar);
    if (fromPrzedmiar) return fromPrzedmiar;
    const key = normalizeBoqPositionLp(lp);
    if (key && expressionsByLp?.[key]?.trim()) return expressionsByLp[key]!.trim();
    return null;
  };

  const push = (
    indexInSourceDoc: number,
    lp: string,
    description: string,
    unit: string,
    quantityRaw: string,
    athUnit: number | null,
    athTotal: number | null,
    catalogBasis?: CatalogBasis | null,
    quantityExpressionRaw?: string | null,
  ) => {
    const desc = String(description ?? "").trim();
    const safeLp = sanitizeSourceLp(lp, indexInSourceDoc);
    const sourceLineKey = buildSourceLineKey(safeLp, desc, indexInSourceDoc);
    const unitStr = String(unit ?? "").trim();
    const qtyStr = String(quantityRaw ?? "").trim();
    const normalized = normalizeBoqLineForMerge({
      lp: safeLp,
      description: desc,
      unit: unitStr,
      quantityRaw: qtyStr,
      sourceKind,
    });
    const contentHash = normalized.canonicalContentHash;
    const expr = quantityExpressionRaw?.trim() || null;
    out.push({
      sourceDocumentId: ref.documentId,
      sourceArtifactId: ref.artifactId,
      indexInSourceDoc,
      lp: safeLp,
      description: desc || "(bez opisu)",
      unit: unitStr,
      quantityRaw: qtyStr,
      quantity: parseQty(quantityRaw),
      ...(expr ? { quantityExpressionRaw: expr } : {}),
      branchHint: branch,
      sourceKind,
      sourceLineKey,
      contentHash,
      normalized,
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
        resolveCatalogBasisFromSourceRow({
          description: c.description,
          catalogBasis: c.catalogBasis,
        }),
        resolveExpression(c.lp ?? "", c.quantityExpressionRaw ?? null, null),
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
    const rowPrzedmiar =
      Array.isArray((r as { przedmiar?: { quantity: string; formula?: string }[] }).przedmiar)
        ? (r as { przedmiar?: { quantity: string; formula?: string }[] }).przedmiar
        : null;
    push(
      index,
      r.lp ?? "",
      r.description ?? "",
      r.unit ?? "",
      r.quantity ?? "",
      Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : null,
      Number.isFinite(total) && total > 0 ? total : null,
      resolveCatalogBasisFromSourceRow({
        code: r.code,
        description: r.description,
        catalogBasis: r.catalogBasis,
      }),
      resolveExpression(r.lp ?? "", null, rowPrzedmiar),
    );
  });
  return out;
}

export type MergeDwellingLinesResult = {
  lines: DwellingCostSnapshotLine[];
  warnings: string[];
  completeness: "ready" | "hold" | "conflict" | "empty";
};

function lpSortKey(lp: string): number {
  const n = Number(String(lp ?? "").trim());
  return Number.isFinite(n) ? n : 99999;
}

function rawLineToSnapshotLine(line: RawSourceLine, group: RawSourceLine[]): DwellingCostSnapshotLine {
  const primary = pickPrimaryBoqSourceLine(group);
  const sourceDocumentIds = [...new Set(group.map((g) => g.sourceDocumentId))];
  const sourceArtifactIds = [...new Set(group.map((g) => g.sourceArtifactId))];
  return {
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
    ...(primary.quantityExpressionRaw?.trim()
      ? { quantityExpressionRaw: primary.quantityExpressionRaw.trim() }
      : {}),
    branchHint: primary.branchHint,
    contentHash: line.contentHash,
    athUnitPricePln: primary.athUnitPricePln,
    athTotalPln: primary.athTotalPln,
    ...(primary.catalogBasis ? { catalogBasis: primary.catalogBasis } : {}),
  };
}

function reconcileLpBranchGroup(
  lines: RawSourceLine[],
  warnings: string[],
): RawSourceLine[] | "conflict" {
  if (lines.length === 0) return "conflict";
  if (lines.length === 1) return lines;

  const byHash = new Map<string, RawSourceLine[]>();
  for (const line of lines) {
    const bucket = byHash.get(line.contentHash) ?? [];
    bucket.push(line);
    byHash.set(line.contentHash, bucket);
  }
  if (byHash.size === 1) {
    if (lines.length > 1) {
      const primary = lines[0]!;
      warnings.push(
        `KEEP ONE contentHash=${primary.contentHash} sources=${[...new Set(lines.map((l) => l.sourceDocumentId))].join(",")}`,
      );
    }
    return [pickPrimaryBoqSourceLine(lines)];
  }

  const athLines = lines.filter((l) => l.sourceKind === "ath");
  const pdfLines = lines.filter((l) => l.sourceKind === "pdf");

  if (lines.length === 2 && athLines.length === 1 && pdfLines.length === 1) {
    const ath = athLines[0]!;
    const pdf = pdfLines[0]!;
    if (canReconcileAthPdfPair(ath, pdf)) {
      const canonicalInput = buildCanonicalFieldsForReconciledPair(ath, pdf);
      const normalized = normalizeBoqLineForMerge(canonicalInput);
      const primary = pickPrimaryBoqSourceLine([ath, pdf]);
      warnings.push(
        `ATH_PDF_RECONCILED lp=${ath.lp} sources=${ath.sourceDocumentId},${pdf.sourceDocumentId} diff=qty:${ath.normalized.quantityCanonical}/${pdf.normalized.quantityCanonical} unit:${ath.normalized.unitFamily}/${pdf.normalized.unitFamily}`,
      );
      warnings.push(
        `KEEP ONE contentHash=${normalized.canonicalContentHash} sources=${ath.sourceDocumentId},${pdf.sourceDocumentId}`,
      );
      return [{
        ...primary,
        contentHash: normalized.canonicalContentHash,
        normalized,
        unit: canonicalInput.unit,
        description: canonicalInput.description,
      }];
    }
  }

  return "conflict";
}

/**
 * Deterministic compose policy (DF-MB-04…06 + ATH/PDF reconciliation):
 * - UNION different lines
 * - same LP + different branch → KEEP BOTH
 * - identical canonical contentHash → KEEP ONE + provenance sources[]
 * - same LP + same branch + ATH/PDF parser representation diff → KEEP ONE (reconcile)
 * - same LP + same branch + material canonical diff → CONFLICT HOLD
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

  const byLpBranch = new Map<string, RawSourceLine[]>();
  for (const line of allRaw) {
    const lp = line.lp.trim();
    if (!lp) continue;
    const key = `${lp}::${line.branchHint}`;
    const bucket = byLpBranch.get(key) ?? [];
    bucket.push(line);
    byLpBranch.set(key, bucket);
  }

  const collapsed: DwellingCostSnapshotLine[] = [];

  for (const [key, group] of [...byLpBranch.entries()].sort((a, b) => {
    const lpCmp = lpSortKey(a[0].split("::")[0] ?? "") - lpSortKey(b[0].split("::")[0] ?? "");
    if (lpCmp !== 0) return lpCmp;
    return a[0].localeCompare(b[0]);
  })) {
    const reconciled = reconcileLpBranchGroup(group, warnings);
    if (reconciled === "conflict") {
      const hashes = new Set(group.map((g) => g.contentHash));
      warnings.push(
        `CONFLICT ${key}: ${hashes.size} różne treści (same LP + branch) → HOLD`,
      );
      return { lines: collapsed, warnings, completeness: "conflict" };
    }

    const rep = reconciled[0]!;
    const snapshotLine = rawLineToSnapshotLine(rep, group);
    collapsed.push(snapshotLine);
  }

  collapsed.sort((a, b) => {
    const lpCmp = a.lp.localeCompare(b.lp, undefined, { numeric: true });
    if (lpCmp !== 0) return lpCmp;
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
