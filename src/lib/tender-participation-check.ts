/**
 * P2-F.1 — porównanie wymagań udziału SWZ z profilem wykonawcy.
 */

import type { CompanyQualificationProfile } from "@/lib/company-qualification-profile";
import type {
  ParticipationRequirementKey,
  TenderParticipationRequirement,
  TenderParticipationRequirementType,
} from "@/lib/tender-participation-requirements";

export type ParticipationCheckStatus = "MATCH" | "MISSING" | "UNKNOWN";

export type ParticipationOverallStatus = "fulfilled" | "needs_verification" | "gaps";

export interface ParticipationCheckItem {
  requirement: TenderParticipationRequirement;
  status: ParticipationCheckStatus;
  label: string;
  profileNote: string;
}

export interface ParticipationCategoryGroup {
  type: TenderParticipationRequirementType;
  typeLabel: string;
  status: ParticipationCheckStatus;
  items: ParticipationCheckItem[];
}

export interface ParticipationCheckResult {
  overall: ParticipationOverallStatus;
  summaryLabel: string;
  summaryEmoji: string;
  requirements: TenderParticipationRequirement[];
  categories: ParticipationCategoryGroup[];
  matched: ParticipationCheckItem[];
  missing: ParticipationCheckItem[];
  unknown: ParticipationCheckItem[];
}

const TYPE_LABELS: Record<TenderParticipationRequirementType, string> = {
  personnel: "Personel",
  license: "Uprawnienia",
  experience: "Doświadczenie",
  insurance: "Ubezpieczenie",
  finance: "Finanse",
  reference: "Referencje",
};

const CATEGORY_EMOJI: Record<ParticipationCheckStatus, string> = {
  MATCH: "🟢",
  MISSING: "🔴",
  UNKNOWN: "🟡",
};

function worstStatus(items: ParticipationCheckItem[]): ParticipationCheckStatus {
  if (items.some((i) => i.status === "MISSING")) return "MISSING";
  if (items.some((i) => i.status === "UNKNOWN")) return "UNKNOWN";
  return "MATCH";
}

function checkPersonnel(
  key: ParticipationRequirementKey | undefined,
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; note: string } {
  const p = profile.personnel;
  switch (key) {
    case "kierownikBudowy":
      return p.kierownikBudowy
        ? { status: "MATCH", note: "Kierownik budowy — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak kierownika budowy w profilu wykonawcy" };
    case "kierownikSanitarny":
      return p.kierownikSanitarny
        ? { status: "MATCH", note: "Kierownik robót sanitarnych — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak kierownika robót sanitarnych w profilu" };
    case "kierownikElektryczny":
      return p.kierownikElektryczny
        ? { status: "MATCH", note: "Kierownik robót elektrycznych — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak kierownika robót elektrycznych w profilu" };
    case "kierownikDrogowy":
      return p.kierownikDrogowy
        ? { status: "MATCH", note: "Kierownik robót drogowych — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak kierownika robót drogowych w profilu" };
    case "kierownikRobot":
      return p.kierownikBudowy
        ? { status: "MATCH", note: "Kierownik robót — pokrycie przez kierownika budowy" }
        : { status: "UNKNOWN", note: "Brak potwierdzenia personelu w profilu" };
    default:
      return { status: "UNKNOWN", note: "Wymaga weryfikacji personelu w SWZ" };
  }
}

function checkLicense(
  key: ParticipationRequirementKey | undefined,
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; note: string } {
  const l = profile.licenses;
  switch (key) {
    case "piib":
      return l.piib
        ? { status: "MATCH", note: "PIIB / izba inżynierów — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak PIIB w profilu wykonawcy" };
    case "sep":
    case "sepE":
      return l.sepE || l.sepD
        ? { status: "MATCH", note: "Uprawnienia SEP — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak SEP w profilu wykonawcy" };
    case "sepD":
      return l.sepD
        ? { status: "MATCH", note: "SEP grupa D — zaznaczone w profilu" }
        : l.sepE
          ? { status: "UNKNOWN", note: "SEP E w profilu — zweryfikuj wymaganie D w SWZ" }
          : { status: "MISSING", note: "Brak SEP D w profilu" };
    case "udt":
      return l.udt
        ? { status: "MATCH", note: "UDT — zaznaczone w profilu" }
        : { status: "MISSING", note: "Brak UDT w profilu wykonawcy" };
    case "uprawnieniaBudowlane":
      return l.uprawnieniaBudowlane || l.piib
        ? { status: "MATCH", note: "Uprawnienia budowlane — zgodne z profilem" }
        : { status: "UNKNOWN", note: "Brak potwierdzenia uprawnień budowlanych w profilu" };
    default:
      return { status: "UNKNOWN", note: "Wymaga weryfikacji uprawnień w SWZ" };
  }
}

function checkExperience(
  req: TenderParticipationRequirement,
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; note: string } {
  const e = profile.experience;
  if (req.minProjects != null) {
    if (e.similarProjectsCount == null) {
      return { status: "UNKNOWN", note: "Brak danych o liczbie podobnych realizacji w profilu" };
    }
    return e.similarProjectsCount >= req.minProjects
      ? { status: "MATCH", note: `${e.similarProjectsCount} realizacji w profilu (wymagane ≥ ${req.minProjects})` }
      : { status: "MISSING", note: `${e.similarProjectsCount} realizacji — wymagane ≥ ${req.minProjects}` };
  }
  if (req.minValuePln != null) {
    if (e.largestProjectPln == null) {
      return { status: "UNKNOWN", note: "Brak danych o największej realizacji w profilu" };
    }
    return e.largestProjectPln >= req.minValuePln
      ? { status: "MATCH", note: `Największa realizacja ${e.largestProjectPln.toLocaleString("pl-PL")} zł` }
      : { status: "MISSING", note: `Największa realizacja poniżej wymaganego ${req.minValuePln.toLocaleString("pl-PL")} zł` };
  }
  if (e.similarProjectsCount != null || e.largestProjectPln != null) {
    return { status: "UNKNOWN", note: "Doświadczenie częściowo w profilu — zweryfikuj w SWZ" };
  }
  return { status: "UNKNOWN", note: "Brak danych o doświadczeniu w profilu" };
}

