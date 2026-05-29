import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";

export const TENDERS_COMPANY_PROFILE_KEY = "kw-tenders-company-profile";
export const PROFILE_SCHEMA_VERSION = 4;

/** Parametry kosztowe do wyliczania oferty przetargowej. */
export interface TenderCompanyCostModel {
  /** Etaty / stała załoga (np. 15). */
  headcount: number;
  /** Ile osób średnio pracuje jednocześnie na budowach. */
  activeWorkersOnSite: number;
  /** Średnia stawka brutto rbh (Wrocław, remonty). */
  avgGrossHourlyPln: number;
  /** Składki pracodawcy + urlopy/chorobowe (% od brutto). */
  employerBurdenPct: number;
  /** Stałe miesięczne: biuro, flota, admin, ubezp., narzędzia. */
  fixedOverheadMonthlyPln: number;
  /** Indeks cen materiałów vs norma ATH (%). */
  materialPriceIndexPct: number;
  /** Indeks kosztu rbh vs norma ATH (%). */
  laborNormIndexPct: number;
  /** Koszty pośrednie Kp (% od direct). */
  kpPct: number;
  /** Docelowy zysk (% od direct+Kp+stałe). */
  profitPct: number;
  /** Rezerwa ryzyka (%). */
  riskReservePct: number;
  /** Minimalna marża nad kosztem własnym (%). */
  minMarginPct: number;
  /** Przy 100% ceny — ile % poniżej wartości ref. startować. */
  targetPriceDiscountPct: number;
}

export function defaultCostModel(): TenderCompanyCostModel {
  return {
    headcount: 15,
    activeWorkersOnSite: 11,
    avgGrossHourlyPln: 42,
    employerBurdenPct: 23,
    fixedOverheadMonthlyPln: 52_000,
    materialPriceIndexPct: 108,
    laborNormIndexPct: 115,
    kpPct: 12,
    profitPct: 7,
    riskReservePct: 3,
    minMarginPct: 4,
    targetPriceDiscountPct: 2,
  };
}

export interface TenderCompanyReference {
  client: string;
  scope: string;
  year?: string;
  valuePln?: number | null;
  source?: string;
}

/** Profil firmy do porównania z wymaganiami przetargu. Edytuj w zakładce Przetargi. */
export interface TenderCompanyProfile {
  profileSchemaVersion: number;
  companyName: string;
  ownerName: string;
  formerOwnerNote: string;
  nip: string;
  regon: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  brandSinceYear: number;
  vatRegisteredSince: string;
  regions: string[];
  minOrderValuePln: number;
  maxOrderValuePln: number;
  maxWadiumPln: number;
  referenceExperiencePln: number;
  totalReferencesPln: number;
  referenceCount: number;
  minProjectDays: number;
  maxConcurrentProjects: number;
  licenses: string[];
  ocInsuranceMinPln: number;
  preferredCpvPrefixes: string[];
  strengths: string[];
  references: TenderCompanyReference[];
  tenderWins: TenderCompanyReference[];
  tenderParticipations: TenderCompanyReference[];
  /** Model kosztów ofertowych (robocizna, ZUS, stałe). */
  costModel: TenderCompanyCostModel;
  notes: string;
  updatedAt: string;
}

