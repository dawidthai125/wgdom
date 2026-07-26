/**
 * AP2-S3 — Deep Tender Intelligence (pure aggregator).
 * REUSE istniejących pól SWZ / brief / dossier / formal — bez nowych parserów PDF.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import {
  canPrepareValuation,
  resolvedAwardCriteria,
  resolvedWadiumDisplay,
} from "@/lib/tender-data-ssot";
import { classifyDocumentRole } from "@/lib/tender-document-role";
import { extractKnrCodeSpan } from "@/lib/pdf-przedmiar-heuristic";
import { extractKatalogHintFromDescription } from "@/lib/tender-detail-v4-display";
import { buildConstructionScopeFromTenderDossier } from "@/lib/construction-scope-analysis";
import {
  buildDocumentationCompleteness,
  type ValuationReadinessLevel,
} from "@/lib/tender-documentation-completeness";

export type IntelligenceConfidence = "high" | "medium" | "low";

export type IntelligenceFactGroup = "swz" | "przedmiar" | "umowa" | "aggregate";

export interface IntelligenceFact {
  id: string;
  label: string;
  value: string;
  sourceDoc: string;
  sourceSection: string;
  confidence: IntelligenceConfidence;
  group: IntelligenceFactGroup;
}

export interface PrzedmiarInsightsView {
  rowCount: number;
  branchCount: number;
  dominantBranch: string | null;
  units: string[];
  workGroups: string[];
  knrCatalogs: string[];
  topQuantityPositions: Array<{
    lp: string;
    description: string;
    unit: string;
    quantity: number;
    quantityLabel: string;
  }>;
  confidence: IntelligenceConfidence;
  sourceDoc: string;
}

export interface DeepIntelligenceView {
  facts: IntelligenceFact[];
  /** Max 15 — panel „Najważniejsze informacje”. */
  keyFacts: IntelligenceFact[];
  przedmiar: PrzedmiarInsightsView;
  hasUmowaSignal: boolean;
  offerReadyLabel: string;
  offerReadyLevel: ValuationReadinessLevel;
}

const KEY_FACT_PRIORITY: string[] = [
  "offer_deadline",
  "realization",
  "wadium",
  "warranty",
  "dominant_branch",
  "przedmiar_rows",
  "formal_summary",
  "award_criteria",
  "offer_ready",
  "znw",
  "experience",
  "personnel",
  "licenses",
  "insurance",
  "payment_terms",
  "payment_deadline",
  "rekojmia",
  "penalties",
  "valorization",
  "contract_changes",
  "top_quantity",
  "knr_catalogs",
  "units",
  "references",
];

const KEY_FACTS_MAX = 15;

function mapNumericConfidence(n: number | null | undefined): IntelligenceConfidence {
  if (n == null || Number.isNaN(n)) return "medium";
  if (n >= 0.75) return "high";
  if (n >= 0.55) return "medium";
  return "low";
}

function fact(partial: IntelligenceFact): IntelligenceFact {
  return partial;
}

function swzSourceDoc(swz?: TenderSwzAnalysis | null): string {
  if (swz?.sourceFilename?.trim()) return swz.sourceFilename.trim();
  if (swz?.source === "html") return "Ogłoszenie BZP (HTML)";
  if (swz?.source === "pdf") return "SWZ (PDF)";
  if (swz?.source === "docx") return "SWZ (DOCX)";
  return "SWZ / dokumentacja";
}

function collectCorpusText(
  item: TenderPipelineItem,
  swz?: TenderSwzAnalysis | null,
): string {
  const brief = item.tenderDossier?.brief;
  const parts = [
    brief?.paymentTerms,
    brief?.contractPeriod,
    brief?.scopeDescription,
    ...(brief?.additionalNotes ?? []),
    swz?.implementationDeadlineRaw,
    swz?.referenceRequirement,
    ...(swz?.technicalRequirements ?? []),
    ...(swz?.tableExtracts ?? []),
    ...(swz?.qualificationHints ?? []),
  ];
  return parts.filter((p): p is string => Boolean(p?.trim())).join("\n");
}

