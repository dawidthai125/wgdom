/**
 * AP2-S4 — Business Risk Engine (pure).
 * Wejście: fakty AP2-S3 + kompletność. Bez profilu firmy · bez Autonomous/Pricing Gate.
 */

import type {
  DeepIntelligenceView,
  IntelligenceFact,
} from "@/lib/tender-deep-intelligence";
import type { ValuationReadinessLevel } from "@/lib/tender-documentation-completeness";

export type BusinessRiskCategory =
  | "formal"
  | "financial"
  | "technical"
  | "contractual"
  | "organizational";

export type BusinessRiskLevel = "low" | "medium" | "high";

export type BusinessFitLevel = "high" | "medium" | "low";

export type BusinessVerdict = "STARTUJ" | "STARTUJ WARUNKOWO" | "ODPUŚĆ";

export type AssessmentPolarity = "risk" | "strength";

export interface BusinessRiskAssessment {
  id: string;
  category: BusinessRiskCategory;
  label: string;
  description: string;
  impact: string;
  level: BusinessRiskLevel;
  /** 1–5 */
  weight: number;
  /** Wkład do score (−weight*level … +weight dla strength). */
  scoreDelta: number;
  rationale: string;
  sourceDoc: string;
  factId: string | null;
  factValue: string | null;
  ruleId: string;
  ruleLabel: string;
  polarity: AssessmentPolarity;
}

export interface BusinessFitView {
  level: BusinessFitLevel;
  labelPl: string;
  badge: string;
  score: number;
  rationale: string;
}

export interface BusinessRecommendationView {
  verdict: BusinessVerdict;
  verdictBadge: string;
  summaryLine: string;
  reasons: string[];
}

export interface BusinessRiskEngineView {
  recommendation: BusinessRecommendationView;
  businessFit: BusinessFitView;
  assessments: BusinessRiskAssessment[];
  risks: BusinessRiskAssessment[];
  strengths: BusinessRiskAssessment[];
  risksByCategory: Record<BusinessRiskCategory, BusinessRiskAssessment[]>;
  totalRiskScore: number;
  totalStrengthScore: number;
  netScore: number;
}

export const BUSINESS_RISK_CATEGORY_LABEL_PL: Record<BusinessRiskCategory, string> = {
  formal: "Ryzyka formalne",
  financial: "Ryzyka finansowe",
  technical: "Ryzyka techniczne",
  contractual: "Ryzyka kontraktowe",
  organizational: "Ryzyka organizacyjne",
};

export const BUSINESS_FIT_LABEL_PL: Record<BusinessFitLevel, string> = {
  high: "Wysokie",
  medium: "Średnie",
  low: "Niskie",
};

function factById(
  facts: IntelligenceFact[],
  id: string,
): IntelligenceFact | undefined {
  return facts.find((f) => f.id === id);
}

