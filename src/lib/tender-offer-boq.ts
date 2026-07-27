/**
 * AI-COST-01 / COST-S1 — OfferBoq SSOT (pure).
 * Adapter ze istniejącego TenderKosztorysSnapshot — bez parserów, bez wyceny.
 */

import type {
  TenderCatalogQuantityLine,
  TenderCostLine,
  TenderKosztorysSnapshot,
} from "@/lib/tenders-bzp-brief";
import { extractKatalogHintFromDescription } from "@/lib/tender-detail-v4-display";

/** Wersja schematu OfferBoq — bump przy breaking change. */
export const OFFER_BOQ_SCHEMA_VERSION = 5;

export type OfferBoqMatchMethod =
  | "exact_knr"
  | "catalog_map"
  | "category_heuristic"
  | "ath_seed"
  | "manual"
  | "unmatched"
  | "snapshot";

/** Produktowy alias metody dopasowania (COST-S2+) — synonim semantyczny `matchMethod`. */
export type OfferBoqMatchedBy =
  | "exact_knr"
  | "catalog_map"
  | "category_heuristic"
  | "keyword"
  | "manual"
  | "unmatched"
  | "snapshot";

export type OfferBoqConfidence = "high" | "medium" | "low";

/** COST-S3 — typ pozycji (klasyfikacja inteligencji kosztowej). */
export type OfferBoqLineKind =
  | "MaterialInstallation"
  | "Equipment"
  | "Measurement"
  | "Programming"
  | "SupplyInstallation"
  | "IndividualAnalysis"
  | "CompleteSystem"
  | "Demolition"
  | "CivilWorks"
  | "Unknown";

/** COST-S3 — identyfikator strategii przyszłej wyceny. */
export type OfferBoqPricingStrategyId =
  | "material_plus_labor"
  | "finished_device"
  | "measurement"
  | "supply_and_install"
  | "individual_analysis"
  | "complete_system_decompose"
  | "demolition"
  | "civil_works"
  | "unknown";

/** Składowe planu wyceny (bez kwot) — prep pod silniki S4+. */
export type OfferBoqPricingComponent =
  | "material"
  | "labor"
  | "auxiliary_material"
  | "purchase"
  | "transport"
  | "carry_in"
  | "installation"
  | "commissioning"
  | "measurement_equipment"
  | "configuration"
  | "acceptance"
  | "wiring"
  | "test";

/** Planowane silniki wyceny (COST-S4+) — bez implementacji cen. */
export type OfferBoqPlannedEngine =
  | "material"
  | "labour"
  | "equipment"
  | "transport"
  | "calculator";

export interface OfferBoqDecompositionElement {
  elementId: string;
  labelPl: string;
  kindHint: OfferBoqLineKind | null;
  pricingComponents: OfferBoqPricingComponent[];
  source: "rule" | "candidate_match" | "domain";
  notesPl?: string;
}

/** COST-S3 — wynik AI Cost Intelligence dla pozycji. */
export interface OfferBoqCostIntelligence {
  lineKind: OfferBoqLineKind;
  lineKindLabelPl: string;
  pricingStrategyId: OfferBoqPricingStrategyId;
  pricingStrategyLabelPl: string;
  pricingComponents: OfferBoqPricingComponent[];
  requiresDecomposition: boolean;
  decompositionElements: OfferBoqDecompositionElement[];
  confidence: OfferBoqConfidence;
  aiRationale: string;
  plannedEngines: OfferBoqPlannedEngine[];
  analyzedAt: string;
}

export interface OfferBoqCostIntelligenceStats {
  lineCount: number;
  withIntelligence: number;
  decomposedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  byKind: Partial<Record<OfferBoqLineKind, number>>;
}

/** COST-S4 — kategoria komponentu wyceny (agregacja). */
export type OfferBoqPricedComponentCategory =
  | "material"
  | "labor"
  | "equipment"
  | "transport"
  | "auxiliary";

/** COST-S4 — rodzaj źródła ceny (architektura multi-source). */
export type OfferBoqPriceOriginKind =
  | "work_catalog"
  | "company_model"
  | "category_rate"
  | "heuristic_estimate"
  | "external_future"
  | "unknown";

export interface OfferBoqPriceOrigin {
  kind: OfferBoqPriceOriginKind;
  refId?: string;
  labelPl: string;
  /** Miejsce na przyszłe oficjalne integracje (bez scrapingu). */
  externalProviderId?: string;
}

