/**
 * P2-F.6 — Offer Completeness Engine (UI-only, reuse P2-F.1–F.5 SSOT).
 */

import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { CompanyQualificationProfile } from "@/lib/company-qualification-profile";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import {
  checkTenderParticipation,
  type ParticipationCheckStatus,
} from "@/lib/tender-participation-check";
import { checkReferenceRequirement } from "@/lib/tender-experience-check";
import { extractParticipationRequirements } from "@/lib/tender-participation-requirements";
import { extractExperienceRequirements } from "@/lib/tender-experience-requirements";
import type { ExperienceRequirement } from "@/lib/tender-experience-requirements";
import { selectProjectsForTender } from "@/lib/tender-works-register";

export const TENDER_OFFER_COMPLETENESS_SECTION_ID = "tender-offer-completeness-section";

export type OfferCompletenessItemId =
  | "works_register"
  | "references"
  | "qualification_profile"
  | "participation_conditions"
  | "insurance_oc"
  | "power_of_attorney";

export type OfferCompletenessItemStatus = "ready" | "needs_attention" | "missing";

export type OfferReadinessStatus = "ready" | "needs_work" | "incomplete";

export interface OfferCompletenessCheckItem {
  id: OfferCompletenessItemId;
  label: string;
  tier: "critical" | "additional";
  status: OfferCompletenessItemStatus;
  /** false = nie dotyczy tego przetargu (liczy się jako gotowe) */
  applicable: boolean;
  hint?: string;
}

export interface OfferCompletenessSnapshot {
  items: OfferCompletenessCheckItem[];
  readiness: OfferReadinessStatus;
  readinessLabel: string;
  readinessEmoji: string;
  readyCount: number;
  totalCount: number;
  readyLabel: string;
}

export interface OfferCompletenessInput {
  swz?: TenderSwzAnalysis | null;
  combinedText?: string;
  profile?: CompanyQualificationProfile;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź/g, "z")
    .replace(/ż/g, "z");
}

function participationToItemStatus(s: ParticipationCheckStatus): OfferCompletenessItemStatus {
  if (s === "MATCH") return "ready";
  if (s === "UNKNOWN") return "needs_attention";
  return "missing";
}

function resolveRequirements(input: OfferCompletenessInput) {
  const swz = input.swz;
  const combinedText = input.combinedText?.trim() ?? "";
  const participationRequirements = swz?.participationRequirements?.length
    ? swz.participationRequirements
    : combinedText
      ? extractParticipationRequirements(combinedText)
      : [];
  const experienceRequirements = swz?.experienceRequirements?.length
    ? swz.experienceRequirements
    : combinedText
      ? extractExperienceRequirements(combinedText)
      : [];
  return { participationRequirements, experienceRequirements };
}

function checkQualificationProfile(profile: CompanyQualificationProfile): OfferCompletenessCheckItem {
  const p = profile.personnel;
  const l = profile.licenses;
  const hasPersonnel =
    p.kierownikBudowy || p.kierownikSanitarny || p.kierownikElektryczny || p.kierownikDrogowy;
  const hasLicenses = l.piib || l.sepE || l.sepD || l.udt || l.uprawnieniaBudowlane;
  const hasProjects = (profile.experienceProjects?.length ?? 0) > 0;
  const hasLegacyExp =
    profile.experience.similarProjectsCount != null || profile.experience.largestProjectPln != null;
  const hasRefs = profile.references.count != null;

  let status: OfferCompletenessItemStatus;
  let hint: string;
  if ((hasPersonnel || hasLicenses) && (hasProjects || hasLegacyExp || hasRefs)) {
    status = "ready";
    hint = "Profil wykonawcy uzupełniony";
  } else if (hasPersonnel || hasLicenses || hasProjects || hasLegacyExp) {
    status = "needs_attention";
    hint = "Uzupełnij personel, licencje lub realizacje w profilu wykonawcy";
  } else {
    status = "missing";
    hint = "Brak danych profilu kwalifikacyjnego";
  }

  return {
    id: "qualification_profile",
    label: "Profil kwalifikacyjny",
    tier: "critical",
    status,
    applicable: true,
    hint,
  };
}

