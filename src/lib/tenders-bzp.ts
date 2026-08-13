import { fetchKeysFromCloud, persistKey, API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import {
  addDeletedTenderId,
  getDeletedTenderIds,
  mergeTenderPipelineForCloud,
  TENDERS_DELETED_IDS_KEY,
} from "@/lib/tenders-sync";
import { patchPipelineSessionCache } from "@/lib/tenders-pipeline-session-cache";
import { mergeTenderDossierByQuality } from "@/lib/tender-dossier-merge";
import {
  matchTenderKeywords,
  isExcludedTenderTitle,
  hasRenovationSignal,
  TENDER_PRIORITY_BUILDING_HINTS,
} from "@/lib/tenders-bzp-keywords";
import {
  getMergedActionKeywords,
  getMergedScopeKeywords,
  getMergedExcludeKeywords,
  loadCustomKeywordsLocal,
  loadCustomKeywords,
  type TendersCustomKeywords,
} from "@/lib/tenders-bzp-learn";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { isKosztorysUploadFilename, type JobFileAttachment } from "@/lib/job-documents";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { displayTenderFilename } from "@/lib/tenders-bzp-filename";
import {
  getTenderDocumentBytesCached,
  setTenderDocumentBytesCached,
  tenderDocumentBytesCacheKey,
} from "@/lib/tender-document-bytes-cache";
import { recordTenderDocumentFetch } from "@/lib/tender-pipeline-metrics";
import {
  getPipelineColdMemory,
  hydratePipelineColdFromIdb,
  resolvePipelineLocalWithCold,
  setPipelineColdMemory,
  stripTenderPipelineForLocalStorage,
} from "@/lib/storage/tenders-pipeline-cold";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

export const TENDERS_PIPELINE_KEY = "kw-tenders-pipeline";

export type TenderPipelineStatus =
  | "new"
  | "seen"
  | "interested"
  | "preparing"
  | "submitted"
  | "won"
  | "lost"
  | "ignored";

export interface BzpNoticeRaw {
  objectId?: string;
  bzpNumber?: string;
  noticeNumber?: string;
  orderObject?: string;
  organizationName?: string;
  organizationCity?: string;
  organizationProvince?: string;
  cpvCode?: string;
  publicationDate?: string;
  submittingOffersDate?: string | null;
  orderType?: string;
  tenderId?: string;
  moIdentifier?: string;
  tenderState?: string;
}

export interface TenderBzpDocument {
  index: number;
  documentId: string;
  filename: string;
  contentType: string;
  downloadUrl: string;
  isSwzHint: boolean;
  /** P2-A.3 — źródło poza readmodels (logintrade itd.). */
  platform?: string;
  sourcePageUrl?: string;
}

export interface TenderUploadedFile {
  id: string;
  filename: string;
  path: string;
  publicUrl: string;
  uploadedAt: string;
}

export interface TenderPipelineItem {
  id: string;
  bzpNumber: string;
  noticeNumber: string;
  title: string;
  organizationName: string;
  organizationCity: string;
  organizationProvince: string;
  cpvCode: string;
  publicationDate: string;
  submittingOffersDate: string | null;
  orderType: string;
  tenderId: string;
  moIdentifier: string;
  status: TenderPipelineStatus;
  notes: string;
  relevanceScore: number;
  matchedKeywords: string[];
  isWroclaw: boolean;
  priorityBuyerId: string | null;
  priorityBuyerLabel: string | null;
  addedAt: string;
  updatedAt: string;
  ezamowieniaUrl: string;
  /** Załączniki z e-Zamówienia (po skanowaniu). */
  bzpDocuments?: TenderBzpDocument[];
  documentsFetchedAt?: string | null;
  /** Analiza SWZ / ogłoszenia HTML. */
  swzAnalysis?: TenderSwzAnalysis | null;
  /** Ręcznie wgrany plik SWZ/kosztorys. */
  uploadedFile?: TenderUploadedFile | null;
  /** Wasz szacunek kosztów (PLN brutto) — do oceny opłacalności. */
  ourEstimatePln?: number | null;
  /** Powiązana robota w WGDOM (po wygranym przetargu). */
  linkedJobId?: string | null;
  /** Status postępowania z API e-Zamówienia. */
  tenderState?: string | null;
  /** Cache HTML ogłoszenia (podgląd). */
  noticeHtml?: string | null;
  noticeHtmlFetchedAt?: string | null;
  /** Ustrukturyzowany brief + kosztorys (bez wychodzenia na zewnątrz). */
  tenderDossier?: import("@/lib/tenders-bzp-brief").TenderDossier | null;
  /** Dopasowanie do profilu firmy + szacunek szans (po analizie SWZ). */
  tenderFit?: import("@/lib/tenders-bzp-fit").TenderFitAssessment | null;
  /** Linki BIP / platformy + pobrane pliki spoza e-Zamówień. */
  externalDocDiscovery?: TenderExternalDocDiscovery | null;
  /** Historia zmian „Nasz szacunek”. */
  estimateHistory?: TenderEstimateSnapshot[];
  /** Wynik postępowania (wykonawca, kwota). */
  awardResult?: import("@/lib/tenders-bzp-award").TenderAwardResult | null;
  /** Ostatnia próba pobrania wyniku z BZP (auto). */
  awardFetchAttemptedAt?: string | null;
  /** P2-G.3B — kwota oferty faktycznie złożonej (PLN). */
  submittedBidPln?: number | null;
  /** P2-G.3B — kiedy zapisano złożoną ofertę (ISO). */
  submittedAt?: string | null;
  /** P2-D.1 — snapshot dokumentów + historia zmian. */
  changeMonitor?: import("@/lib/tender-change-monitor").TenderChangeMonitorState | null;
  /** P2-D.2 — snapshot Q&A + historia odpowiedzi. */
  qaMonitor?: import("@/lib/tender-qa-monitor").TenderQaMonitorState | null;
  /** INGEST-01 — OCDS id (pin / fixture); additive, default BZP PL02 unchanged. */
  ocdsId?: string;
  /** INGEST-01 — owner_requested | fixture_pin (auto BZP path leaves unset). */
  ingestMode?: import("@/lib/tender-ingest/types").TenderIngestMode;
  /** INGEST-01 — pinned survives pruneExpiredUntouched. */
  retention?: import("@/lib/tender-ingest/types").TenderIngestRetention;
  /** INGEST-01 — BIP / source URLs declared by Owner. */
  sourceUrls?: string[];
}

/** INGEST-01 — re-export pin helpers (additive; no PL02 change). */
export {
  buildPinnedPipelineItem,
  mergePinnedIntoPipeline,
  isPinnedRetentionItem,
  resolvePinnedTenderItemId,
} from "@/lib/tender-ingest/pin";
export type { ImportTenderRequest } from "@/lib/tender-ingest/types";

export interface TenderEstimateSnapshot {
  pln: number;
  at: string;
  note?: string;
}

/** P2-G.3B — zapis złożonej oferty (pipeline item patch). */
export function patchSubmittedBidPln(
  item: TenderPipelineItem,
  pln: number | null,
): Partial<TenderPipelineItem> {
  if (pln == null || !Number.isFinite(pln) || pln <= 0) {
    return { submittedBidPln: null, submittedAt: null };
  }
  return {
    submittedBidPln: pln,
    submittedAt: new Date().toISOString(),
  };
}

export function patchOurEstimatePln(
  item: TenderPipelineItem,
  pln: number | null,
  note?: string,
): Partial<TenderPipelineItem> {
  const history = [...(item.estimateHistory ?? [])];
  if (item.ourEstimatePln != null && item.ourEstimatePln !== pln) {
    history.push({
      pln: item.ourEstimatePln,
      at: new Date().toISOString(),
      note: note ? `Przed: ${note}` : undefined,
    });
  }
  return {
    ourEstimatePln: pln,
    estimateHistory: history.slice(-25),
  };
}

export const TENDERS_LAST_BZP_SYNC_KEY = "kw-tenders-bzp-last-sync";
export const BZP_AUTO_REFRESH_HOURS = 20;

export const TENDER_STATE_LABELS: Record<string, string> = {
  Initiated: "Zainicjowane",
  CollectingOffers: "Składanie ofert",
  OffersOpened: "Otwarcie ofert",
  Cancelled: "Unieważnione",
  Awarded: "Rozstrzygnięte",
  Finished: "Zakończone",
  Suspended: "Zawieszone",
  Open: "Otwarte",
  Closed: "Zamknięte",
};

export function labelTenderState(state: string | null | undefined): string {
  if (!state) return "—";
  return TENDER_STATE_LABELS[state] || state.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export interface TenderPipelineFunnel {
  new: number;
  seen: number;
  interested: number;
  preparing: number;
  submitted: number;
  won: number;
  lost: number;
  ignored: number;
  winRate: number | null;
}

export interface TendersDashboardStats {
  actionable: number;
  urgent: number;
  interested: number;
  funnel: TenderPipelineFunnel;
  alerts: import("@/lib/tenders-actions").TenderDashboardAlert[];
}

export function getLastBzpSyncAt(): string | null {
  try {
    return localStorage.getItem(TENDERS_LAST_BZP_SYNC_KEY);
  } catch {
    return null;
  }
}

export function markBzpSyncedAt(): void {
  try {
    localStorage.setItem(TENDERS_LAST_BZP_SYNC_KEY, new Date().toISOString());
  } catch { /* ignore */ }
}

export function shouldAutoRefreshBzp(hours = BZP_AUTO_REFRESH_HOURS): boolean {
  const last = getLastBzpSyncAt();
  if (!last) return true;
  const ageMs = Date.now() - new Date(last).getTime();
  return ageMs >= hours * 3600_000;
}

export function computePipelineFunnel(items: TenderPipelineItem[]): TenderPipelineFunnel {
  const counts = {
    new: 0, seen: 0, interested: 0, preparing: 0,
    submitted: 0, won: 0, lost: 0, ignored: 0,
  };
  for (const i of items) {
    if (i.status in counts) counts[i.status as keyof typeof counts] += 1;
  }
  const decided = counts.won + counts.lost;
  return {
    ...counts,
    winRate: decided > 0 ? Math.round((counts.won / decided) * 100) : null,
  };
}

export function computeTendersDashboardStats(items: TenderPipelineItem[]): TendersDashboardStats {
  return {
    actionable: items.filter((i) => isActionableTender(i)).length,
    urgent: items.filter((i) => {
      const d = daysUntilTenderDeadline(i.submittingOffersDate);
      return isTenderOpenForOffers(i.submittingOffersDate) && d !== null && d >= 0 && d <= 7;
    }).length,
    interested: items.filter((i) => i.status === "interested" || i.status === "preparing").length,
    funnel: computePipelineFunnel(items),
    alerts: [],
  };
}

export function recalculateTenderItemScore(
  item: TenderPipelineItem,
  custom?: TendersCustomKeywords,
): TenderPipelineItem {
  const n: BzpNoticeRaw = {
    objectId: item.id,
    orderObject: item.title,
    organizationName: item.organizationName,
    organizationCity: item.organizationCity,
    organizationProvince: item.organizationProvince,
    cpvCode: item.cpvCode,
    publicationDate: item.publicationDate,
    submittingOffersDate: item.submittingOffersDate,
    tenderId: item.tenderId,
  };
  const kw = custom ?? loadCustomKeywordsLocal();
  const { score, keywords } = scoreTenderNotice(n, { priorityOrg: !!item.priorityBuyerId, custom: kw });
  return { ...item, relevanceScore: score, matchedKeywords: keywords };
}

export function recalculateAllTenderScores(items: TenderPipelineItem[], custom?: TendersCustomKeywords): TenderPipelineItem[] {
  const c = custom ?? loadCustomKeywordsLocal();
  return items.map((i) => recalculateTenderItemScore(i, c));
}

/** Przeliczenie score bez fetch chmury (Performance 2.1C — cache hit). */
export function rescorePipelineWithKeywords(
  items: TenderPipelineItem[],
  custom: TendersCustomKeywords,
): { items: TenderPipelineItem[]; changed: boolean } {
  const next = recalculateAllTenderScores(items, custom);
  const changed = next.some((n, i) =>
    n.relevanceScore !== items[i]?.relevanceScore
    || n.matchedKeywords.join(",") !== items[i]?.matchedKeywords.join(","),
  );
  return { items: next, changed };
}

/** Sync słów kluczowych z chmury + przeliczenie score pipeline. */
export async function syncTenderKeywordsAndRescore(
  items: TenderPipelineItem[],
): Promise<{ items: TenderPipelineItem[]; custom: TendersCustomKeywords; changed: boolean }> {
  const custom = await loadCustomKeywords();
  const { items: next, changed } = rescorePipelineWithKeywords(items, custom);
  return { items: next, custom, changed };
}

const PRIORITY_BUILDING_HINTS = TENDER_PRIORITY_BUILDING_HINTS;

export const WROCLAW_PRIORITY_BUYERS = [
  { id: "wm", label: "Wrocławskie Mieszkania", search: "Wrocławskie Mieszkania", cityOnly: true },
  { id: "zik", label: "Zarząd Zasobu Komunalnego", search: "Zarząd Zasobu Komunalnego", cityOnly: true },
  { id: "zim", label: "Gmina Wrocław – ZIM", search: "Zarząd Inwestycji Miejskich", cityOnly: true },
  { id: "tbs", label: "TBS Wrocław", search: "Budownictwa Społecznego Wrocław", cityOnly: false },
  { id: "gmina", label: "Gmina Wrocław", search: "Gmina Wrocław", cityOnly: true },
  { id: "mops", label: "MOPS Wrocław", search: "Miejski Ośrodek Pomocy Społecznej", cityOnly: true, organizationCity: "Wrocław" },
] as const;

export function matchPriorityBuyer(orgName: string, organizationCity?: string): { id: string; label: string } | null {
  const n = orgName || "";
  const folded = n.toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
  const city = (organizationCity || "").toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
  const isWroclawCity = city.includes("wroclaw") || city.startsWith("wroc");
  for (const b of WROCLAW_PRIORITY_BUYERS) {
    if (b.id === "wm" && /wrocławskie\s+mieszkania/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "zik" && /zarząd\s+zasobu\s+komunalnego/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "zim" && /zarząd\s+inwestycji\s+miejskich/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "tbs" && /budownictwa\s+społecznego\s+wrocław|tbs.*wrocław|tbś.*wrocław/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "gmina" && /gmina\s+wrocław/i.test(n) && !/kąty|wrocławski/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "mops" && /miejski\s+osrodek\s+pomocy\s+spolecznej/.test(folded) && (isWroclawCity || /we\s+wrocławiu/i.test(n))) {
      return { id: b.id, label: b.label };
    }
  }
  return null;
}

/** Minimalna trafność, żeby przetarg trafił do widoku „Do zgłoszenia”. */
export const TENDER_IMPORTANCE_MIN_SCORE = 15;

export function parseTenderDeadline(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Termin składania ofert jeszcze nie minął. */
export function isTenderOpenForOffers(iso: string | null | undefined, now = new Date()): boolean {
  const d = parseTenderDeadline(iso);
  if (!d) return false;
  return d.getTime() > now.getTime();
}

export function daysUntilTenderDeadline(iso: string | null | undefined, now = new Date()): number | null {
  const d = parseTenderDeadline(iso);
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function isTenderImportant(
  item: Pick<TenderPipelineItem, "relevanceScore" | "priorityBuyerId">,
): boolean {
  return !!item.priorityBuyerId || item.relevanceScore >= TENDER_IMPORTANCE_MIN_SCORE;
}

/** Aktywny przetarg budowlany we Wrocławiu (lub u kluczowego zamawiającego), w którym warto rozważyć udział. */
export function isActionableTender(item: TenderPipelineItem, now = new Date()): boolean {
  if (!isTenderOpenForOffers(item.submittingOffersDate, now)) return false;
  if (item.status === "ignored" || item.status === "lost" || item.status === "won") return false;
  if (!item.isWroclaw && !item.priorityBuyerId) return false;
  return isTenderImportant(item);
}

/** Usuwa z pipeline zamknięte ogłoszenia, których nikt nie oznaczył. */
export function pruneExpiredUntouched(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return items.filter((i) => {
    // INGEST-01 — historical/fixture pin must survive prune (DF D2).
    if (i.retention === "pinned" || i.ingestMode === "fixture_pin") return true;
    if (isTenderOpenForOffers(i.submittingOffersDate)) return true;
    return i.status !== "new" && i.status !== "seen";
  });
}

export function sortTendersByUrgency(items: TenderPipelineItem[]): TenderPipelineItem[] {
  return [...items].sort((a, b) => {
    const aOpen = isTenderOpenForOffers(a.submittingOffersDate);
    const bOpen = isTenderOpenForOffers(b.submittingOffersDate);
    if (aOpen && !bOpen) return -1;
    if (!aOpen && bOpen) return 1;
    if (aOpen && bOpen) {
      const da = a.submittingOffersDate || "";
      const db = b.submittingOffersDate || "";
      return da.localeCompare(db);
    }
    const pa = a.publicationDate || "";
    const pb = b.publicationDate || "";
    return pb.localeCompare(pa);
  });
}

export function tenderEzamowieniaUrl(tenderId: string): string {
  if (!tenderId) return "https://ezamowienia.gov.pl/mo-client-board/";
  return `https://ezamowienia.gov.pl/mp-client/search/list/${encodeURIComponent(tenderId)}`;
}

export function scoreTenderNotice(
  n: BzpNoticeRaw,
  opts?: { priorityOrg?: boolean; custom?: TendersCustomKeywords },
): { score: number; keywords: string[]; excluded: boolean } {
  const title = `${n.orderObject || ""} ${n.cpvCode || ""}`.toLowerCase();
  const custom = opts?.custom ?? loadCustomKeywordsLocal();
  const customKw = {
    action: getMergedActionKeywords(custom),
    scope: getMergedScopeKeywords(custom),
  };
  if (isExcludedTenderTitle(title, getMergedExcludeKeywords(custom))) {
    return { score: 0, keywords: [], excluded: true };
  }
  const { actionKeywords, scopeKeywords, allKeywords } = matchTenderKeywords(title, customKw);
  let score = actionKeywords.length * 10 + scopeKeywords.length * 5;
  const city = (n.organizationCity || "").toLowerCase();
  if (city.includes("wrocław") || city.includes("wroclaw")) score += 25;
  if ((n.orderObject || "").toLowerCase().includes("wrocław")) score += 15;
  if ((n.cpvCode || "").includes("454")) score += 5;
  if ((n.cpvCode || "").includes("452")) score += 3;
  const priority = opts?.priorityOrg || !!matchPriorityBuyer(n.organizationName || "", n.organizationCity);
  if (priority) score += 20;
  const priorityPass = priority && PRIORITY_BUILDING_HINTS.some((h) => title.includes(h));
  if (priorityPass) score = Math.max(score, 18);
  if (!hasRenovationSignal(title) && !priorityPass) {
    return { score: 0, keywords: allKeywords, excluded: true };
  }
  return { score, keywords: allKeywords, excluded: false };
}

export function mapBzpToPipelineItem(n: BzpNoticeRaw, existing?: TenderPipelineItem): TenderPipelineItem {
  const city = n.organizationCity || "";
  const priority = matchPriorityBuyer(n.organizationName || "", city);
  const { score, keywords } = scoreTenderNotice(n, { priorityOrg: !!priority });
  const id = String(n.objectId || n.moIdentifier || n.bzpNumber || "");
  const now = new Date().toISOString();
  const isWroclaw = /wrocław|wroclaw/i.test(city) || /wrocław|wroclaw/i.test(n.orderObject || "");
  return {
    id,
    bzpNumber: n.bzpNumber || "",
    noticeNumber: n.noticeNumber || "",
    title: n.orderObject || "—",
    organizationName: n.organizationName || "—",
    organizationCity: city,
    organizationProvince: n.organizationProvince || "",
    cpvCode: n.cpvCode || "",
    publicationDate: n.publicationDate || "",
    submittingOffersDate: n.submittingOffersDate ?? null,
    orderType: n.orderType || "",
    tenderId: n.tenderId || "",
    moIdentifier: n.moIdentifier || "",
    status: existing?.status && existing.status !== "new" ? existing.status : "new",
    notes: existing?.notes || "",
    relevanceScore: score,
    matchedKeywords: keywords,
    isWroclaw,
    priorityBuyerId: priority?.id ?? existing?.priorityBuyerId ?? null,
    priorityBuyerLabel: priority?.label ?? existing?.priorityBuyerLabel ?? null,
    addedAt: existing?.addedAt || now,
    updatedAt: now,
    ezamowieniaUrl: tenderEzamowieniaUrl(n.tenderId || ""),
    bzpDocuments: existing?.bzpDocuments,
    documentsFetchedAt: existing?.documentsFetchedAt ?? null,
    swzAnalysis: existing?.swzAnalysis ?? null,
    uploadedFile: existing?.uploadedFile ?? null,
    ourEstimatePln: existing?.ourEstimatePln ?? null,
    linkedJobId: existing?.linkedJobId ?? null,
    tenderState: n.tenderState ?? existing?.tenderState ?? null,
    noticeHtml: existing?.noticeHtml ?? null,
    noticeHtmlFetchedAt: existing?.noticeHtmlFetchedAt ?? null,
    tenderDossier: existing?.tenderDossier ?? null,
    tenderFit: existing?.tenderFit ?? null,
    externalDocDiscovery: existing?.externalDocDiscovery ?? null,
    estimateHistory: existing?.estimateHistory ?? [],
    awardResult: existing?.awardResult ?? null,
  };
}

export function mergeTenderPipeline(
  existing: TenderPipelineItem[],
  incoming: TenderPipelineItem[],
): TenderPipelineItem[] {
  const map = new Map<string, TenderPipelineItem>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    map.set(item.id, prev
      ? {
          ...item,
          status: prev.status === "new" ? item.status : prev.status,
          notes: prev.notes,
          addedAt: prev.addedAt,
          bzpDocuments: prev.bzpDocuments ?? item.bzpDocuments,
          documentsFetchedAt: prev.documentsFetchedAt ?? item.documentsFetchedAt,
          swzAnalysis: prev.swzAnalysis ?? item.swzAnalysis,
          uploadedFile: prev.uploadedFile ?? item.uploadedFile,
          ourEstimatePln: prev.ourEstimatePln ?? item.ourEstimatePln,
          linkedJobId: prev.linkedJobId ?? item.linkedJobId,
          tenderState: item.tenderState ?? prev.tenderState,
          noticeHtml: prev.noticeHtml ?? item.noticeHtml,
          noticeHtmlFetchedAt: prev.noticeHtmlFetchedAt ?? item.noticeHtmlFetchedAt,
          tenderDossier: mergeTenderDossierByQuality(prev.tenderDossier, item.tenderDossier) ?? prev.tenderDossier ?? item.tenderDossier,
          tenderFit: prev.tenderFit ?? item.tenderFit,
          externalDocDiscovery: prev.externalDocDiscovery ?? item.externalDocDiscovery,
          estimateHistory: prev.estimateHistory ?? item.estimateHistory,
          awardResult: prev.awardResult ?? item.awardResult,
          changeMonitor: prev.changeMonitor ?? item.changeMonitor,
          qaMonitor: prev.qaMonitor ?? item.qaMonitor,
        }
      : item);
  }
  return sortTendersByUrgency([...map.values()]);
}

export async function fetchBzpTendersFromServer(opts?: {
  days?: number;
  pages?: number;
  province?: string;
  orgPages?: number;
}): Promise<BzpNoticeRaw[]> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const params = new URLSearchParams({
    days: String(opts?.days ?? 90),
    pages: String(opts?.pages ?? 4),
    orgPages: String(opts?.orgPages ?? 5),
    province: opts?.province ?? "PL02",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/tenders-bzp-search?${params}`, {
      headers: API_HEADERS,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Przekroczono czas oczekiwania na BZP (3 min) — spróbuj ponownie");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Błąd pobierania BZP (${res.status})`);
  }
  return (data.items || []) as BzpNoticeRaw[];
}

export function loadTendersPipelineLocal(): TenderPipelineItem[] {
  try {
    const raw = localStorage.getItem(TENDERS_PIPELINE_KEY);
    if (!raw) {
      const cold = getPipelineColdMemory();
      return cold && cold.length > 0 ? cold : [];
    }
    const parsed = JSON.parse(raw);
    const lean = Array.isArray(parsed) ? (parsed as TenderPipelineItem[]) : [];
    return resolvePipelineLocalWithCold(lean);
  } catch {
    return getPipelineColdMemory() ?? [];
  }
}

const PIPELINE_LS_TELEMETRY_KEY = "wgdom-pipeline-ls-telemetry";
const PIPELINE_LS_TELEMETRY_MAX = 50;

export interface PipelineLsTelemetryEntry {
  at: string;
  kind: "quota_exceeded" | "save_error";
  bytes?: number;
  itemCount?: number;
  message?: string;
}

/** Telemetria zapisu pipeline w LS — bez PII (dev console + ring buffer LS). */
export function logPipelineLocalSaveTelemetry(
  entry: Omit<PipelineLsTelemetryEntry, "at">,
): void {
  if (typeof window === "undefined") return;
  const row: PipelineLsTelemetryEntry = { ...entry, at: new Date().toISOString() };
  console.warn("[wgdom:pipeline-ls]", row);
  try {
    const raw = localStorage.getItem(PIPELINE_LS_TELEMETRY_KEY);
    const prev: PipelineLsTelemetryEntry[] = raw ? JSON.parse(raw) : [];
    prev.push(row);
    if (prev.length > PIPELINE_LS_TELEMETRY_MAX) {
      prev.splice(0, prev.length - PIPELINE_LS_TELEMETRY_MAX);
    }
    localStorage.setItem(PIPELINE_LS_TELEMETRY_KEY, JSON.stringify(prev));
  } catch {
    /* telemetry best-effort — nie blokuj zapisu głównego */
  }
}

export function readPipelineLocalSaveTelemetry(): PipelineLsTelemetryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PIPELINE_LS_TELEMETRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTendersPipelineLocal(items: TenderPipelineItem[]): void {
  setPipelineColdMemory(items);
  const lean = stripTenderPipelineForLocalStorage(items);
  const payload = JSON.stringify(lean);
  const bytes = typeof Blob !== "undefined"
    ? new Blob([payload]).size
    : payload.length * 2;
  try {
    localStorage.setItem(TENDERS_PIPELINE_KEY, payload);
    recordStorageWrite({
      key: TENDERS_PIPELINE_KEY,
      bytes,
      writer: "tenders-bzp.saveTendersPipelineLocal",
      ok: true,
      tier: 1,
      note: "lean",
    });
  } catch (e) {
    const isQuota = e instanceof DOMException
      && (e.name === "QuotaExceededError" || e.code === 22);
    logPipelineLocalSaveTelemetry({
      kind: isQuota ? "quota_exceeded" : "save_error",
      bytes,
      itemCount: items.length,
      message: e instanceof Error ? e.message : String(e),
    });
    recordStorageWrite({
      key: TENDERS_PIPELINE_KEY,
      bytes,
      writer: "tenders-bzp.saveTendersPipelineLocal",
      ok: false,
      tier: 1,
      note: isQuota ? "quota_exceeded_lean" : "save_error",
    });
  }
}

export async function loadTendersPipeline(): Promise<TenderPipelineItem[]> {
  try {
    await hydratePipelineColdFromIdb();
    const local = loadTendersPipelineLocal();
    const [cloud] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY]);
    if (cloud == null || !Array.isArray(cloud)) return local;
    const merged = mergeTenderPipelineForCloud(local, cloud);
    saveTendersPipelineLocal(merged);
    return merged;
  } catch {
    await hydratePipelineColdFromIdb();
    return loadTendersPipelineLocal();
  }
}