/** COST-S5 — status współpracy użytkownika z propozycją AI. */
export type OfferBoqComponentEditStatus =
  | "ai_proposal"
  | "user_approved"
  | "user_changed";

/** COST-S5 — wpis historii zmian komponentu (append-only, prep audytu). */
export interface OfferBoqComponentChangeRecord {
  field: string;
  previousValue: string;
  nextValue: string;
  changedAt: string;
}

/** COST-S4 — pojedynczy komponent wyceny pozycji. */
export interface OfferBoqPricedComponent {
  componentId: string;
  namePl: string;
  category: OfferBoqPricedComponentCategory;
  quantity: number;
  unit: string;
  unitPricePln: number | null;
  totalPln: number | null;
  priceOrigin: OfferBoqPriceOrigin;
  confidence: OfferBoqConfidence;
  aiRationale: string;
  requiresUserReview: boolean;
  fromDecompositionElementId?: string;
  pricingComponentKind?: OfferBoqPricingComponent;
  /** COST-S5 — domyślnie ai_proposal. */
  editStatus?: OfferBoqComponentEditStatus;
  /** COST-S5 — historia decyzji użytkownika. */
  changeHistory?: OfferBoqComponentChangeRecord[];
}

export interface OfferBoqUserEditStats {
  componentCount: number;
  aiOnlyCount: number;
  approvedCount: number;
  changedCount: number;
}

export interface OfferBoqLinePricingAggregates {
  materialsPln: number | null;
  laborPln: number | null;
  equipmentPln: number | null;
  transportPln: number | null;
  auxiliaryPln: number | null;
  /** Suma bezpośrednia pozycji (bez Kp / marży / oferty). */
  lineDirectPln: number | null;
}

/** COST-S4 — propozycja wyceny pozycji. */
export interface OfferBoqLinePricing {
  components: OfferBoqPricedComponent[];
  aggregates: OfferBoqLinePricingAggregates;
  pricedAt: string;
  confidence: OfferBoqConfidence;
  aiRationale: string;
  componentCount: number;
  pricedComponentCount: number;
}

export interface OfferBoqPricingStats {
  lineCount: number;
  withPricing: number;
  componentCount: number;
  pricedComponentCount: number;
  unpricedComponentCount: number;
  reviewRequiredCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/** Kandydat mapowania — prep pod multi-activity (dostawa + montaż + …). */
export type OfferBoqMatchCandidateRole = "primary" | "candidate";

export interface OfferBoqMatchCandidate {
  catalogWorkId: string;
  workNamePl: string;
  workCategory: string;
  tradeId: string | null;
  score: number;
  role: OfferBoqMatchCandidateRole;
  matchedBy: OfferBoqMatchedBy;
  matchConfidence: OfferBoqConfidence;
  rationale: string;
}

export type OfferBoqEditableField =
  | "material"
  | "labor"
  | "equipment"
  | "kp"
  | "margin"
  | "quantity"
  | "lineTotal";

export type OfferBoqPriceSourceKind =
  | "work_catalog"
  | "category_override"
  | "line_override"
  | "ath"
  | "company_model"
  | "manual"
  | "snapshot"
  | "unknown";

/** Transparentność źródła składowej ceny (M/R/S). */
export interface OfferBoqPriceSourceRef {
  kind: OfferBoqPriceSourceKind;
  refId?: string;
  asOf?: string;
  labelPl: string;
}

export interface OfferBoqLine {
  lineId: string;
  lp: string;
  description: string;
  quantity: number;
  quantityRaw: string;
  unit: string;

  catalogWorkId: string | null;
  /** Branża / kategoria robót (label PL) — COST-S2. */
  workCategory: string | null;
  categoryId: string | null;
  knrHint: string | null;
  matchMethod: OfferBoqMatchMethod;
  /** Alias produktowy metody (DoD COST-S2). */
  matchedBy: OfferBoqMatchedBy;
  matchConfidence: OfferBoqConfidence;
  /** Primary + alternatywy — przyszły split pozycji bez przebudowy modelu. */
  candidateMatches: OfferBoqMatchCandidate[];

  /** COST-S3 — klasyfikacja / strategia / dekompozycja (bez cen). */
  costIntelligence: OfferBoqCostIntelligence | null;