function checkWorksRegister(
  experienceRequirements: ExperienceRequirement[],
  profile: CompanyQualificationProfile,
): OfferCompletenessCheckItem {
  if (experienceRequirements.length === 0) {
    return {
      id: "works_register",
      label: "Wykaz robót",
      tier: "critical",
      status: "ready",
      applicable: false,
      hint: "Brak wymogu wykazu robót w SWZ",
    };
  }
  const sel = selectProjectsForTender(experienceRequirements, profile);
  const { recommended, requiredCount } = sel;
  if (requiredCount === 0) {
    return {
      id: "works_register",
      label: "Wykaz robót",
      tier: "critical",
      status: "needs_attention",
      applicable: true,
      hint: "Nie rozpoznano wymogu doświadczenia w SWZ",
    };
  }
  if (recommended.length >= requiredCount) {
    return {
      id: "works_register",
      label: "Wykaz robót",
      tier: "critical",
      status: "ready",
      applicable: true,
      hint: `${recommended.length}/${requiredCount} realizacji w wykazie`,
    };
  }
  return {
    id: "works_register",
    label: "Wykaz robót",
    tier: "critical",
    status: "missing",
    applicable: true,
    hint:
      recommended.length > 0
        ? `${recommended.length}/${requiredCount} — uzupełnij wykaz w Kwalifikacji`
        : `Brak pozycji w wykazie — wymagane ${requiredCount}`,
  };
}

function referencesRequired(
  experienceRequirements: ExperienceRequirement[],
  participationRequirements: ReturnType<typeof extractParticipationRequirements>,
): boolean {
  if (experienceRequirements.some((r) => r.referenceRequired)) return true;
  if (participationRequirements.some((r) => r.type === "reference")) return true;
  return experienceRequirements.length > 0;
}

function checkReferencesItem(
  experienceRequirements: ExperienceRequirement[],
  participationRequirements: ReturnType<typeof extractParticipationRequirements>,
  profile: CompanyQualificationProfile,
): OfferCompletenessCheckItem {
  if (!referencesRequired(experienceRequirements, participationRequirements)) {
    return {
      id: "references",
      label: "Referencje",
      tier: "critical",
      status: "ready",
      applicable: false,
      hint: "Brak wymogu referencji w SWZ",
    };
  }

  const refReq =
    experienceRequirements.find((r) => r.referenceRequired)
    ?? experienceRequirements.sort((a, b) => b.minProjects - a.minProjects)[0]
    ?? null;
  const refCheck = checkReferenceRequirement(profile, refReq);

  return {
    id: "references",
    label: "Referencje",
    tier: "critical",
    status: participationToItemStatus(refCheck.status),
    applicable: true,
    hint: refCheck.profileNote,
  };
}

function checkParticipationConditions(
  participationResult: ReturnType<typeof checkTenderParticipation>,
): OfferCompletenessCheckItem {
  if (!participationResult) {
    return {
      id: "participation_conditions",
      label: "Warunki udziału",
      tier: "critical",
      status: "needs_attention",
      applicable: true,
      hint: "Brak analizy warunków udziału — przeanalizuj SWZ w Dokumentach",
    };
  }
  const status: OfferCompletenessItemStatus =
    participationResult.overall === "fulfilled"
      ? "ready"
      : participationResult.overall === "needs_verification"
        ? "needs_attention"
        : "missing";
  return {
    id: "participation_conditions",
    label: "Warunki udziału",
    tier: "critical",
    status,
    applicable: true,
    hint: `${participationResult.summaryEmoji} ${participationResult.summaryLabel}`,
  };
}

function checkInsuranceOc(
  participationResult: ReturnType<typeof checkTenderParticipation>,
  participationRequirements: ReturnType<typeof extractParticipationRequirements>,
): OfferCompletenessCheckItem {
  const insuranceReqs = participationRequirements.filter((r) => r.type === "insurance");
  const insuranceCat = participationResult?.categories.find((c) => c.type === "insurance");
  const applicable = insuranceReqs.length > 0 || insuranceCat != null;

  if (!applicable) {
    return {
      id: "insurance_oc",
      label: "Polisa OC",
      tier: "additional",
      status: "ready",
      applicable: false,
      hint: "Brak wymogu OC w SWZ",
    };
  }

  const catStatus = insuranceCat?.status ?? "UNKNOWN";
  return {
    id: "insurance_oc",
    label: "Polisa OC",
    tier: "additional",
    status: participationToItemStatus(catStatus),
    applicable: true,
    hint: insuranceCat?.items[0]?.profileNote ?? "Sprawdź sumę ubezpieczenia OC",
  };
}