export async function removeTenderFromPipeline(
  items: TenderPipelineItem[],
  id: string,
): Promise<TenderPipelineItem[]> {
  addDeletedTenderId(id);
  await persistKey(TENDERS_DELETED_IDS_KEY, getDeletedTenderIds());
  const next = items.filter((i) => i.id !== id);
  await saveTendersPipeline(next);
  return next;
}

export async function saveTendersPipeline(items: TenderPipelineItem[]): Promise<void> {
  saveTendersPipelineLocal(items);
  patchPipelineSessionCache(items);
  await persistKey(TENDERS_PIPELINE_KEY, items);
}

export const TENDER_STATUS_LABELS: Record<TenderPipelineStatus, string> = {
  new: "Nowy",
  seen: "Obejrzany",
  interested: "Interesuje nas",
  preparing: "Przygotowujemy ofertę",
  submitted: "Złożona oferta",
  won: "Wygrany",
  lost: "Przegrany / rezygnacja",
  ignored: "Pominięty",
};

export interface TenderNoticeDetails {
  id: string;
  tenderId: string;
  moIdentifier: string;
  noticeNumber: string;
  tenderState: string;
  publicationDate: string;
  htmlBody: string;
}

async function tenderApiGet(path: string, params: Record<string, string>): Promise<unknown> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const q = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}${path}?${q}`, { headers: API_HEADERS });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !(data as { ok?: boolean }).ok) {
    const err = new Error((data as { error?: string }).error || `Błąd API (${res.status})`) as Error & {
      diag?: TenderDownloadDiag;
    };
    err.diag = (data as { diag?: TenderDownloadDiag }).diag;
    throw err;
  }
  return data;
}

export interface TenderDownloadDiag {
  path: string;
  requestUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  contentType?: string;
  contentLength?: string;
  bytesReceived?: number;
  rejectReason?: string;
}

export interface TenderZipCatalogEntry {
  path: string;
  filename: string;
  score: number;
}

export async function fetchTenderZipCatalog(opts: {
  tenderId: string;
  documentIndex: number;
  downloadUrl?: string;
  sourcePageUrl?: string;
}): Promise<{
  zipSize: number;
  outerFilename: string;
  entries: TenderZipCatalogEntry[];
  diag?: TenderDownloadDiag;
}> {
  const data = await tenderApiGet("/tenders-bzp-zip-catalog", {
    tenderId: opts.tenderId,
    documentIndex: String(opts.documentIndex),
    ...(opts.downloadUrl ? { downloadUrl: opts.downloadUrl } : {}),
    ...(opts.sourcePageUrl ? { sourcePageUrl: opts.sourcePageUrl } : {}),
  }) as {
    zipSize: number;
    outerFilename: string;
    entries: TenderZipCatalogEntry[];
    diag?: TenderDownloadDiag;
  };
  return data;
}

export async function fetchTenderZipEntryBytes(opts: {
  tenderId: string;
  documentIndex: number;
  innerPath: string;
  downloadUrl?: string;
  sourcePageUrl?: string;
}): Promise<{ base64: string; filename: string; contentType: string; innerPath: string; diag?: TenderDownloadDiag }> {
  const data = await tenderApiGet("/tenders-bzp-zip-entry-bytes", {
    tenderId: opts.tenderId,
    documentIndex: String(opts.documentIndex),
    innerPath: opts.innerPath,
    ...(opts.downloadUrl ? { downloadUrl: opts.downloadUrl } : {}),
    ...(opts.sourcePageUrl ? { sourcePageUrl: opts.sourcePageUrl } : {}),
  }) as {
    base64: string;
    filename: string;
    contentType: string;
    innerPath: string;
    diag?: TenderDownloadDiag;
  };
  return data;
}

export async function fetchTenderNoticeDetails(noticeNumber: string): Promise<TenderNoticeDetails> {
  const data = await tenderApiGet("/tenders-bzp-notice", { noticeNumber }) as {
    details: TenderNoticeDetails;
  };
  return data.details;
}

export interface FetchTenderDocumentsInput {
  tenderId: string;
  noticeNumber?: string;
  /** Gdy klient ma HTML lokalnie — Edge użyje zamiast ponownego fetch BZP. */
  noticeHtml?: string;
}

export async function fetchTenderDocuments(
  input: FetchTenderDocumentsInput | string,
  noticeNumber?: string,
): Promise<TenderBzpDocument[]> {
  const resolved: FetchTenderDocumentsInput =
    typeof input === "string"
      ? { tenderId: input, noticeNumber: noticeNumber?.trim() || undefined }
      : input;
  const params: Record<string, string> = { tenderId: resolved.tenderId };
  const noticeNum = resolved.noticeNumber?.trim();
  if (noticeNum) {
    params.noticeNumber = noticeNum;
  } else if (resolved.noticeHtml?.trim()) {
    // NG11-P0.2 — html-only anchor (P0.2.1 backlog); nigdy noticeHtml gdy jest numer (414 URI Too Long).
    params.noticeHtml = resolved.noticeHtml.trim();
  }
  const data = await tenderApiGet("/tenders-bzp-documents", params) as {
    documents: TenderBzpDocument[];
  };
  return (data.documents || []).map((doc) => ({
    ...doc,
    filename: displayTenderFilename(doc.filename, {
      index: doc.index,
      contentType: doc.contentType,
      url: doc.downloadUrl,
    }),
  }));
}

export async function analyzeTenderSwz(opts: {
  noticeNumber?: string;
  tenderId?: string;
  documentIndex?: number;
  ourEstimatePln?: number | null;
}): Promise<TenderSwzAnalysis> {
  const data = await tenderApiGet("/tenders-bzp-analyze-swz", {
    ...(opts.noticeNumber ? { noticeNumber: opts.noticeNumber } : {}),
    ...(opts.tenderId ? { tenderId: opts.tenderId } : {}),
    ...(opts.documentIndex != null ? { documentIndex: String(opts.documentIndex) } : {}),
    ...(opts.ourEstimatePln != null ? { ourEstimatePln: String(opts.ourEstimatePln) } : {}),
  }) as { analysis: TenderSwzAnalysis };
  return data.analysis;
}

export async function uploadTenderFile(
  tenderItemId: string,
  file: File,
): Promise<TenderUploadedFile> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const safeName = file.name.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+/g, "_").slice(0, 80);
  const filename = `swz-${Date.now()}-${safeName}`;
  const form = new FormData();
  form.append("file", file);
  form.append("tenderId", tenderItemId);
  form.append("filename", filename);
  const res = await fetch(`${API_BASE}/tenders-bzp-upload`, {
    method: "POST",
    headers: { Authorization: API_HEADERS.Authorization },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `Błąd uploadu (${res.status})`);
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    path: data.path,
    publicUrl: data.publicUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * INGEST-01 — multi PDF/ZIP cloud upload helper (no silent truncation).
 * Registry retention is separate (`ingestOwnerBrowserFiles`); this only stores bytes remotely.
 */
export async function uploadTenderFiles(
  tenderItemId: string,
  files: File[],
): Promise<TenderUploadedFile[]> {
  const out: TenderUploadedFile[] = [];
  for (const file of files) {
    out.push(await uploadTenderFile(tenderItemId, file));
  }
  return out;
}

export interface TenderJobDraft {
  address: string;
  client: string;
  notes: string;
  invoiceAmount: string;
  linkedTenderId: string;
  linkedTenderBzpNumber: string;
  /** ETAP 8.1 — z awardResult.contractDate (ISO), gdy dostępne. */
  startDate?: string;
  /** ETAP 8.1 — contractDate + swzAnalysis.implementationDays, gdy oba dostępne. */
  endDate?: string;
}

/** Konwersja awardResult.contractDate (DD-MM-YYYY) → YYYY-MM-DD. Bez parserów tekstowych SWZ. */
function awardContractDateToIso(contractDate: string | null | undefined): string | undefined {
  if (!contractDate?.trim()) return undefined;
  const trimmed = contractDate.trim();
  const dmy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return undefined;
}

function addCalendarDaysIso(isoStart: string, days: number): string {
  const d = new Date(`${isoStart}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ETAP 8.4 — DD.MM.YYYY → YYYY-MM-DD; tylko poprawne daty kalendarzowe. */
