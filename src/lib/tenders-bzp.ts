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
  buildTenderPipelineLsIndex,
  detectPipelineLsKind,
  evaluatePipelineIndexBudget,
  getPipelineColdMemory,
  hydratePipelineColdEnvelopeFromIdb,
  hydratePipelineColdFromIdb,
  resolvePipelineLocalWithCold,
  setPipelineColdMemory,
  stripTenderPipelineForLocalStorage,
  validatePipelineFullForWrite,
  type PipelineIdbReadStatus,
  type PipelineIdbWriteResult,
  type PipelineLsKind,
  type TenderPipelineIndexItemV1,
} from "@/lib/storage/tenders-pipeline-cold";
import { recordStorageWrite, scheduleLocalStorageTotalTelemetry } from "@/lib/storage/storage-telemetry";
import {
  getLastPipelineLocalIndexGateDecision,
  isPipelineLocalIndexEnabled,
} from "@/lib/app-settings";
import { hydratePipelineItemsFromIngestRegistry } from "@/lib/tender-ingest/artifact-bridge";
import {
  classifyPipelineRepresentation,
  getPipelineFullAvailability,
  hasLsIndexMarker,
  setPipelineFullAvailability,
  type PipelineFullAvailability,
} from "@/lib/tender-pipeline/tender-pipeline-representation";

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
  /**
   * IK A08-P4 G3 — Owner-approved Final Bid (≠ submittedBidPln · ≠ ourEstimatePln).
   * DF: IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE.md
   */
  ikFinalBid?: import("@/lib/intelligent-estimator/ik-g3-final-bid").IkG3FinalBidRecord | null;
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
  /** OD-OCR-25 — additive lean cloud marker (omitted ≠ deleted). */
  _cloudLean?: import("@/lib/tender-pipeline/tender-pipeline-cloud-lean").TenderPipelineCloudLeanMarker;
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
    submittedBidPln: existing?.submittedBidPln ?? null,
    submittedAt: existing?.submittedAt ?? null,
    ikFinalBid: existing?.ikFinalBid ?? null,
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
          submittedBidPln: prev.submittedBidPln ?? item.submittedBidPln,
          submittedAt: prev.submittedAt ?? item.submittedAt,
          ikFinalBid: prev.ikFinalBid ?? item.ikFinalBid,
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

// ---------------------------------------------------------------------------
// STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 4 — READER MIGRATION (DF §4, §A.5–§A.8).
// Granica: FULL-required czyta wyłącznie RAM FULL → valid IDB FULL → zwalidowane źródło
// zewnętrzne (§A.5.3). LS INDEX = reprezentacja hot/read-only; INDEX → FULL nie istnieje.
// ---------------------------------------------------------------------------

const PIPELINE_READER_TELEMETRY_WRITER = "tenders-bzp.reader";

function recordPipelineReadTelemetry(note: string): void {
  recordStorageWrite({
    key: TENDERS_PIPELINE_KEY,
    bytes: 0,
    writer: PIPELINE_READER_TELEMETRY_WRITER,
    ok: false,
    tier: 1,
    note,
  });
}

/** §A.5.1/§A.6.1 — stan dostępności FULL + telemetria `full_availability:<state>:<reason>`. */
function markPipelineFullAvailability(next: PipelineFullAvailability, reason: string): void {
  if (getPipelineFullAvailability() !== next) {
    recordStorageWrite({
      key: TENDERS_PIPELINE_KEY,
      bytes: 0,
      writer: "tenders-bzp.loadTendersPipeline",
      ok: next === "FULL" || next === "EMPTY",
      tier: 1,
      note: `full_availability:${next}:${reason}`,
    });
  }
  setPipelineFullAvailability(next, reason);
}

/**
 * R1 (DF §4.1/§4.2) — sync reader dla UI. **NIE jest źródłem FULL** (PIPELINE-FULL-SOURCE-01):
 * operacje FULL-required używają `resolvePipelineFullSource()` (§A.5.2).
 *
 * Kolejność źródeł (D8): RAM/IDB FULL (`coldMem`) → LS. LS INDEX zwracany wyłącznie jako
 * reprezentacja **hot/read-only** z markerem `_lsIndex` (nigdy zdejmowanym) + availability
 * `DEGRADED_INDEX` — każdy downstream guard (writer §3.1, merge §A.6.3, seam §A.6 E) go odrzuci.
 */
