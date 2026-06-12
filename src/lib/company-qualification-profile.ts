/**
 * P2-F.1 — strukturalny profil kwalifikacji wykonawcy (checkboxy + liczby).
 * Klucz chmury: kw-company-profile
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { mergeCompanyQualificationProfileForCloud } from "@/lib/tenders-sync";
import { defaultCompanyProfile, type TenderCompanyProfile } from "@/lib/tenders-bzp-company";

export const COMPANY_QUALIFICATION_PROFILE_KEY = "kw-company-profile";
export const QUALIFICATION_PROFILE_SCHEMA_VERSION = 4;

export type ExperienceReferenceStatus = "unknown" | "available" | "missing";

/** P2-F.4 — plik referencji / protokołu w storage. */
export interface ExperienceDocumentFile {
  id: string;
  filename: string;
  path: string;
  publicUrl: string;
  mimeType?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface CompanyExperienceProject {
  title: string;
  category: string;
  valuePln: number | null;
  year: number | null;
  /** P2-F.3 — domyślnie unknown; nie zakładamy referencji automatycznie. */
  referenceStatus: ExperienceReferenceStatus;
  /** Zgodność wsteczna — true tylko gdy referenceStatus === available. */
  referenceAvailable: boolean;
  /** P2-F.4 — dokumenty potwierdzające wykonanie. */
  referenceFiles: ExperienceDocumentFile[];
  protocolFiles: ExperienceDocumentFile[];
  /** P2-F.3 — powiązanie z robotą (dedupe). */
  sourceJobId?: string;
  discoveredFrom?: string;
}

export type ExperienceReferenceUiStatus = "available" | "unverified" | "missing";

export const EXPERIENCE_REFERENCE_UI: Record<
  ExperienceReferenceUiStatus,
  { emoji: string; label: string; className: string }
> = {
  available: {
    emoji: "🟢",
    label: "Referencja dostępna",
    className: "text-emerald-700 dark:text-emerald-400",
  },
  unverified: {
    emoji: "🟡",
    label: "Niezweryfikowana",
    className: "text-amber-700 dark:text-amber-400",
  },
  missing: {
    emoji: "🔴",
    label: "Brak referencji",
    className: "text-red-700 dark:text-red-400",
  },
};

export interface CompanyQualificationPersonnel {
  kierownikBudowy: boolean;
  kierownikSanitarny: boolean;
  kierownikElektryczny: boolean;
  kierownikDrogowy: boolean;
}

export interface CompanyQualificationLicenses {
  piib: boolean;
  sepE: boolean;
  sepD: boolean;
  udt: boolean;
  /** Uprawnienia budowlane (ogólnie). */
  uprawnieniaBudowlane: boolean;
}

export interface CompanyQualificationExperience {
  largestProjectPln: number | null;
  similarProjectsCount: number | null;
  yearsInBusiness: number | null;
}

export interface CompanyQualificationInsurance {
  ocPln: number | null;
}

export interface CompanyQualificationFinances {
  availableFundsPln: number | null;
}

export interface CompanyQualificationReferences {
  count: number | null;
}

export interface CompanyQualificationProfile {
  schemaVersion: number;
  personnel: CompanyQualificationPersonnel;
  licenses: CompanyQualificationLicenses;
  experience: CompanyQualificationExperience;
  /** P2-F.2 — lista realizacji do twardego dopasowania doświadczenia. */
  experienceProjects: CompanyExperienceProject[];
  insurance: CompanyQualificationInsurance;
  finances: CompanyQualificationFinances;
  references: CompanyQualificationReferences;
  updatedAt: string;
}

function seedExperienceProjects(p: TenderCompanyProfile): CompanyExperienceProject[] {
  const fromRefs = p.references
    .filter((r) => r.scope || r.client)
    .map((r) => ({
      title: r.scope?.trim() || r.client.trim(),
      category: "roboty ogólnobudowlane",
      valuePln: r.valuePln ?? null,
      year: r.year ? parseInt(String(r.year).slice(0, 4), 10) || null : null,
      referenceStatus: "available" as const,
      referenceAvailable: true,
      referenceFiles: [],
      protocolFiles: [],
    }));
  if (fromRefs.length > 0) return fromRefs;
  return [];
}

export function projectHasConfirmedReference(p: CompanyExperienceProject): boolean {
  if (p.referenceStatus === "missing" && (p.referenceFiles?.length ?? 0) === 0) return false;
  if ((p.referenceFiles?.length ?? 0) > 0) return true;
  if (p.referenceStatus === "available") return true;
  if (p.referenceStatus === "missing") return false;
  return Boolean(p.referenceAvailable);
}

export function resolveExperienceReferenceUiStatus(
  p: CompanyExperienceProject,
): ExperienceReferenceUiStatus {
  if (p.referenceStatus === "missing" && (p.referenceFiles?.length ?? 0) === 0) {
    return "missing";
  }
  if (projectHasConfirmedReference(p)) return "available";
  return "unverified";
}

function normalizeDocumentFiles(raw: ExperienceDocumentFile[] | undefined): ExperienceDocumentFile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f.filename === "string" && typeof f.publicUrl === "string")
    .map((f) => ({
      id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
      filename: String(f.filename),
      path: String(f.path ?? ""),
      publicUrl: String(f.publicUrl),
      mimeType: typeof f.mimeType === "string" ? f.mimeType : undefined,
      uploadedAt: f.uploadedAt ?? new Date().toISOString(),
      uploadedBy: typeof f.uploadedBy === "string" ? f.uploadedBy : undefined,
    }));
}

