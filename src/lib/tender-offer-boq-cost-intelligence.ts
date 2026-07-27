/**
 * AI-COST-01 / COST-S3 — AI Cost Intelligence Engine (pure).
 * Klasyfikacja · strategia wyceny · inteligentna dekompozycja — bez cen.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  computeOfferBoqRecomputeToken,
  type OfferBoqConfidence,
  type OfferBoqCostIntelligence,
  type OfferBoqCostIntelligenceStats,
  type OfferBoqDecompositionElement,
  type OfferBoqDocument,
  type OfferBoqLine,
  type OfferBoqLineKind,
  type OfferBoqPlannedEngine,
  type OfferBoqPricingComponent,
  type OfferBoqPricingStrategyId,
} from "@/lib/tender-offer-boq";

export interface OfferBoqCostIntelligenceContext {
  analyzedAt?: string;
  documentContext?: string | null;
}

/** Etykiety PL typów pozycji. */
export const OFFER_BOQ_LINE_KIND_LABELS_PL: Record<OfferBoqLineKind, string> = {
  MaterialInstallation: "Materiał + montaż",
  Equipment: "Gotowe urządzenie / sprzęt",
  Measurement: "Pomiary",
  Programming: "Programowanie / konfiguracja",
  SupplyInstallation: "Dostawa i montaż",
  IndividualAnalysis: "Analiza indywidualna",
  CompleteSystem: "Komplet / system",
  Demolition: "Rozbiórki",
  CivilWorks: "Roboty ogólnobudowlane",
  Unknown: "Nieznany / do weryfikacji",
};

/** Etykiety PL strategii wyceny. */
export const OFFER_BOQ_PRICING_STRATEGY_LABELS_PL: Record<OfferBoqPricingStrategyId, string> = {
  material_plus_labor: "Materiał + montaż (M + R + drobne pomocnicze)",
  finished_device: "Gotowe urządzenie (zakup + montaż + uruchomienie)",
  measurement: "Pomiary (RBH + sprzęt pomiarowy)",
  supply_and_install: "Dostawa i montaż (zakup + transport + montaż + uruchomienie + odbiory)",
  individual_analysis: "Analiza indywidualna (propozycja domenowa)",
  complete_system_decompose: "Komplet — wymaga dekompozycji przed wyceną",
  demolition: "Rozbiórki (głównie robocizna + utylizacja)",
  civil_works: "Roboty ogólnobudowlane (materiał / robocizna wg opisu)",
  unknown: "Do ustalenia po weryfikacji",
};

const STRATEGY_COMPONENTS: Record<OfferBoqPricingStrategyId, OfferBoqPricingComponent[]> = {
  material_plus_labor: ["material", "labor", "auxiliary_material"],
  finished_device: ["purchase", "installation", "commissioning"],
  measurement: ["labor", "measurement_equipment"],
  supply_and_install: ["purchase", "transport", "installation", "commissioning", "acceptance"],
  individual_analysis: ["labor", "transport", "auxiliary_material"],
  complete_system_decompose: ["material", "labor", "purchase", "installation", "commissioning"],
  demolition: ["labor", "transport"],
  civil_works: ["material", "labor"],
  unknown: [],
};

const STRATEGY_ENGINES: Record<OfferBoqPricingStrategyId, OfferBoqPlannedEngine[]> = {
  material_plus_labor: ["material", "labour", "calculator"],
  finished_device: ["material", "labour", "equipment", "calculator"],
  measurement: ["labour", "equipment", "calculator"],
  supply_and_install: ["material", "labour", "transport", "equipment", "calculator"],
  individual_analysis: ["material", "labour", "equipment", "transport", "calculator"],
  complete_system_decompose: ["material", "labour", "equipment", "transport", "calculator"],
  demolition: ["labour", "transport", "calculator"],
  civil_works: ["material", "labour", "calculator"],
  unknown: ["calculator"],
};

function hayHasAny(hay: string, phrases: string[]): boolean {
  return phrases.some((p) => hay.includes(foldPolishText(p)));
}

function elem(
  id: string,
  labelPl: string,
  kindHint: OfferBoqLineKind | null,
  pricingComponents: OfferBoqPricingComponent[],
  source: OfferBoqDecompositionElement["source"] = "domain",
  notesPl?: string,
): OfferBoqDecompositionElement {
  return { elementId: id, labelPl, kindHint, pricingComponents, source, notesPl };
}

