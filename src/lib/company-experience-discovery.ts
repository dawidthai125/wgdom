/**
 * P2-F.3 — automatyczne odkrywanie realizacji z danych WGDOM (Roboty, faktury, kosztorysy).
 */

import type { Job } from "@/app/app-domain";
import type {
  CompanyExperienceProject,
  CompanyQualificationProfile,
} from "@/lib/company-qualification-profile";
import { syncExperienceAggregates } from "@/lib/company-qualification-profile";
import { parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { parsePlnAmount } from "@/lib/tenders-bzp-swz";

export type DiscoveredProjectSource =
  | "roboty"
  | "dokumenty"
  | "kosztorys"
  | "faktury"
  | "archiwum"
  | "wycena";

export interface DiscoveredProject {
  id: string;
  source: DiscoveredProjectSource;
  title: string;
  valuePln: number | null;
  category: string;
  startDate: string | null;
  endDate: string | null;
  confidence: number;
  /** Powiązana robota (dedupe). */
  jobId?: string;
}

export interface TenderKosztorysHint {
  totalValue?: string | null;
  currency?: string | null;
}

export interface DiscoverCompanyExperienceOptions {
  /** jobId → kosztorys końcowy (np. ATH z przetargu powiązanego z robotą). */
  tenderKosztorysByJobId?: Record<string, TenderKosztorysHint>;
  /** linkedTenderId → wartość umowy / wycena z pipeline przetargów. */
  tenderContractValueById?: Record<string, number>;
  minConfidence?: number;
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

function normalizeTitleKey(title: string): string {
  return fold(title).replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/** Klasyfikacja typu robót na podstawie nazwy, notatek i materiałów. */
export function classifyProjectCategory(text: string): string {
  const h = fold(text);
  if (/elektrycz|instalac.*elektr|sep\b|oswietlen/.test(h)) return "elektryczne";
  if (/sanitarn|hydraul|instalac.*wod|kanaliz|co\b|grzewcz/.test(h)) return "sanitarne";
  if (/drogow|nawierzchni|asfalt|chodnik/.test(h)) return "drogowe";
  if (/bruk|kostka brukowa|chodnik beton/.test(h)) return "brukarskie";
  if (/dach|dekarsk|pokryc.*dach|rynna/.test(h)) return "dekarskie";
  if (/wykończen|malow|gladz|podlog|glazur|laminat|tynk/.test(h)) return "wykończeniowe";
  if (/remont|modernizac|przebudow|odnow/.test(h)) return "remontowe";
  if (/budowl|ogolnobudowl|konstrukcj|murow/.test(h)) return "roboty ogólnobudowlane";
  return "roboty ogólnobudowlane";
}

function buildJobTitle(job: Job): string {
  const addr = [job.address, job.flatNumber].filter(Boolean).join(" ").trim();
  const client = (job.client || "").trim();
  const notesLine = (job.notes || "").split("\n").map((l) => l.trim()).find((l) => l.length >= 8);
  if (notesLine && notesLine.length <= 120) return notesLine;
  if (addr && client) return `${client} — ${addr}`;
  if (addr) return `Remont ${addr}`;
  if (client) return client;
  return "Realizacja robót budowlanych";
}

function parsePlnFromText(text: string): number | null {
  if (!text?.trim()) return null;
  const kosztorysCtx = text.match(
    /(?:kosztorys|warto[sś]ć(?:\s+(?:rob[oó]t|umowy|całkowita|netto|brutto))?|razem|suma)[^.\n]{0,80}?([\d\s.,]+)\s*(?:zł|pln)/gi,
  );
  if (kosztorysCtx) {
    for (const m of kosztorysCtx) {
      const num = m.match(/([\d\s.,]+)\s*(?:zł|pln)/i);
      if (num) {
        const v = parsePlnAmount(num[1]).value;
        if (v != null && v > 0) return v;
      }
    }
  }
  const amounts = [...text.matchAll(/([\d\s.,]+)\s*(?:zł|pln)/gi)];
  let best: number | null = null;
  for (const m of amounts) {
    const v = parsePlnAmount(m[1]).value;
    if (v != null && v >= 10_000 && (best == null || v > best)) best = v;
  }
  return best;
}

function estimateLaborAndMaterialsPln(job: Job): number | null {
  let sum = 0;
  for (const w of job.workEntries ?? []) {
    sum += (w.hours || 0) * (w.rate || 0);
  }
  for (const m of job.materials ?? []) {
    sum += m.cost || 0;
  }
  if (sum <= 0) return null;
  return Math.round(sum * 1.15);
}

function jobHasKosztorysFile(job: Job): boolean {
  if (job.documents?.kosztorys) return true;
  return (job.jobFiles ?? []).some((f) => f.kind === "kosztorys");
}

function jobHasZlecenieFile(job: Job): boolean {
  if (job.documents?.zlecenie) return true;
  return (job.jobFiles ?? []).some((f) => f.kind === "zlecenie");
}

interface ResolvedValue {
  valuePln: number | null;
  source: DiscoveredProjectSource;
  confidence: number;
}

/** Priorytet: kosztorys końcowy → faktury → umowa → wycena → fallback. */
export function resolveJobExperienceValue(
  job: Job,
  options?: DiscoverCompanyExperienceOptions,
): ResolvedValue {
  const hints = options?.tenderKosztorysByJobId?.[job.id];
  if (hints?.totalValue) {
    const fromAth = parsePlnFromKosztorysTotal(hints.totalValue, hints.currency);
    if (fromAth != null && fromAth > 0) {
      return { valuePln: fromAth, source: "kosztorys", confidence: 0.92 };
    }
  }

  const notesValue = parsePlnFromText(job.notes ?? "");
  if (notesValue != null && jobHasKosztorysFile(job)) {
    return { valuePln: notesValue, source: "kosztorys", confidence: 0.9 };
  }

  const invoicePln = parseFloat(String(job.invoiceAmount ?? "").replace(/\s/g, "").replace(",", "."));
  if (Number.isFinite(invoicePln) && invoicePln > 0) {
    const conf = job.invoiceStatus === "paid" ? 0.92 : 0.88;
    return { valuePln: Math.round(invoicePln), source: "faktury", confidence: conf };
  }

  if (job.linkedTenderId && options?.tenderContractValueById?.[job.linkedTenderId]) {
    const contract = options.tenderContractValueById[job.linkedTenderId]!;
    if (contract > 0) {
      return { valuePln: contract, source: "dokumenty", confidence: 0.85 };
    }
  }

  if (notesValue != null) {
    return { valuePln: notesValue, source: "dokumenty", confidence: 0.78 };
  }

  const estimate = estimateLaborAndMaterialsPln(job);
  if (estimate != null && estimate >= 5000) {
    return { valuePln: estimate, source: "wycena", confidence: 0.65 };
  }

  if (jobHasKosztorysFile(job) || jobHasZlecenieFile(job)) {
    return { valuePln: null, source: "dokumenty", confidence: 0.4 };
  }

  return { valuePln: null, source: "roboty", confidence: 0.3 };
}

function yearFromDate(iso: string | undefined | null): number | null {
  if (!iso?.trim()) return null;
  const y = parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) && y >= 1990 && y <= 2100 ? y : null;
}

function isEligibleJob(job: Job): boolean {
  if (job.status === "completed") return true;
  const inv = parseFloat(String(job.invoiceAmount ?? "0").replace(",", "."));
  if (Number.isFinite(inv) && inv > 0) return true;
  if (jobHasKosztorysFile(job) && (job.notes?.trim().length ?? 0) > 0) return true;
  return false;
}

export function traceExperienceDiscovery(detail: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[EXPERIENCE DISCOVERY TRACE]", detail);
  }
}

/** Czy odkryta realizacja pokrywa się z wpisem w profilu (nazwa + wartość + okres). */
export function isDuplicateExperienceProject(
  discovered: Pick<DiscoveredProject, "title" | "valuePln" | "startDate" | "endDate" | "jobId">,
  existing: CompanyExperienceProject[],
): boolean {
  const dKey = normalizeTitleKey(discovered.title);
  const dYear = yearFromDate(discovered.endDate) ?? yearFromDate(discovered.startDate);

  for (const e of existing) {
    if (discovered.jobId && e.sourceJobId === discovered.jobId) return true;
    const eKey = normalizeTitleKey(e.title);
    const nameMatch = dKey === eKey
      || (dKey.length >= 8 && eKey.includes(dKey))
      || (eKey.length >= 8 && dKey.includes(eKey));
    if (!nameMatch) continue;

    const valMatch = discovered.valuePln != null && e.valuePln != null
      && Math.abs(discovered.valuePln - e.valuePln) / Math.max(discovered.valuePln, e.valuePln, 1) <= 0.05;
    const yearMatch = dYear == null || e.year == null || dYear === e.year;
    if (valMatch && yearMatch) return true;
  }
  return false;
}

export function discoveredToExperienceProject(d: DiscoveredProject): CompanyExperienceProject {
  return {
    title: d.title,
    category: d.category,
    valuePln: d.valuePln,
    year: yearFromDate(d.endDate) ?? yearFromDate(d.startDate),
    referenceStatus: "unknown",
    referenceAvailable: false,
    referenceFiles: [],
    protocolFiles: [],
    sourceJobId: d.jobId,
    discoveredFrom: d.source,
  };
}

/** Zatwierdzenie odkrytej realizacji — bez auto-zapisu poza wywołaniem save w UI. */
export function approveDiscoveredProject(
  profile: CompanyQualificationProfile,
  discovered: DiscoveredProject,
): CompanyQualificationProfile {
  if (isDuplicateExperienceProject(discovered, profile.experienceProjects ?? [])) {
    return profile;
  }
  const next = {
    ...profile,
    experienceProjects: [
      ...(profile.experienceProjects ?? []),
      discoveredToExperienceProject(discovered),
    ],
  };
  traceExperienceDiscovery({
    project: discovered.title,
    value: discovered.valuePln,
    category: discovered.category,
    confidence: discovered.confidence,
    source: discovered.source,
    action: "approved",
  });
  return syncExperienceAggregates(next);
}

export function discoverProjectFromJob(
  job: Job,
  options?: DiscoverCompanyExperienceOptions,
): DiscoveredProject | null {
  if (!isEligibleJob(job)) return null;

  const { valuePln, source, confidence } = resolveJobExperienceValue(job, options);
  const minConf = options?.minConfidence ?? 0.5;
  if (valuePln == null || valuePln <= 0) return null;
  if (confidence < minConf) return null;

  const hay = [
    buildJobTitle(job),
    job.notes,
    job.address,
    job.client,
    ...(job.materials ?? []).map((m) => m.description),
  ].join(" ");

  const discovered: DiscoveredProject = {
    id: `disc-${job.id}`,
    source: job.status === "completed" && !job.endDate ? "archiwum" : source,
    title: buildJobTitle(job),
    valuePln,
    category: classifyProjectCategory(hay),
    startDate: job.startDate || null,
    endDate: job.endDate || null,
    confidence,
    jobId: job.id,
  };

  if (discovered.source === "archiwum" && source !== "archiwum") {
    discovered.source = source;
  }

  traceExperienceDiscovery({
    project: discovered.title,
    value: discovered.valuePln,
    category: discovered.category,
    confidence: discovered.confidence,
    source: discovered.source,
  });

  return discovered;
}

/** Odkryj realizacje z listy robót; pomija duplikaty względem profilu. */
export function discoverCompanyExperience(
  jobs: Job[],
  profile: CompanyQualificationProfile,
  options?: DiscoverCompanyExperienceOptions,
): DiscoveredProject[] {
  const existing = profile.experienceProjects ?? [];
  const out: DiscoveredProject[] = [];
  const seenJobIds = new Set<string>();

  for (const job of jobs) {
    if (seenJobIds.has(job.id)) continue;
    const d = discoverProjectFromJob(job, options);
    if (!d) continue;
    if (isDuplicateExperienceProject(d, existing)) continue;
    if (out.some((x) => x.jobId === d.jobId)) continue;
    seenJobIds.add(job.id);
    out.push(d);
  }

  out.sort((a, b) => (b.valuePln ?? 0) - (a.valuePln ?? 0));
  return out;
}

/** Wczytaj roboty z localStorage (panel profilu). */
export function loadJobsForExperienceDiscovery(): Job[] {
  try {
    const raw = localStorage.getItem("kw-jobs");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Job[] : [];
  } catch {
    return [];
  }
}

export function fmtDiscoveredValuePln(n: number | null): string {
  if (n == null || n <= 0) return "—";
  return `${n.toLocaleString("pl-PL")} zł`;
}
