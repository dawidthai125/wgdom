import { fetchKeysFromCloud, persistKey, API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import {
  matchTenderKeywords,
  isExcludedTenderTitle,
  hasRenovationSignal,
  TENDER_PRIORITY_BUILDING_HINTS,
} from "@/lib/tenders-bzp-keywords";

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
  opts?: { priorityOrg?: boolean },
): { score: number; keywords: string[]; excluded: boolean } {
  const title = `${n.orderObject || ""} ${n.cpvCode || ""}`.toLowerCase();
  if (isExcludedTenderTitle(title)) {
    return { score: 0, keywords: [], excluded: true };
  }
  const { actionKeywords, scopeKeywords, allKeywords } = matchTenderKeywords(title);
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
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTendersPipelineLocal(items: TenderPipelineItem[]): void {
  try {
    localStorage.setItem(TENDERS_PIPELINE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export async function loadTendersPipeline(): Promise<TenderPipelineItem[]> {
  try {
    const [cloud] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY]);
    if (Array.isArray(cloud) && cloud.length >= 0) {
      const items = cloud as TenderPipelineItem[];
      saveTendersPipelineLocal(items);
      return items;
    }
  } catch { /* offline */ }
  return loadTendersPipelineLocal();
}

export async function saveTendersPipeline(items: TenderPipelineItem[]): Promise<void> {
  saveTendersPipelineLocal(items);
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
