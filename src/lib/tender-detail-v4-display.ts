/**
 * V4.1 — prezentacja danych przetargu (display-only, bez parserów / scoringu).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import { checkTenderParticipation } from "@/lib/tender-participation-check";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  resolvedCostStatusDisplay,
  resolveTenderValue,
  resolvedWadiumDisplay,
} from "@/lib/tender-data-ssot";
import { isKosztorysAwaitingHeavyParse } from "@/lib/tender-analysis-status-ux";
import { buildPreviewContextFromPipelineItem } from "@/lib/tender-pdf-preview-ux";
import { buildDocumentPreviewSummary } from "@/lib/tender-document-summary-header";
import { buildExecutiveSummary, type ExecutiveSummary } from "@/lib/tender-executive-summary";
import { buildTenderIntelligenceNarrative } from "@/lib/tender-intelligence-narrative";
import { summarizeSwzFindings } from "@/lib/tenders-bid-prep";
import { buildClassificationSummary } from "@/lib/tender-classification-inspector";
import {
  getTenderPriceOverrides,
  loadTenderPriceOverridesStoreLocal,
  type TenderPriceOverrideEntry,
} from "@/lib/tender-price-overrides";
import { buildCatalogLinePricingView } from "@/lib/tender-catalog-line-pricing";
import { defaultCostModelFromPayroll } from "@/lib/company-labor-cost";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";

export function formatTenderDeadlineDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const offerOpen = isTenderOpenForOffers(iso);
  const days = daysUntilTenderDeadline(iso);
  const base = d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!offerOpen) return base;
  if (days != null && days >= 0) return `${base} (${days} d.)`;
  return base;
}

export function displayZnwLabel(swz: TenderSwzAnalysis | null | undefined): string {
  const reqs = swz?.participationRequirements ?? [];
  const finance = reqs.filter((r) => r.type === "finance");
  const hit = finance.find((r) =>
    /należytego|znw|zabezpieczenie.*wykonania/i.test(r.label),
  );
  if (hit?.label?.trim()) return hit.label.trim();
  return "—";
}

export function displayParticipationSummary(
  swz: TenderSwzAnalysis | null | undefined,
): string {
  const reqs = swz?.participationRequirements ?? [];
  const experience = swz?.experienceRequirements ?? [];
  if (reqs.length === 0 && experience.length === 0) return "—";
  const profile = loadCompanyQualificationProfileLocal();
  const result = checkTenderParticipation(reqs, profile, experience);
  if (!result) return reqs.length > 0 ? `${reqs.length} wymagań` : "—";
  return `${result.summaryEmoji} ${result.summaryLabel}`;
}

export interface PrzetargExecutiveBundle {
  executive: ExecutiveSummary | null;
  docSummary: ReturnType<typeof buildDocumentPreviewSummary>;
  narrative: string;
}

export function buildPrzetargExecutiveBundle(item: TenderPipelineItem): PrzetargExecutiveBundle {
  const previewCtx = buildPreviewContextFromPipelineItem(item);
  const docSummary = previewCtx ? buildDocumentPreviewSummary(previewCtx, { item }) : null;
  const executive = previewCtx && docSummary
    ? buildExecutiveSummary(previewCtx, docSummary)
    : null;
  const narrative = buildTenderIntelligenceNarrative(item, executive, item.swzAnalysis);
  return { executive, docSummary, narrative };
}

export interface ParticipationDisplayGroup {
  label: string;
  items: string[];
}

const EQUIPMENT_RE = /sprz[eę]t|maszyn|pojazd|urządzen|urzadzen/i;

export function buildParticipationDisplayGroups(
  swz: TenderSwzAnalysis | null | undefined,
): ParticipationDisplayGroup[] {
  const profile = loadCompanyQualificationProfileLocal();
  const reqs = swz?.participationRequirements ?? [];
  const experience = swz?.experienceRequirements ?? [];
  const formal = swz?.formalRequirements ?? [];
  const result: ParticipationCheckResult | null = reqs.length || experience.length
    ? checkTenderParticipation(reqs, profile, experience)
    : null;

  const groups: ParticipationDisplayGroup[] = [
    { label: "Referencje", items: [] },
    { label: "Kadra", items: [] },
    { label: "Sprzęt", items: [] },
    { label: "Ubezpieczenia", items: [] },
    { label: "Inne wymagania", items: [] },
  ];

  const push = (label: string, text: string) => {
    const g = groups.find((x) => x.label === label);
    if (g && text.trim()) g.items.push(text.trim());
  };

  if (result) {
    for (const cat of result.categories) {
      for (const it of cat.items) {
        const line = it.label || it.requirement.label;
        switch (cat.type) {
          case "reference":
          case "experience":
            push("Referencje", line);
            break;
          case "personnel":
          case "license":
            push("Kadra", line);
            break;
          case "insurance":
            push("Ubezpieczenia", line);
            break;
          case "finance":
            push("Inne wymagania", line);
            break;
          default:
            push("Inne wymagania", line);
        }
      }
    }
  } else {
    for (const req of reqs) {
      switch (req.type) {
        case "reference":
        case "experience":
          push("Referencje", req.label);
          break;
        case "personnel":
        case "license":
          push("Kadra", req.label);
          break;
        case "insurance":
          push("Ubezpieczenia", req.label);
          break;
        default:
          push("Inne wymagania", req.label);
      }
    }
  }

  for (const exp of experience) {
    push("Referencje", exp.label || exp.sourceText?.slice(0, 120) || "Doświadczenie");
  }

  for (const f of formal) {
    const text = f.label || f.sourceText || "";
    if (!text) continue;
    if (EQUIPMENT_RE.test(text)) push("Sprzęt", text);
    else if (f.type === "personnel" || f.type === "license") push("Kadra", text);
    else if (f.type === "experience") push("Referencje", text);
    else push("Inne wymagania", text);
  }

  if (swz?.referenceRequirement?.trim()) {
    push("Referencje", swz.referenceRequirement.trim().slice(0, 160));
  }

  return groups.filter((g) => g.items.length > 0);
}

export function hasParticipationDisplayData(swz: TenderSwzAnalysis | null | undefined): boolean {
  return buildParticipationDisplayGroups(swz).length > 0;
}

export function buildPrzetargKeyFacts(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): Array<{ label: string; value: string }> {
  const wadium = computeWadiumInfo(item, swz, loadCompanyProfileLocal().maxWadiumPln);
  const value = resolveTenderValue(item, swz ?? null);
  return [
    { label: "Nazwa przetargu", value: item.title?.trim() || "—" },
    { label: "Zamawiający", value: item.organizationName?.trim() || "—" },
    { label: "Termin składania", value: formatTenderDeadlineDisplay(item.submittingOffersDate) },
    { label: "Wadium", value: wadium.summary?.trim() || resolvedWadiumDisplay(swz) || "—" },
    { label: "ZNW", value: displayZnwLabel(swz) },
    { label: "Wartość", value: value.display?.trim() || "—" },
  ];
}

export function buildPrzetargWorkScopeLabels(
  item: TenderPipelineItem,
  bundle: PrzetargExecutiveBundle,
): string[] {
  const fromExec = bundle.executive?.mainWorks ?? [];
  if (fromExec.length > 0) return fromExec.slice(0, 8);
  const briefScope = item.tenderDossier?.brief?.scopeDescription?.trim();
  if (briefScope) {
    return [briefScope.slice(0, 200)];
  }
  return [];
}

export function buildPrzetargHighlights(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  bundle: PrzetargExecutiveBundle,
): string[] {
  const lines: string[] = [];
  const swzLine = swz ? summarizeSwzFindings(item, swz) : "";
  if (swzLine) lines.push(swzLine);
  if (bundle.executive?.headline) lines.push(bundle.executive.headline);
  if (bundle.executive?.rowCountLabel && bundle.executive.rowCount != null && bundle.executive.rowCount > 0) {
    lines.push(`Pozycje kosztorysu: ${bundle.executive.rowCountLabel}`);
  }
  if (bundle.docSummary?.valueLabel) lines.push(`Wartość dokumentu: ${bundle.docSummary.valueLabel}`);
  if (bundle.docSummary?.statusLabel) lines.push(bundle.docSummary.statusLabel);
  if (bundle.narrative && !lines.some((l) => l.includes(bundle.narrative.slice(0, 40)))) {
    lines.push(bundle.narrative);
  }
  const notes = item.tenderDossier?.brief?.additionalNotes ?? [];
  for (const n of notes.slice(0, 3)) {
    if (n.trim()) lines.push(n.trim().slice(0, 200));
  }
  const tech = swz?.technicalRequirements ?? [];
  for (const t of tech.slice(0, 2)) {
    if (t.trim()) lines.push(t.trim().slice(0, 200));
  }
  return [...new Set(lines)].slice(0, 8);
}

export function countTenderDocuments(item: TenderPipelineItem): number {
  let n = item.bzpDocuments?.length ?? 0;
  if (item.uploadedFile) n += 1;
  return n;
}

export function formatAthPositionCount(count: number | null | undefined): string {
  if (count == null || count <= 0) return "Brak rozpoznanych pozycji";
  return String(count);
}

export interface KosztorysV4Stats {
  athReady: boolean;
  athStatusLabel: string;
  athPositions: number;
  athPositionsDisplay: string;
  pricedPositions: number;
  unpricedPositions: number;
  pricedDisplay: string;
  unpricedDisplay: string;
  valuationValueDisplay: string;
  valuationTotalPln: number | null;
}

export function buildKosztorysV4Stats(
  item: TenderPipelineItem,
  priceOverrides: TenderPriceOverrideEntry[] = getTenderPriceOverrides(
    loadTenderPriceOverridesStoreLocal(),
    item.id,
  ).overrides,
): KosztorysV4Stats {
  const k = item.tenderDossier?.kosztorys;
  const awaiting = isKosztorysAwaitingHeavyParse(item);
  const athReady = Boolean(k?.ok) && !awaiting;

  const catalog = k?.catalogQuantities?.filter((line) => {
    const q = parseFloat(String(line.quantity ?? "").replace(",", "."));
    return Number.isFinite(q) && q > 0;
  }) ?? [];

  let athPositions = 0;
  if (catalog.length > 0) athPositions = catalog.length;
  else if (k?.rowCount && k.rowCount > 0) athPositions = k.rowCount;
  else if (k?.rows?.length) athPositions = k.rows.length;

  let pricedPositions = 0;
  let unpricedPositions = 0;

  if (catalog.length > 0) {
    const classification = buildClassificationSummary(catalog);
    pricedPositions = classification.classifiedRows;
    unpricedPositions = classification.unknownRows;
    const pricingView = buildCatalogLinePricingView(
      catalog,
      undefined,
      defaultCostModelFromPayroll(),
      priceOverrides,
    );
    if (pricingView) {
      pricedPositions = pricingView.classifiedPositionCount;
      unpricedPositions = pricingView.unassignedCount;
    }
  } else if (k?.rows?.length) {
    athPositions = k.rowCount || k.rows.length;
    pricedPositions = k.rows.filter((r) => r.total?.trim() && r.total !== "—" && r.total !== "0").length;
    unpricedPositions = Math.max(0, athPositions - pricedPositions);
  }

  const valuationTotalPln = pricingTotalPln(item, priceOverrides, catalog.length > 0 ? catalog : null);
  const costDisplay = resolvedCostStatusDisplay(item);

  return {
    athReady,
    athStatusLabel: athReady ? "ATH gotowy" : "ATH niegotowy",
    athPositions,
    athPositionsDisplay: formatAthPositionCount(athPositions),
    pricedPositions,
    unpricedPositions,
    pricedDisplay: pricedPositions > 0 ? String(pricedPositions) : (athPositions > 0 ? "0" : "Brak rozpoznanych pozycji"),
    unpricedDisplay: unpricedPositions > 0 ? String(unpricedPositions) : (athPositions > 0 ? "0" : "Brak rozpoznanych pozycji"),
    valuationValueDisplay: valuationTotalPln != null
      ? fmtPln(valuationTotalPln)
      : (costDisplay.display || k?.totalValue || "—"),
    valuationTotalPln,
  };
}

function pricingTotalPln(
  item: TenderPipelineItem,
  priceOverrides: TenderPriceOverrideEntry[],
  catalog: import("@/lib/tenders-bzp-brief").TenderCatalogQuantityLine[] | null,
): number | null {
  if (catalog?.length) {
    const view = buildCatalogLinePricingView(catalog, undefined, defaultCostModelFromPayroll(), priceOverrides);
    if (view && view.classifiedDirectTotalPln > 0) return Math.round(view.classifiedDirectTotalPln);
  }
  const k = item.tenderDossier?.kosztorys;
  const fromFile = parsePlnFromKosztorysTotal(k?.totalValue, k?.currency);
  if (fromFile != null) return fromFile;
  if (item.ourEstimatePln != null) return item.ourEstimatePln;
  return null;
}

export interface WycenaKpiDisplay {
  priced: number;
  total: number;
  ratioDisplay: string;
  percentDisplay: string;
}

export function buildWycenaKpiDisplay(item: TenderPipelineItem): WycenaKpiDisplay {
  const stats = buildKosztorysV4Stats(item);
  const total = stats.athPositions;
  const priced = stats.pricedPositions;
  if (total <= 0) {
    return { priced: 0, total: 0, ratioDisplay: "—", percentDisplay: "—" };
  }
  const pct = Math.round((priced / total) * 100);
  return {
    priced,
    total,
    ratioDisplay: `${priced} / ${total}`,
    percentDisplay: `${pct}%`,
  };
}

export interface KpiBarProCell {
  label: string;
  value: string;
  subValue?: string;
}

export function buildKpiBarProCells(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
): KpiBarProCell[] {
  const wadium = computeWadiumInfo(item, swz, loadCompanyProfileLocal().maxWadiumPln);
  const value = resolveTenderValue(item, swz ?? null);
  const docs = countTenderDocuments(item);
  const athStats = buildKosztorysV4Stats(item);
  const wycena = buildWycenaKpiDisplay(item);

  return [
    { label: "Termin", value: formatTenderDeadlineDisplay(item.submittingOffersDate) },
    { label: "Wadium", value: wadium.summary?.trim() || "—" },
    { label: "ZNW", value: displayZnwLabel(swz) },
    { label: "Wartość", value: value.display?.trim() || "—" },
    { label: "Warunki", value: displayParticipationSummary(swz) },
    { label: "Dokumenty", value: docs > 0 ? String(docs) : "—" },
    {
      label: "ATH",
      value: athStats.athPositions > 0 ? `${athStats.athPositions} pozycji` : athStats.athPositionsDisplay,
    },
    {
      label: "Wycena",
      value: wycena.ratioDisplay,
      subValue: wycena.percentDisplay !== "—" ? wycena.percentDisplay : undefined,
    },
  ];
}