/** Czy SWZ wymaga pełnomocnictwa (heurystyka tekstowa). */
export function detectPowerOfAttorneyRequired(
  swz: TenderSwzAnalysis | null | undefined,
  combinedText = "",
): boolean {
  const parts: string[] = [];
  if (combinedText.trim()) parts.push(combinedText);
  if (swz?.referenceRequirement) parts.push(swz.referenceRequirement);
  for (const fr of swz?.formalRequirements ?? []) {
    if (fr.label) parts.push(fr.label);
  }
  for (const r of swz?.participationRequirements ?? []) {
    parts.push(r.label);
  }
  const hay = fold(parts.join(" "));
  return /pelnomocnictw|upowaznien/.test(hay);
}

function checkPowerOfAttorney(
  swz: TenderSwzAnalysis | null | undefined,
  combinedText: string,
): OfferCompletenessCheckItem {
  const required = detectPowerOfAttorneyRequired(swz, combinedText);
  if (!required) {
    return {
      id: "power_of_attorney",
      label: "Pełnomocnictwo",
      tier: "additional",
      status: "ready",
      applicable: false,
      hint: "Brak wymogu pełnomocnictwa w SWZ",
    };
  }
  return {
    id: "power_of_attorney",
    label: "Pełnomocnictwo",
    tier: "additional",
    status: "missing",
    applicable: true,
    hint: "SWZ wymaga pełnomocnictwa — przygotuj dokument do złożenia",
  };
}

export function buildOfferCompletenessChecklist(input: OfferCompletenessInput): OfferCompletenessCheckItem[] {
  const profile = input.profile ?? loadCompanyQualificationProfileLocal();
  const { participationRequirements, experienceRequirements } = resolveRequirements(input);
  const participationResult = checkTenderParticipation(
    participationRequirements,
    profile,
    experienceRequirements,
  );

  return [
    checkWorksRegister(experienceRequirements, profile),
    checkReferencesItem(experienceRequirements, participationRequirements, profile),
    checkQualificationProfile(profile),
    checkParticipationConditions(participationResult),
    checkInsuranceOc(participationResult, participationRequirements),
    checkPowerOfAttorney(input.swz, input.combinedText ?? ""),
  ];
}

export function resolveOfferReadinessStatus(items: OfferCompletenessCheckItem[]): OfferReadinessStatus {
  const applicable = items.filter((i) => i.applicable);
  const critical = applicable.filter((i) => i.tier === "critical");
  const additional = applicable.filter((i) => i.tier === "additional");

  if (critical.some((i) => i.status === "missing")) return "incomplete";
  if (critical.some((i) => i.status === "needs_attention")) return "needs_work";
  if (additional.some((i) => i.status === "missing" || i.status === "needs_attention")) {
    return "needs_work";
  }
  return "ready";
}

const READINESS_META: Record<OfferReadinessStatus, { label: string; emoji: string }> = {
  ready: { label: "Gotowa do złożenia", emoji: "🟢" },
  needs_work: { label: "Wymaga uzupełnienia", emoji: "🟡" },
  incomplete: { label: "Niekompletna", emoji: "🔴" },
};

export function buildOfferCompletenessSnapshot(input: OfferCompletenessInput): OfferCompletenessSnapshot {
  const items = buildOfferCompletenessChecklist(input);
  const readiness = resolveOfferReadinessStatus(items);
  const meta = READINESS_META[readiness];
  const readyCount = items.filter((i) => i.status === "ready").length;
  const totalCount = items.length;

  return {
    items,
    readiness,
    readinessLabel: meta.label,
    readinessEmoji: meta.emoji,
    readyCount,
    totalCount,
    readyLabel: `${readyCount} / ${totalCount} gotowych`,
  };
}

export function offerCompletenessItemEmoji(status: OfferCompletenessItemStatus): string {
  if (status === "ready") return "🟢";
  if (status === "needs_attention") return "🟡";
  return "🔴";
}
