/**
 * W&G DOM COMMAND CENTER AI — AI Insights Engine (ETAP 7C).
 * Reguły statystyczne — bez LLM. Źródła: learning, owner profile, decyzje.
 */

import type { TenderDecision } from "@/lib/tender-center-decision";
import { learningReasonLabel, type TenderLearningEntry } from "@/lib/tender-center-learning";
import type { OwnerProfile } from "@/lib/tender-center-owner-profile";

const MIN_DECISIONS_FOR_ANALYSIS = 3;
const INSUFFICIENT_MSG = "Za mało danych do analizy.";

type ContractSizeBucket = "MAŁE" | "ŚREDNIE" | "DUŻE";

export interface AiInsightsInput {
  learningEntries: TenderLearningEntry[];
  ownerProfile: OwnerProfile;
}

export interface AiInsightsResult {
  highlights: string[];
  warnings: string[];
  strengths: string[];
  maturityScore: number;
  maturityLabel: string;
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

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function takeUnique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function computeMaturityScore(decisionCount: number): number {
  if (decisionCount >= 100) return 100;
  if (decisionCount >= 50) return 85;
  if (decisionCount >= 25) return 60;
  if (decisionCount >= 10) return 30;
  return 10;
}

export function computeMaturityLabel(maturityScore: number): string {
  if (maturityScore >= 100) return "Ekspercka";
  if (maturityScore >= 85) return "Wysoka";
  if (maturityScore >= 30) return "Średnia";
  return "Niska";
}

function buildHighlights(
  entries: TenderLearningEntry[],
  profile: OwnerProfile,
): string[] {
  const total = entries.length;
  const highlights: string[] = [];

  if (profile.preferredDecision === "HOLD") {
    const holdShare = pct(
      entries.filter((e) => e.ownerDecision === "HOLD").length,
      total,
    );
    if (holdShare >= 30) {
      highlights.push("Najczęściej wybierasz decyzję HOLD.");
    }
  } else if (profile.preferredDecision === "GO") {
    const goShare = pct(entries.filter((e) => e.ownerDecision === "GO").length, total);
    if (goShare >= 40) {
      highlights.push("Najczęściej wybierasz decyzję GO.");
    }
  } else if (profile.preferredDecision === "NO-GO") {
    const noGoShare = pct(
      entries.filter((e) => e.ownerDecision === "NO-GO").length,
      total,
    );
    if (noGoShare >= 30) {
      highlights.push("Najczęściej wybierasz decyzję NO-GO.");
    }
  }

  const highOpp = entries.filter((e) => e.opportunityScore >= 70).length;
  const highOppShare = pct(highOpp, total);
  if (highOppShare >= 40) {
    highlights.push(
      `Najwięcej decyzji dotyczyło przetargów o wysokim Opportunity Score (${highOppShare}% ≥ 70).`,
    );
  }

  const bucketCounts: Record<ContractSizeBucket, number> = {
    MAŁE: 0,
    ŚREDNIE: 0,
    DUŻE: 0,
  };
  for (const e of entries) bucketCounts[contractSizeBucket(e)] += 1;
  const topBucket = (Object.entries(bucketCounts) as Array<[ContractSizeBucket, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topBucket && topBucket[1] / total >= 0.4) {
    const label =
      topBucket[0] === "MAŁE"
        ? "małej"
        : topBucket[0] === "DUŻE"
          ? "dużej"
          : "średniej";
    highlights.push(`Najczęściej analizujesz kontrakty ${label} wielkości.`);
  }

  if (profile.ownerType === "AGRESYWNY") {
    highlights.push("Profil decyzyjny: właściciel agresywny (GO > 60%).");
  } else if (profile.ownerType === "OSTROŻNY") {
    highlights.push("Profil decyzyjny: właściciel ostrożny (GO < 35%).");
  }

  const topReason = profile.topReasons[0];
  if (topReason && topReason.count / total >= 0.25) {
    highlights.push(
      `Dominujący powód decyzji: „${topReason.label}” (${topReason.count}×).`,
    );
  }

  const avgOpp = Math.round(
    entries.reduce((s, e) => s + e.opportunityScore, 0) / total,
  );
  if (avgOpp >= 65 && highlights.length < 5) {
    highlights.push(`Średni Opportunity Score analizowanych przetargów: ${avgOpp}/100.`);
  }

  return takeUnique(highlights, 5);
}

function buildWarnings(entries: TenderLearningEntry[]): string[] {
  const total = entries.length;
  const warnings: string[] = [];

  const rejected = entries.filter(
    (e) => e.ownerDecision === "HOLD" || e.ownerDecision === "NO-GO",
  );
  if (rejected.length > 0) {
    const wadiumRejected = rejected.filter((e) => e.reason === "za_wysokie_wadium").length;
    const wadiumShare = pct(wadiumRejected, rejected.length);
    if (wadiumShare >= 50) {
      warnings.push(
        `${wadiumShare}% odrzuconych przetargów miało wysokie wadium.`,
      );
    }
  }

  const brakLudzi = entries.filter((e) => e.reason === "brak_ludzi").length;
  if (brakLudzi / total >= 0.2) {
    warnings.push("Brak ludzi jest częstym powodem odrzucenia.");
  }

  const noGoEntries = entries.filter((e) => e.ownerDecision === "NO-GO");
  if (noGoEntries.length >= 2) {
    const strategicNoGo = noGoEntries.filter((e) => e.strategicScore >= 70).length;
    const strategicShare = pct(strategicNoGo, noGoEntries.length);
    if (strategicShare >= 50) {
      warnings.push(
        `Większość decyzji NO-GO dotyczy kontraktów strategicznych (${strategicShare}%).`,
      );
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  let streakWithoutLargeGo = 0;
  for (const e of sorted) {
    const isLargeGo = e.ownerDecision === "GO" && contractSizeBucket(e) === "DUŻE";
    if (isLargeGo) break;
    streakWithoutLargeGo += 1;
  }
  if (streakWithoutLargeGo >= 20) {
    warnings.push(
      `Od ${streakWithoutLargeGo} decyzji nie podjąłeś GO dla dużego kontraktu.`,
    );
  }

  const misaligned = entries.filter((e) => e.ownerDecision !== e.systemDecision).length;
  const misalignShare = pct(misaligned, total);
  if (misalignShare >= 60 && total >= 5) {
    warnings.push(
      `${misalignShare}% decyzji różni się od rekomendacji systemu — możliwy dryf strategii.`,
    );
  }

  const riskReasons = entries.filter(
    (e) => e.reason === "za_duze_ryzyko" || e.reason === "za_wysokie_wadium",
  ).length;
  if (riskReasons / total >= 0.35) {
    warnings.push(
      `${pct(riskReasons, total)}% decyzji wskazuje wadium lub wysokie ryzyko jako powód.`,
    );
  }

  const zaKrotki = entries.filter((e) => e.reason === "za_krotki_termin").length;
  if (zaKrotki / total >= 0.2) {
    warnings.push("Krótki termin realizacji często blokuje Twoje decyzje GO.");
  }

  return takeUnique(warnings, 5);
}

function buildStrengths(entries: TenderLearningEntry[]): string[] {
  const total = entries.length;
  const strengths: string[] = [];

  const goEntries = entries.filter((e) => e.ownerDecision === "GO");
  if (goEntries.length > 0) {
    const highPotGo = goEntries.filter((e) => e.opportunityScore >= 70).length;
    const highPotShare = pct(highPotGo, goEntries.length);
    if (highPotShare >= 50) {
      strengths.push("Regularnie wybierasz przetargi o wysokim potencjale.");
    }
  }

  const alignedGo = entries.filter(
    (e) => e.ownerDecision === "GO" && e.systemDecision === "GO",
  ).length;
  const systemGo = entries.filter((e) => e.systemDecision === "GO").length;
  if (systemGo > 0) {
    const alignShare = pct(alignedGo, systemGo);
    if (alignShare >= 60) {
      strengths.push("Decyzje GO są zgodne z rekomendacją systemu.");
    }
  }

  const highOppAll = entries.filter((e) => e.opportunityScore > 70).length;
  const highOppShare = pct(highOppAll, total);
  if (highOppShare >= 40) {
    strengths.push(
      `Wysoki udział decyzji opartych na Opportunity Score > 70 (${highOppShare}%).`,
    );
  }

  if (goEntries.length >= 3) {
    const avgStrategicGo = Math.round(
      goEntries.reduce((s, e) => s + e.strategicScore, 0) / goEntries.length,
    );
    if (avgStrategicGo >= 65) {
      strengths.push(
        `Średni Strategic Score przy decyzjach GO: ${avgStrategicGo}/100.`,
      );
    }
  }

  const aligned = entries.filter((e) => e.ownerDecision === e.systemDecision).length;
  const alignShare = pct(aligned, total);
  if (alignShare >= 70) {
    strengths.push(`${alignShare}% decyzji jest zgodnych z rekomendacją systemu.`);
  }

  const impactGo = goEntries.filter((e) => e.impactScore >= 60).length;
  if (goEntries.length > 0 && pct(impactGo, goEntries.length) >= 50) {
    strengths.push("Decyzje GO często dotyczą przetargów z wysokim Impact Score.");
  }

  return takeUnique(strengths, 5);
}

export function computeAiInsights(input: AiInsightsInput): AiInsightsResult {
  const { learningEntries, ownerProfile } = input;
  const maturityScore = computeMaturityScore(learningEntries.length);
  const maturityLabel = computeMaturityLabel(maturityScore);

  if (learningEntries.length < MIN_DECISIONS_FOR_ANALYSIS) {
    return {
      highlights: [INSUFFICIENT_MSG],
      warnings: [INSUFFICIENT_MSG],
      strengths: [INSUFFICIENT_MSG],
      maturityScore,
      maturityLabel,
    };
  }

  const highlights = buildHighlights(learningEntries, ownerProfile);
  const warnings = buildWarnings(learningEntries);
  const strengths = buildStrengths(learningEntries);

  return {
    highlights: highlights.length > 0 ? highlights : [INSUFFICIENT_MSG],
    warnings: warnings.length > 0 ? warnings : ["Brak istotnych ostrzeżeń w obecnej próbce."],
    strengths: strengths.length > 0 ? strengths : [INSUFFICIENT_MSG],
    maturityScore,
    maturityLabel,
  };
}