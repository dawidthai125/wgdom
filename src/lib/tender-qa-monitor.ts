/**
 * P2-D.2 — monitoring pytań i odpowiedzi (Q&A) w przetargach.
 * SSOT heurystyk Q&A · snapshot + diff · bez analizy PDF.
 */
import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";

export type TenderQaEventType = "NEW_QA" | "QA_UPDATED" | "QA_BATCH";

export type TenderQaFilter = "all" | "new" | "updated";

export type TenderQaDocKind = "question" | "answer" | "clarification" | "qa_mixed";

/** Rozszerzone wzorce nazw plików Q&A (e-Zamówienia / Logintrade / BIP). */
const QA_FILENAME_PATTERNS = [
  /pytania\s*wykonaw/i,
  /pytania\s*i\s*odpowied/i,
  /odpowiedzi\s*na\s*pytania/i,
  /wyjaśnien/i,
  /wyjasnien/i,
  /treści\s*swz/i,
  /tresc\s*swz/i,
  /\bq\s*&\s*a\b/i,
  /\bqa\b/i,
  /pytan/i,
  /odpowied/i,
  /question/i,
  /answer/i,
  /clarification/i,
];

export interface TenderQaFingerprint {
  key: string;
  filename: string;
  hash: string;
  kind: TenderQaDocKind;
  source: "bzp" | "external";
}

export interface TenderQaSnapshot {
  tenderId: string;
  qaCount: number;
  qaHashes: string[];
  items: TenderQaFingerprint[];
  lastQaAt: string | null;
  capturedAt: string;
}

export interface TenderQaEvent {
  id: string;
  type: TenderQaEventType;
  at: string;
  tenderItemId: string;
  tenderTitle: string;
  bzpNumber: string;
  summary: string;
  details?: string;
  filenames?: string[];
  count?: number;
  aiSummary?: string;
  acknowledged?: boolean;
}

export interface TenderQaMonitorState {
  snapshot: TenderQaSnapshot | null;
  events: TenderQaEvent[];
  lastCheckedAt: string | null;
  unseenCount: number;
}

const MAX_QA_EVENTS = 40;
const QA_BATCH_THRESHOLD = 2;

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Czy nazwa pliku wygląda na Q&A / wyjaśnienia (SSOT dla całego modułu przetargów). */
export function isQaDocumentFilename(filename: string): boolean {
  const n = filename.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return QA_FILENAME_PATTERNS.some((re) => re.test(n));
}

export function classifyQaDocumentKind(filename: string): TenderQaDocKind {
  const n = filename.toLowerCase();
  const hasQuestion = /pytan|question|\bqa\b/i.test(n);
  const hasAnswer = /odpowied|answer|wyjaśn|wyjasn/i.test(n);
  if (hasQuestion && hasAnswer) return "qa_mixed";
  if (/wyjaśn|wyjasn|treści swz|tresc swz|clarification/i.test(n)) return "clarification";
  if (hasAnswer) return "answer";
  if (hasQuestion) return "question";
  return "qa_mixed";
}

function fingerprintFromBzp(doc: TenderBzpDocument): TenderQaFingerprint | null {
  if (!isQaDocumentFilename(doc.filename)) return null;
  const key = doc.documentId || `idx-${doc.index}`;
  return {
    key,
    filename: doc.filename,
    hash: simpleHash(`${key}|${doc.filename}|${doc.downloadUrl}|${doc.contentType}`),
    kind: classifyQaDocumentKind(doc.filename),
    source: "bzp",
  };
}

function fingerprintsFromExternal(discovery?: TenderExternalDocDiscovery | null): TenderQaFingerprint[] {
  if (!discovery?.files?.length) return [];
  return discovery.files
    .map((f, idx) => {
      if (!isQaDocumentFilename(f.filename)) return null;
      const key = f.id || `ext-${idx}`;
      return {
        key,
        filename: f.filename,
        hash: simpleHash(`${key}|${f.filename}|${f.publicUrl}`),
        kind: classifyQaDocumentKind(f.filename),
        source: "external" as const,
      };
    })
    .filter(Boolean) as TenderQaFingerprint[];
}