function dmyToIso(day: string, month: string, year: string): string | undefined {
  const dd = parseInt(day, 10);
  const mm = parseInt(month, 10);
  const yyyy = parseInt(year, 10);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return undefined;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1990 || yyyy > 2100) return undefined;
  const probe = new Date(`${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}T12:00:00`);
  if (
    probe.getFullYear() !== yyyy
    || probe.getMonth() + 1 !== mm
    || probe.getDate() !== dd
  ) {
    return undefined;
  }
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * ETAP 8.4 — jednoznaczny termin końcowy (bez zgadywania).
 * Wzorce: „do 31.12.2026”, „termin realizacji: 31.12.2026”, samo „31.12.2026”.
 */
export function parseAbsoluteDeadlineFromSwzText(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const text = raw.replace(/\s+/g, " ").trim();
  const patterns: RegExp[] = [
    /\bdo\s+(\d{1,2})\.(\d{1,2})\.(\d{4})\b/i,
    /termin\s+(?:realizacji|wykonania|zakończenia|zakonczenia)\s*[:\s]+(\d{1,2})\.(\d{1,2})\.(\d{4})/i,
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return dmyToIso(m[1], m[2], m[3]);
  }
  return undefined;
}

/**
 * ETAP 8.4 — jednoznaczny okres: „30 dni”, „6 miesięcy” (dokładnie jeden match w tekście).
 */