export function loadTendersPipelineLocal(): TenderPipelineItem[] {
  const cold = getPipelineColdMemory();
  const ls = detectPipelineLsKind(readPipelineLsRaw());

  if (ls.kind === "INDEX") {
    // §4.2: INDEX VALID/STALE + FULL w RAM/IDB ⇒ FULL wygrywa (rebuild LS należy do writera, nie do readera).
    if (cold && cold.length > 0) return cold;
    // §4.3 / §A.7 CASE 2–5: brak FULL ⇒ degraded read-only; ZERO konwersji INDEX → FULL.
    markPipelineFullAvailability("DEGRADED_INDEX", "ls_index_without_full");
    recordPipelineReadTelemetry("index_without_full");
    return (ls.items ?? []) as unknown as TenderPipelineItem[];
  }

  if (ls.kind === "LEGACY_FULL" || ls.kind === "LEGACY_LEAN") {
    // FULL-compatible (§A.4) — cold (RAM/IDB) nadal ma pierwszeństwo (F-P2-01).
    if (ls.kind === "LEGACY_LEAN" && !(cold && cold.length > 0)) {
      // §4.2: LEAN bez FULL w RAM/IDB ⇒ LEAN items + telemetria; FULL recovery = §8.2 (Phase 8).
      recordPipelineReadTelemetry("legacy_lean_without_full");
    }
    return resolvePipelineLocalWithCold((ls.items ?? []) as TenderPipelineItem[]);
  }

  // EMPTY / MISSING / CORRUPT — §4.2: coldMem FULL gdy jest, inaczej [] (LS nie jest kasowany).
  if (ls.kind === "CORRUPT") recordPipelineReadTelemetry(`ls_corrupt:${ls.reason ?? "unknown"}`);
  return cold && cold.length > 0 ? cold : [];
}

const PIPELINE_LS_TELEMETRY_KEY = "wgdom-pipeline-ls-telemetry";
const PIPELINE_LS_TELEMETRY_MAX = 50;

export interface PipelineLsTelemetryEntry {
  at: string;
  /**
   * `quota_exceeded` = warstwa A (wyjątek przeglądarki) · `budget_block` = warstwa B (NEW-06,
   * decyzja projektowa przed `setItem`) — DF §7 zakazuje utożsamiania tych dwóch.
   */
  kind: "quota_exceeded" | "save_error" | "budget_block";
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

// ---------------------------------------------------------------------------
// STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 3 — NEW-04: canonical local writer (DF §3, in-place).
// Sekwencja §3.2: RAM FULL → VALIDATE → IDB FULL envelope → read-back ACK → BUILD INDEX (seq = ACK) →
// LS INDEX. Flag OFF (default) = compat: kroki 1–3 + synchroniczny LEGACY_LEAN jak MAIN (Phase 3 ⊇ MAIN).
// Writer NIGDY: nie pisze FULL do LS jako canonical, nie pisze INDEX do IDB, nie robi removeItem,
// nie nadpisuje LS pustką po błędzie, nie wykonuje retry, nie dotyka cloud (seam = caller).
//
// Phase 7 — krok 6 BUDGET (NEW-06 / DF §7): trzy rozdzielne warstwy quota.
//   A. browser quota  — `catch` DOMException wokół `setItem` (`quota_blocked_index` / `_compat`)
//   B. per-key INDEX  — `evaluatePipelineIndexBudget(bytes)` PRZED `setItem`; BLOCK ⇒ skip
//   C. global LS      — `scheduleLocalStorageTotalTelemetry()` po zapisie, w idle, tylko telemetria
// A i B nigdy nie są utożsamiane; C nigdy nie blokuje. W żadnej z nich nie ginie IDB FULL.
// ---------------------------------------------------------------------------

const PIPELINE_LOCAL_WRITER = "tenders-bzp.saveTendersPipelineLocal";

export type PipelineLocalWriteLsMode = "index" | "compat" | "skipped";
/** `legacy_subset` = Phase 5 cutover guard (PLAN Phase 5; additive wobec unii DF §3.2). */
export type PipelineLocalWriteLsReason = "quota" | "error" | "budget_block" | "no_ack" | "legacy_subset";

export interface PipelineLocalWriteLsResult {
  mode: PipelineLocalWriteLsMode;
  ok: boolean;
  bytes: number;
  reason?: PipelineLocalWriteLsReason;
}

/** NEW-04 — wynik ostatniego zapisu lokalnego (IDB ACK + LS). */
export interface PipelineLocalWriteResult {
  idb: PipelineIdbWriteResult;
  ls: PipelineLocalWriteLsResult;
}

let lastPipelineLocalWrite: Promise<PipelineLocalWriteResult> | null = null;

/**
 * NEW-04 (DF §3.2) — ostatni zapis `saveTendersPipelineLocal` po ustaleniu IDB ACK + LS.
 * Test/diag; sygnatura writera (`void`) bez zmian. `null` = brak zapisu w tej sesji.
 */
export function awaitPipelineLocalWriteSettled(): Promise<PipelineLocalWriteResult | null> {
  return lastPipelineLocalWrite ?? Promise.resolve(null);
}

function isLsQuotaError(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014;
  }
  return typeof e === "object" && e != null && (e as { name?: unknown }).name === "QuotaExceededError";
}