interface ClassificationSignals {
  hay: string;
  unitNorm: string | null;
  categoryId: string | null;
  workCategory: string | null;
  knrHint: string | null;
  matchConfidence: OfferBoqConfidence;
  matchedBy: string;
  candidateCount: number;
  hasSupplyAndInstallPhrase: boolean;
  hasCompleteSystemPhrase: boolean;
  hasMeasurementPhrase: boolean;
  hasProgrammingPhrase: boolean;
  hasEquipmentPhrase: boolean;
  hasDemolitionPhrase: boolean;
  hasCivilPhrase: boolean;
  hasPaintSimple: boolean;
  hasLedLuminaire: boolean;
  hasIndividualHint: boolean;
  hasCleaningPhrase: boolean;
  hasProtectionPhrase: boolean;
  hasAcceptancePhrase: boolean;
  hasTestPhrase: boolean;
  hasAsBuiltDocsPhrase: boolean;
}

function collectSignals(line: OfferBoqLine): ClassificationSignals {
  const hay = foldPolishText(line.description || "");
  const unitNorm = normalizeWgdomCostUnit(line.unit);

  return {
    hay,
    unitNorm,
    categoryId: line.categoryId,
    workCategory: line.workCategory,
    knrHint: line.knrHint,
    matchConfidence: line.matchConfidence,
    matchedBy: line.matchedBy,
    candidateCount: line.candidateMatches?.length ?? 0,
    hasSupplyAndInstallPhrase: hayHasAny(hay, [
      "dostawa i montaz",
      "dostawa oraz montaz",
      "dostawa z montazem",
      "dostarczyc i zamontowac",
    ]) || (hay.includes("dostawa") && hay.includes("montaz")),
    hasCompleteSystemPhrase: hayHasAny(hay, [
      "wymiana instalacji",
      "wykonanie instalacji",
      "komplet instalacji",
      "system detekcji",
      "system sygnalizacji",
      "instalacja elektryczna",
      "instalacja teletechniczna",
      "rozdzielni glown",
    ]),
    hasMeasurementPhrase: hayHasAny(hay, [
      "pomiar",
      "pomiary",
      "protokol z pomiar",
      "badanie instalacji",
      "sprawdzenie rezystanc",
      "sprawdzenie samoczynnego",
      "sprawdzenie dzialania",
      "sprawdzenie wyłączania",
      "sprawdzenie wylaczania",
    ]),
    hasProgrammingPhrase: hayHasAny(hay, [
      "programowan",
      "konfiguracj",
      "parametryzac",
      "oprogramowan",
      "software",
    ]),
    hasEquipmentPhrase: hayHasAny(hay, [
      "ups",
      "agregat",
      "klimatyzator",
      "centrala wentylacyjna",
      "szafa rack",
      "rozdzielnica gotowa",
      "urządzenie",
      "urzadzenie",
    ]),
    hasDemolitionPhrase: hayHasAny(hay, [
      "rozbiork",
      "demontaz",
      "wyburzen",
      "usuniecie instalacji",
    ]),
    hasCivilPhrase:
      hayHasAny(hay, ["roboty ziemne", "wykop", "zasyp", "beton", "tynk", "murowan"]) ||
      line.categoryId === "OGOLNOBUDOWLANE" ||
      line.categoryId === "ROZBIORKI",
    hasPaintSimple:
      hayHasAny(hay, ["malowanie", "malowac", "farba lateks"]) &&
      !hayHasAny(hay, ["wymiana instalacji", "komplet"]),
    hasLedLuminaire: hayHasAny(hay, [
      "oprawa led",
      "oprawa oswietleniowa",
      "oprawa swietl",
      "lampa led",
    ]),
    hasIndividualHint: hayHasAny(hay, [
      "analiza",
      "opracowanie",
      "projekt wykonawczy",
      "dokumentacja powybuchowa",
      "indywidualn",
    ]),
    // STAB-3 — RWAT P1 klasyfikacja
    hasCleaningPhrase: hayHasAny(hay, [
      "sprzatanie",
      "prace porzadkowe",
      "porzadkowanie",
      "utrzymanie czystosci",
      "zamiatanie",
      "wywoz smieci",
      "wywoz odpad",
      "czyszczenie pomieszczen",
    ]),
    hasProtectionPhrase: hayHasAny(hay, [
      "zabezpieczenie",
      "zabezpieczen",
      "oslony ochron",
      "bariery ochron",
      "tasma ostrzegawcza",
      "ogrodzenie tymczasowe",
    ]),
    hasAcceptancePhrase: hayHasAny(hay, [
      "odbior technicz",
      "odbior koncow",
      "odbiory",
      "protokol odbioru",
      "uczestnictwo w odbior",
    ]),
    hasTestPhrase: hayHasAny(hay, [
      "proba dzialania",
      "proby ruchowe",
      "proba szczelnosci",
      "proba cisnieniowa",
      "nastepna proba",
      "testowanie",
      "testy odbior",
    ]),
    hasAsBuiltDocsPhrase: hayHasAny(hay, [
      "dokumentacja powykonawcza",
      "dokumentacja powykon",
      "as-built",
      "as built",
      "inwentaryzacja powykon",
      "rysunki powykonawcze",
    ]),
  };
}