export function parseUnambiguousDurationDaysFromSwzText(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  const dayMatches = [...text.matchAll(/(\d+)\s*(?:dni|dzień|dzien|dni roboczych?)\b/gi)];
  const monthMatches = [...text.matchAll(/(\d+)\s*(?:miesięcy|miesiące|mies\.?)\b/gi)];
  type Hit = { kind: "days" | "months"; n: number };
  const hits: Hit[] = [];
  for (const m of dayMatches) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n <= 730) hits.push({ kind: "days", n });
  }
  for (const m of monthMatches) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0 && n <= 36) hits.push({ kind: "months", n });
  }
  if (hits.length !== 1) return null;
  const one = hits[0]!;
  return one.kind === "days" ? one.n : one.n * 30;
}

function tenderImplementationDeadlineRaw(item: TenderPipelineItem): string | null {
  const raw = item.swzAnalysis?.implementationDeadlineRaw?.trim();
  return raw || null;
}

function tenderContractPeriod(item: TenderPipelineItem): string | null {
  const raw = item.tenderDossier?.brief?.contractPeriod?.trim();
  return raw || null;
}

/** Koniec realizacji z tekstu SWZ/brief — wymaga startDate (okres względny) lub sama data absolutna. */
function resolveEndDateFromSwzFallbackText(
  raw: string,
  startDateIso: string | undefined,
): string | undefined {
  const abs = parseAbsoluteDeadlineFromSwzText(raw);
  const dur = parseUnambiguousDurationDaysFromSwzText(raw);
  if (abs && dur) return undefined;
  if (startDateIso && dur) return addCalendarDaysIso(startDateIso, dur);
  if (abs) return abs;
  return undefined;
}