function lsPayloadBytes(payload: string): number {
  return typeof Blob !== "undefined" ? new Blob([payload]).size : payload.length * 2;
}

/**
 * Jedyny `localStorage.setItem(TENDERS_PIPELINE_KEY)` w module. Quota/error ⇒ BLOCK: LS pozostaje
 * z poprzednią zawartością (brak removeItem, brak retry, brak zmiany formatu) — DF §3.3 B/C, §7 A.
 */
function writePipelineLsPayload(
  payload: string,
  mode: "index" | "compat",
  itemCount: number,
  okNote: string,
  /** Phase 7: bajty zmierzone już przez budżet NEW-06 — bez drugiego `Blob()` na tym samym payloadzie. */
  measuredBytes?: number,
): PipelineLocalWriteLsResult {
  const bytes = measuredBytes ?? lsPayloadBytes(payload);
  try {
    localStorage.setItem(TENDERS_PIPELINE_KEY, payload);
    recordStorageWrite({
      key: TENDERS_PIPELINE_KEY,
      bytes,
      writer: PIPELINE_LOCAL_WRITER,
      ok: true,
      tier: 1,
      note: okNote,
    });
    return { mode, ok: true, bytes };
  } catch (e) {
    const isQuota = isLsQuotaError(e);
    logPipelineLocalSaveTelemetry({
      kind: isQuota ? "quota_exceeded" : "save_error",
      bytes,
      itemCount,
      message: e instanceof Error ? e.message : String(e),
    });
    recordStorageWrite({
      key: TENDERS_PIPELINE_KEY,
      bytes,
      writer: PIPELINE_LOCAL_WRITER,
      ok: false,
      tier: 1,
      note: mode === "index"
        ? (isQuota ? "quota_blocked_index" : "ls_write_error")
        : (isQuota ? "quota_exceeded_lean" : "save_error"),
    });
    return { mode, ok: false, bytes, reason: isQuota ? "quota" : "error" };
  }
}

/** Compat (flag OFF / fallback po ACK FAIL): LEGACY_LEAN = zdefiniowany format MAIN, nigdy INDEX. */
function writePipelineLsCompatLean(items: TenderPipelineItem[]): PipelineLocalWriteLsResult {
  const lean = stripTenderPipelineForLocalStorage(items);
  const result = writePipelineLsPayload(JSON.stringify(lean), "compat", items.length, "lean");
  // Rollback ON→OFF: LEAN nadpisuje INDEX przy następnym zapisie (DF §13); LS = LEAN(items).
  if (result.ok) markPipelineLsWriterState("LEGACY_LEAN", items);
  return result;
}

function recordLsSkipped(note: string): void {
  recordStorageWrite({ key: TENDERS_PIPELINE_KEY, bytes: 0, writer: PIPELINE_LOCAL_WRITER, ok: false, tier: 1, note });
}