function parseDays(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,4})\s*(?:dni|dzie[nń]|dn\b)/i)
    || raw.match(/\((\d{1,4})\s*dni\)/i)
    || raw.match(/^(\d{1,4})\s*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function parsePlnRough(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.replace(/\s/g, " ").match(/([\d]{1,3}(?:[\s\u00a0]?\d{3})+|\d+)(?:[.,]\d{2})?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/[\s\u00a0]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parsePercent(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseMonths(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const years = raw.match(/(\d{1,2})\s*(?:lat|lata|roku|rok)/i);
  if (years) return parseInt(years[1], 10) * 12;
  const months = raw.match(/(\d{1,3})\s*(?:miesi[eę]c)/i);
  if (months) return parseInt(months[1], 10);
  return null;
}

function levelWeight(level: BusinessRiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function makeRisk(opts: {
  id: string;
  category: BusinessRiskCategory;
  label: string;
  description: string;
  impact: string;
  level: BusinessRiskLevel;
  weight: number;
  rationale: string;
  sourceDoc: string;
  factId: string | null;
  factValue: string | null;
  ruleId: string;
  ruleLabel: string;
}): BusinessRiskAssessment {
  const scoreDelta = -(opts.weight * levelWeight(opts.level));
  return { ...opts, scoreDelta, polarity: "risk" };
}

function makeStrength(opts: {
  id: string;
  category: BusinessRiskCategory;
  label: string;
  description: string;
  impact: string;
  level: BusinessRiskLevel;
  weight: number;
  rationale: string;
  sourceDoc: string;
  factId: string | null;
  factValue: string | null;
  ruleId: string;
  ruleLabel: string;
}): BusinessRiskAssessment {
  const scoreDelta = opts.weight * levelWeight(opts.level);
  return { ...opts, scoreDelta, polarity: "strength" };
}

function emptyCategories(): Record<BusinessRiskCategory, BusinessRiskAssessment[]> {
  return {
    formal: [],
    financial: [],
    technical: [],
    contractual: [],
    organizational: [],
  };
}

export function buildBusinessRiskEngineView(opts: {
  deep: DeepIntelligenceView;
  valuationLevel?: ValuationReadinessLevel | null;
}): BusinessRiskEngineView {
  const { deep } = opts;
  const valuationLevel = opts.valuationLevel ?? deep.offerReadyLevel;
  const facts = deep.facts;
  const assessments: BusinessRiskAssessment[] = [];

  const realization = factById(facts, "realization");
  const days = parseDays(realization?.value ?? null)
    ?? parseDays(realization?.value?.match(/\((\d+)\s*dni\)/)?.[0] ?? null);
  if (realization) {
    const d = days ?? parseDays(realization.value);
    if (d != null && d > 0 && d < 45) {
      assessments.push(makeRisk({
        id: "risk_realization_short",
        category: "organizational",
        label: "Krótki termin realizacji",
        description: `Wykryty termin realizacji: ${realization.value}`,
        impact: "Presja czasowa na organizację robót i podwykonawców",
        level: d < 30 ? "high" : "medium",
        weight: 4,
        rationale: "Krótki harmonogram zwiększa ryzyko opóźnień i kar.",
        sourceDoc: realization.sourceDoc,
        factId: realization.id,
        factValue: realization.value,
        ruleId: "R-REALIZATION-SHORT",
        ruleLabel: "Termin realizacji < 45 dni → ryzyko organizacyjne",
      }));
    } else if (d != null && d >= 60 && d <= 365) {
      assessments.push(makeStrength({
        id: "str_realization_ok",
        category: "organizational",
        label: "Realistyczny harmonogram",
        description: realization.value,
        impact: "Łatwiejsze zaplanowanie zasobów",
        level: "medium",
        weight: 3,
        rationale: "Termin realizacji w typowym przedziale budowlanym.",
        sourceDoc: realization.sourceDoc,
        factId: realization.id,
        factValue: realization.value,
        ruleId: "R-REALIZATION-OK",
        ruleLabel: "Termin realizacji 60–365 dni → mocna strona",
      }));
    } else if (d != null && d > 365) {
      assessments.push(makeRisk({
        id: "risk_realization_long",
        category: "organizational",
        label: "Bardzo długi termin realizacji",
        description: realization.value,
        impact: "Dłuższe zamrożenie zasobów i ekspozycja na zmiany cen",
        level: "low",
        weight: 2,
        rationale: "Długi kontrakt wymaga buforu finansowego.",
        sourceDoc: realization.sourceDoc,
        factId: realization.id,
        factValue: realization.value,
        ruleId: "R-REALIZATION-LONG",
        ruleLabel: "Termin realizacji > 365 dni → lekkie ryzyko",
      }));
    }
  }

  const experience = factById(facts, "experience");
  if (experience) {
    const heavy = /min\.\s*[3-9]|min\.\s*\d{2}|wartość|1[\s\u00a0]?\d{3}/i.test(experience.value)
      || (parsePlnRough(experience.value) ?? 0) >= 1_000_000;
    assessments.push(makeRisk({
      id: "risk_experience",
      category: "formal",
      label: "Wymagane doświadczenie",
      description: experience.value,
      impact: heavy ? "Może wykluczyć ofertę bez silnego portfolio" : "Wymaga weryfikacji referencji",
      level: heavy ? "high" : "medium",
      weight: heavy ? 4 : 3,
      rationale: "Warunki doświadczenia to typowy bloker formalny.",
      sourceDoc: experience.sourceDoc,
      factId: experience.id,
      factValue: experience.value,
      ruleId: "R-EXPERIENCE",
      ruleLabel: "Wykryte wymagania doświadczenia → ryzyko formalne",
    }));
  } else if (valuationLevel !== "insufficient") {
    assessments.push(makeStrength({
      id: "str_experience_light",
      category: "formal",
      label: "Brak ostrych wymagań doświadczenia w skrócie",
      description: "Nie wykryto surowych wymagań doświadczenia w kluczowych faktach",
      impact: "Niższa bariera wejścia formalnego",
      level: "low",
      weight: 2,
      rationale: "Brak sygnału wysokich wymagań doświadczenia w ekstrakcji S3.",
      sourceDoc: "Agregat dokumentacji",
      factId: null,
      factValue: null,
      ruleId: "R-EXPERIENCE-ABSENT",
      ruleLabel: "Brak faktu doświadczenia → potencjalna mocna strona formalna",
    }));
  }

  const personnel = factById(facts, "personnel");
  if (personnel) {
    const count = personnel.value.split("·").length;
    assessments.push(makeRisk({
      id: "risk_personnel",
      category: "organizational",
      label: "Wymagany personel",
      description: personnel.value,
      impact: "Konieczność zapewnienia kadry z uprawnieniami",
      level: count >= 3 ? "high" : "medium",
      weight: 3,
      rationale: "Wymagania kadrowe obciążają organizację oferty.",
      sourceDoc: personnel.sourceDoc,
      factId: personnel.id,
      factValue: personnel.value,
      ruleId: "R-PERSONNEL",
      ruleLabel: "Wykryty wymagany personel → ryzyko organizacyjne",
    }));
  }

  const licenses = factById(facts, "licenses");
  if (licenses) {
    assessments.push(makeRisk({
      id: "risk_licenses",
      category: "formal",
      label: "Wymagane uprawnienia",
      description: licenses.value,
      impact: "Brak uprawnień = ryzyko odrzucenia oferty",
      level: "medium",
      weight: 3,
      rationale: "Uprawnienia to warunek udziału.",
      sourceDoc: licenses.sourceDoc,
      factId: licenses.id,
      factValue: licenses.value,
      ruleId: "R-LICENSES",
      ruleLabel: "Wykryte uprawnienia → ryzyko formalne",
    }));
  }

  const wadium = factById(facts, "wadium");
  if (wadium) {
    const pln = parsePlnRough(wadium.value);
    if (pln != null && pln >= 50_000) {
      assessments.push(makeRisk({
        id: "risk_wadium_high",
        category: "financial",
        label: "Wysokie wadium",
        description: wadium.value,
        impact: "Duże obciążenie płynności przy składaniu oferty",
        level: pln >= 100_000 ? "high" : "medium",
        weight: 4,
        rationale: "Wysokie wadium zwiększa koszt wejścia w przetarg.",
        sourceDoc: wadium.sourceDoc,
        factId: wadium.id,
        factValue: wadium.value,
        ruleId: "R-WADIUM-HIGH",
        ruleLabel: "Wadium ≥ 50 000 zł → ryzyko finansowe",
      }));
    } else if (pln != null && pln > 0 && pln < 10_000) {
      assessments.push(makeStrength({
        id: "str_wadium_low",
        category: "financial",
        label: "Niskie wadium",
        description: wadium.value,
        impact: "Niższy próg płynności",
        level: "medium",
        weight: 2,
        rationale: "Niskie wadium ułatwia udział.",
        sourceDoc: wadium.sourceDoc,
        factId: wadium.id,
        factValue: wadium.value,
        ruleId: "R-WADIUM-LOW",
        ruleLabel: "Wadium < 10 000 zł → mocna strona finansowa",
      }));
    } else if (/brak|nie\s+wymaga|0\s*zł/i.test(wadium.value)) {
      assessments.push(makeStrength({
        id: "str_wadium_none",
        category: "financial",
        label: "Brak / symboliczne wadium",
        description: wadium.value,
        impact: "Brak zamrożenia gotówki na wadium",
        level: "high",
        weight: 3,
        rationale: "Brak wadium to istotna korzyść finansowa.",
        sourceDoc: wadium.sourceDoc,
        factId: wadium.id,
        factValue: wadium.value,
        ruleId: "R-WADIUM-NONE",
        ruleLabel: "Brak wadium → mocna strona",
      }));
    }
  }

  const znw = factById(facts, "znw");
  if (znw) {
    const pct = parsePercent(znw.value);
    assessments.push(makeRisk({
      id: "risk_znw",
      category: "financial",
      label: "Zabezpieczenie należytego wykonania",
      description: znw.value,
      impact: "Zamrożenie środków po wyborze oferty",
      level: pct != null && pct >= 5 ? "high" : "medium",
      weight: 3,
      rationale: "ZNW obciąża cash-flow po zawarciu umowy.",
      sourceDoc: znw.sourceDoc,
      factId: znw.id,
      factValue: znw.value,
      ruleId: "R-ZNW",
      ruleLabel: "Wykryte ZNW → ryzyko finansowe",
    }));
  }

  const warranty = factById(facts, "warranty");
  if (warranty) {
    const months = parseMonths(warranty.value);
    if (months != null && months >= 60) {
      assessments.push(makeRisk({
        id: "risk_warranty_long",
        category: "contractual",
        label: "Długa gwarancja",
        description: warranty.value,
        impact: "Długa odpowiedzialność posprzedażowa",
        level: months >= 84 ? "high" : "medium",
        weight: 3,
        rationale: "Długi okres gwarancji podnosi ryzyko kontraktowe.",
        sourceDoc: warranty.sourceDoc,
        factId: warranty.id,
        factValue: warranty.value,
        ruleId: "R-WARRANTY-LONG",
        ruleLabel: "Gwarancja ≥ 60 mies. → ryzyko kontraktowe",
      }));
    } else if (months != null && months > 0 && months <= 36) {
      assessments.push(makeStrength({
        id: "str_warranty_ok",
        category: "contractual",
        label: "Umiarkowany okres gwarancji",
        description: warranty.value,
        impact: "Typowy poziom odpowiedzialności",
        level: "low",
        weight: 2,
        rationale: "Gwarancja w typowym zakresie rynkowym.",
        sourceDoc: warranty.sourceDoc,
        factId: warranty.id,
        factValue: warranty.value,
        ruleId: "R-WARRANTY-OK",
        ruleLabel: "Gwarancja ≤ 36 mies. → mocna strona kontraktowa",
      }));
    }
  }

  const payment = factById(facts, "payment_terms") ?? factById(facts, "payment_deadline");
  if (payment) {
    const daysPay = parseDays(payment.value);
    const favorable = /30\s*dni|przelew|po\s+odbior/i.test(payment.value)
      && (daysPay == null || daysPay <= 45);
    const harsh = /90\s*dni|120\s*dni|kaucj|zatrzyman|retenc/i.test(payment.value)
      || (daysPay != null && daysPay >= 60);
    if (harsh) {
      assessments.push(makeRisk({
        id: "risk_payment",
        category: "financial",
        label: "Trudniejsze warunki płatności",
        description: payment.value,
        impact: "Wolniejszy zwrot kapitału obrotowego",
        level: "medium",
        weight: 3,
        rationale: "Długie terminy płatności pogarszają cash-flow.",
        sourceDoc: payment.sourceDoc,
        factId: payment.id,
        factValue: payment.value,
        ruleId: "R-PAYMENT-HARSH",
        ruleLabel: "Płatność ≥ 60 dni / retencja → ryzyko finansowe",
      }));
    } else if (favorable) {
      assessments.push(makeStrength({
        id: "str_payment",
        category: "financial",
        label: "Korzystne warunki płatności",
        description: payment.value,
        impact: "Szybszy obrót środków",
        level: "medium",
        weight: 3,
        rationale: "Krótsze terminy płatności wspierają płynność.",
        sourceDoc: payment.sourceDoc,
        factId: payment.id,
        factValue: payment.value,
        ruleId: "R-PAYMENT-GOOD",
        ruleLabel: "Płatność ≤ 45 dni → mocna strona finansowa",
      }));
    }
  }

  const penalties = factById(facts, "penalties");
  if (penalties) {
    const pct = parsePercent(penalties.value);
    const dailyHarsh = pct != null && pct >= 0.1;
    assessments.push(makeRisk({
      id: "risk_penalties",
      category: "contractual",
      label: "Kary umowne",
      description: penalties.value,
      impact: "Wysoki koszt opóźnień lub wad",
      level: dailyHarsh ? "high" : "medium",
      weight: 4,
      rationale: "Kary umowne to kluczowe ryzyko kontraktowe.",
      sourceDoc: penalties.sourceDoc,
      factId: penalties.id,
      factValue: penalties.value,
      ruleId: "R-PENALTIES",
      ruleLabel: "Wykryte kary umowne → ryzyko kontraktowe",
    }));
  }

  const valorization = factById(facts, "valorization");
  if (valorization) {
    assessments.push(makeStrength({
      id: "str_valorization",
      category: "contractual",
      label: "Możliwość waloryzacji",
      description: valorization.value,
      impact: "Ochrona przed inflacją kosztów",
      level: "high",
      weight: 3,
      rationale: "Waloryzacja zmniejsza ryzyko cenowe kontraktu.",
      sourceDoc: valorization.sourceDoc,
      factId: valorization.id,
      factValue: valorization.value,
      ruleId: "R-VALORIZATION",
      ruleLabel: "Wykryta waloryzacja → mocna strona kontraktowa",
    }));
  }

  const contractChanges = factById(facts, "contract_changes");
  if (contractChanges) {
    assessments.push(makeStrength({
      id: "str_contract_changes",
      category: "contractual",
      label: "Elastyczność zmian umowy",
      description: contractChanges.value,
      impact: "Możliwość dostosowania zakresu",
      level: "low",
      weight: 2,
      rationale: "Klauzule zmian mogą ułatwić zarządzanie zakresem.",
      sourceDoc: contractChanges.sourceDoc,
      factId: contractChanges.id,
      factValue: contractChanges.value,
      ruleId: "R-CONTRACT-CHANGES",
      ruleLabel: "Wykryta możliwość zmian umowy → mocna strona",
    }));
  }

  // Dokumentacja / przedmiar
  if (valuationLevel === "ready") {
    assessments.push(makeStrength({
      id: "str_docs_ready",
      category: "formal",
      label: "Kompletna dokumentacja do wyceny",
      description: deep.offerReadyLabel,
      impact: "Można przygotować ofertę na bazie dokumentów",
      level: "high",
      weight: 5,
      rationale: "Gotowość wyceny z kompletności dokumentacji.",
      sourceDoc: "Agregat dokumentacji",
      factId: "offer_ready",
      factValue: deep.offerReadyLabel,
      ruleId: "R-DOCS-READY",
      ruleLabel: "Gotowość wyceny = ready → mocna strona formalna",
    }));
  } else if (valuationLevel === "risk") {
    assessments.push(makeRisk({
      id: "risk_docs_partial",
      category: "formal",
      label: "Dokumentacja z lukami",
      description: deep.offerReadyLabel,
      impact: "Wycena możliwa, ale z podwyższonym ryzykiem",
      level: "medium",
      weight: 3,
      rationale: "Częściowa kompletność dokumentacji.",
      sourceDoc: "Agregat dokumentacji",
      factId: "offer_ready",
      factValue: deep.offerReadyLabel,
      ruleId: "R-DOCS-PARTIAL",
      ruleLabel: "Gotowość wyceny = risk → ryzyko formalne",
    }));
  } else {
    assessments.push(makeRisk({
      id: "risk_docs_insufficient",
      category: "formal",
      label: "Dokumentacja niewystarczająca",
      description: deep.offerReadyLabel,
      impact: "Trudno przygotować wiarygodną ofertę",
      level: "high",
      weight: 5,
      rationale: "Brak materiału ilościowego / kluczowych dokumentów.",
      sourceDoc: "Agregat dokumentacji",
      factId: "offer_ready",
      factValue: deep.offerReadyLabel,
      ruleId: "R-DOCS-INSUFFICIENT",
      ruleLabel: "Gotowość wyceny = insufficient → wysokie ryzyko formalne",
    }));
  }

  const przedmiarRows = deep.przedmiar.rowCount;
  if (przedmiarRows >= 10) {
    assessments.push(makeStrength({
      id: "str_przedmiar_rich",
      category: "technical",
      label: "Bogaty przedmiar",
      description: `${przedmiarRows} pozycji · ${deep.przedmiar.dominantBranch ?? "zakres"}`,
      impact: "Lepsza baza do wyceny i planowania",
      level: "high",
      weight: 4,
      rationale: "Duża liczba pozycji przedmiaru poprawia jakość wyceny.",
      sourceDoc: deep.przedmiar.sourceDoc,
      factId: "przedmiar_rows",
      factValue: String(przedmiarRows),
      ruleId: "R-PRZEDMIAR-RICH",
      ruleLabel: "≥10 pozycji przedmiaru → mocna strona techniczna",
    }));
  } else if (przedmiarRows > 0) {
    assessments.push(makeStrength({
      id: "str_przedmiar_basic",
      category: "technical",
      label: "Wykryty przedmiar",
      description: `${przedmiarRows} pozycji`,
      impact: "Podstawa do wyceny własnej",
      level: "medium",
      weight: 3,
      rationale: "Jest materiał ilościowy do wyceny.",
      sourceDoc: deep.przedmiar.sourceDoc,
      factId: "przedmiar_rows",
      factValue: String(przedmiarRows),
      ruleId: "R-PRZEDMIAR-BASIC",
      ruleLabel: "1–9 pozycji przedmiaru → mocna strona techniczna",
    }));
  } else if (valuationLevel === "insufficient") {
    assessments.push(makeRisk({
      id: "risk_przedmiar_missing",
      category: "technical",
      label: "Brak przedmiaru / pozycji",
      description: "Nie wykryto pozycji przedmiaru",
      impact: "Trudna wycena zakresu robót",
      level: "high",
      weight: 5,
      rationale: "Bez przedmiaru ryzyko techniczne wyceny jest wysokie.",
      sourceDoc: "Przedmiar / kosztorys",
      factId: null,
      factValue: null,
      ruleId: "R-PRZEDMIAR-MISSING",
      ruleLabel: "0 pozycji przedmiaru + insufficient → ryzyko techniczne",
    }));
  }

  if (deep.przedmiar.knrCatalogs.length > 0) {
    assessments.push(makeStrength({
      id: "str_knr",
      category: "technical",
      label: "Wykryte katalogi KNR/KNNR",
      description: deep.przedmiar.knrCatalogs.slice(0, 4).join(" · "),
      impact: "Ułatwia kalibrację kosztów katalogowych",
      level: "medium",
      weight: 2,
      rationale: "Normy katalogowe wspierają wycenę.",
      sourceDoc: deep.przedmiar.sourceDoc,
      factId: "knr_catalogs",
      factValue: deep.przedmiar.knrCatalogs.slice(0, 4).join(" · "),
      ruleId: "R-KNR",
      ruleLabel: "Wykryte KNR/KNNR → mocna strona techniczna",
    }));
  }

  const criteria = factById(facts, "award_criteria");
  if (criteria && /cena/i.test(criteria.value) && /6[0-9]\s*%|7[0-9]\s*%|8[0-9]\s*%|9[0-9]\s*%|100\s*%/i.test(criteria.value)) {
    assessments.push(makeStrength({
      id: "str_criteria_price",
      category: "formal",
      label: "Dominujące kryterium ceny",
      description: criteria.value,
      impact: "Przewidywalniejsza strategia oferty",
      level: "medium",
      weight: 2,
      rationale: "Wysoka waga ceny upraszcza decyzję ofertową.",
      sourceDoc: criteria.sourceDoc,
      factId: criteria.id,
      factValue: criteria.value,
      ruleId: "R-CRITERIA-PRICE",
      ruleLabel: "Cena ≥ 60% → mocna strona formalna",
    }));
  }

  const risks = assessments.filter((a) => a.polarity === "risk");
  const strengths = assessments.filter((a) => a.polarity === "strength");
  const risksByCategory = emptyCategories();
  for (const r of risks) risksByCategory[r.category].push(r);

  const totalRiskScore = risks.reduce((s, a) => s + Math.abs(a.scoreDelta), 0);
  const totalStrengthScore = strengths.reduce((s, a) => s + a.scoreDelta, 0);
  const netScore = totalStrengthScore - totalRiskScore;

  // Business Fit — tylko dokumentacja (nie profil firmy)
  let fitScore = 40;
  if (valuationLevel === "ready") fitScore += 30;
  else if (valuationLevel === "risk") fitScore += 12;
  else fitScore -= 20;
  if (przedmiarRows >= 10) fitScore += 15;
  else if (przedmiarRows > 0) fitScore += 8;
  if (deep.keyFacts.length >= 8) fitScore += 10;
  else if (deep.keyFacts.length >= 4) fitScore += 5;
  if (deep.hasUmowaSignal) fitScore += 5;
  if (deep.przedmiar.knrCatalogs.length > 0) fitScore += 5;
  fitScore -= Math.min(25, risks.filter((r) => r.level === "high").length * 8);
  fitScore = Math.max(0, Math.min(100, fitScore));

  let fitLevel: BusinessFitLevel = "medium";
  if (fitScore >= 70) fitLevel = "high";
  else if (fitScore < 40) fitLevel = "low";

  const fitRationaleParts: string[] = [];
  fitRationaleParts.push(`Kompletność/wycena: ${deep.offerReadyLabel}`);
  fitRationaleParts.push(`Pozycje przedmiaru: ${przedmiarRows}`);
  fitRationaleParts.push(`Kluczowe fakty: ${deep.keyFacts.length}`);
  if (deep.hasUmowaSignal) fitRationaleParts.push("Wykryto projekt umowy");
  fitRationaleParts.push(`Wysokie ryzyka: ${risks.filter((r) => r.level === "high").length}`);

  const businessFit: BusinessFitView = {
    level: fitLevel,
    labelPl: BUSINESS_FIT_LABEL_PL[fitLevel],
    badge: fitLevel === "high" ? "🟢" : fitLevel === "medium" ? "🟡" : "🔴",
    score: fitScore,
    rationale: fitRationaleParts.join(" · "),
  };

  const highRisks = risks.filter((r) => r.level === "high");
  const blocker = valuationLevel === "insufficient" && przedmiarRows === 0;

  let verdict: BusinessVerdict = "STARTUJ WARUNKOWO";
  if (blocker || (highRisks.length >= 3 && fitLevel === "low")) {
    verdict = "ODPUŚĆ";
  } else if (
    fitLevel === "high"
    && highRisks.length === 0
    && netScore >= 8
    && valuationLevel !== "insufficient"
  ) {
    verdict = "STARTUJ";
  } else if (fitLevel === "low" && highRisks.length >= 2) {
    verdict = "ODPUŚĆ";
  }

  const reasons: string[] = [];
  if (verdict === "STARTUJ") {
    reasons.push(...strengths.slice(0, 4).map((s) => s.label.toLowerCase()));
    if (reasons.length === 0) reasons.push("korzystny bilans dokumentacji");
  } else if (verdict === "ODPUŚĆ") {
    reasons.push(...highRisks.slice(0, 4).map((r) => r.label.toLowerCase()));
    if (blocker) reasons.unshift("niewystarczająca dokumentacja do wyceny");
    if (reasons.length === 0) reasons.push("niekorzystny bilans ryzyk dokumentacyjnych");
  } else {
    // STARTUJ WARUNKOWO — mix
    for (const s of strengths.slice(0, 3)) reasons.push(s.label.toLowerCase());
    for (const r of [...highRisks, ...risks.filter((x) => x.level === "medium")].slice(0, 3)) {
      reasons.push(r.label.toLowerCase());
    }
    if (reasons.length === 0) reasons.push("wymaga weryfikacji kluczowych warunków");
  }

  // dedupe reasons
  const uniqueReasons = [...new Set(reasons)].slice(0, 6);

  const recommendation: BusinessRecommendationView = {
    verdict,
    verdictBadge: verdict === "STARTUJ" ? "🟢" : verdict === "STARTUJ WARUNKOWO" ? "🟡" : "🔴",
    summaryLine: `Rekomendacja biznesowa (dokumentacja): ${verdict}`,
    reasons: uniqueReasons,
  };

  return {
    recommendation,
    businessFit,
    assessments,
    risks,
    strengths,
    risksByCategory,
    totalRiskScore,
    totalStrengthScore,
    netScore,
  };
}

export function businessRiskLevelLabelPl(level: BusinessRiskLevel): string {
  if (level === "high") return "wysoki";
  if (level === "medium") return "średni";
  return "niski";
}