function classifyLineKind(s: ClassificationSignals): {
  kind: OfferBoqLineKind;
  confidence: OfferBoqConfidence;
  reasons: string[];
} {
  const reasons: string[] = [];

  // STAB-3 — priorytet nad błędnym matchowaniem katalogowym (RWAT sprzątanie→transport)
  if (s.hasCleaningPhrase) {
    reasons.push("opis wskazuje sprzątanie / prace porządkowe (robocizna + utylizacja/transport)");
    return { kind: "Demolition", confidence: "high", reasons };
  }

  if (s.hasAsBuiltDocsPhrase) {
    reasons.push("opis wskazuje dokumentację powykonawczą / as-built");
    return { kind: "Programming", confidence: "high", reasons };
  }

  if (s.hasAcceptancePhrase) {
    reasons.push("opis wskazuje odbiory / protokół odbioru");
    return { kind: "Measurement", confidence: "high", reasons };
  }

  if (s.hasTestPhrase) {
    reasons.push("opis wskazuje próby / testy odbiorowe");
    return { kind: "Measurement", confidence: "high", reasons };
  }

  if (s.hasProtectionPhrase) {
    reasons.push("opis wskazuje zabezpieczenia tymczasowe / ochronę");
    return { kind: "CivilWorks", confidence: "medium", reasons };
  }

  if (s.hasPaintSimple || s.hasLedLuminaire) {
    reasons.push(
      s.hasLedLuminaire
        ? "wykryto gotowy produkt oświetleniowy (oprawa/lampa)"
        : "wykryto prostą robotę malarską",
    );
    return {
      kind: s.hasLedLuminaire ? "Equipment" : "MaterialInstallation",
      confidence: "high",
      reasons,
    };
  }

  if (s.hasMeasurementPhrase) {
    reasons.push("opis wskazuje pomiary / badania / sprawdzenia");
    return { kind: "Measurement", confidence: "high", reasons };
  }

  if (s.hasProgrammingPhrase && !s.hasSupplyAndInstallPhrase) {
    reasons.push("opis wskazuje programowanie / konfigurację");
    return { kind: "Programming", confidence: "medium", reasons };
  }

  if (s.hasDemolitionPhrase || s.categoryId === "ROZBIORKI") {
    reasons.push("opis / kategoria wskazują rozbiórki");
    return { kind: "Demolition", confidence: "high", reasons };
  }

  if (s.hasCompleteSystemPhrase && !s.hasLedLuminaire) {
    reasons.push("opis wskazuje komplet / wymianę instalacji systemowej");
    return { kind: "CompleteSystem", confidence: "high", reasons };
  }

  if (s.hasSupplyAndInstallPhrase) {
    reasons.push("opis łączy dostawę i montaż");
    return {
      kind: "SupplyInstallation",
      confidence: "high",
      reasons,
    };
  }

  if (s.hasEquipmentPhrase && (s.unitNorm === "szt" || s.unitNorm === "kpl" || !s.unitNorm)) {
    reasons.push("opis wskazuje gotowe urządzenie / sprzęt");
    return { kind: "Equipment", confidence: "medium", reasons };
  }

  if (s.hasIndividualHint || (s.matchedBy === "unmatched" && !s.knrHint)) {
    reasons.push(
      s.hasIndividualHint
        ? "opis wymaga analizy indywidualnej"
        : "brak pewnego mapowania katalogowego — analiza indywidualna",
    );
    return {
      kind: "IndividualAnalysis",
      confidence: s.hasIndividualHint ? "medium" : "low",
      reasons,
    };
  }

  if (
    s.hasCivilPhrase ||
    s.categoryId === "OGOLNOBUDOWLANE" ||
    s.workCategory?.toLowerCase().includes("ogólnobudowl")
  ) {
    reasons.push("kategoria / opis — roboty ogólnobudowlane");
    return { kind: "CivilWorks", confidence: "medium", reasons };
  }

  if (s.matchedBy === "exact_knr" || s.matchConfidence === "high") {
    reasons.push("silne dopasowanie katalogowe — typowa robota materiał + montaż");
    return { kind: "MaterialInstallation", confidence: "high", reasons };
  }

  if (s.categoryId && s.categoryId !== "UNKNOWN") {
    reasons.push(`kategoria legacy ${s.categoryId} — domyślnie materiał + montaż`);
    return { kind: "MaterialInstallation", confidence: "medium", reasons };
  }

  reasons.push("niewystarczające sygnały — typ nieznany");
  return { kind: "Unknown", confidence: "low", reasons };
}