/**
 * Phase 11 — obserwowalność HARD VERSION GATE. `flag_off` = normalny compat (bez wpisu);
 * każdy inny powód blokady przy fladze ON jest raportowany raz na zapis (bez ponownego
 * czytania ustawień — decyzja pochodzi z tego samego wywołania `isPipelineLocalIndexEnabled`).
 */
function recordIndexGateBlockedIfAny(): void {
  const gate = getLastPipelineLocalIndexGateDecision();
  if (gate == null || gate.allowed || gate.reason === "flag_off") return;
  recordStorageWrite({
    key: TENDERS_PIPELINE_KEY,
    bytes: 0,
    writer: PIPELINE_LOCAL_WRITER,
    ok: false,
    tier: 1,
    note: `index_gate_blocked:${gate.reason}:min=${gate.minAppVersion ?? "unset"}:client=${gate.appVersion ?? "unknown"}`,
  });
}

// ---------------------------------------------------------------------------
// Phase 5 — LS INDEX CUTOVER (PLAN Phase 5 GATE 5, DF §8.1/§8.2/§8.4).
// Legacy LS (LEGACY_FULL/LEGACY_LEAN) zostaje nadpisany INDEX-em WYŁĄCZNIE po ACK envelope,
// którego id-set ⊇ id-set legacy LS (∪ deletedIds). Inaczej LS pozostaje legacy (bez removeItem,
// bez compat overwrite) — dopóki nie istnieje durable FULL pokrywający legacy id-y.
// Kształt LS czytany raz na sesję (memo), tylko w ścieżce flag ON; flag OFF = 0 dodatkowego I/O.
// ---------------------------------------------------------------------------

interface PipelineLsWriterState {
  kind: PipelineLsKind;
  /** Tylko LEGACY_* — id-y wymagające pokrycia przed cutover; null = brak legacy do ochrony. */
  legacyIds: string[] | null;
}

let pipelineLsWriterState: PipelineLsWriterState | null = null;

function collectLsItemIds(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    const id = (item as { id?: unknown } | null | undefined)?.id;
    if (typeof id === "string" && id.length > 0) out.push(id);
  }
  return out;
}

function readPipelineLsWriterState(): PipelineLsWriterState {
  if (pipelineLsWriterState != null) return pipelineLsWriterState;
  const ls = detectPipelineLsKind(readPipelineLsRaw());
  const isLegacy = ls.kind === "LEGACY_FULL" || ls.kind === "LEGACY_LEAN";
  pipelineLsWriterState = {
    kind: ls.kind,
    legacyIds: isLegacy ? collectLsItemIds(ls.items ?? []) : null,
  };
  recordStorageWrite({
    key: TENDERS_PIPELINE_KEY,
    bytes: 0,
    writer: PIPELINE_LOCAL_WRITER,
    ok: true,
    tier: 1,
    note: `cutover_ls_kind:${ls.kind}`,
  });
  return pipelineLsWriterState;
}

/** Po udanym zapisie LS writer zna kształt bez ponownego czytania (brak full LS scan). */
function markPipelineLsWriterState(kind: PipelineLsKind, items: TenderPipelineItem[] | null): void {
  pipelineLsWriterState = {
    kind,
    legacyIds: items == null ? null : items.map((it) => it.id),
  };
}

export interface PipelineIndexCutoverDecision {
  ok: boolean;
  lsKind: PipelineLsKind;
  /** ≤ 50 id-ów legacy LS bez pokrycia w ACK-owanym FULL ∪ deletedIds. */
  missingIds: string[];
  /** Guard pominięty: jawnie pusta kolekcja (parity z MAIN / DF §3.3 EMPTY). */
  exemption?: "empty_collection";
}

