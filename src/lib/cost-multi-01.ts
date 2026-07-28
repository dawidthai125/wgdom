/**
 * COST-MULTI-01 — feature flag, resolve z pipeline item, UX copy (M1–M3).
 * Bid / Discovery / parsers / cloud-sync — OOS.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { kosztorysEffectiveRowCount } from "@/lib/tender-dossier-merge";
import { filterCostCandidateFilenames, buildCostPackage } from "@/lib/cost-multi-01-package";
import type { CostPackage } from "@/lib/cost-multi-01-types";
import { branchCodeLabelPl } from "@/lib/cost-multi-01-classify";

/** Rollback: ustaw `false` — UI i resolve wyłączone (DF §12). */
export const COST_MULTI_01_ENABLED = true;

export type CostMultiUiCopy = {
  tone: "info" | "warn";
  title: string;
  body: string;
  members: { filename: string; role: string; detail: string }[];
  policyLabel: string | null;
};

export function collectCostCandidateSourcesFromFilenames(filenames: string[]): string[] {
  return filterCostCandidateFilenames(filenames);
}

export function resolveCostCandidateSources(item: TenderPipelineItem): string[] {
  const fromScan = item.tenderDossier?.scanSummary?.costCandidateSources;
  if (Array.isArray(fromScan) && fromScan.length > 0) {
    return filterCostCandidateFilenames(fromScan);
  }
  const disc = item.tenderDossier?.scanSummary?.costDiscovery;
  if (disc?.found && disc.source) {
    return filterCostCandidateFilenames([disc.source]);
  }
  const src = item.tenderDossier?.kosztorys?.sourceFilename;
  if (src) return filterCostCandidateFilenames([src]);
  return [];
}

export function resolveCostPackageFromItem(item: TenderPipelineItem): CostPackage | null {
  if (!COST_MULTI_01_ENABLED) return null;

  const sources = resolveCostCandidateSources(item);
  if (sources.length === 0) return null;

  const k = item.tenderDossier?.kosztorys;
  const legacyName =
    k?.sourceFilename
    ?? item.tenderDossier?.scanSummary?.costDiscovery?.source
    ?? null;

  const legacyRow = k?.ok ? kosztorysEffectiveRowCount(k) : null;
  const legacyPln = k?.ok
    ? (parsePlnFromKosztorysTotal(k.totalValue, k.currency) ?? null)
    : null;

  const documents = sources.map((filename) => {
    const isLegacy =
      legacyName
      && (filename === legacyName
        || (filename.split(" → ").pop() ?? filename) === legacyName
        || filename.endsWith(legacyName));
    return {
      filename,
      rowCount: isLegacy ? legacyRow : null,
      totalValuePln: isLegacy ? legacyPln : null,
      parseOk: isLegacy ? (k?.ok ?? null) : null,
    };
  });

  return buildCostPackage({
    tenderItemId: item.id,
    documents,
    legacyWinnerFilename: legacyName,
  });
}

export function shouldShowCostMultiUi(pkg: CostPackage | null | undefined): boolean {
  if (!COST_MULTI_01_ENABLED || !pkg) return false;
  return pkg.status === "multi_ready" || pkg.status === "multi_hold" || pkg.status === "conflict";
}

export function resolveCostMultiUiCopy(pkg: CostPackage): CostMultiUiCopy {
  const n = pkg.incompleteness.detectedCostCount;
  const missing = pkg.incompleteness.missingBranchHints;
  const policy = pkg.aggregate?.policy ?? null;

  let title: string;
  let body: string;
  let tone: CostMultiUiCopy["tone"] = "info";

  if (pkg.status === "multi_hold" || pkg.status === "conflict") {
    tone = "warn";
    title = `Wykryto ${n} przedmiarów branżowych — wymagana weryfikacja`;
    body =
      "System nie sumuje automatycznie tych dokumentów (HOLD). "
      + "Wycena ONE może być niepełna. Nie traktuj rekomendowanej ceny jako sumy branż.";
  } else {
    title = `Wykryto ${n} przedmiarów branżowych — wycena ONE może być niepełna`;
    body =
      missing.length > 0
        ? `Poza wybranym ONE wykryto też: ${missing.join(", ")}. `
          + "Suma branż jest przygotowana w pakiecie kosztowym (bez zmiany kalkulatora oferty w tej wersji)."
        : "Wykryto rozłączne branże. Kalkulator oferty nadal korzysta z jednego dokumentu (ONE) — bez auto-PLN z sumy.";
  }

  const members = pkg.members.map((m) => {
    let role = "kandydat";
    let detail = branchCodeLabelPl(m.branchHint);
    if (m.roleInPackage === "included_base") role = "w pakiecie bazowym";
    else if (m.roleInPackage === "excluded") {
      role = "wykluczony";
      const ex = pkg.exclusions.find((e) => e.documentId === m.id);
      detail = ex ? `${detail} · ${ex.reason}` : detail;
    } else if (m.roleInPackage === "alternate") {
      role = "alternatywny";
      const ex = pkg.exclusions.find((e) => e.documentId === m.id);
      detail = ex ? `${detail} · ${ex.reason}` : detail;
    } else if (m.roleInPackage === "held") role = "wstrzymany";
    else if (m.roleInPackage === "legacy_winner") role = "ONE (legacy)";
    const base = m.filename.split(" → ").pop() ?? m.filename;
    return { filename: base, role, detail };
  });

  // Mark legacy in list if present
  if (pkg.legacyOneWinner) {
    const legacyBase = pkg.legacyOneWinner.filename.split(" → ").pop() ?? pkg.legacyOneWinner.filename;
    const hit = members.find((m) => m.filename === legacyBase);
    if (hit && hit.role === "w pakiecie bazowym") {
      hit.role = "ONE + baza";
    } else if (hit) {
      hit.role = `${hit.role} · ONE`;
    }
  }

  const policyLabel =
    policy === "SUM_BRANCH_WINNERS"
      ? "Polityka: SUM_BRANCH_WINNERS (bez PLN Bid)"
      : policy === "HOLD_MANUAL"
        ? "Polityka: HOLD_MANUAL"
        : policy === "BEST_SINGLE"
          ? "Polityka: BEST_SINGLE"
          : null;

  return { tone, title, body, members, policyLabel };
}

export {
  buildCostPackage,
  filterCostCandidateFilenames,
} from "@/lib/cost-multi-01-package";
export {
  classifyRelation,
  inferBranchHint,
  collectRelationHints,
  toCostDocumentRef,
  branchCodeLabelPl,
} from "@/lib/cost-multi-01-classify";
export type * from "@/lib/cost-multi-01-types";