function strategyForKind(kind: OfferBoqLineKind): OfferBoqPricingStrategyId {
  switch (kind) {
    case "MaterialInstallation":
      return "material_plus_labor";
    case "Equipment":
      return "finished_device";
    case "Measurement":
      return "measurement";
    case "Programming":
      return "measurement";
    case "SupplyInstallation":
      return "supply_and_install";
    case "IndividualAnalysis":
      return "individual_analysis";
    case "CompleteSystem":
      return "complete_system_decompose";
    case "Demolition":
      return "demolition";
    case "CivilWorks":
      return "civil_works";
    default:
      return "unknown";
  }
}

function shouldDecompose(
  kind: OfferBoqLineKind,
  s: ClassificationSignals,
): { yes: boolean; why: string } {
  if (s.hasPaintSimple) {
    return { yes: false, why: "proste malowanie — jedna pozycja katalogowa wystarczy" };
  }
  if (s.hasLedLuminaire) {
    return { yes: false, why: "gotowy produkt (oprawa LED) — bez rozbijania" };
  }
  if (kind === "Measurement" || kind === "Programming") {
    return { yes: false, why: "pomiary/programowanie wyceniane jako spójna usługa" };
  }
  if (kind === "MaterialInstallation" && s.matchConfidence === "high" && !s.hasCompleteSystemPhrase) {
    return { yes: false, why: "pewne dopasowanie katalogowe — bez dekompozycji" };
  }
  if (kind === "CompleteSystem") {
    return { yes: true, why: "komplet / wymiana instalacji wymaga elementów składowych" };
  }
  if (kind === "SupplyInstallation" && (s.hasEquipmentPhrase || s.candidateCount >= 2)) {
    return {
      yes: true,
      why: "dostawa i montaż urządzenia — rozbicie na zakup, transport, montaż i uruchomienie",
    };
  }
  if (kind === "IndividualAnalysis" && s.hasCompleteSystemPhrase) {
    return { yes: true, why: "analiza indywidualna złożonego zakresu" };
  }
  return { yes: false, why: "dekompozycja nie wnosi wartości na tym etapie" };
}

