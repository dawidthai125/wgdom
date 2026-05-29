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
  priorityBuyerId: string | null;
  priorityBuyerLabel: string | null;
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

/** Kluczowi wrocławscy zamawiający — dedykowane zapytania organizationName w BZP. */
export const WROCLAW_PRIORITY_BUYERS = [
  { id: "wm", label: "Wrocławskie Mieszkania", search: "Wrocławskie Mieszkania", cityOnly: true },
  { id: "zik", label: "Zarząd Zasobu Komunalnego", search: "Zarząd Zasobu Komunalnego", cityOnly: true },
  { id: "zim", label: "Gmina Wrocław – ZIM", search: "Zarząd Inwestycji Miejskich", cityOnly: true },
  { id: "tbs", label: "TBS Wrocław", search: "Budownictwa Społecznego Wrocław", cityOnly: false },
  { id: "gmina", label: "Gmina Wrocław", search: "Gmina Wrocław", cityOnly: true },
  { id: "mops", label: "MOPS Wrocław", search: "Miejski Ośrodek Pomocy Społecznej", cityOnly: true, organizationCity: "Wrocław" },
] as const;

const PRIORITY_BUILDING_HINTS = [
  "lokal", "mieszkal", "pustostan", "budynk", "klatk", "elewac", "stolark",
  "sanitar", "piętr", "pietr", "wind", "dźwig", "dzwig", "remont", "moderniz",
  "przebudow", "wykończ", "wykończen", "adaptac", "izolac", "pensjonat", "pomieszcze", "monta",
];

export function matchPriorityBuyer(orgName: string, organizationCity?: string): { id: string; label: string } | null {
  const n = orgName || "";
  const city = (organizationCity || "").toLowerCase();
  const isWroclawCity = city.includes("wrocław") || city.includes("wroclaw");
  for (const b of WROCLAW_PRIORITY_BUYERS) {
    if (b.id === "wm" && /wrocławskie\s+mieszkania/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "zik" && /zarząd\s+zasobu\s+komunalnego/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "zim" && /zarząd\s+inwestycji\s+miejskich/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "tbs" && /budownictwa\s+społecznego\s+wrocław|tbs.*wrocław|tbś.*wrocław/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "gmina" && /gmina\s+wrocław/i.test(n) && !/kąty|wrocławski/i.test(n)) return { id: b.id, label: b.label };
    if (b.id === "mops" && /miejski\s+ośrodek\s+pomocy\s+społecznej/i.test(n) && (isWroclawCity || /we\s+wrocławiu/i.test(n))) {
      return { id: b.id, label: b.label };
    }
  }
  return null;
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
  const priority = opts?.priorityOrg || !!matchPriorityBuyer(n.organizationName || "", n.organizationCity);
  if (priority) score += 20;
  if (keywords.length === 0 && priority && PRIORITY_BUILDING_HINTS.some((h) => title.includes(h))) {
    score = Math.max(score, 18);
  }
  if (keywords.length === 0 && score < 20) return { score: 0, keywords, excluded: true };
  return { score, keywords, excluded: false };
}

export function mapBzpToPipelineItem(n: BzpNoticeRaw, existing?: TenderPipelineItem): TenderPipelineItem {
  const priority = matchPriorityBuyer(n.organizationName || "", city);
  const { score, keywords } = scoreTenderNotice(n, { priorityOrg: !!priority });
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
  orgPages?: number;
}): Promise<BzpNoticeRaw[]> {
  if (!API_BASE) throw new Error("Brak konfiguracji Supabase");
  const params = new URLSearchParams({
    days: String(opts?.days ?? 60),
    pages: String(opts?.pages ?? 4),
    orgPages: String(opts?.orgPages ?? 3),
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