  /** COST-S4 — propozycja wyceny komponentowej. */
  linePricing: OfferBoqLinePricing | null;

  materialUnitPln: number | null;
  materialCostPln: number | null;
  materialSource: OfferBoqPriceSourceRef;

  laborRbh: number | null;
  laborRatePlnPerH: number | null;
  laborCostPln: number | null;
  laborSource: OfferBoqPriceSourceRef;

  equipmentUnitPln: number | null;
  equipmentCostPln: number | null;
  equipmentSource: OfferBoqPriceSourceRef;

  directCostPln: number | null;
  kpPln: number | null;
  overheadSharePln: number | null;
  marginPln: number | null;
  lineTotalPln: number | null;

  /** Opcjonalny seed z ATH (nie jest wyceną ofertową). */
  athUnitPricePln: number | null;
  athTotalPln: number | null;

  pricingSourceLabelPl: string;
  aiConfidence: OfferBoqConfidence;
  /** Uzasadnienie AI / reguły — wypełniane w S2+. */
  aiRationale: string | null;

  userEdited: boolean;
  editedFields: OfferBoqEditableField[];
  warnings: string[];
}

export interface OfferBoqParserSnapshotRef {
  kosztorysParsedAt: string | null;
  sourceFilename: string | null;
  rowCount: number;
  pdfPrzedmiarCase: 1 | 2 | 3 | null;
}

export interface OfferBoqTotals {
  materialsPln: number | null;
  laborPln: number | null;
  equipmentPln: number | null;
  directPln: number | null;
  kpPln: number | null;
  overheadPln: number | null;
  costPricePln: number | null;
  marginPln: number | null;
  recommendedBidPln: number | null;
  profitPln: number | null;
  profitabilityPct: number | null;
  estimatedDurationDays: number | null;
  workingCapitalPln: number | null;
  lineCount: number;
  pricedLineCount: number;
}

/** Alias produktowy „OfferBoq” = dokument pozycji. */
export type OfferBoq = OfferBoqDocument;

export interface OfferBoqDocument {
  schemaVersion: number;
  tenderId: string;
  version: number;
  builtAt: string;
  parserSnapshotRef: OfferBoqParserSnapshotRef;
  lines: OfferBoqLine[];
  totals: OfferBoqTotals;
  /** Token do invalidacji UI po edycji (S7). */
  recomputeToken: string;
  /** Status: S1 structural · S2 mapped · S3 analyzed · later priced. */
  buildStatus: "empty" | "structural_only" | "mapped" | "analyzed" | "partially_priced" | "priced";
  /** Statystyki mapowania COST-S2 (null przed mapowaniem). */
  mappingStats: OfferBoqMappingStats | null;
  mappingAppliedAt: string | null;
  /** Statystyki Cost Intelligence COST-S3. */
  costIntelligenceStats: OfferBoqCostIntelligenceStats | null;
  costIntelligenceAppliedAt: string | null;
  /** Statystyki wyceny COST-S4. */
  pricingStats: OfferBoqPricingStats | null;
  pricingAppliedAt: string | null;
  /** Statystyki ingerencji użytkownika COST-S5. */
  userEditStats: OfferBoqUserEditStats | null;
  warnings: string[];
}

export interface OfferBoqMappingStats {
  lineCount: number;
  matchedCount: number;
  unmatchedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export const UNKNOWN_PRICE_SOURCE: OfferBoqPriceSourceRef = {
  kind: "unknown",
  labelPl: "Brak wyceny (kolejne Slice)",
};

export const SNAPSHOT_PRICE_SOURCE: OfferBoqPriceSourceRef = {
  kind: "snapshot",
  labelPl: "Przedmiar / snapshot dossier",
};

function foldHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function parseOfferBoqQuantity(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  const n = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function parseOfferBoqPln(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const m = cleaned.match(/[\d.]+/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildOfferBoqLineId(
  tenderId: string,
  lp: string,
  description: string,
  index: number,
): string {
  const base = `${tenderId}|${lp}|${description.trim().slice(0, 120)}|${index}`;
  return `obl_${foldHash(base).toString(16)}`;
}

export function emptyOfferBoqTotals(lineCount = 0): OfferBoqTotals {
  return {
    materialsPln: null,
    laborPln: null,
    equipmentPln: null,
    directPln: null,
    kpPln: null,
    overheadPln: null,
    costPricePln: null,
    marginPln: null,
    recommendedBidPln: null,
    profitPln: null,
    profitabilityPct: null,
    estimatedDurationDays: null,
    workingCapitalPln: null,
    lineCount,
    pricedLineCount: 0,
  };
}

function knrHintFromDescription(description: string): string | null {
  const hint = extractKatalogHintFromDescription(description);
  if (!hint || hint === "—") return null;
  return hint;
}

function structuralLine(opts: {
  tenderId: string;
  index: number;
  lp: string;
  description: string;
  unit: string;
  quantityRaw: string;
  athUnitPricePln: number | null;
  athTotalPln: number | null;
  warnings: string[];
}): OfferBoqLine {
  const quantity = parseOfferBoqQuantity(opts.quantityRaw);
  const knrHint = knrHintFromDescription(opts.description);
  const warnings = [...opts.warnings];
  if (quantity <= 0) warnings.push("Brak poprawnej ilości — uzupełnij przed wyceną.");
  if (!opts.description.trim()) warnings.push("Pusty opis pozycji.");

  let aiConfidence: OfferBoqConfidence = "low";
  if (quantity > 0 && opts.description.trim()) aiConfidence = "medium";
  if (quantity > 0 && knrHint) aiConfidence = "high";

  return {
    lineId: buildOfferBoqLineId(opts.tenderId, opts.lp, opts.description, opts.index),
    lp: opts.lp || String(opts.index + 1),
    description: opts.description.trim() || "(bez opisu)",
    quantity,
    quantityRaw: opts.quantityRaw || "",
    unit: opts.unit?.trim() || "",

    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    knrHint,
    matchMethod: "snapshot",
    matchedBy: "snapshot",
    matchConfidence: knrHint ? "medium" : "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,

    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { ...UNKNOWN_PRICE_SOURCE },

    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { ...UNKNOWN_PRICE_SOURCE },

    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { ...UNKNOWN_PRICE_SOURCE },

    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,

    athUnitPricePln: opts.athUnitPricePln,
    athTotalPln: opts.athTotalPln,

    pricingSourceLabelPl: "Snapshot przedmiaru — wycena AI w kolejnych Slice",
    aiConfidence,
    aiRationale: null,

    userEdited: false,
    editedFields: [],
    warnings,
  };
}

function linesFromCatalogQuantities(
  tenderId: string,
  catalog: TenderCatalogQuantityLine[],
): OfferBoqLine[] {
  return catalog.map((c, index) =>
    structuralLine({
      tenderId,
      index,
      lp: c.lp ?? "",
      description: c.description ?? "",
      unit: c.unit ?? "",
      quantityRaw: c.quantity ?? "",
      athUnitPricePln: null,
      athTotalPln: null,
      warnings: [],
    }),
  );
}

function linesFromCostRows(tenderId: string, rows: TenderCostLine[]): OfferBoqLine[] {
  return rows.map((r, index) =>
    structuralLine({
      tenderId,
      index,
      lp: r.lp ?? "",
      description: r.description ?? "",
      unit: r.unit ?? "",
      quantityRaw: r.quantity ?? "",
      athUnitPricePln: parseOfferBoqPln(r.unitPrice),
      athTotalPln: parseOfferBoqPln(r.total),
      warnings: r.unitPrice || r.total
        ? ["Wykryto ceny ATH w snapshot — nie użyte jako wycena ofertowa (S1)."]
        : [],
    }),
  );
}

export function computeOfferBoqRecomputeToken(lines: OfferBoqLine[]): string {
  const payload = lines
    .map((l) =>
      [
        l.lineId,
        l.lp,
        l.quantity,
        l.catalogWorkId ?? "",
        l.matchMethod,
        l.matchConfidence,
        l.costIntelligence?.lineKind ?? "",
        l.costIntelligence?.pricingStrategyId ?? "",
        l.linePricing?.aggregates.lineDirectPln ?? "",
        l.materialUnitPln,
        l.laborCostPln,
        l.equipmentCostPln,
        l.lineTotalPln,
        l.userEdited ? "1" : "0",
        l.editedFields.join(","),
      ].join(":"),
    )
    .join("|");
  return `rt_${foldHash(payload).toString(16)}_${lines.length}`;
}

/**
 * Buduje OfferBoq ze snapshotu dossier.
 * Preferuje catalogQuantities (ścieżka wyceny katalogowej), inaczej rows.
 */
export function buildOfferBoqFromSnapshot(opts: {
  tenderId: string;
  snapshot: TenderKosztorysSnapshot | null | undefined;
  builtAt?: string;
  version?: number;
}): OfferBoqDocument {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const tenderId = opts.tenderId?.trim() || "unknown";
  const snapshot = opts.snapshot ?? null;
  const docWarnings: string[] = [];

  let lines: OfferBoqLine[] = [];
  if (snapshot) {
    const catalog = snapshot.catalogQuantities ?? [];
    if (catalog.length > 0) {
      lines = linesFromCatalogQuantities(tenderId, catalog);
    } else if ((snapshot.rows?.length ?? 0) > 0) {
      lines = linesFromCostRows(tenderId, snapshot.rows);
      docWarnings.push("Brak catalogQuantities — użyto rows snapshotu.");
    } else {
      docWarnings.push("Snapshot bez pozycji przedmiaru.");
    }
    if (snapshot.warnings?.length) {
      docWarnings.push(...snapshot.warnings.slice(0, 5));
    }
  } else {
    docWarnings.push("Brak TenderKosztorysSnapshot.");
  }

  const pricedLineCount = lines.filter((l) => l.lineTotalPln != null).length;
  const buildStatus: OfferBoqDocument["buildStatus"] = lines.length === 0
    ? "empty"
    : pricedLineCount > 0
      ? "partially_priced"
      : "structural_only";

  return {
    schemaVersion: OFFER_BOQ_SCHEMA_VERSION,
    tenderId,
    version: opts.version ?? 1,
    builtAt,
    parserSnapshotRef: {
      kosztorysParsedAt: snapshot?.parsedAt ?? null,
      sourceFilename: snapshot?.sourceFilename ?? null,
      rowCount: snapshot?.rowCount ?? lines.length,
      pdfPrzedmiarCase: snapshot?.pdfPrzedmiarCase ?? null,
    },
    lines,
    totals: emptyOfferBoqTotals(lines.length),
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    buildStatus,
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: docWarnings,
  };
}

/**
 * Przygotowanie pod edycję (S7) — czysta aktualizacja metadanych bez wyceny.
 * Nie przelicza kosztów (OUT COST-S1).
 */
export function markOfferBoqLineEdited(
  line: OfferBoqLine,
  field: OfferBoqEditableField,
  patch: Partial<
    Pick<
      OfferBoqLine,
      | "materialUnitPln"
      | "materialCostPln"
      | "laborRbh"
      | "laborRatePlnPerH"
      | "laborCostPln"
      | "equipmentUnitPln"
      | "equipmentCostPln"
      | "kpPln"
      | "marginPln"
      | "lineTotalPln"
      | "quantity"
      | "quantityRaw"
    >
  >,
): OfferBoqLine {
  const editedFields = line.editedFields.includes(field)
    ? line.editedFields
    : [...line.editedFields, field];

  const next: OfferBoqLine = {
    ...line,
    ...patch,
    userEdited: true,
    editedFields,
    materialSource: field === "material"
      ? { kind: "manual", labelPl: "Korekta ręczna użytkownika" }
      : line.materialSource,
    laborSource: field === "labor"
      ? { kind: "manual", labelPl: "Korekta ręczna użytkownika" }
      : line.laborSource,
    equipmentSource: field === "equipment"
      ? { kind: "manual", labelPl: "Korekta ręczna użytkownika" }
      : line.equipmentSource,
    pricingSourceLabelPl: "Korekta ręczna (oczekuje przeliczenia)",
    aiRationale: line.aiRationale,
  };

  if (field === "quantity" && patch.quantityRaw != null) {
    next.quantity = parseOfferBoqQuantity(patch.quantityRaw);
  }

  return next;
}

/** Podmienia linię w dokumencie i odświeża recomputeToken (bez wyceny). */
export function replaceOfferBoqLine(
  doc: OfferBoqDocument,
  nextLine: OfferBoqLine,
): OfferBoqDocument {
  const lines = doc.lines.map((l) => (l.lineId === nextLine.lineId ? nextLine : l));
  return {
    ...doc,
    lines,
    totals: { ...doc.totals, lineCount: lines.length },
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    version: doc.version + 1,
  };
}