function checkInsurance(
  req: TenderParticipationRequirement,
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; note: string } {
  const oc = profile.insurance.ocPln;
  if (oc == null) {
    return { status: "UNKNOWN", note: "Brak kwoty polisy OC w profilu wykonawcy" };
  }
  if (req.minValuePln != null) {
    return oc >= req.minValuePln
      ? { status: "MATCH", note: `Polisa OC ${oc.toLocaleString("pl-PL")} zł (wymagane ≥ ${req.minValuePln.toLocaleString("pl-PL")} zł)` }
      : { status: "MISSING", note: `Polisa OC ${oc.toLocaleString("pl-PL")} zł — wymagane ≥ ${req.minValuePln.toLocaleString("pl-PL")} zł` };
  }
  return oc > 0
    ? { status: "MATCH", note: `Polisa OC ${oc.toLocaleString("pl-PL")} zł w profilu` }
    : { status: "UNKNOWN", note: "Uzupełnij polisę OC w profilu wykonawcy" };
}

function checkFinance(profile: CompanyQualificationProfile): { status: ParticipationCheckStatus; note: string } {
  const funds = profile.finances.availableFundsPln;
  if (funds == null) {
    return { status: "UNKNOWN", note: "Brak danych o środkach finansowych w profilu" };
  }
  return funds > 0
    ? { status: "MATCH", note: `Dostępne środki ${funds.toLocaleString("pl-PL")} zł w profilu` }
    : { status: "UNKNOWN", note: "Uzupełnij dostępne środki w profilu wykonawcy" };
}

function checkReferences(
  req: TenderParticipationRequirement,
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; note: string } {
  const count = profile.references.count;
  if (count == null) {
    return { status: "UNKNOWN", note: "Brak danych o referencjach w profilu" };
  }
  if (req.minReferences != null) {
    return count >= req.minReferences
      ? { status: "MATCH", note: `${count} referencji w profilu (wymagane ≥ ${req.minReferences})` }
      : { status: "MISSING", note: `${count} referencji — wymagane ≥ ${req.minReferences}` };
  }
  return count > 0
    ? { status: "MATCH", note: `${count} referencji w profilu` }
    : { status: "UNKNOWN", note: "Brak referencji w profilu wykonawcy" };
}

function checkSingleRequirement(
  req: TenderParticipationRequirement,
  profile: CompanyQualificationProfile,
): ParticipationCheckItem {
  let result: { status: ParticipationCheckStatus; note: string };
  switch (req.type) {
    case "personnel":
      result = checkPersonnel(req.key, profile);
      break;
    case "license":
      result = checkLicense(req.key, profile);
      break;
    case "experience":
      result = checkExperience(req, profile);
      break;
    case "insurance":
      result = checkInsurance(req, profile);
      break;
    case "finance":
      result = checkFinance(profile);
      break;
    case "reference":
      result = checkReferences(req, profile);
      break;
    default:
      result = { status: "UNKNOWN", note: "Wymaga weryfikacji w SWZ" };
  }
  return {
    requirement: req,
    status: result.status,
    label: req.label,
    profileNote: result.note,
  };
}

function computeOverall(
  items: ParticipationCheckItem[],
): { overall: ParticipationOverallStatus; summaryLabel: string; summaryEmoji: string } {
  const hasMissing = items.some((i) => i.status === "MISSING");
  const hasUnknown = items.some((i) => i.status === "UNKNOWN");
  if (hasMissing) {
    return { overall: "gaps", summaryLabel: "Braki formalne", summaryEmoji: "🔴" };
  }
  if (hasUnknown) {
    return { overall: "needs_verification", summaryLabel: "Wymaga weryfikacji", summaryEmoji: "🟡" };
  }
  return { overall: "fulfilled", summaryLabel: "Spełnione", summaryEmoji: "🟢" };
}

/** Główny silnik porównania SWZ ↔ profil wykonawcy. */
export function checkTenderParticipation(
  requirements: TenderParticipationRequirement[],
  profile: CompanyQualificationProfile,
): ParticipationCheckResult | null {
  if (requirements.length === 0) return null;

  const items = requirements.map((req) => checkSingleRequirement(req, profile));
  const matched = items.filter((i) => i.status === "MATCH");
  const missing = items.filter((i) => i.status === "MISSING");
  const unknown = items.filter((i) => i.status === "UNKNOWN");
  const { overall, summaryLabel, summaryEmoji } = computeOverall(items);

  const typeOrder: TenderParticipationRequirementType[] = [
    "personnel", "license", "experience", "insurance", "finance", "reference",
  ];
  const categories: ParticipationCategoryGroup[] = typeOrder
    .map((type) => {
      const groupItems = items.filter((i) => i.requirement.type === type);
      if (groupItems.length === 0) return null;
      return {
        type,
        typeLabel: TYPE_LABELS[type],
        status: worstStatus(groupItems),
        items: groupItems,
      };
    })
    .filter((g): g is ParticipationCategoryGroup => g != null);

  return {
    overall,
    summaryLabel,
    summaryEmoji,
    requirements,
    categories,
    matched,
    missing,
    unknown,
  };
}

export { CATEGORY_EMOJI, TYPE_LABELS };