export function defaultCompanyProfile(): TenderCompanyProfile {
  return {
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    companyName: "W&G DOM",
    ownerName: "Iwona Schabowska-Wałek",
    formerOwnerNote:
      "Marka W&G od maja 1989 (rodzinna firma remontowo-budowlana). Wcześniej JDG Stanisław Wałek — "
      + "przejście na emeryturę, kontynuacja pod Iwoną Schabowska-Wałek (NIP 8991736797 od 2014). "
      + "Stanisław Wałek nadal wspiera operacyjnie, relacje i renomę firmy.",
    nip: "8991736797",
    regon: "931121728",
    address: "ul. Poświęcka 19, 51-128 Wrocław",
    phone: "518-892-270",
    email: "kontakt@wgdom.pl",
    website: "https://www.wgdom.pl",
    brandSinceYear: 1989,
    vatRegisteredSince: "2014-08-01",
    regions: ["Wrocław", "dolnośląskie", "Dolny Śląsk", "Wrocławia"],
    minOrderValuePln: 25_000,
    maxOrderValuePln: 2_500_000,
    maxWadiumPln: 60_000,
    referenceExperiencePln: 983_310,
    totalReferencesPln: 6_500_000,
    referenceCount: 15,
    minProjectDays: 14,
    maxConcurrentProjects: 4,
    licenses: [
      "współpracownicy w Dolnośląskiej Izbie Inżynierów Budownictwa",
      "uprawnienia SEP Wrocław (elektrycy)",
      "roboty ogólnobudowlane i wykończeniowe",
      "remonty mieszkań, domów i lokali użytkowych",
      "wykończenia pod klucz",
      "roboty dekarskie, brukarskie, instalacyjne",
    ],
    ocInsuranceMinPln: 1_000_000,
    preferredCpvPrefixes: ["450", "451", "452", "453", "454", "507"],
    strengths: [
      "remonty mieszkań i wnętrz pod klucz",
      "modernizacje budynków mieszkalnych i użyteczności publicznej",
      "malowanie, tynki, podłogi, glazura, gładzie",
      "wymiana instalacji c.o., elektrycznych i sanitarnych",
      "roboty dla instytucji publicznych we Wrocławiu",
      "MOPS Wrocław — wygrana Kamieńskiego 2025, udział Owsiana 2024",
      "ZUS, PKO, UWr, DOZG — referencje",
      "Wrocław i okolice — kilkadziesiąt obiektów od 1989",
      "WM, spółdzielnie, TBS, wspólnoty",
    ],
    references: [
      {
        client: "ZUS Wrocław",
        scope: "Roboty dekarskie i wymiana instalacji c.o., budynek ul. Pretficza",
        source: "wgdom.pl",
      },
      {
        client: "Bank PKO SA",
        scope: "Wymiana instalacji c.o., ul. Oławska Wrocław",
        source: "wgdom.pl",
      },
      {
        client: "Uniwersytet Wrocławski",
        scope: "Prace remontowe w budynku Uczelni",
        source: "wgdom.pl",
      },
      {
        client: "DOZG Wrocław",
        scope: "Parkingi ul. Ziębicka i Gazowa",
        source: "wgdom.pl",
      },
      {
        client: "Inwestycja mieszkaniowa Wrocław",
        scope: "Osiedle domów szeregowych ul. Wańkowicza",
        source: "wgdom.pl",
      },
      {
        client: "Inwestycja mieszkaniowa Wrocław",
        scope: "Osiedle domów jednorodzinnych ul. Jutrzenki",
        source: "wgdom.pl",
      },
    ],
    tenderWins: [
      {
        client: "MOPS Wrocław",
        scope:
          "Przebudowa 16 lokali — Pensjonat ul. Kamieńskiego 190 (130 dni, 3 oferty, 100% cena)",
        year: "2025",
        valuePln: 983_310,
        source: "BZP 2025/BZP 00390721 — umowa 2025-08-06, 983 309,93 zł",
      },
    ],
    tenderParticipations: [
      {
        client: "MOPS Wrocław",
        scope:
          "Modernizacja ul. Owsianej 4/6 — centrum przeciwdziałania przemocy domowej, Etap I (oferta złożona)",
        year: "2024",
        valuePln: 615_000,
        source:
          "BIP MOPS — otwarcie ofert 21.10.2024 (5 ofert; budżet 652 466 zł; nie wybrano)",
      },
      {
        client: "MPWiK Wrocław",
        scope:
          "Prace konserwacyjno-remontowe budynków MPWiK (oferta 23,10 zł/rbh, 13. z 17 ofert)",
        year: "2012",
        source: "mpwik.wroc.pl — Stanisław Wałek W&G Dom, ul. Poświęcka 19",
      },
    ],
    costModel: defaultCostModel(),
    notes:
      "Dane rejestrowe: NIP 8991736797, REGON 931121728, VAT czynny (MF). "
      + "Ciągłość marki W&G od 1989 (wgdom.pl). "
      + "Publiczne BZP: 1 wygrana (MOPS Kamieńskiego 2025). "
      + "Udziały: MOPS Owsiana 2024, MPWiK 2012 (Stanisław Wałek). "
      + "Brak innych wpisów w eGospodarka „kto wygrał” dla REGON 931121728. "
      + "Uzupełnij kwoty referencji prywatnych, jeśli SWZ wymaga wyższych progów.",
    updatedAt: "",
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRefs(raw: unknown, fallback: TenderCompanyReference[]): TenderCompanyReference[] {
  if (!Array.isArray(raw)) return fallback;
  const out: TenderCompanyReference[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<TenderCompanyReference>;
    if (typeof r.client !== "string" || !r.client.trim()) continue;
    out.push({
      client: r.client.trim(),
      scope: typeof r.scope === "string" ? r.scope.trim() : "",
      year: typeof r.year === "string" ? r.year : undefined,
      valuePln: r.valuePln != null ? num(r.valuePln, 0) : undefined,
      source: typeof r.source === "string" ? r.source : undefined,
    });
  }
  return out.length > 0 ? out : fallback;
}

function normalizeCostModel(raw: Partial<TenderCompanyCostModel> | undefined): TenderCompanyCostModel {
  const d = defaultCostModel();
  if (!raw || typeof raw !== "object") return d;
  return {
    headcount: num(raw.headcount, d.headcount),
    activeWorkersOnSite: num(raw.activeWorkersOnSite, d.activeWorkersOnSite),
    avgGrossHourlyPln: num(raw.avgGrossHourlyPln, d.avgGrossHourlyPln),
    employerBurdenPct: num(raw.employerBurdenPct, d.employerBurdenPct),
    fixedOverheadMonthlyPln: num(raw.fixedOverheadMonthlyPln, d.fixedOverheadMonthlyPln),
    materialPriceIndexPct: num(raw.materialPriceIndexPct, d.materialPriceIndexPct),
    laborNormIndexPct: num(raw.laborNormIndexPct, d.laborNormIndexPct),
    kpPct: num(raw.kpPct, d.kpPct),
    profitPct: num(raw.profitPct, d.profitPct),
    riskReservePct: num(raw.riskReservePct, d.riskReservePct),
    minMarginPct: num(raw.minMarginPct, d.minMarginPct),
    targetPriceDiscountPct: num(raw.targetPriceDiscountPct, d.targetPriceDiscountPct),
  };
}

function normalizeProfile(raw: Partial<TenderCompanyProfile>): TenderCompanyProfile {
  const d = defaultCompanyProfile();
  const version = raw.profileSchemaVersion ?? 1;
  if (version < PROFILE_SCHEMA_VERSION) {
    return {
      ...d,
      costModel: normalizeCostModel(raw.costModel as Partial<TenderCompanyCostModel> | undefined),
      notes: raw.notes?.trim() ? raw.notes : d.notes,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    };
  }
  return {
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    companyName: typeof raw.companyName === "string" ? raw.companyName : d.companyName,
    ownerName: typeof raw.ownerName === "string" ? raw.ownerName : d.ownerName,
    formerOwnerNote: typeof raw.formerOwnerNote === "string" ? raw.formerOwnerNote : d.formerOwnerNote,
    nip: typeof raw.nip === "string" ? raw.nip : d.nip,
    regon: typeof raw.regon === "string" ? raw.regon : d.regon,
    address: typeof raw.address === "string" ? raw.address : d.address,
    phone: typeof raw.phone === "string" ? raw.phone : d.phone,
    email: typeof raw.email === "string" ? raw.email : d.email,
    website: typeof raw.website === "string" ? raw.website : d.website,
    brandSinceYear: num(raw.brandSinceYear, d.brandSinceYear),
    vatRegisteredSince: typeof raw.vatRegisteredSince === "string" ? raw.vatRegisteredSince : d.vatRegisteredSince,
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
    references: normalizeRefs(raw.references, d.references),
    tenderWins: normalizeRefs(raw.tenderWins, d.tenderWins),
    tenderParticipations: normalizeRefs(raw.tenderParticipations, d.tenderParticipations),
    costModel: normalizeCostModel(raw.costModel as Partial<TenderCompanyCostModel> | undefined),
    notes: typeof raw.notes === "string" ? raw.notes : d.notes,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export function profileKnownBuyerKeywords(profile: TenderCompanyProfile): string[] {
  const words = new Set<string>();
  const all = [...profile.references, ...profile.tenderWins, ...profile.tenderParticipations];
  for (const ref of all) {
    for (const w of ref.client.split(/[\s,./-]+/)) {
      const t = w.trim().toLowerCase();
      if (t.length >= 4) words.add(t);
    }
  }
  for (const s of ["mops", "zus", "mpwik", "dożg", "gmina", "uniwersytet", "pko", "wrocław"]) {
    words.add(s);
  }
  return [...words];
}

export function loadCompanyProfileLocal(): TenderCompanyProfile {
  try {
    const raw = localStorage.getItem(TENDERS_COMPANY_PROFILE_KEY);
    if (!raw) return defaultCompanyProfile();
    const parsed = JSON.parse(raw) as Partial<TenderCompanyProfile>;
    const p = normalizeProfile(parsed);
    if ((parsed.profileSchemaVersion ?? 1) < PROFILE_SCHEMA_VERSION) {
      localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(p));
    }
    return p;
  } catch {
    return defaultCompanyProfile();
  }
}

export async function loadCompanyProfile(): Promise<TenderCompanyProfile> {
  try {
    const [cloud] = await fetchKeysFromCloud([TENDERS_COMPANY_PROFILE_KEY]);
    if (cloud && typeof cloud === "object") {
      const parsed = cloud as Partial<TenderCompanyProfile>;
      const p = normalizeProfile(parsed);
      localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(p));
      if ((parsed.profileSchemaVersion ?? 1) < PROFILE_SCHEMA_VERSION) {
        await persistKey(TENDERS_COMPANY_PROFILE_KEY, p);
      }
      return p;
    }
  } catch { /* offline */ }
  return loadCompanyProfileLocal();
}

export async function saveCompanyProfile(profile: TenderCompanyProfile): Promise<void> {
  const next = {
    ...profile,
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(TENDERS_COMPANY_PROFILE_KEY, JSON.stringify(next));
  await persistKey(TENDERS_COMPANY_PROFILE_KEY, next);
}