function resolveEndDateFromSwzFallbacks(
  item: TenderPipelineItem,
  startDateIso: string | undefined,
): string | undefined {
  for (const raw of [tenderImplementationDeadlineRaw(item), tenderContractPeriod(item)]) {
    if (!raw) continue;
    const end = resolveEndDateFromSwzFallbackText(raw, startDateIso);
    if (end) return end;
  }
  return undefined;
}

/** ETAP 8.1 — kwota faktury: wygrana → SWZ → nasz szacunek. */
export function resolveInvoiceAmountFromTender(item: TenderPipelineItem): string {
  const awardPln = item.awardResult?.awardValuePln;
  if (awardPln != null && awardPln > 0) return String(Math.round(awardPln));
  const estimatedPln = item.swzAnalysis?.estimatedValuePln;
  if (estimatedPln != null) return String(Math.round(estimatedPln));
  if (item.ourEstimatePln != null) return String(Math.round(item.ourEstimatePln));
  return "";
}

/**
 * Terminy draftu roboty z przetargu.
 * Priorytet: contractDate + implementationDays (8.1) → implementationDeadlineRaw → contractPeriod.
 */
export function resolveJobDraftDatesFromTender(
  item: TenderPipelineItem,
): Pick<TenderJobDraft, "startDate" | "endDate"> {
  const startDate = awardContractDateToIso(item.awardResult?.contractDate);
  if (startDate) {
    const implDays = item.swzAnalysis?.implementationDays;
    if (implDays != null && implDays > 0) {
      return { startDate, endDate: addCalendarDaysIso(startDate, implDays) };
    }
    const endFromFallback = resolveEndDateFromSwzFallbacks(item, startDate);
    if (endFromFallback) return { startDate, endDate: endFromFallback };
    return { startDate };
  }

  const endOnly = resolveEndDateFromSwzFallbacks(item, undefined);
  if (endOnly) return { endDate: endOnly };
  return {};
}