export function evaluatePipelineIndexCutover(items: TenderPipelineItem[]): PipelineIndexCutoverDecision {
  const state = readPipelineLsWriterState();
  const legacyIds = state.legacyIds;
  if (legacyIds == null || legacyIds.length === 0) {
    return { ok: true, lsKind: state.kind, missingIds: [] };
  }
  // Jawnie pusta kolekcja = autoryzowane opróżnienie (reset/tombstony). Guard chroni przed
  // CZĘŚCIOWYM cutoverem, nie przed intencjonalnym `[]` — tam obowiązuje write-safety/reset (§10).
  if (items.length === 0) {
    return { ok: true, lsKind: state.kind, missingIds: [], exemption: "empty_collection" };
  }
  const covered = new Set<string>(items.map((it) => it.id));
  for (const id of getDeletedTenderIds()) covered.add(id);
  const missing = legacyIds.filter((id) => !covered.has(id));
  return { ok: missing.length === 0, lsKind: state.kind, missingIds: missing.slice(0, 50) };
}

/**
 * Canonical local pipeline writer (D6/D7). `items` = FULL wg kontraktu callera (Owner PH2-P2-01);
 * INDEX (`_lsIndex`) odrzucany przez VALIDATE §3.1 — bez RAM/IDB/LS. Sygnatura `(items) => void` bez zmian;
 * wynik dual-write dostępny przez `awaitPipelineLocalWriteSettled()`.
 */
export function saveTendersPipelineLocal(items: TenderPipelineItem[]): void {
  const indexMode = isPipelineLocalIndexEnabled();
  const validation = validatePipelineFullForWrite(items);

  // Kroki 1–3 (Phase 1): RAM coldMem (sync) + VALIDATE + IDB envelope write; Promise = read-back ACK.
  const ack = setPipelineColdMemory(items, { writer: PIPELINE_LOCAL_WRITER });

  let settled: Promise<PipelineLocalWriteResult>;

  if (!validation.ok) {
    // §3.1 FAIL ⇒ żaden zapis LS (INDEX ani compat). Telemetria `writer_validation_failed` już w cold.ts.
    recordLsSkipped(`ls_skipped:validation:${validation.reason}`);
    settled = ack.then((idb) => ({ idb, ls: { mode: "skipped", ok: false, bytes: 0, reason: "no_ack" } }));
  } else if (!indexMode) {
    // Flag OFF (compat, Phase 3 ⊇ MAIN): LEGACY_LEAN synchronicznie, bez czekania na ACK.
    // IDB FAIL w tym trybie = jak MAIN (telemetria envelope:* w cold.ts); LS lean nadal zapisany (DF §3.3 D/E).
    // Phase 11: flaga ON + bramka wersji BLOCK ⇒ ta sama ścieżka compat (fail closed) + sygnał.
    recordIndexGateBlockedIfAny();
    const ls = writePipelineLsCompatLean(items);
    settled = ack.then((idb) => ({ idb, ls }));
  } else {
    // Flag ON: LS INDEX wyłącznie PO ACK tego samego seq (IDB-first). Brak ACK ⇒ fallback compat LEAN (nie INDEX).
    settled = ack.then((idb) => {
      if (!idb.ok) {
        recordLsSkipped(`idb_write_failed:${idb.reason ?? "unknown"}:compat_write`);
        const ls = writePipelineLsCompatLean(items);
        if (!ls.ok) recordLsSkipped(`no_local_durable:${ls.reason ?? "error"}`);
        return { idb, ls };
      }
      // Phase 5: cutover legacy → INDEX dopiero gdy ACK-owany FULL pokrywa id-y legacy LS.
      const cutover = evaluatePipelineIndexCutover(items);
      if (!cutover.ok) {
        recordLsSkipped(
          `index_cutover_blocked:${cutover.lsKind}:legacy_ids_missing=${cutover.missingIds.length}`,
        );
        return { idb, ls: { mode: "skipped", ok: false, bytes: 0, reason: "legacy_subset" } };
      }
      try {
        // Krok 5: INDEX z jawnym seq = localSeq potwierdzony read-backiem; FULL nie jest mutowany.
        const index = buildTenderPipelineLsIndex(items, idb.localSeq);
        // Krok 6 (Phase 7, NEW-06 / DF §7 B): MEASURE na TYM SAMYM payloadzie, który pójdzie do
        // `setItem` — jedna serializacja i jeden pomiar na zapis.
        const payload = JSON.stringify(index);
        const budget = evaluatePipelineIndexBudget(lsPayloadBytes(payload));
        if (budget.state === "block") {
          // BLOCK = świadomy degraded mode: brak `setItem`, LS zachowuje poprzednią zawartość
          // (stary INDEX / legacy), envelope FULL w IDB pozostaje durable (PIPELINE-QUOTA-01).
          // Bez truncate, bez usuwania pól, bez partial INDEX, bez retry, bez removeItem.
          logPipelineLocalSaveTelemetry({
            kind: "budget_block",
            bytes: budget.bytes,
            itemCount: items.length,
            message: `index_budget_block:${budget.bytes}>=${budget.block}`,
          });
          recordStorageWrite({
            key: TENDERS_PIPELINE_KEY,
            bytes: budget.bytes,
            writer: PIPELINE_LOCAL_WRITER,
            ok: false,
            tier: 1,
            note: `index_budget_block:bytes=${budget.bytes}:block=${budget.block}`,
          });
          return { idb, ls: { mode: "skipped", ok: false, bytes: budget.bytes, reason: "budget_block" } };
        }
        if (budget.state === "warning") {
          // WARN nigdy nie blokuje zapisu (DF §7 B) — tylko sygnał obserwowalności.
          recordStorageWrite({
            key: TENDERS_PIPELINE_KEY,
            bytes: budget.bytes,
            writer: PIPELINE_LOCAL_WRITER,
            ok: true,
            tier: 1,
            note: `index_budget_warning:bytes=${budget.bytes}:warn=${budget.warn}`,
          });
        }
        // Krok 7: setItem tego samego payloadu; quota (warstwa A) obsłużona w seamie.
        const ls = writePipelineLsPayload(
          payload,
          "index",
          items.length,
          `index_written:seq=${idb.localSeq}`,
          budget.bytes,
        );
        if (ls.ok) markPipelineLsWriterState("INDEX", null);
        return { idb, ls };
      } catch (e) {
        recordLsSkipped(`index_build_failed:${e instanceof Error ? e.message : String(e)}`);
        return { idb, ls: { mode: "skipped", ok: false, bytes: 0, reason: "error" } };
      }
    });
  }

  // Wynik dostępny dla diag/testów; brak unhandled rejection przy fire-and-forget callerach.
  lastPipelineLocalWrite = settled;
  settled.catch(() => undefined);
  // Warstwa C (DF §7 C): pomiar całego LS PO zapisie, w idle, ≤ 1×/60 s — nigdy w hot-path
  // i nigdy jako warunek zapisu. Nie zmienia wyniku `settled`.
  scheduleLocalStorageTotalTelemetry();
}