export function buildTenderQaSnapshot(
  item: Pick<TenderPipelineItem, "tenderId" | "externalDocDiscovery">,
  documents?: TenderBzpDocument[],
): TenderQaSnapshot {
  const docs = documents ?? [];
  const items = [
    ...docs.map(fingerprintFromBzp).filter(Boolean) as TenderQaFingerprint[],
    ...fingerprintsFromExternal(item.externalDocDiscovery),
  ];
  const now = new Date().toISOString();
  return {
    tenderId: item.tenderId,
    qaCount: items.length,
    qaHashes: items.map((i) => i.hash),
    items,
    lastQaAt: items.length > 0 ? now : null,
    capturedAt: now,
  };
}

/** Podsumowanie z nazw plików (bez PDF) — max 2–3 zdania. */
export function generateQaAiSummary(filenames: string[]): string {
  if (filenames.length === 0) return "";
  const text = filenames.join(" ").toLowerCase();
  const hints: string[] = [];

  if (/dopuszcz|zamienn|równoważ|rownowaz|ekwiwalent/.test(text)) {
    hints.push("Publikacja może dotyczyć dopuszczenia zamienników lub materiałów równoważnych — zweryfikuj wymagania techniczne oferty.");
  }
  if (/termin|przedłu|przedluz|harmonogram|deadline/.test(text)) {
    hints.push("W materiałach Q&A może być korekta terminów składania ofert lub realizacji.");
  }
  if (/materiał|material|technolog|wykonan/.test(text)) {
    hints.push("Możliwa zmiana technologii wykonania lub specyfikacji materiałów.");
  }
  if (/doświadczen|doswiadczen|kwalifik|referenc/.test(text)) {
    hints.push("Zamawiający mógł doprecyzować wymagania doświadczenia lub referencji wykonawcy.");
  }
  if (/zakres|przedmiar|korekt|zmian/.test(text)) {
    hints.push("Odpowiedź może korygować zakres robót lub przedmiar — sprawdź kosztorys i wycenę.");
  }

  if (hints.length === 0) {
    const names = filenames
      .slice(0, 2)
      .map((f) => f.replace(/\.(pdf|docx?|zip|xlsx?)$/i, ""))
      .join(", ");
    return `Nowe pliki Q&A (${names}) — pobierz i oceń wpływ na ofertę przed terminem składania.`;
  }
  return hints.slice(0, 2).join(" ");
}

function qaEventId(type: TenderQaEventType, tenderItemId: string, suffix: string): string {
  return `qa-${type}-${tenderItemId}-${suffix}`;
}

export function diffTenderQaSnapshots(
  item: Pick<TenderPipelineItem, "id" | "title" | "bzpNumber">,
  prev: TenderQaSnapshot,
  next: TenderQaSnapshot,
  at = new Date().toISOString(),
): TenderQaEvent[] {
  const events: TenderQaEvent[] = [];
  const prevByKey = new Map(prev.items.map((d) => [d.key, d]));
  const nextByKey = new Map(next.items.map((d) => [d.key, d]));

  const newItems = next.items.filter((d) => !prevByKey.has(d.key));
  const updatedItems = next.items.filter((d) => {
    const p = prevByKey.get(d.key);
    return p && p.hash !== d.hash;
  });

  const newAnswers = newItems.filter((d) => d.kind === "answer" || d.kind === "qa_mixed" || d.kind === "clarification");
  const updatedAnswers = updatedItems.filter((d) => d.kind !== "question");

  if (newAnswers.length >= QA_BATCH_THRESHOLD) {
    const filenames = newAnswers.map((d) => d.filename);
    events.push({
      id: qaEventId("QA_BATCH", item.id, at),
      type: "QA_BATCH",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `Dodano ${newAnswers.length} odpowiedzi`,
      count: newAnswers.length,
      filenames,
      details: filenames.slice(0, 4).join(", "),
      aiSummary: generateQaAiSummary(filenames),
    });
  } else if (newAnswers.length === 1) {
    const f = newAnswers[0];
    events.push({
      id: qaEventId("NEW_QA", item.id, f.key),
      type: "NEW_QA",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: "Dodano odpowiedź na pytanie",
      filenames: [f.filename],
      details: f.filename,
      count: 1,
      aiSummary: generateQaAiSummary([f.filename]),
    });
  } else if (newItems.length > 0) {
    const filenames = newItems.map((d) => d.filename);
    events.push({
      id: qaEventId("NEW_QA", item.id, at),
      type: "NEW_QA",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `Dodano ${newItems.length} plik(ów) Q&A`,
      count: newItems.length,
      filenames,
      details: filenames.slice(0, 3).join(", "),
      aiSummary: generateQaAiSummary(filenames),
    });
  }

  for (const doc of updatedAnswers) {
    events.push({
      id: qaEventId("QA_UPDATED", item.id, doc.key),
      type: "QA_UPDATED",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: "Zmieniono odpowiedź",
      filenames: [doc.filename],
      details: doc.filename,
      aiSummary: generateQaAiSummary([doc.filename]),
    });
  }

  return events;
}