function extractClause(
  text: string,
  patterns: RegExp[],
): string | null {
  if (!text.trim()) return null;
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[0]) {
      const cleaned = m[0].replace(/\s+/g, " ").trim();
      if (cleaned.length >= 8) return cleaned.slice(0, 180);
    }
  }
  return null;
}

function parseQuantity(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasUmowaDocument(item: TenderPipelineItem): boolean {
  const names: string[] = [];
  for (const d of item.bzpDocuments ?? []) names.push(d.filename);
  for (const f of item.externalDocDiscovery?.files ?? []) names.push(f.filename);
  if (item.uploadedFile?.filename) names.push(item.uploadedFile.filename);
  return names.some((n) => classifyDocumentRole(n) === "umowa");
}

export function buildPrzedmiarInsights(
  item: TenderPipelineItem,
  swz?: TenderSwzAnalysis | null,
): PrzedmiarInsightsView {
  const kosztorys = item.tenderDossier?.kosztorys ?? null;
  const rows = kosztorys?.rows ?? [];
  const catalog = kosztorys?.catalogQuantities ?? [];
  const categories = kosztorys?.categories ?? [];

  const unitSet = new Set<string>();
  for (const r of rows) {
    if (r.unit?.trim()) unitSet.add(r.unit.trim());
  }
  for (const c of catalog) {
    if (c.unit?.trim()) unitSet.add(c.unit.trim());
  }

  const knrSet = new Set<string>();
  for (const r of rows) {
    const fromCode = r.lp && extractKnrCodeSpan(`${r.lp} ${r.description}`)?.code;
    const hint = extractKatalogHintFromDescription(r.description ?? "");
    if (fromCode) knrSet.add(fromCode);
    if (hint && hint !== "—") knrSet.add(hint);
  }
  for (const c of catalog) {
    const span = extractKnrCodeSpan(`${c.lp ?? ""} ${c.description ?? ""}`);
    if (span?.code) knrSet.add(span.code);
    const hint = extractKatalogHintFromDescription(c.description ?? "");
    if (hint && hint !== "—") knrSet.add(hint);
  }

  const qtyCandidates: PrzedmiarInsightsView["topQuantityPositions"] = [];
  for (const r of rows) {
    const q = parseQuantity(r.quantity);
    if (q == null) continue;
    qtyCandidates.push({
      lp: r.lp || "—",
      description: (r.description || "Pozycja").slice(0, 80),
      unit: r.unit || "",
      quantity: q,
      quantityLabel: `${r.quantity}${r.unit ? ` ${r.unit}` : ""}`,
    });
  }
  for (const c of catalog) {
    const q = parseQuantity(c.quantity);
    if (q == null) continue;
    qtyCandidates.push({
      lp: c.lp || "—",
      description: (c.description || "Pozycja").slice(0, 80),
      unit: c.unit || "",
      quantity: q,
      quantityLabel: `${c.quantity}${c.unit ? ` ${c.unit}` : ""}`,
    });
  }
  qtyCandidates.sort((a, b) => b.quantity - a.quantity);
  const topQuantityPositions = qtyCandidates.slice(0, 5);

  const scope = buildConstructionScopeFromTenderDossier({
    kosztorys,
    scopeDescription: item.tenderDossier?.brief?.scopeDescription ?? null,
    swzText: [
      ...(swz?.technicalRequirements ?? []),
      swz?.implementationDeadlineRaw ?? "",
    ].join(" "),
  });

  const workGroups = categories.map((c) => c.name).filter(Boolean).slice(0, 8);
  const dominantBranch = scope.primaryCategory && scope.primaryCategory !== "inne"
    ? scope.primaryCategory
    : (workGroups[0] ?? null);

  const rowCount = Math.max(
    kosztorys?.rowCount ?? 0,
    rows.length,
    catalog.length,
  );
  const branchCount = Math.max(categories.length, scope.categoryBreakdown.length);

  let confidence: IntelligenceConfidence = "low";
  if (rowCount >= 5 && (dominantBranch || knrSet.size > 0)) confidence = "high";
  else if (rowCount > 0 || categories.length > 0) confidence = "medium";

  return {
    rowCount,
    branchCount,
    dominantBranch,
    units: [...unitSet].slice(0, 12),
    workGroups,
    knrCatalogs: [...knrSet].slice(0, 12),
    topQuantityPositions,
    confidence,
    sourceDoc: kosztorys?.sourceFilename?.trim() || "Przedmiar / kosztorys",
  };
}

function pushUnique(facts: IntelligenceFact[], next: IntelligenceFact | null): void {
  if (!next?.value?.trim()) return;
  if (facts.some((f) => f.id === next.id)) return;
  facts.push(next);
}

export function buildDeepIntelligenceView(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
}): DeepIntelligenceView {
  const { item, swz } = opts;
  const facts: IntelligenceFact[] = [];
  const brief = item.tenderDossier?.brief;
  const docSwz = swzSourceDoc(swz);
  const corpus = collectCorpusText(item, swz);
  const umowaPresent = hasUmowaDocument(item);
  const przedmiar = buildPrzedmiarInsights(item, swz);
  const completeness = buildDocumentationCompleteness({ item, swz });
  const readiness = completeness.valuationReadiness;

  // —— SWZ / formal ——
  const deadlineIso = item.submittingOffersDate || brief?.offerDeadline || null;
  if (deadlineIso) {
    const display = (() => {
      const d = new Date(deadlineIso);
      if (!Number.isNaN(d.getTime()) && /T|\d{4}-\d{2}/.test(deadlineIso)) {
        return d.toLocaleString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return String(deadlineIso).slice(0, 80);
    })();
    pushUnique(facts, fact({
      id: "offer_deadline",
      label: "Termin składania ofert",
      value: display,
      sourceDoc: item.submittingOffersDate ? "Ogłoszenie BZP" : "Brief / SWZ",
      sourceSection: "Termin składania ofert",
      confidence: item.submittingOffersDate ? "high" : "medium",
      group: "swz",
    }));
  }

  const realization = swz?.implementationDeadlineRaw?.trim()
    || brief?.contractPeriod?.trim()
    || null;
  if (realization) {
    const days = swz?.implementationDays != null ? ` (${swz.implementationDays} dni)` : "";
    pushUnique(facts, fact({
      id: "realization",
      label: "Termin realizacji",
      value: `${realization}${days}`.slice(0, 160),
      sourceDoc: swz?.implementationDeadlineRaw ? docSwz : "Brief",
      sourceSection: "Termin / okres realizacji",
      confidence: swz?.implementationDays != null ? "high" : "medium",
      group: "swz",
    }));
  }

  const wadium = resolvedWadiumDisplay(swz)?.trim();
  if (wadium) {
    pushUnique(facts, fact({
      id: "wadium",
      label: "Wadium",
      value: wadium,
      sourceDoc: docSwz,
      sourceSection: "Wadium",
      confidence: swz?.wadiumPln != null ? "high" : "medium",
      group: "swz",
    }));
  }

  const warranty = extractClause(corpus, [
    /okres\s+gwarancji[^\n.]{0,100}/i,
    /gwarancj[ai]\s+(?:jako[sś]ci|na\s+wykonane)[^\n.]{0,100}/i,
    /minimalny\s+wymagany\s+okres\s+gwarancji[^\n.]{0,80}/i,
  ]);
  if (warranty) {
    pushUnique(facts, fact({
      id: "warranty",
      label: "Okres gwarancji",
      value: warranty,
      sourceDoc: umowaPresent ? "Umowa / SWZ" : docSwz,
      sourceSection: "Gwarancja",
      confidence: "medium",
      group: umowaPresent ? "umowa" : "swz",
    }));
  }

  const experience = (swz?.experienceRequirements ?? []).filter((e) => e.confidence >= 0.55);
  if (experience.length > 0) {
    const top = experience[0];
    pushUnique(facts, fact({
      id: "experience",
      label: "Wymagane doświadczenie",
      value: top.label || [
        top.minProjects ? `min. ${top.minProjects} robót` : null,
        top.minValuePln != null ? `wartość ${fmtPln(top.minValuePln)}` : null,
        top.periodYears != null ? `okres ${top.periodYears} lat` : null,
      ].filter(Boolean).join(" · ") || "Wymagane",
      sourceDoc: docSwz,
      sourceSection: "Doświadczenie / warunki udziału",
      confidence: mapNumericConfidence(top.confidence),
      group: "swz",
    }));
  }

  if (swz?.referenceRequirement?.trim()) {
    pushUnique(facts, fact({
      id: "references",
      label: "Wymagane referencje",
      value: swz.referenceRequirement.trim().slice(0, 160),
      sourceDoc: docSwz,
      sourceSection: "Referencje",
      confidence: "medium",
      group: "swz",
    }));
  } else if (experience.some((e) => e.referenceRequired)) {
    pushUnique(facts, fact({
      id: "references",
      label: "Wymagane referencje",
      value: "Tak (z wymagań doświadczenia)",
      sourceDoc: docSwz,
      sourceSection: "Doświadczenie",
      confidence: "medium",
      group: "swz",
    }));
  }

  const participation = swz?.participationRequirements ?? [];
  const personnel = participation.filter((p) => p.type === "personnel" && p.confidence >= 0.55);
  if (personnel.length > 0) {
    pushUnique(facts, fact({
      id: "personnel",
      label: "Wymagany personel",
      value: personnel.map((p) => p.label).slice(0, 4).join(" · "),
      sourceDoc: docSwz,
      sourceSection: "Personel / warunki udziału",
      confidence: mapNumericConfidence(Math.max(...personnel.map((p) => p.confidence))),
      group: "swz",
    }));
  }

  const formalReqs = swz?.formalRequirements ?? [];
  const licenseLabels = [
    ...participation.filter((p) => p.type === "license" && p.confidence >= 0.55).map((p) => p.label),
    ...formalReqs.filter((f) =>
      (f.type === "license" || f.type === "membership") && f.confidence >= 0.55
    ).map((f) => f.label),
  ];
  const uniqueLicenses = [...new Set(licenseLabels)].slice(0, 4);
  if (uniqueLicenses.length > 0) {
    pushUnique(facts, fact({
      id: "licenses",
      label: "Wymagane uprawnienia",
      value: uniqueLicenses.join(" · "),
      sourceDoc: docSwz,
      sourceSection: "Uprawnienia / członkostwo",
      confidence: "medium",
      group: "swz",
    }));
  }

  const insurance = participation.filter((p) => p.type === "insurance" && p.confidence >= 0.55);
  if (insurance.length > 0) {
    const top = insurance[0];
    const valueExtra = top.minValuePln != null ? ` (min. ${fmtPln(top.minValuePln)})` : "";
    pushUnique(facts, fact({
      id: "insurance",
      label: "Wymagane ubezpieczenia",
      value: `${top.label}${valueExtra}`,
      sourceDoc: docSwz,
      sourceSection: "Ubezpieczenie OC",
      confidence: mapNumericConfidence(top.confidence),
      group: "swz",
    }));
  }

  const znwFromParticipation = participation.find((p) =>
    p.type === "finance" && /należytego|znw|zabezpieczenie/i.test(p.label)
  );
  const znwClause = znwFromParticipation?.label
    ?? extractClause(corpus, [
      /zabezpieczen(?:ie|ia)\s+należytego\s+wykonania[^\n.]{0,120}/i,
      /wysoko[sś][cć]\s+zabezpieczenia[^\n.]{0,80}/i,
    ]);
  if (znwClause) {
    pushUnique(facts, fact({
      id: "znw",
      label: "Zabezpieczenie należytego wykonania",
      value: znwClause.slice(0, 160),
      sourceDoc: docSwz,
      sourceSection: "ZNW / zabezpieczenie",
      confidence: znwFromParticipation ? mapNumericConfidence(znwFromParticipation.confidence) : "low",
      group: "swz",
    }));
  }

  const criteria = resolvedAwardCriteria(swz);
  if (criteria.length > 0) {
    const summary = criteria
      .slice(0, 4)
      .map((c) => {
        const w = c.weightPct != null ? ` ${c.weightPct}%` : "";
        return `${c.name}${w}`;
      })
      .join(" · ");
    pushUnique(facts, fact({
      id: "award_criteria",
      label: "Kryteria oceny ofert",
      value: summary,
      sourceDoc: docSwz,
      sourceSection: "Kryteria oceny",
      confidence: criteria.some((c) => c.weightPct != null) ? "high" : "medium",
      group: "swz",
    }));
  }

  const formalCount = (swz?.formalRequirements?.length ?? 0)
    + (swz?.participationRequirements?.length ?? 0);
  if (formalCount > 0) {
    const labels = [
      ...(swz?.formalRequirements ?? []).map((f) => f.label),
      ...personnel.map((p) => p.label),
      ...uniqueLicenses,
    ].filter(Boolean);
    const unique = [...new Set(labels)].slice(0, 5);
    pushUnique(facts, fact({
      id: "formal_summary",
      label: "Główne wymagania formalne",
      value: unique.length > 0 ? unique.join(" · ") : `${formalCount} wymagań`,
      sourceDoc: docSwz,
      sourceSection: "Warunki udziału",
      confidence: "medium",
      group: "swz",
    }));
  }

  // —— Przedmiar ——
  if (przedmiar.rowCount > 0) {
    pushUnique(facts, fact({
      id: "przedmiar_rows",
      label: "Liczba pozycji przedmiaru",
      value: String(przedmiar.rowCount),
      sourceDoc: przedmiar.sourceDoc,
      sourceSection: "Przedmiar · pozycje",
      confidence: przedmiar.confidence,
      group: "przedmiar",
    }));
  }
  if (przedmiar.dominantBranch) {
    pushUnique(facts, fact({
      id: "dominant_branch",
      label: "Dominująca branża",
      value: przedmiar.branchCount > 1
        ? `${przedmiar.dominantBranch} (${przedmiar.branchCount} grup)`
        : przedmiar.dominantBranch,
      sourceDoc: przedmiar.sourceDoc,
      sourceSection: "Zakres / kategorie",
      confidence: przedmiar.confidence,
      group: "przedmiar",
    }));
  }
  if (przedmiar.units.length > 0) {
    pushUnique(facts, fact({
      id: "units",
      label: "Jednostki miary",
      value: przedmiar.units.join(", "),
      sourceDoc: przedmiar.sourceDoc,
      sourceSection: "Przedmiar · j.m.",
      confidence: "high",
      group: "przedmiar",
    }));
  }
  if (przedmiar.knrCatalogs.length > 0) {
    pushUnique(facts, fact({
      id: "knr_catalogs",
      label: "Wykryte katalogi KNR/KNNR",
      value: przedmiar.knrCatalogs.slice(0, 6).join(" · "),
      sourceDoc: przedmiar.sourceDoc,
      sourceSection: "Normy katalogowe",
      confidence: "medium",
      group: "przedmiar",
    }));
  }
  if (przedmiar.topQuantityPositions.length > 0) {
    const top = przedmiar.topQuantityPositions[0];
    pushUnique(facts, fact({
      id: "top_quantity",
      label: "Największa pozycja ilościowa",
      value: `${top.lp}: ${top.description} — ${top.quantityLabel}`,
      sourceDoc: przedmiar.sourceDoc,
      sourceSection: "Przedmiar · ilości",
      confidence: "medium",
      group: "przedmiar",
    }));
  }

  // —— Umowa (ekstrakcja z dostępnego tekstu; bez oceny ryzyka) ——
  const contractSource = umowaPresent ? "Projekt umowy / SWZ" : docSwz;
  const contractGroup: IntelligenceFactGroup = umowaPresent ? "umowa" : "swz";

  if (brief?.paymentTerms?.trim()) {
    pushUnique(facts, fact({
      id: "payment_terms",
      label: "Warunki płatności",
      value: brief.paymentTerms.trim().slice(0, 160),
      sourceDoc: "Brief / ogłoszenie",
      sourceSection: "Warunki płatności",
      confidence: "high",
      group: contractGroup,
    }));
  }

  const paymentDeadline = extractClause(corpus, [
    /termin(?:u)?\s+p[lł]atno[sś]ci[^\n.]{0,100}/i,
    /p[lł]atno[sś][cć]\s+w\s+terminie[^\n.]{0,80}/i,
    /(?:\d{1,3})\s*dni\s+(?:od\s+)?(?:otrzymania|dostarczenia|faktury)/i,
  ]);
  if (paymentDeadline) {
    pushUnique(facts, fact({
      id: "payment_deadline",
      label: "Terminy płatności",
      value: paymentDeadline,
      sourceDoc: contractSource,
      sourceSection: "Terminy płatności",
      confidence: "medium",
      group: contractGroup,
    }));
  }

  const penalties = extractClause(corpus, [
    /kar[ay]\s+umown[^\n.]{0,120}/i,
    /wysoko[sś][cć]\s+kar(?:y|)\s+umown[^\n.]{0,100}/i,
  ]);
  if (penalties) {
    pushUnique(facts, fact({
      id: "penalties",
      label: "Kary umowne",
      value: penalties,
      sourceDoc: contractSource,
      sourceSection: "Kary umowne",
      confidence: umowaPresent ? "medium" : "low",
      group: contractGroup,
    }));
  }

  const rekojmia = extractClause(corpus, [
    /r[eę]kojmi[^\n.]{0,100}/i,
    /okres\s+r[eę]kojmi[^\n.]{0,80}/i,
  ]);
  if (rekojmia) {
    pushUnique(facts, fact({
      id: "rekojmia",
      label: "Okres rękojmi",
      value: rekojmia,
      sourceDoc: contractSource,
      sourceSection: "Rękojmia",
      confidence: "medium",
      group: contractGroup,
    }));
  }

  const valorization = extractClause(corpus, [
    /waloryzac[^\n.]{0,120}/i,
    /klauzul[aą]\s+waloryzacyjn[^\n.]{0,80}/i,
  ]);
  if (valorization) {
    pushUnique(facts, fact({
      id: "valorization",
      label: "Możliwość waloryzacji",
      value: valorization,
      sourceDoc: contractSource,
      sourceSection: "Waloryzacja",
      confidence: "medium",
      group: contractGroup,
    }));
  }

  const contractChanges = extractClause(corpus, [
    /zmian[ay]\s+umowy[^\n.]{0,120}/i,
    /istotn[aą]\s+zmian[aą]\s+umowy[^\n.]{0,100}/i,
    /mo[zż]liwo[sś][cć]\s+zmian(?:y|)\s+umowy[^\n.]{0,80}/i,
  ]);
  if (contractChanges) {
    pushUnique(facts, fact({
      id: "contract_changes",
      label: "Możliwość zmian umowy",
      value: contractChanges,
      sourceDoc: contractSource,
      sourceSection: "Zmiany umowy",
      confidence: "low",
      group: contractGroup,
    }));
  }

  // —— Aggregate ——
  pushUnique(facts, fact({
    id: "offer_ready",
    label: "Gotowość do przygotowania oferty",
    value: readiness.labelPl,
    sourceDoc: "Agregat dokumentacji",
    sourceSection: "Kompletność + przedmiar",
    confidence: canPrepareValuation(item) ? "high" : "medium",
    group: "aggregate",
  }));

  const keyFacts = KEY_FACT_PRIORITY
    .map((id) => facts.find((f) => f.id === id))
    .filter((f): f is IntelligenceFact => Boolean(f))
    .slice(0, KEY_FACTS_MAX);

  // Uzupełnij do max jeśli brakuje priorytetów
  if (keyFacts.length < KEY_FACTS_MAX) {
    for (const f of facts) {
      if (keyFacts.length >= KEY_FACTS_MAX) break;
      if (!keyFacts.some((k) => k.id === f.id)) keyFacts.push(f);
    }
  }

  return {
    facts,
    keyFacts,
    przedmiar,
    hasUmowaSignal: umowaPresent,
    offerReadyLabel: readiness.labelPl,
    offerReadyLevel: readiness.level,
  };
}

export function confidenceLabelPl(c: IntelligenceConfidence): string {
  switch (c) {
    case "high":
      return "wysoka";
    case "medium":
      return "średnia";
    default:
      return "niska";
  }
}