// ---------------------------------------------------------------------------
// DF §A.5.2 — FULL-source resolver (PIPELINE-FULL-SOURCE-01). Kolejność D8: RAM → IDB (OK/LEGACY_ARRAY)
// → LS tylko LEGACY_FULL/LEGACY_LEAN. INDEX NIGDY nie jest zwracany jako FULL (NO_FULL + id-set).
// Phase 3: API dostępne; podłączenie callerów FULL-required (E1–E6) = Phase 4.
// ---------------------------------------------------------------------------

export type PipelineFullSourceResult =
  | {
      status: "FULL";
      items: TenderPipelineItem[];
      provenance: "RAM" | "IDB_OK" | "IDB_LEGACY_ARRAY" | "LS_LEGACY_FULL" | "LS_LEGACY_LEAN";
    }
  | {
      status: "NO_FULL";
      index: TenderPipelineIndexItemV1[] | null;
      lsKind: PipelineLsKind;
      idbStatus: PipelineIdbReadStatus;
    }
  | { status: "EMPTY" };

function readPipelineLsRaw(): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(TENDERS_PIPELINE_KEY);
  } catch {
    return null;
  }
}

export async function resolvePipelineFullSource(): Promise<PipelineFullSourceResult> {
  const ram = getPipelineColdMemory();
  if (ram != null) {
    // RAM = prawda sesji (D8). Jawnie pusta kolekcja po zapisie writera ⇒ EMPTY.
    if (ram.length > 0) return { status: "FULL", items: ram, provenance: "RAM" };
    return { status: "EMPTY" };
  }

  const idb = await hydratePipelineColdEnvelopeFromIdb();
  const idbFullShape = idb.status === "OK" || idb.status === "LEGACY_ARRAY";
  if (idbFullShape && idb.items && idb.items.length > 0) {
    return {
      status: "FULL",
      items: idb.items,
      provenance: idb.status === "OK" ? "IDB_OK" : "IDB_LEGACY_ARRAY",
    };
  }

  const ls = detectPipelineLsKind(readPipelineLsRaw());
  if (ls.kind === "LEGACY_FULL" || ls.kind === "LEGACY_LEAN") {
    // Provenance jawna — LEGACY_LEAN jest FULL w sensie kontraktu §A.4 (heavy → recovery §8.2), nie „promocją".
    return {
      status: "FULL",
      items: ls.items as TenderPipelineItem[],
      provenance: ls.kind === "LEGACY_FULL" ? "LS_LEGACY_FULL" : "LS_LEGACY_LEAN",
    };
  }

  const idbNoData = idb.status === "MISSING" || (idbFullShape && (!idb.items || idb.items.length === 0));
  if (idbNoData && (ls.kind === "MISSING" || ls.kind === "EMPTY")) return { status: "EMPTY" };

  return {
    status: "NO_FULL",
    index: ls.kind === "INDEX" ? (ls.items as TenderPipelineIndexItemV1[]) : null,
    lsKind: ls.kind,
    idbStatus: idb.status,
  };
}