export function syncExperienceAggregates(profile: CompanyQualificationProfile): CompanyQualificationProfile {
  const projects = profile.experienceProjects ?? [];
  if (projects.length === 0) return profile;
  const values = projects.map((p) => p.valuePln).filter((v): v is number => v != null && v > 0);
  const refCount = projects.filter((p) => projectHasConfirmedReference(p)).length;
  return {
    ...profile,
    experience: {
      ...profile.experience,
      largestProjectPln: values.length ? Math.max(...values) : profile.experience.largestProjectPln,
      similarProjectsCount: projects.length,
    },
    references: {
      ...profile.references,
      count: refCount > 0 ? refCount : profile.references.count,
    },
  };
}

export function defaultCompanyQualificationProfile(
  seed?: Partial<TenderCompanyProfile>,
): CompanyQualificationProfile {
  const p = seed ?? defaultCompanyProfile();
  const brandYears = Math.max(0, new Date().getFullYear() - (p.brandSinceYear || 1989));
  const hay = [...p.licenses, ...p.strengths].join(" ").toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
  return {
    schemaVersion: QUALIFICATION_PROFILE_SCHEMA_VERSION,
    personnel: {
      kierownikBudowy: /kierownik|budow|ogolnobudowl/.test(hay),
      kierownikSanitarny: /sanitarn|instalac/.test(hay),
      kierownikElektryczny: /elektrycz|sep/.test(hay),
      kierownikDrogowy: false,
    },
    licenses: {
      piib: /izba inzynierow|diib|piib|iib/.test(hay),
      sepE: /sep/.test(hay),
      sepD: /sep/.test(hay),
      udt: /udt/.test(hay),
      uprawnieniaBudowlane: /uprawnienia budowlane|inzynierow budownictwa|diib/.test(hay),
    },
    experience: {
      largestProjectPln: p.referenceExperiencePln > 0 ? p.referenceExperiencePln : null,
      similarProjectsCount: p.referenceCount > 0 ? p.referenceCount : null,
      yearsInBusiness: brandYears > 0 ? brandYears : null,
    },
    insurance: {
      ocPln: p.ocInsuranceMinPln > 0 ? p.ocInsuranceMinPln : null,
    },
    finances: {
      availableFundsPln: null,
    },
    references: {
      count: p.referenceCount > 0 ? p.referenceCount : null,
    },
    experienceProjects: seedExperienceProjects(p),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeReferenceStatus(
  raw: Partial<CompanyExperienceProject>,
): ExperienceReferenceStatus {
  const rs = raw.referenceStatus;
  if (rs === "available" || rs === "missing" || rs === "unknown") return rs;
  if (raw.referenceAvailable) return "available";
  return "unknown";
}

function normalizeExperienceProjects(raw: CompanyExperienceProject[] | undefined): CompanyExperienceProject[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p.title === "string")
    .map((p) => {
      const referenceStatus = normalizeReferenceStatus(p);
      const referenceFiles = normalizeDocumentFiles(p.referenceFiles);
      const protocolFiles = normalizeDocumentFiles(p.protocolFiles);
      const hasRefFiles = referenceFiles.length > 0;
      const effectiveStatus: ExperienceReferenceStatus = hasRefFiles
        ? "available"
        : referenceStatus;
      return {
        title: String(p.title).trim(),
        category: String(p.category ?? "roboty ogólnobudowlane").trim(),
        valuePln: p.valuePln != null && Number.isFinite(Number(p.valuePln)) ? Number(p.valuePln) : null,
        year: p.year != null && Number.isFinite(Number(p.year)) ? Number(p.year) : null,
        referenceStatus: effectiveStatus,
        referenceAvailable: effectiveStatus === "available",
        referenceFiles,
        protocolFiles,
        sourceJobId: typeof p.sourceJobId === "string" ? p.sourceJobId : undefined,
        discoveredFrom: typeof p.discoveredFrom === "string" ? p.discoveredFrom : undefined,
      };
    })
    .filter((p) => p.title.length > 0);
}

function normalizeProfile(raw: Partial<CompanyQualificationProfile>): CompanyQualificationProfile {
  const d = defaultCompanyQualificationProfile();
  const experienceProjects = normalizeExperienceProjects(raw.experienceProjects);
  const merged: CompanyQualificationProfile = {
    schemaVersion: QUALIFICATION_PROFILE_SCHEMA_VERSION,
    personnel: { ...d.personnel, ...raw.personnel },
    licenses: { ...d.licenses, ...raw.licenses },
    experience: { ...d.experience, ...raw.experience },
    experienceProjects: experienceProjects.length > 0 ? experienceProjects : d.experienceProjects,
    insurance: { ...d.insurance, ...raw.insurance },
    finances: { ...d.finances, ...raw.finances },
    references: { ...d.references, ...raw.references },
    updatedAt: raw.updatedAt ?? d.updatedAt,
  };
  return syncExperienceAggregates(merged);
}

export function loadCompanyQualificationProfileLocal(): CompanyQualificationProfile {
  try {
    const raw = localStorage.getItem(COMPANY_QUALIFICATION_PROFILE_KEY);
    if (!raw) return defaultCompanyQualificationProfile();
    return normalizeProfile(JSON.parse(raw) as Partial<CompanyQualificationProfile>);
  } catch {
    return defaultCompanyQualificationProfile();
  }
}

export async function loadCompanyQualificationProfile(): Promise<CompanyQualificationProfile> {
  try {
    const local = loadCompanyQualificationProfileLocal();
    const [cloud] = await fetchKeysFromCloud([COMPANY_QUALIFICATION_PROFILE_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = normalizeProfile(
      mergeCompanyQualificationProfileForCloud(local, cloud) as Partial<CompanyQualificationProfile>,
    );
    localStorage.setItem(COMPANY_QUALIFICATION_PROFILE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return loadCompanyQualificationProfileLocal();
  }
}

export async function saveCompanyQualificationProfile(
  profile: CompanyQualificationProfile,
): Promise<void> {
  const synced = syncExperienceAggregates({
    ...profile,
    schemaVersion: QUALIFICATION_PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem(COMPANY_QUALIFICATION_PROFILE_KEY, JSON.stringify(synced));
  await persistKey(COMPANY_QUALIFICATION_PROFILE_KEY, synced);
}
