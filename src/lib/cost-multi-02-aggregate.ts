/**
 * COST-MULTI-02 — merge Branch winners → synthetic TenderKosztorysSnapshot.
 * Zakaz: sum(all) plików. Tylko winners z Aggregate.
 */

import type { TenderCatalogQuantityLine, TenderCostLine, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import { hasUsableCatalogQuantities } from "@/lib/tenders-bzp-brief";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import type { BranchCode } from "@/lib/cost-multi-01-types";
import type { BranchWinnerSnapshot } from "@/lib/cost-multi-02-types";

function branchLpPrefix(branch: BranchCode): string {
  switch (branch) {
    case "construction":
      return "C";
    case "electrical":
      return "E";
    case "sanitary":
      return "S";
    case "fire":
      return "F";
    case "hvac":
      return "H";
    case "finishes":
      return "W";
    case "other":
      return "O";
    default:
      return "U";
  }
}

function parseQtyLoose(q: string | undefined): number {
  if (!q?.trim()) return 0;
  const n = Number(String(q).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Czy snapshot nadaje się do Aggregate (qty lub ATH total > 0). */
export function snapshotUsableForAggregate(snapshot: TenderKosztorysSnapshot | null | undefined): boolean {
  if (!snapshot?.ok) return false;
  if (hasUsableCatalogQuantities(snapshot.catalogQuantities)) return true;
  if (snapshot.rows?.some((r) => r.description?.trim() && parseQtyLoose(r.quantity) > 0)) {
    return true;
  }
  const pln = parsePlnFromKosztorysTotal(snapshot.totalValue, snapshot.currency);
  return pln != null && pln > 0;
}

function linesFromSnapshot(snapshot: TenderKosztorysSnapshot): TenderCatalogQuantityLine[] {
  if (hasUsableCatalogQuantities(snapshot.catalogQuantities)) {
    return (snapshot.catalogQuantities ?? []).filter((l) => parseQtyLoose(l.quantity) > 0);
  }
  return (snapshot.rows ?? [])
    .filter((r) => r.description?.trim() && parseQtyLoose(r.quantity) > 0)
    .map((r) => ({
      lp: r.lp,
      description: r.description,
      unit: r.unit,
      quantity: r.quantity,
    }));
}

/**
 * Buduje syntetyczny snapshot z Branch winners (DF §4.3).
 * Zwraca null gdy którykolwiek winner nie jest usable.
 */
export function buildAggregateKosztorysSnapshot(
  winners: BranchWinnerSnapshot[],
): TenderKosztorysSnapshot | null {
  if (winners.length < 2) return null;
  if (!winners.every((w) => snapshotUsableForAggregate(w.snapshot))) return null;

  const catalogQuantities: TenderCatalogQuantityLine[] = [];
  const rows: TenderCostLine[] = [];
  const warnings: string[] = ["AGGREGATE:SUM_BRANCH_WINNERS"];
  const branches = new Set<BranchCode>();

  let sumPln = 0;
  let allHavePln = true;

  for (const w of winners) {
    branches.add(w.branch);
    const prefix = branchLpPrefix(w.branch);
    const lines = linesFromSnapshot(w.snapshot);
    for (const line of lines) {
      const lp = line.lp?.trim() ? `${prefix}.${line.lp}` : `${prefix}.`;
      const description = `[${prefix}] ${line.description ?? ""}`.trim();
      catalogQuantities.push({
        ...line,
        lp,
        description,
      });
      rows.push({
        lp,
        description,
        unit: line.unit ?? "",
        quantity: line.quantity ?? "",
        total: "",
      });
    }
    for (const warn of w.snapshot.warnings ?? []) {
      if (warn && !warnings.includes(warn)) warnings.push(warn);
    }
    const pln = parsePlnFromKosztorysTotal(w.snapshot.totalValue, w.snapshot.currency);
    if (pln != null && pln > 0) sumPln += pln;
    else allHavePln = false;
  }

  if (branches.has("finishes") && branches.has("construction")) {
    warnings.push("scope_overlap_unchecked");
  }

  const totalValue = allHavePln && sumPln > 0 ? String(Math.round(sumPln)) : undefined;

  return {
    ok: true,
    sourceFilename: `AGGREGATE:${winners.length}-branches`,
    title: `Aggregate ${winners.length} branż`,
    totalValue,
    currency: allHavePln ? "PLN" : undefined,
    rowCount: catalogQuantities.length,
    rows,
    catalogQuantities,
    przedmiar: [],
    categories: [],
    warnings,
    parsedAt: new Date().toISOString(),
  };
}

/** Dopasowanie nazwy artefaktu do membera pakietu. */
export function filenamesMatchCost(a: string, b: string): boolean {
  if (a === b) return true;
  const base = (s: string) => (s.split(" → ").pop() ?? s).trim().toLowerCase();
  return base(a) === base(b);
}