// ---------------------------------------------------------------------------
// DF §A.5.3 — zewnętrzne źródło FULL (cloud lean / plik backupu / cloud snapshot).
// Jedyna dopuszczalna droga odzysku FULL, gdy lokalnie jest wyłącznie INDEX.
// ---------------------------------------------------------------------------

export type PipelineExternalFullReject =
  | "external_source_index"
  | "external_source_not_array"
  | `validation:${string}`
  | `index_ids_not_in_source:${number}`;

export type PipelineExternalFullResult =
  | { ok: true; items: TenderPipelineItem[] }
  | { ok: false; reason: PipelineExternalFullReject; missingIds?: string[] };

/**
 * §A.5.3 — `acceptExternalFull`. Kroki: klasa FULL (∄ `_lsIndex`) → VALIDATE §3.1 →
 * SUBSET `ids(INDEX_local) ⊆ ids(source) ∪ deletedIds` → FULL′ = source **nienaruszone**
 * (bez merge z INDEX). REJECT nie kasuje niczego lokalnie (CASE 7 = deterministyczny brak zapisu).
 */
export function acceptExternalFull(
  source: unknown,
  indexIds: string[] = [],
  deletedIds: string[] = getDeletedTenderIds(),
): PipelineExternalFullResult {
  if (!Array.isArray(source)) return { ok: false, reason: "external_source_not_array" };
  const representation = classifyPipelineRepresentation(source);
  if (representation === "INDEX" || representation === "INDEX_INVALID") {
    return { ok: false, reason: "external_source_index" };
  }
  const items = source as TenderPipelineItem[];
  const validation = validatePipelineFullForWrite(items);
  if (!validation.ok) return { ok: false, reason: `validation:${validation.reason}` };

  const known = new Set<string>(items.map((it) => it.id));
  for (const id of deletedIds) known.add(id);
  const missing = indexIds.filter((id) => !known.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `index_ids_not_in_source:${missing.length}`,
      missingIds: missing.slice(0, 50),
    };
  }
  return { ok: true, items };
}

/**
 * §A.6.2 — DESIGN-C registry FULL → bridge → cold. No cloud write / no re-ingest.
 * INDEX na wejściu ⇒ zwrot bez hydracji i bez zapisu (hydracja artefaktów do INDEX = konwersja).
 */
function finalizePipelineLoadWithIngestHydrate(
  items: TenderPipelineItem[],
  opts?: { persistAlways?: boolean },
): TenderPipelineItem[] {
  if (hasLsIndexMarker(items)) {
    recordPipelineReadTelemetry("ingest_hydrate_skipped:index_not_full");
    return items;
  }
  const { items: hydrated, hydratedCount } = hydratePipelineItemsFromIngestRegistry(items);
  if (opts?.persistAlways || hydratedCount > 0) {
    saveTendersPipelineLocal(hydrated);
  }
  return hydrated;
}