/** Szablon roboty z wygranego / przygotowywanego przetargu. */
export function jobDraftFromTender(item: TenderPipelineItem): TenderJobDraft {
  const addr = item.organizationCity?.includes("Wrocław") || item.isWroclaw
    ? item.title.slice(0, 80)
    : `${item.organizationCity || "Wrocław"} — ${item.title.slice(0, 60)}`;
  const notes = [
    `Przetarg BZP: ${item.bzpNumber}`,
    item.noticeNumber ? `Nr ogłoszenia: ${item.noticeNumber}` : "",
    item.ezamowieniaUrl,
    item.swzAnalysis?.estimatedValueRaw ? `Wartość SWZ: ${item.swzAnalysis.estimatedValueRaw}` : "",
  ].filter(Boolean).join("\n");
  const invoiceAmount = resolveInvoiceAmountFromTender(item);
  const dates = resolveJobDraftDatesFromTender(item);
  return {
    address: addr,
    client: item.organizationName || "—",
    notes,
    invoiceAmount,
    linkedTenderId: item.id,
    linkedTenderBzpNumber: item.bzpNumber,
    ...dates,
  };
}

/** Kopiuje pliki przetargu (SWZ / kosztorys) do storage roboty. */
export async function attachTenderAssetsToJob(
  jobId: string,
  item: TenderPipelineItem,
  uploadedBy: string,
): Promise<JobFileAttachment[]> {
  if (!API_BASE) return [];
  type Source = { storagePath?: string; url?: string; filename: string; kind: "zlecenie" | "kosztorys" };
  const sources: Source[] = [];
  if (item.uploadedFile?.path) {
    const kind = isKosztorysUploadFilename(item.uploadedFile.filename) ? "kosztorys" : "zlecenie";
    sources.push({
      storagePath: item.uploadedFile.path,
      filename: item.uploadedFile.filename,
      kind,
    });
  } else if (item.uploadedFile?.publicUrl) {
    const kind = isKosztorysUploadFilename(item.uploadedFile.filename) ? "kosztorys" : "zlecenie";
    sources.push({ url: item.uploadedFile.publicUrl, filename: item.uploadedFile.filename, kind });
  }
  const swzDoc = item.bzpDocuments?.find((d) => d.isSwzHint) ?? item.bzpDocuments?.[0];
  if (swzDoc && !sources.some((s) => s.filename === swzDoc.filename)) {
    sources.push({
      url: swzDoc.downloadUrl,
      filename: swzDoc.filename,
      kind: isKosztorysUploadFilename(swzDoc.filename) ? "kosztorys" : "zlecenie",
    });
  }
  for (const ext of item.externalDocDiscovery?.files ?? []) {
    if (!sources.some((s) => s.filename === ext.filename)) {
      sources.push({
        storagePath: ext.storagePath,
        filename: ext.filename,
        kind: isKosztorysUploadFilename(ext.filename) ? "kosztorys" : "zlecenie",
      });
    }
  }
  if (sources.length === 0) return [];
  const res = await fetch(`${API_BASE}/tenders-bzp-attach-to-job`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ jobId, uploadedBy, sources }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return [];
  return (data.attachments || []) as JobFileAttachment[];
}

