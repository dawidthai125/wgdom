/**
 * P2-F.2 — porównanie doświadczenia i referencji SWZ z profilem wykonawcy.
 */

import type {
  CompanyExperienceProject,
  CompanyQualificationProfile,
} from "@/lib/company-qualification-profile";
import type { ExperienceRequirement } from "@/lib/tender-experience-requirements";
import type { ParticipationCheckStatus } from "@/lib/tender-participation-check";

export interface ExperienceCheckItem {
  requirement: ExperienceRequirement;
  status: ParticipationCheckStatus;
  label: string;
  profileNote: string;
  matchingProjects: number;
  requiredProjects: number;
  requiredValue: number | null;
  largestMatchPln: number | null;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function categoryMatches(projectCategory: string, required: string | null): boolean {
  if (!required) return true;
  const p = fold(projectCategory);
  const r = fold(required);
  if (p.includes(r) || r.includes(p)) return true;
  if (/ogolnobudowl|budowlan/.test(r) && /budowlan|remont|ogolnobudowl/.test(p)) return true;
  if (/podobn/.test(r)) return true;
  if (/remont/.test(r) && /remont/.test(p)) return true;
  if (/elektrycz/.test(r) && /elektrycz/.test(p)) return true;
  if (/instalac|sanitarn/.test(r) && /(instalac|sanitarn)/.test(p)) return true;
  return false;
}

function projectInPeriod(project: CompanyExperienceProject, periodYears: number | null): boolean {
  if (periodYears == null || project.year == null) return true;
  const cutoff = new Date().getFullYear() - periodYears;
  return project.year >= cutoff;
}

function getProfileProjects(profile: CompanyQualificationProfile): CompanyExperienceProject[] {
  return profile.experienceProjects ?? [];
}

function hasLegacyExperienceData(profile: CompanyQualificationProfile): boolean {
  const e = profile.experience;
  return (e.similarProjectsCount != null && e.similarProjectsCount > 0)
    || (e.largestProjectPln != null && e.largestProjectPln > 0);
}

function filterMatchingProjects(
  profile: CompanyQualificationProfile,
  req: ExperienceRequirement,
): CompanyExperienceProject[] {
  return getProfileProjects(profile).filter((p) => {
    if (p.valuePln == null || p.valuePln <= 0) return false;
    if (req.minValuePln != null && p.valuePln < req.minValuePln) return false;
    if (!categoryMatches(p.category, req.category)) return false;
    if (!projectInPeriod(p, req.periodYears)) return false;
    return true;
  });
}

function fmtPln(n: number): string {
  return n.toLocaleString("pl-PL");
}

export function traceExperienceCheck(detail: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[EXPERIENCE TRACE]", detail);
  }
}

