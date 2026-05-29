import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";

export const TENDERS_COMPANY_PROFILE_KEY = "kw-tenders-company-profile";

/** Profil firmy do porównania z wymaganiami przetargu. Edytuj w zakładce Przetargi. */
export interface TenderCompanyProfile {
  companyName: string;
  /** Regiony / miasta, w których działacie. */
  regions: string[];
  minOrderValuePln: number;
  maxOrderValuePln: number;
  /** Maks. wadium, które możecie wnieść bez problemu płynności. */
  maxWadiumPln: number;
  /** Największa pojedyncza referencja (PLN brutto). */
  referenceExperiencePln: number;
  /** Łączna wartość referencji do wykazania (PLN). */
  totalReferencesPln: number;
  referenceCount: number;
  /** Typowe minimum dni na realizację (moce zespołu). */
  minProjectDays: number;
  maxConcurrentProjects: number;
  licenses: string[];
  ocInsuranceMinPln: number;
  /** Preferowane prefiksy CPV (np. 454, 452). */
  preferredCpvPrefixes: string[];
  /** Mocne strony / specjalizacja — dopasowanie do opisu przetargu. */
  strengths: string[];
  /** Notatki wewnętrne (np. „nie bierzemy hali sportowych”). */
  notes: string;
  updatedAt: string;
}

export function defaultCompanyProfile(): TenderCompanyProfile {
  return {
    companyName: "W&G DOM",
    regions: ["Wrocław", "dolnośląskie", "Dolny Śląsk", "Wrocławia"],
    minOrderValuePln: 15_000,
    maxOrderValuePln: 3_000_000,
    maxWadiumPln: 40_000,
    referenceExperiencePln: 500_000,
    totalReferencesPln: 2_500_000,
    referenceCount: 8,
    minProjectDays: 14,
    maxConcurrentProjects: 4,
    licenses: [
      "uprawnienia budowlane",
      "remonty mieszkań i lokali",
      "prace wykończeniowe",
    ],
    ocInsuranceMinPln: 1_000_000,
    preferredCpvPrefixes: ["454", "452", "453"],
    strengths: [
      "remonty mieszkań i wnętrz",
      "modernizacje budynków mieszkalnych",
      "malowanie, podłogi, sufity",
      "Wrocław i okolice",
      "roboty dla WM, spółdzielni, TBS",
    ],
    notes: "",
    updatedAt: "",
  };
}

function normalizeProfile(raw: Partial<TenderCompanyProfile>): TenderCompanyProfile {
  const d = defaultCompanyProfile();
  return {
    companyName: typeof raw.companyName === "string" ? raw.companyName : d.companyName,
    regions: Array.isArray(raw.regions) ? raw.regions.filter(Boolean) : d.regions,
    minOrderValuePln: num(raw.minOrderValuePln, d.minOrderValuePln),
    maxOrderValuePln: num(raw.maxOrderValuePln, d.maxOrderValuePln),
    maxWadiumPln: num(raw.maxWadiumPln, d.maxWadiumPln),
    referenceExperiencePln: num(raw.referenceExperiencePln, d.referenceExperiencePln),
    totalReferencesPln: num(raw.totalReferencesPln, d.totalReferencesPln),
    referenceCount: num(raw.referenceCount, d.referenceCount),
    minProjectDays: num(raw.minProjectDays, d.minProjectDays),
    maxConcurrentProjects: num(raw.maxConcurrentProjects, d.maxConcurrentProjects),
    licenses: Array.isArray(raw.licenses) ? raw.licenses.filter(Boolean) : d.licenses,
    ocInsuranceMinPln: num(raw.ocInsuranceMinPln, d.ocInsuranceMinPln),
    preferredCpvPrefixes: Array.isArray(raw.preferredCpvPrefixes)
      ? raw.preferredCpvPrefixes.filter(Boolean)
      : d.preferredCpvPrefixes,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter(Boolean) : d.strengths,
    notes: typeof raw.notes === "string" ? raw.notes : d.notes,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function loadCompanyProfileLocal(): TenderCompanyProfile {
  try {
    const raw = localStorage.getItem(TENDERS_COMPANY_PROFILE_KEY);
    if (!raw) return defaultCompanyProfile();
    return normalizeProfile(JSON.parse(raw) as Partial<TenderCompanyProfile>);
  } catch {
    return defaultCompanyProfile();
  }
}

export async function loadCompanyProfile(): Promise<TenderCompanyProfile> {
  try {
    const [cloud] = await fetchKeysFromCloud([TENDERS_COMPANY_PROFILE_KEY]);
    if (cloud && typeof cloud === "object") {
      const p = normalizeProfile(cloud as Partial<TenderCompanyProfile>);
      localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(p));
      return p;
    }
  } catch { /* offline */ }
  return loadCompanyProfileLocal();
}

export async function saveCompanyProfile(profile: TenderCompanyProfile): Promise<void> {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(next));
  await persistKey(TENDERS_COMPANY_PROFILE_KEY, next);
}
