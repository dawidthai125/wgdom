/**
 * P2-F.5 — selekcja realizacji pod wykaz robót budowlanych (SWZ ↔ profil wykonawcy).
 */

import type {
  CompanyExperienceProject,
  CompanyQualificationProfile,
  ExperienceReferenceUiStatus,
} from "@/lib/company-qualification-profile";
import {
  projectHasConfirmedReference,
  resolveExperienceReferenceUiStatus,
} from "@/lib/company-qualification-profile";
import { getMatchingExperienceProjects } from "@/lib/tender-experience-check";
import type { ExperienceRequirement } from "@/lib/tender-experience-requirements";

export interface WorksRegisterEntry {
  projectName: string;
  category: string;
  valuePln: number | null;
  completionDate: string | null;
  referenceStatus: ExperienceReferenceUiStatus;
  investorName: string | null;
  notes: string | null;
}

export interface WorksRegister {
  generatedAt: string;
  tenderId: string;
  entries: WorksRegisterEntry[];
}

export interface RecommendedProject {
  project: CompanyExperienceProject;
  reason: string;
  referenceLabel: string;
  referenceUi: ExperienceReferenceUiStatus;
}

export interface ProjectSelectionResult {
  requirement: ExperienceRequirement | null;
  recommended: RecommendedProject[];
  allMatching: CompanyExperienceProject[];
  requiredCount: number;
}

const REFERENCE_LABEL: Record<ExperienceReferenceUiStatus, string> = {
  available: "🟢 Referencja dostępna",
  unverified: "🟡 Niezweryfikowana",
  missing: "🔴 Brak referencji",
};

export function traceWorksRegister(detail: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[WORKS REGISTER TRACE]", detail);
  }
}

function pickPrimaryExperienceRequirement(
  requirements: ExperienceRequirement[],
): ExperienceRequirement | null {
  if (requirements.length === 0) return null;
  const experienceReqs = requirements.filter((r) => !r.referenceRequired || r.minValuePln != null || r.minProjects > 1);
  const pool = experienceReqs.length > 0 ? experienceReqs : requirements;
  return [...pool].sort((a, b) => {
    const valDiff = (b.minValuePln ?? 0) - (a.minValuePln ?? 0);
    if (valDiff !== 0) return valDiff;
    return b.minProjects - a.minProjects;
  })[0] ?? null;
}

function parseInvestorFromTitle(title: string): string | null {
  const parts = title.split(" — ");
  if (parts.length >= 2 && parts[0].trim().length >= 3) return parts[0].trim();
  return null;
}

function completionDateFromProject(project: CompanyExperienceProject): string | null {
  if (project.year != null) return `31.12.${project.year}`;
  return null;
}

export function projectToWorksRegisterEntry(project: CompanyExperienceProject): WorksRegisterEntry {
  const referenceUi = resolveExperienceReferenceUiStatus(project);
  const refNote = projectHasConfirmedReference(project)
    ? "Referencja w profilu"
    : referenceUi === "missing"
      ? "Brak referencji w profilu"
      : "Referencja niezweryfikowana";

  return {
    projectName: project.title,
    category: project.category,
    valuePln: project.valuePln,
    completionDate: completionDateFromProject(project),
    referenceStatus: referenceUi,
    investorName: parseInvestorFromTitle(project.title),
    notes: refNote,
  };
}

/** Wybierz realizacje spełniające wymóg SWZ (sortowanie: wartość malejąco, limit = minProjects). */
export function selectProjectsForTender(
  experienceRequirements: ExperienceRequirement[],
  profile: CompanyQualificationProfile,
): ProjectSelectionResult {
  const requirement = pickPrimaryExperienceRequirement(experienceRequirements);
  if (!requirement) {
    return { requirement: null, recommended: [], allMatching: [], requiredCount: 0 };
  }

  const allMatching = getMatchingExperienceProjects(profile, requirement)
    .sort((a, b) => (b.valuePln ?? 0) - (a.valuePln ?? 0));

  const requiredCount = Math.max(requirement.minProjects, 1);
  const selected = allMatching.slice(0, requiredCount);

  const recommended: RecommendedProject[] = selected.map((project) => {
    const referenceUi = resolveExperienceReferenceUiStatus(project);
    return {
      project,
      reason: "Spełnia warunek doświadczenia",
      referenceLabel: REFERENCE_LABEL[referenceUi],
      referenceUi,
    };
  });

  traceWorksRegister({
    requiredProjects: requiredCount,
    selectedProjects: selected.length,
    matchingTotal: allMatching.length,
    minValuePln: requirement.minValuePln,
  });

  return {
    requirement,
    recommended,
    allMatching,
    requiredCount,
  };
}

export function buildWorksRegister(
  tenderId: string,
  selection: ProjectSelectionResult,
): WorksRegister {
  return {
    generatedAt: new Date().toISOString(),
    tenderId,
    entries: selection.recommended.map((r) => projectToWorksRegisterEntry(r.project)),
  };
}

export function fmtRegisterValuePln(n: number | null): string {
  if (n == null || n <= 0) return "—";
  return `${n.toLocaleString("pl-PL")} zł`;
}

export function referenceStatusPdfLabel(status: ExperienceReferenceUiStatus): string {
  if (status === "available") return "Tak";
  if (status === "missing") return "Brak";
  return "Niezweryfikowana";
}

/** Wiersze tabeli wykazu (testy + generatory PDF/DOCX). */
export function buildWorksRegisterTableRows(register: WorksRegister): string[][] {
  return register.entries.map((e, i) => [
    String(i + 1),
    e.projectName,
    e.category,
    fmtRegisterValuePln(e.valuePln),
    e.completionDate ?? "—",
    referenceStatusPdfLabel(e.referenceStatus),
    e.notes ?? "—",
  ]);
}