/** Porównanie jednego wymagania doświadczenia z profilem. */
export function checkExperienceRequirement(
  req: ExperienceRequirement,
  profile: CompanyQualificationProfile,
): ExperienceCheckItem {
  const projects = getProfileProjects(profile);
  const matching = filterMatchingProjects(profile, req);
  const matchingCount = matching.length;
  const largestMatch = matching.reduce(
    (max, p) => Math.max(max, p.valuePln ?? 0),
    0,
  ) || null;

  if (projects.length === 0 && !hasLegacyExperienceData(profile)) {
    const item: ExperienceCheckItem = {
      requirement: req,
      status: "UNKNOWN",
      label: req.label,
      profileNote: "Brak danych o doświadczeniu firmy w profilu wykonawcy",
      matchingProjects: 0,
      requiredProjects: req.minProjects,
      requiredValue: req.minValuePln,
      largestMatchPln: null,
    };
    traceExperienceCheck({
      requiredProjects: req.minProjects,
      requiredValue: req.minValuePln,
      matchingProjects: 0,
      status: "UNKNOWN",
    });
    return item;
  }

  if (projects.length === 0 && hasLegacyExperienceData(profile)) {
    const e = profile.experience;
    const countOk = e.similarProjectsCount != null && e.similarProjectsCount >= req.minProjects;
    const valueOk = req.minValuePln == null
      || (e.largestProjectPln != null && e.largestProjectPln >= req.minValuePln);
    if (countOk && valueOk) {
      return {
        requirement: req,
        status: "UNKNOWN",
        label: req.label,
        profileNote: "Dane zbiorcze w profilu — uzupełnij listę realizacji dla twardego dopasowania",
        matchingProjects: e.similarProjectsCount ?? 0,
        requiredProjects: req.minProjects,
        requiredValue: req.minValuePln,
        largestMatchPln: e.largestProjectPln,
      };
    }
  }

  let status: ParticipationCheckStatus;
  let profileNote: string;

  if (matchingCount >= req.minProjects) {
    status = "MATCH";
    profileNote = req.minValuePln != null
      ? `${matchingCount} realizacji spełniają warunek (≥ ${fmtPln(req.minValuePln)} zł)`
      : `${matchingCount} realizacji spełniają warunek`;
    if (largestMatch != null && largestMatch > 0) {
      profileNote += ` · największa ${fmtPln(largestMatch)} zł`;
    }
  } else if (matchingCount > 0) {
    status = "MISSING";
    profileNote = req.minValuePln != null
      ? `Wymagane ${req.minProjects} realizacji > ${fmtPln(req.minValuePln)} zł · znaleziono ${matchingCount}`
      : `Wymagane ${req.minProjects} realizacji · znaleziono ${matchingCount}`;
  } else {
    status = "MISSING";
    profileNote = req.minValuePln != null
      ? `Wymagane ${req.minProjects} realizacji > ${fmtPln(req.minValuePln)} zł · brak pasujących w profilu`
      : `Wymagane ${req.minProjects} realizacji · brak pasujących w profilu`;
  }

  traceExperienceCheck({
    requiredProjects: req.minProjects,
    requiredValue: req.minValuePln,
    matchingProjects: matchingCount,
    status,
  });

  return {
    requirement: req,
    status,
    label: req.label,
    profileNote,
    matchingProjects: matchingCount,
    requiredProjects: req.minProjects,
    requiredValue: req.minValuePln,
    largestMatchPln: largestMatch,
  };
}

/** Sprawdzenie wymogu referencji. */
export function checkReferenceRequirement(
  profile: CompanyQualificationProfile,
): { status: ParticipationCheckStatus; label: string; profileNote: string } {
  const projects = getProfileProjects(profile);
  const withRef = projects.filter((p) => p.referenceAvailable);
  if (withRef.length > 0) {
    return {
      status: "MATCH",
      label: "Referencje potwierdzone w profilu",
      profileNote: `${withRef.length} realizacji z referencją`,
    };
  }
  if (profile.references.count != null && profile.references.count > 0) {
    return {
      status: "MATCH",
      label: "Referencje w profilu",
      profileNote: `${profile.references.count} referencji w profilu`,
    };
  }
  if (projects.length === 0 && profile.references.count == null) {
    return {
      status: "UNKNOWN",
      label: "Referencje wymagane",
      profileNote: "Brak danych o referencjach w profilu firmy",
    };
  }
  return {
    status: "MISSING",
    label: "Referencje wymagane",
    profileNote: "Brak potwierdzonych referencji w profilu wykonawcy",
  };
}

/** Wszystkie wymagania doświadczenia + opcjonalne referencje. */
export function checkExperienceQualification(
  requirements: ExperienceRequirement[],
  profile: CompanyQualificationProfile,
): ExperienceCheckItem[] {
  const items = requirements.map((req) => checkExperienceRequirement(req, profile));
  const anyRefRequired = requirements.some((r) => r.referenceRequired);
  if (anyRefRequired) {
    const ref = checkReferenceRequirement(profile);
    items.push({
      requirement: {
        minProjects: 1,
        minValuePln: null,
        category: null,
        referenceRequired: true,
        periodYears: null,
        confidence: 0.9,
        label: ref.label,
      },
      status: ref.status,
      label: ref.label,
      profileNote: ref.profileNote,
      matchingProjects: 0,
      requiredProjects: 1,
      requiredValue: null,
      largestMatchPln: null,
    });
  }
  return items;
}
