/**
 * W&G DOM COMMAND CENTER AI — Owner Profile Engine (ETAP 7B).
 * Analiza statystyczna wpisów z kw-tender-learning — bez LLM.
 */

import type { TenderDecision } from "@/lib/tender-center-decision";
import {
  learningReasonLabel,
  type LearningReasonId,
  type TenderLearningEntry,
} from "@/lib/tender-center-learning";

export type OwnerType = "OSTROŻNY" | "WYWAŻONY" | "AGRESYWNY";
export type PreferredContractSize =
  | "MAŁE"
  | "ŚREDNIE"
  | "DUŻE"
  | "MIESZANE"
  | "NIEOKREŚLONE";
export type RiskProfile =
  | "NISKA TOLERANCJA RYZYKA"
  | "UMIARKOWANA TOLERANCJA RYZYKA"
  | "WYSOKA TOLERANCJA RYZYKA"
  | "BRAK DANYCH";

const RISK_REASONS: ReadonlySet<LearningReasonId> = new Set([
  "za_wysokie_wadium",
  "za_duze_ryzyko",
]);

const REJECTION_DECISIONS: ReadonlySet<TenderDecision> = new Set(["HOLD", "NO-GO"]);

export interface OwnerProfileTopReason {
  id: LearningReasonId | string;
  label: string;
  count: number;
}

export interface OwnerProfile {
  totalDecisions: number;
  preferredDecision: TenderDecision | null;
  riskProfile: RiskProfile;
  topReasons: OwnerProfileTopReason[];
  profileInsights: string[];
  preferredContractSize: PreferredContractSize;
  ownerType: OwnerType | null;
}

type ContractSizeBucket = "MAŁE" | "ŚREDNIE" | "DUŻE";

function countByDecision(entries: TenderLearningEntry[]): Record<TenderDecision, number> {
  const counts: Record<TenderDecision, number> = { GO: 0, HOLD: 0, "NO-GO": 0 };
  for (const e of entries) counts[e.ownerDecision] += 1;
  return counts;
}

function computeOwnerType(goRate: number): OwnerType {
  if (goRate > 0.6) return "AGRESYWNY";
  if (goRate >= 0.35) return "WYWAŻONY";
  return "OSTROŻNY";
}

function combinedScore(entry: TenderLearningEntry): number {
  return (entry.opportunityScore + entry.impactScore) / 2;
}

function contractSizeBucket(entry: TenderLearningEntry): ContractSizeBucket {
  const score = combinedScore(entry);
  if (score < 45) return "MAŁE";
  if (score <= 65) return "ŚREDNIE";
  return "DUŻE";
}

function computePreferredContractSize(entries: TenderLearningEntry[]): PreferredContractSize {
  const goEntries = entries.filter((e) => e.ownerDecision === "GO");
  if (goEntries.length === 0) return "NIEOKREŚLONE";

  const buckets: Record<ContractSizeBucket, number> = { MAŁE: 0, ŚREDNIE: 0, DUŻE: 0 };
  for (const e of goEntries) buckets[contractSizeBucket(e)] += 1;

  const total = goEntries.length;
  const ranked = (Object.entries(buckets) as Array<[ContractSizeBucket, number]>)
    .sort((a, b) => b[1] - a[1]);

  const [topBucket, topCount] = ranked[0];
  const secondCount = ranked[1]?.[1] ?? 0;

  if (topCount / total >= 0.5) return topBucket;
  if (topCount > 0 && secondCount > 0 && topCount - secondCount <= 1) return "MIESZANE";
  if (topCount / total >= 0.4) return topBucket;
  return "MIESZANE";
}

function computeRiskProfile(entries: TenderLearningEntry[]): RiskProfile {
  if (entries.length === 0) return "BRAK DANYCH";

  const decisionCounts = countByDecision(entries);
  const goRate = decisionCounts.GO / entries.length;

  const riskReasonCount = entries.filter((e) => RISK_REASONS.has(e.reason)).length;
  const riskReasonShare = riskReasonCount / entries.length;

  const rejectionWithRisk = entries.filter(
    (e) => REJECTION_DECISIONS.has(e.ownerDecision) && RISK_REASONS.has(e.reason),
  ).length;
  const rejectionCount = decisionCounts.HOLD + decisionCounts["NO-GO"];
  const rejectionRiskShare = rejectionCount > 0 ? rejectionWithRisk / rejectionCount : 0;

  if (riskReasonShare >= 0.3 || rejectionRiskShare >= 0.4) {
    return "NISKA TOLERANCJA RYZYKA";
  }
  if (goRate >= 0.5 && riskReasonShare < 0.15) {
    return "WYSOKA TOLERANCJA RYZYKA";
  }
  return "UMIARKOWANA TOLERANCJA RYZYKA";
}

function computeTopReasons(entries: TenderLearningEntry[], limit = 5): OwnerProfileTopReason[] {
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.reason] = (counts[e.reason] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      label: learningReasonLabel(id),
      count,
    }));
}