export function processTenderQaMonitorUpdate(
  item: TenderPipelineItem,
  input?: {
    documents?: TenderBzpDocument[];
    externalDocDiscovery?: TenderExternalDocDiscovery | null;
  },
): { qaMonitor: TenderQaMonitorState; newEvents: TenderQaEvent[] } {
  const now = new Date().toISOString();
  const merged: TenderPipelineItem = {
    ...item,
    externalDocDiscovery: input?.externalDocDiscovery !== undefined
      ? input.externalDocDiscovery
      : item.externalDocDiscovery,
  };
  const nextSnapshot = buildTenderQaSnapshot(
    merged,
    input?.documents ?? item.bzpDocuments,
  );
  const prevSnapshot = item.qaMonitor?.snapshot ?? null;
  const prevEvents = item.qaMonitor?.events ?? [];

  if (!prevSnapshot) {
    return {
      qaMonitor: {
        snapshot: nextSnapshot,
        events: prevEvents,
        lastCheckedAt: now,
        unseenCount: item.qaMonitor?.unseenCount ?? 0,
      },
      newEvents: [],
    };
  }

  const newEvents = diffTenderQaSnapshots(item, prevSnapshot, nextSnapshot, now);
  const events = [...prevEvents, ...newEvents].slice(-MAX_QA_EVENTS);
  const unseenCount = (item.qaMonitor?.unseenCount ?? 0) + newEvents.length;

  return {
    qaMonitor: {
      snapshot: nextSnapshot,
      events,
      lastCheckedAt: now,
      unseenCount,
    },
    newEvents,
  };
}

export function collectAllQaEvents(items: TenderPipelineItem[]): TenderQaEvent[] {
  return items
    .flatMap((i) => i.qaMonitor?.events ?? [])
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function filterQaEvents(events: TenderQaEvent[], filter: TenderQaFilter): TenderQaEvent[] {
  if (filter === "all") return events;
  if (filter === "new") return events.filter((e) => e.type === "NEW_QA" || e.type === "QA_BATCH");
  return events.filter((e) => e.type === "QA_UPDATED");
}

export function countRecentQaEvents(items: TenderPipelineItem[], withinHours = 168): number {
  const cutoff = Date.now() - withinHours * 3600_000;
  return collectAllQaEvents(items).filter((e) => new Date(e.at).getTime() >= cutoff).length;
}

export function countUnseenQaEvents(items: TenderPipelineItem[]): number {
  return items.reduce((sum, i) => sum + (i.qaMonitor?.unseenCount ?? 0), 0);
}

export function qaEventPriority(
  event: TenderQaEvent,
  now = new Date(),
): "HIGH" | "MEDIUM" {
  const ageMs = now.getTime() - new Date(event.at).getTime();
  const within24h = ageMs < 24 * 3600_000;
  const batchSize = event.count ?? 1;
  if (within24h || batchSize >= 3 || event.type === "QA_BATCH") return "HIGH";
  return "MEDIUM";
}

export function isUrgentQaEvent(event: TenderQaEvent, now = new Date()): boolean {
  return qaEventPriority(event, now) === "HIGH";
}

export function formatRelativeQaTime(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = now.getTime() - t;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dzień temu" : `${days} dni temu`;
}

export function qaMonitorSummary(items: TenderPipelineItem[]): {
  recentCount: number;
  unseenCount: number;
  lastAt: string | null;
  lastRelative: string | null;
} {
  const events = collectAllQaEvents(items);
  const cutoff = Date.now() - 7 * 24 * 3600_000;
  const recent = events.filter((e) => new Date(e.at).getTime() >= cutoff);
  const lastAt = events[0]?.at ?? null;
  return {
    recentCount: recent.length,
    unseenCount: countUnseenQaEvents(items),
    lastAt,
    lastRelative: lastAt ? formatRelativeQaTime(lastAt) : null,
  };
}

export function qaEventTypeLabel(type: TenderQaEventType): string {
  switch (type) {
    case "NEW_QA": return "Nowa odpowiedź";
    case "QA_UPDATED": return "Zmieniona odpowiedź";
    case "QA_BATCH": return "Pakiet odpowiedzi";
  }
}