export async function fetchTenderDocumentBytes(
  tenderId: string,
  documentIndex: number,
  downloadUrl?: string,
  sourcePageUrl?: string,
): Promise<{ base64: string; filename: string; contentType: string; diag?: TenderDownloadDiag }> {
  const cacheKey = tenderDocumentBytesCacheKey(
    tenderId,
    documentIndex,
    downloadUrl,
    sourcePageUrl,
  );
  const cached = getTenderDocumentBytesCached(cacheKey);
  if (cached) return cached;

  recordTenderDocumentFetch();
  const data = await tenderApiGet("/tenders-bzp-document-bytes", {
    tenderId,
    documentIndex: String(documentIndex),
    ...(downloadUrl ? { downloadUrl } : {}),
    ...(sourcePageUrl ? { sourcePageUrl } : {}),
  }) as { base64: string; filename: string; contentType: string; diag?: TenderDownloadDiag };
  setTenderDocumentBytesCached(cacheKey, data);
  return data;
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBlobUrl(bytes: Uint8Array, contentType?: string): string {
  return URL.createObjectURL(new Blob([bytes], { type: contentType || "application/octet-stream" }));
}

/** URL pobrania dla dokumentów spoza readmodels (Logintrade itd.). */
export function resolveTenderDocumentDownload(
  docs: TenderBzpDocument[] | undefined,
  documentIndex: number,
): { downloadUrl?: string; platform?: string; filename?: string; sourcePageUrl?: string } | null {
  const doc = docs?.find((d) => d.index === documentIndex);
  if (!doc) return null;
  if (doc.downloadUrl) {
    return {
      downloadUrl: doc.downloadUrl,
      platform: doc.platform,
      filename: doc.filename,
      sourcePageUrl: doc.sourcePageUrl,
    };
  }
  return { filename: doc.filename, sourcePageUrl: doc.sourcePageUrl };
}

export async function loadTenderBzpDocumentBytes(
  tenderId: string,
  documentIndex: number,
  downloadUrl?: string,
  sourcePageUrl?: string,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  const { base64, filename, contentType } = await fetchTenderDocumentBytes(
    tenderId,
    documentIndex,
    downloadUrl,
    sourcePageUrl,
  );
  return { bytes: base64ToBytes(base64), filename, contentType };
}

/** P2-E.1 / P2-H.1 — pobieranie z resolve downloadUrl + sourcePageUrl (Logintrade / ezamawiajacy). */
export async function loadTenderBzpDocumentBytesResolved(
  tenderId: string,
  documentIndex: number,
  docs?: TenderBzpDocument[],
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  const resolved = resolveTenderDocumentDownload(docs, documentIndex);
  return loadTenderBzpDocumentBytes(
    tenderId,
    documentIndex,
    resolved?.downloadUrl,
    resolved?.sourcePageUrl,
  );
}