/**
 * §4.3 / §A.7 CASE 2–3, 6–7 — brak valid FULL lokalnie. Recovery WYŁĄCZNIE z cloud lean jako
 * całości (§A.5.3). Zakaz `merge(INDEX, cloud)`. Brak push (recovery jest lokalne).
 */
async function recoverPipelineFullFromCloud(
  source: Extract<PipelineFullSourceResult, { status: "NO_FULL" }>,
): Promise<TenderPipelineItem[]> {
  const indexItems = (source.index ?? []) as unknown as TenderPipelineItem[];
  markPipelineFullAvailability("DEGRADED_INDEX", `no_full:${source.lsKind}:${source.idbStatus}`);
  recordPipelineReadTelemetry(`index_without_full:${source.lsKind}:${source.idbStatus}`);

  let cloud: unknown = null;
  try {
    [cloud] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY]);
  } catch {
    // CASE 6 — cloud niedostępny: INDEX pozostaje jedynym lokalnym źródłem (read-only, 0 zapisów).
    recordPipelineReadTelemetry("recovery_unavailable:cloud_fetch_failed");
    return indexItems;
  }
  if (cloud == null || !Array.isArray(cloud)) {
    recordPipelineReadTelemetry("recovery_unavailable:cloud_empty");
    return indexItems;
  }

  const accepted = acceptExternalFull(cloud, (source.index ?? []).map((it) => it.id));
  if (!accepted.ok) {
    // CASE 7 — subset FAIL / niepoprawne źródło: brak zapisu FULL, brak push, stan DEGRADED_INDEX.
    recordPipelineReadTelemetry(`recovery_rejected:${accepted.reason.replace("index_ids_not_in_source", "index_ids_not_in_cloud")}`);
    return indexItems;
  }

  // FULL′ nienaruszone → canonical writer (envelope + ACK + rebuild LS). Cloud nie jest zapisywany.
  saveTendersPipelineLocal(accepted.items);
  markPipelineFullAvailability("FULL", "recovery.cloud_lean");
  return finalizePipelineLoadWithIngestHydrate(accepted.items);
}

export async function loadTendersPipeline(): Promise<TenderPipelineItem[]> {
  try {
    // FULL-required (§4.1): RAM → valid IDB → LS tylko LEGACY_*; INDEX nigdy jako FULL.
    const source = await resolvePipelineFullSource();
    if (source.status === "NO_FULL") return await recoverPipelineFullFromCloud(source);

    const local = source.status === "FULL" ? source.items : [];
    markPipelineFullAvailability(
      source.status === "FULL" ? "FULL" : "EMPTY",
      source.status === "FULL" ? `source:${source.provenance}` : "source:empty",
    );
    const [cloud] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY]);
    if (cloud == null || !Array.isArray(cloud)) {
      return finalizePipelineLoadWithIngestHydrate(local);
    }
    const merged = mergeTenderPipelineForCloud(local, cloud);
    return finalizePipelineLoadWithIngestHydrate(merged, { persistAlways: true });
  } catch {
    const fallback = await resolvePipelineFullSource();
    if (fallback.status === "FULL") {
      markPipelineFullAvailability("FULL", `catch:${fallback.provenance}`);
      return finalizePipelineLoadWithIngestHydrate(fallback.items);
    }
    if (fallback.status === "EMPTY") {
      markPipelineFullAvailability("EMPTY", "catch:empty");
      return [];
    }
    markPipelineFullAvailability("DEGRADED_INDEX", `catch:no_full:${fallback.lsKind}`);
    recordPipelineReadTelemetry(`index_without_full:${fallback.lsKind}:${fallback.idbStatus}`);
    return (fallback.index ?? []) as unknown as TenderPipelineItem[];
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
  const { pushTenderPipelineToCloud } = await import(
    "@/lib/tender-pipeline/tender-pipeline-cloud-push"
  );
  await pushTenderPipelineToCloud(items);
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