function buildDecomposition(
  kind: OfferBoqLineKind,
  s: ClassificationSignals,
  line: OfferBoqLine,
): OfferBoqDecompositionElement[] {
  if (kind === "CompleteSystem" && (s.hay.includes("elektrycz") || s.hay.includes("instalac"))) {
    return [
      elem("cond", "Przewody / okablowanie", "MaterialInstallation", ["material", "labor"], "domain"),
      elem("box", "Puszki instalacyjne", "MaterialInstallation", ["material", "labor"], "domain"),
      elem("conduit", "Peszle / osłony", "MaterialInstallation", ["material", "labor"], "domain"),
      elem("db", "Rozdzielnia", "Equipment", ["purchase", "installation"], "domain"),
      elem("gear", "Aparatura zabezpieczająca", "Equipment", ["purchase", "installation"], "domain"),
      elem("fit", "Osprzęt (gniazda, łączniki)", "MaterialInstallation", ["material", "labor"], "domain"),
      elem("meas", "Pomiary powykonawcze", "Measurement", ["labor", "measurement_equipment"], "domain"),
      elem("comm", "Uruchomienie", "Programming", ["labor", "commissioning"], "domain"),
    ];
  }

  if (kind === "SupplyInstallation" || (kind === "CompleteSystem" && s.hasEquipmentPhrase)) {
    const label = line.description.slice(0, 60);
    const fromCandidates = (line.candidateMatches ?? [])
      .slice(0, 3)
      .map((c, i) =>
        elem(
          `cand_${i}_${c.catalogWorkId}`,
          c.workNamePl,
          null,
          ["purchase", "installation"],
          "candidate_match",
          c.rationale,
        ),
      );

    const base = [
      elem("buy", "Zakup urządzenia", "Equipment", ["purchase"], "rule"),
      elem("tr", "Transport", "SupplyInstallation", ["transport"], "rule"),
      elem("carry", "Wniesienie / ustawienie", "SupplyInstallation", ["labor", "carry_in"], "rule"),
      elem("inst", "Montaż", "MaterialInstallation", ["installation", "labor"], "rule"),
      elem("wire", "Okablowanie przyłączeniowe", "MaterialInstallation", ["material", "labor", "wiring"], "rule"),
      elem("cfg", "Konfiguracja", "Programming", ["labor", "configuration"], "rule"),
      elem("test", "Test / uruchomienie", "Measurement", ["labor", "test", "commissioning"], "rule"),
    ];

    // Jeśli UPS w opisie — domyślny zestaw; inaczej base + ewentualnie kandydaci S2
    if (s.hay.includes("ups")) {
      return base;
    }
    if (fromCandidates.length >= 2) {
      return [
        elem("buy", `Zakup — ${label}`, "Equipment", ["purchase"], "rule"),
        ...fromCandidates,
        elem("tr", "Transport", "SupplyInstallation", ["transport"], "rule"),
        elem("comm", "Uruchomienie / odbiór", "Programming", ["commissioning", "acceptance"], "rule"),
      ];
    }
    return base;
  }

  return [];
}

function buildRationale(opts: {
  kind: OfferBoqLineKind;
  strategyId: OfferBoqPricingStrategyId;
  reasons: string[];
  decomp: { yes: boolean; why: string };
  elements: OfferBoqDecompositionElement[];
  s: ClassificationSignals;
  documentContext?: string | null;
}): string {
  const kindLabel = OFFER_BOQ_LINE_KIND_LABELS_PL[opts.kind];
  const strategyLabel = OFFER_BOQ_PRICING_STRATEGY_LABELS_PL[opts.strategyId];
  const mapPart = opts.s.matchedBy !== "snapshot" && opts.s.matchedBy !== "unmatched"
    ? ` Mapowanie S2: ${opts.s.matchedBy} (${opts.s.matchConfidence}).`
    : opts.s.matchedBy === "unmatched"
      ? " Brak pewnego wpisu w Bibliotece Robót."
      : "";
  const knrPart = opts.s.knrHint ? ` Wykryto oznaczenie katalogowe ${opts.s.knrHint}.` : "";
  const catPart = opts.s.workCategory ? ` Branża: ${opts.s.workCategory}.` : "";
  const decompPart = opts.decomp.yes
    ? ` Zaproponowano dekompozycję na ${opts.elements.length} elementów (${opts.decomp.why}).`
    : ` Bez dekompozycji — ${opts.decomp.why}.`;
  const reasonPart = opts.reasons.length
    ? ` Sygnały: ${opts.reasons.join("; ")}.`
    : "";
  const ctx = opts.documentContext?.trim()
    ? ` Kontekst: ${opts.documentContext.trim()}.`
    : "";

  return (
    `Typ pozycji: „${kindLabel}”. Strategia przyszłej wyceny: ${strategyLabel}.` +
    reasonPart +
    mapPart +
    knrPart +
    catPart +
    decompPart +
    ctx
  ).replace(/\s+/g, " ").trim();
}

/**
 * Analiza pojedynczej pozycji OfferBoq — bez wyceny.
 */
