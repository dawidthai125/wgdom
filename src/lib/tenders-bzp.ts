import { fetchKeysFromCloud, persistKey, API_BASE, API_HEADERS } from "@/lib/cloud-sync";

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
  addedAt: string;
  updatedAt: string;
  ezamowieniaUrl: string;
}

const INCLUDE_KEYWORDS = [
  "remont",
  "moderniz",
  "termomoderniz",
  "wykończ",
  "wykończen",
  "przebudow",
  "renowac",
  "adaptacj",
  "rehabilit",
  "odśwież",
  "termo",
];

const EXCLUDE_KEYWORDS = [
  "drogi wojewódzk",
  "nawierzchni jezdni",
  "chodników drogow",
  "przebudowa drogi",
  "rozbudowa skrzyżowania",
  "budowa drogi",
  "kanalizacji deszczowej",
  "wodociąg",
  "gazociąg",
  "most ",
  "wiadukt",
];

export function tenderEzamowieniaUrl(tenderId: string): string {
  if (!tenderId) return "https://ezamowienia.gov.pl/mo-client-board/";
  return `https://ezamowienia.gov.pl/mp-client/search/list/${encodeURIComponent(tenderId)}`;
}

export function scoreTenderNotice(n: BzpNoticeRaw): { score: number; keywords: string[]; excluded: boolean } {
  const title = `${n.orderObject || ""} ${n.cpvCode || ""}`.toLowerCase();
  const keywords: string[] = [];
  for (const kw of INCLUDE_KEYWORDS) {
    if (title.includes(kw)) keywords.push(kw);
  }
  for (const ex of EXCLUDE_KEYWORDS) {
    if (title.includes(ex)) return { score: 0, keywords, excluded: true };
  }
  let score = keywords.length * 10;
  const city = (n.organizationCity || "").toLowerCase();
  if (city.includes("wrocław") || city.includes("wroclaw")) score += 25;
  if ((n.orderObject || "").toLowerCase().includes("wrocław")) score += 15;
  if ((n.cpvCode || "").includes("454")) score += 5;
  if ((n.cpvCode || "").includes("452")) score += 3;
  if (keywords.length === 0 && score < 20) return { score: 0, keywords, excluded: true };
  return { score, keywords, excluded: false };
}

export function mapBzpToPipelineItem(n: BzpNoticeRaw, existing?: TenderPipelineItem): TenderPipelineItem {
  const { score, keywords } = scoreTenderNotice(n);
  const id = String(n.objectId || n.moIdentifier || n.bzpNumber || "");
  const now = new Date().toISOString();
  const city = n.organizationCity || "";
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
  return [...map.values()].sort((a, b) => {
    const da = a.submittingOffersDate || a.publicationDate;
    const db = b.submittingOffersDate || b.publicationDate;
    return db.localeCompare(da);
  });
}

export async function fetchBzpTendersFromServer(opts?: {
  days?: number;
  pages?: number;
  province?: string;
}): Promise<BzpNoticeRaw[]> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const params = new URLSearchParams({
    days: String(opts?.days ?? 30),
    pages: String(opts?.pages ?? 4),
    province: opts?.province ?? "PL02",
  });
  const res = await fetch(`${API_BASE}/tenders-bzp-search?${params}`, { headers: API_HEADERS });
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