function buildProfileInsights(
  entries: TenderLearningEntry[],
  decisionCounts: Record<TenderDecision, number>,
  topReasons: OwnerProfileTopReason[],
  ownerType: OwnerType | null,
  riskProfile: RiskProfile,
  preferredContractSize: PreferredContractSize,
): string[] {
  if (entries.length === 0) {
    return ["Brak zapisanych decyzji — profil zostanie wyliczony po pierwszych wyborach GO/HOLD/NO-GO."];
  }

  const insights: string[] = [];
  const total = entries.length;
  const top = topReasons[0];

  if (top?.id === "za_wysokie_wadium" && top.count / total >= 0.2) {
    insights.push("Najczęściej odrzucasz przetargi z wysokim wadium.");
  }
  if (top?.id === "za_duze_ryzyko" && top.count / total >= 0.2) {
    insights.push("Wysokie ryzyko jest częstym powodem Twoich decyzji o wstrzymaniu lub rezygnacji.");
  }
  if (top?.id === "brak_ludzi" && top.count / total >= 0.15) {
    insights.push("Brak ludzi jest częstym powodem odrzucenia.");
  }

  const preferred = (["GO", "HOLD", "NO-GO"] as const).reduce((best, d) =>
    decisionCounts[d] > decisionCounts[best] ? d : best,
  );
  const preferredShare = decisionCounts[preferred] / total;

  if (preferred === "HOLD" && preferredShare >= 0.35) {
    insights.push("Najczęściej wybierasz decyzję HOLD.");
  } else if (preferred === "GO" && preferredShare >= 0.5) {
    insights.push("Dominującą decyzją jest GO — aktywnie poszukujesz okazji.");
  } else if (preferred === "NO-GO" && preferredShare >= 0.35) {
    insights.push("Często decydujesz się na NO-GO — selekcja przetargów jest restrykcyjna.");
  }

  const goWithRisk = entries.filter(
    (e) => e.ownerDecision === "GO" && RISK_REASONS.has(e.reason),
  ).length;
  const noGoWithRisk = entries.filter(
    (e) => e.ownerDecision === "NO-GO" && RISK_REASONS.has(e.reason),
  ).length;
  if (noGoWithRisk >= 2 && goWithRisk === 0) {
    insights.push("Rzadko podejmujesz decyzję GO przy wysokim ryzyku.");
  }

  if (ownerType === "AGRESYWNY") {
    insights.push("Profil wskazuje na wysoką gotowość do startu w nowych przetargach (GO > 60%).");
  } else if (ownerType === "OSTROŻNY") {
    insights.push("Profil wskazuje na ostrożne podejście — rzadziej wybierasz GO (< 35%).");
  }

  if (riskProfile === "NISKA TOLERANCJA RYZYKA") {
    insights.push("Często wskazujesz wadium lub ryzyko jako powód decyzji.");
  } else if (riskProfile === "WYSOKA TOLERANCJA RYZYKA") {
    insights.push("Akceptujesz ryzyko częściej niż typowy właściciel w tej próbce decyzji.");
  }

  if (preferredContractSize === "DUŻE") {
    insights.push("Preferujesz większe kontrakty (wysokie opportunity i impact score przy GO).");
  } else if (preferredContractSize === "MAŁE") {
    insights.push("Częściej wybierasz GO przy mniejszych kontraktach.");
  } else if (preferredContractSize === "MIESZANE") {
    insights.push("Nie widać jednoznacznej preferencji wielkości kontraktu — profil mieszany.");
  }

  return insights.slice(0, 5);
}

export function computeOwnerProfile(learningEntries: TenderLearningEntry[]): OwnerProfile {
  const totalDecisions = learningEntries.length;

  if (totalDecisions === 0) {
    return {
      totalDecisions: 0,
      preferredDecision: null,
      riskProfile: "BRAK DANYCH",
      topReasons: [],
      profileInsights: [
        "Brak zapisanych decyzji — profil zostanie wyliczony po pierwszych wyborach GO/HOLD/NO-GO.",
      ],
      preferredContractSize: "NIEOKREŚLONE",
      ownerType: null,
    };
  }

  const decisionCounts = countByDecision(learningEntries);
  const goRate = decisionCounts.GO / totalDecisions;

  const preferredDecision = (["GO", "HOLD", "NO-GO"] as const).reduce((best, d) =>
    decisionCounts[d] >= decisionCounts[best] ? d : best,
  );

  const ownerType = computeOwnerType(goRate);
  const riskProfile = computeRiskProfile(learningEntries);
  const topReasons = computeTopReasons(learningEntries);
  const preferredContractSize = computePreferredContractSize(learningEntries);
  const profileInsights = buildProfileInsights(
    learningEntries,
    decisionCounts,
    topReasons,
    ownerType,
    riskProfile,
    preferredContractSize,
  );

  return {
    totalDecisions,
    preferredDecision,
    riskProfile,
    topReasons,
    profileInsights,
    preferredContractSize,
    ownerType,
  };
}

export function ownerTypeTone(type: OwnerType): string {
  switch (type) {
    case "OSTROŻNY":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "WYWAŻONY":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "AGRESYWNY":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
  }
}