export function analyzeOfferBoqLineCostIntelligence(
  line: OfferBoqLine,
  ctx: OfferBoqCostIntelligenceContext = {},
): OfferBoqCostIntelligence {
  const analyzedAt = ctx.analyzedAt ?? new Date().toISOString();
  const s = collectSignals(line);
  const { kind, confidence: classConf, reasons } = classifyLineKind(s);
  const strategyId = strategyForKind(kind);
  const decompDecision = shouldDecompose(kind, s);
  const elements = decompDecision.yes ? buildDecomposition(kind, s, line) : [];

  // Jeśli decyzja TAK, ale brak elementów — obniż pewność i nie wymuszaj pustej dekompozycji
  const requiresDecomposition = decompDecision.yes && elements.length > 0;
  let confidence: OfferBoqConfidence = classConf;
  if (requiresDecomposition && elements.length >= 5) confidence = classConf === "low" ? "medium" : classConf;
  if (kind === "Unknown") confidence = "low";

  return {
    lineKind: kind,
    lineKindLabelPl: OFFER_BOQ_LINE_KIND_LABELS_PL[kind],
    pricingStrategyId: strategyId,
    pricingStrategyLabelPl: OFFER_BOQ_PRICING_STRATEGY_LABELS_PL[strategyId],
    pricingComponents: [...STRATEGY_COMPONENTS[strategyId]],
    requiresDecomposition,
    decompositionElements: elements,
    confidence,
    aiRationale: buildRationale({
      kind,
      strategyId,
      reasons,
      decomp: decompDecision,
      elements,
      s,
      documentContext: ctx.documentContext,
    }),
    plannedEngines: [...STRATEGY_ENGINES[strategyId]],
    analyzedAt,
  };
}

export function computeOfferBoqCostIntelligenceStats(
  lines: OfferBoqLine[],
): OfferBoqCostIntelligenceStats {
  let withIntelligence = 0;
  let decomposedCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  const byKind: Partial<Record<OfferBoqLineKind, number>> = {};

  for (const l of lines) {
    const ci = l.costIntelligence;
    if (!ci) continue;
    withIntelligence += 1;
    if (ci.requiresDecomposition) decomposedCount += 1;
    if (ci.confidence === "high") highCount += 1;
    else if (ci.confidence === "medium") mediumCount += 1;
    else lowCount += 1;
    byKind[ci.lineKind] = (byKind[ci.lineKind] ?? 0) + 1;
  }

  return {
    lineCount: lines.length,
    withIntelligence,
    decomposedCount,
    highCount,
    mediumCount,
    lowCount,
    byKind,
  };
}

/**
 * Nakłada Cost Intelligence na dokument OfferBoq (po mapowaniu S2, bez cen).
 */
export function applyOfferBoqCostIntelligence(
  doc: OfferBoqDocument,
  ctx: OfferBoqCostIntelligenceContext = {},
): OfferBoqDocument {
  const analyzedAt = ctx.analyzedAt ?? new Date().toISOString();
  const documentContext =
    ctx.documentContext ?? doc.parserSnapshotRef.sourceFilename ?? null;
  const lines = doc.lines.map((line) => ({
    ...line,
    costIntelligence: analyzeOfferBoqLineCostIntelligence(line, {
      analyzedAt,
      documentContext,
    }),
  }));
  const costIntelligenceStats = computeOfferBoqCostIntelligenceStats(lines);
  const pricedLineCount = lines.filter((l) => l.lineTotalPln != null).length;
  let buildStatus: OfferBoqDocument["buildStatus"] = doc.buildStatus;
  if (lines.length === 0) buildStatus = "empty";
  else if (pricedLineCount > 0) buildStatus = "partially_priced";
  else buildStatus = "analyzed";

  return {
    ...doc,
    lines,
    costIntelligenceStats,
    costIntelligenceAppliedAt: analyzedAt,
    recomputeToken: computeOfferBoqRecomputeToken(lines),
    buildStatus,
    version: doc.version + 1,
  };
}

/** Eksport pomocniczy pod testy / UI — liczba elementów dekompozycji. */
export function countDecompositionElements(ci: OfferBoqCostIntelligence | null | undefined): number {
  return ci?.decompositionElements?.length ?? 0;
}
