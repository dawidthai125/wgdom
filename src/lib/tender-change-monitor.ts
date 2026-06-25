/**
 * P2-D.1 — monitoring zmian dokumentacji i terminów przetargów.
 * Snapshot + diff — dane w TenderPipelineItem.changeMonitor (sync KV).
 */
import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import { isActionableTender } from "@/lib/tenders-bzp";
import {
  canRunDocumentDiscovery,
  runTenderDocumentDiscovery,
} from "@/lib/tender-document-discovery";
import type { TenderExternalDocDiscovery } from "@/lib/tender-external-docs";
import { isQaDocumentFilename, processTenderQaMonitorUpdate } from "@/lib/tender-qa-monitor";

export type TenderChangeEventType =
  | "NEW_DOCUMENT"
  | "DOCUMENT_UPDATED"
  | "DOCUMENT_REMOVED"
  | "DEADLINE_CHANGED"
  | "NEW_QA";

export type TenderChangeFilter = "all" | "documents" | "deadline" | "qa";

export interface TenderDocumentFingerprint {
  key: string;
  documentId: string;
  filename: string;
  contentType: string;
  downloadUrl: string;
  hash: string;
  source: "bzp" | "external";
  isQaHint: boolean;
}

export interface TenderChangeSnapshot {
  tenderId: string;
  capturedAt: string;
  docCount: number;
  documentHashes: string[];
  documents: TenderDocumentFingerprint[];
  deadline: string | null;
  qaDocCount: number;
  externalDocCount: number;
}

export interface TenderChangeEvent {
  id: string;
  type: TenderChangeEventType;
  at: string;
  tenderItemId: string;
  tenderTitle: string;
  bzpNumber: string;
  summary: string;
  details?: string;
  acknowledged?: boolean;
}

export interface TenderChangeMonitorState {
  snapshot: TenderChangeSnapshot | null;
  events: TenderChangeEvent[];
  lastCheckedAt: string | null;
  unseenCount: number;
}

const MAX_EVENTS = 50;

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export { isQaDocumentFilename } from "@/lib/tender-qa-monitor";

export function normalizeTenderDeadline(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function fingerprintFromBzp(doc: TenderBzpDocument): TenderDocumentFingerprint {
  const key = doc.documentId || `idx-${doc.index}`;
  const raw = `${key}|${doc.filename}|${doc.downloadUrl}|${doc.contentType}|${doc.platform ?? ""}`;
  return {
    key,
    documentId: doc.documentId,
    filename: doc.filename,
    contentType: doc.contentType,
    downloadUrl: doc.downloadUrl,
    hash: simpleHash(raw),
    source: "bzp",
    isQaHint: isQaDocumentFilename(doc.filename),
  };
}

function fingerprintsFromExternal(discovery?: TenderExternalDocDiscovery | null): TenderDocumentFingerprint[] {
  if (!discovery?.files?.length) return [];
  return discovery.files.map((f, idx) => {
    const key = f.id || `ext-${idx}`;
    const raw = `${key}|${f.filename}|${f.publicUrl}`;
    return {
      key,
      documentId: key,
      filename: f.filename,
      contentType: "",
      downloadUrl: f.publicUrl,
      hash: simpleHash(raw),
      source: "external",
      isQaHint: isQaDocumentFilename(f.filename),
    };
  });
}

/** Snapshot bieżącego stanu dokumentów + terminu. */
export function buildTenderChangeSnapshot(
  item: Pick<TenderPipelineItem, "tenderId" | "submittingOffersDate" | "externalDocDiscovery">,
  documents?: TenderBzpDocument[],
): TenderChangeSnapshot {
  const docs = documents ?? [];
  const external = fingerprintsFromExternal(item.externalDocDiscovery);
  const bzp = docs.map(fingerprintFromBzp);
  const all = [...bzp, ...external];
  const now = new Date().toISOString();
  return {
    tenderId: item.tenderId,
    capturedAt: now,
    docCount: all.length,
    documentHashes: all.map((d) => d.hash),
    documents: all,
    deadline: normalizeTenderDeadline(item.submittingOffersDate),
    qaDocCount: all.filter((d) => d.isQaHint).length,
    externalDocCount: external.length,
  };
}

function daysDelta(prevIso: string | null, nextIso: string | null): number | null {
  if (!prevIso || !nextIso) return null;
  const prev = new Date(prevIso).getTime();
  const next = new Date(nextIso).getTime();
  if (Number.isNaN(prev) || Number.isNaN(next)) return null;
  return Math.round((next - prev) / 86_400_000);
}

function eventId(type: TenderChangeEventType, tenderItemId: string, at: string): string {
  return `${type}-${tenderItemId}-${at}`;
}

/** Porównanie snapshotów → zdarzenia. */
export function diffTenderChangeSnapshots(
  item: Pick<TenderPipelineItem, "id" | "title" | "bzpNumber">,
  prev: TenderChangeSnapshot,
  next: TenderChangeSnapshot,
  at = new Date().toISOString(),
): TenderChangeEvent[] {
  const events: TenderChangeEvent[] = [];
  const prevByKey = new Map(prev.documents.map((d) => [d.key, d]));
  const nextByKey = new Map(next.documents.map((d) => [d.key, d]));

  const newDocs = next.documents.filter((d) => !prevByKey.has(d.key));
  const removedDocs = prev.documents.filter((d) => !nextByKey.has(d.key));
  const updatedDocs = next.documents.filter((d) => {
    const p = prevByKey.get(d.key);
    return p && p.hash !== d.hash;
  });

  const newNonQa = newDocs.filter((d) => !d.isQaHint);
  const updatedNonQa = updatedDocs.filter((d) => !d.isQaHint);
  const removedNonQa = removedDocs.filter((d) => !d.isQaHint);

  if (newNonQa.length > 0) {
    events.push({
      id: eventId("NEW_DOCUMENT", item.id, at),
      type: "NEW_DOCUMENT",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `+${newNonQa.length} now${newNonQa.length === 1 ? "y" : "e"} dokument${newNonQa.length === 1 ? "" : "y"}`,
      details: newNonQa.map((d) => d.filename).slice(0, 5).join(", "),
    });
  }

  for (const doc of updatedNonQa) {
    events.push({
      id: eventId("DOCUMENT_UPDATED", `${item.id}-${doc.key}`, at),
      type: "DOCUMENT_UPDATED",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `Dokument zmieniony: ${doc.filename}`,
    });
  }

  for (const doc of removedNonQa) {
    events.push({
      id: eventId("DOCUMENT_REMOVED", `${item.id}-${doc.key}`, at),
      type: "DOCUMENT_REMOVED",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `Usunięto dokument: ${doc.filename}`,
    });
  }

  if (prev.deadline !== next.deadline && next.deadline) {
    const delta = daysDelta(prev.deadline, next.deadline);
    const deltaLabel = delta != null
      ? delta > 0
        ? `przesunięty o ${delta} dni`
        : delta < 0
          ? `skrócony o ${Math.abs(delta)} dni`
          : "zmieniony (ten sam dzień, inna godzina)"
      : "zmieniony";
    events.push({
      id: eventId("DEADLINE_CHANGED", item.id, at),
      type: "DEADLINE_CHANGED",
      at,
      tenderItemId: item.id,
      tenderTitle: item.title,
      bzpNumber: item.bzpNumber,
      summary: `Termin ${deltaLabel}`,
      details: next.deadline,
    });
  }

  return events;
}

export function processTenderChangeMonitorUpdate(
  item: TenderPipelineItem,
  input?: {
    documents?: TenderBzpDocument[];
    submittingOffersDate?: string | null;
    externalDocDiscovery?: TenderExternalDocDiscovery | null;
  },
): { changeMonitor: TenderChangeMonitorState; newEvents: TenderChangeEvent[] } {
  const now = new Date().toISOString();
  const mergedItem: TenderPipelineItem = {
    ...item,
    submittingOffersDate: input?.submittingOffersDate !== undefined
      ? input.submittingOffersDate
      : item.submittingOffersDate,
    externalDocDiscovery: input?.externalDocDiscovery !== undefined
      ? input.externalDocDiscovery
      : item.externalDocDiscovery,
  };
  const nextSnapshot = buildTenderChangeSnapshot(
    mergedItem,
    input?.documents ?? item.bzpDocuments,
  );
  const prevSnapshot = item.changeMonitor?.snapshot ?? null;
  const prevEvents = item.changeMonitor?.events ?? [];

  if (!prevSnapshot) {
    return {
      changeMonitor: {
        snapshot: nextSnapshot,
        events: prevEvents,
        lastCheckedAt: now,
        unseenCount: item.changeMonitor?.unseenCount ?? 0,
      },
      newEvents: [],
    };
  }

  const newEvents = diffTenderChangeSnapshots(item, prevSnapshot, nextSnapshot, now);
  const events = [...prevEvents, ...newEvents].slice(-MAX_EVENTS);
  const unseenCount = (item.changeMonitor?.unseenCount ?? 0) + newEvents.length;

  return {
    changeMonitor: {
      snapshot: nextSnapshot,
      events,
      lastCheckedAt: now,
      unseenCount,
    },
    newEvents,
  };
}

/** Po merge BZP — wykryj zmianę terminu bez ponownego skanowania dokumentów. */
export function applyBzpMergeChangeMonitor(
  prev: TenderPipelineItem,
  incoming: Pick<TenderPipelineItem, "submittingOffersDate">,
): Partial<TenderPipelineItem> | null {
  if (!prev.changeMonitor?.snapshot) return null;
  const oldDl = prev.changeMonitor.snapshot.deadline;
  const newDl = normalizeTenderDeadline(incoming.submittingOffersDate);
  if (!newDl || oldDl === newDl) return null;

  const nextSnapshot: TenderChangeSnapshot = {
    ...prev.changeMonitor.snapshot,
    deadline: newDl,
    capturedAt: new Date().toISOString(),
  };
  const newEvents = diffTenderChangeSnapshots(
    prev,
    { ...prev.changeMonitor.snapshot, deadline: oldDl },
    nextSnapshot,
  ).filter((e) => e.type === "DEADLINE_CHANGED");

  if (newEvents.length === 0) return null;

  const events = [...(prev.changeMonitor.events ?? []), ...newEvents].slice(-MAX_EVENTS);
  return {
    changeMonitor: {
      snapshot: nextSnapshot,
      events,
      lastCheckedAt: new Date().toISOString(),
      unseenCount: (prev.changeMonitor.unseenCount ?? 0) + newEvents.length,
    },
  };
}

export function patchItemWithChangeMonitor(
  item: TenderPipelineItem,
  input?: Parameters<typeof processTenderChangeMonitorUpdate>[1],
): Partial<TenderPipelineItem> {
  const { changeMonitor } = processTenderChangeMonitorUpdate(item, input);
  return { changeMonitor };
}

/** Tło: ponowne skanowanie dokumentów dla aktywnych przetargów ze snapshotem. */
export async function rescanPipelineDocumentChanges(
  items: TenderPipelineItem[],
  maxScans = 3,
): Promise<{ items: TenderPipelineItem[]; scanned: number; newEventCount: number }> {
  const candidates = items.filter(
    (i) => i.changeMonitor?.snapshot
      && i.tenderId
      && isActionableTender(i)
      && ["preparing", "interested", "seen", "new"].includes(i.status),
  ).slice(0, maxScans);

  if (candidates.length === 0) {
    return { items, scanned: 0, newEventCount: 0 };
  }

  const updates = new Map<string, TenderPipelineItem>();
  let newEventCount = 0;

  for (const item of candidates) {
    try {
      if (!canRunDocumentDiscovery(item)) continue;
      const { docs, patch, ran } = await runTenderDocumentDiscovery(item, { force: true });
      if (!ran) continue;
      const { changeMonitor, newEvents } = processTenderChangeMonitorUpdate(item, { documents: docs });
      const { qaMonitor, newEvents: newQaEvents } = processTenderQaMonitorUpdate(item, { documents: docs });
      const totalNew = newEvents.length + newQaEvents.length;
      if (totalNew > 0 || docs.length !== (item.bzpDocuments?.length ?? 0)) {
        updates.set(item.id, {
          ...item,
          ...patch,
          changeMonitor,
          qaMonitor,
        });
        newEventCount += totalNew;
      } else {
        updates.set(item.id, { ...item, changeMonitor, qaMonitor });
      }
    } catch {
      /* best-effort */
    }
  }

  return {
    items: items.map((i) => updates.get(i.id) ?? i),
    scanned: candidates.length,
    newEventCount,
  };
}

export function collectAllChangeEvents(items: TenderPipelineItem[]): TenderChangeEvent[] {
  return items
    .flatMap((i) => i.changeMonitor?.events ?? [])
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function countUnseenTenderChanges(items: TenderPipelineItem[]): number {
  return items.reduce((sum, i) => sum + (i.changeMonitor?.unseenCount ?? 0), 0);
}

export function countRecentChangeEvents(
  items: TenderPipelineItem[],
  withinHours = 168,
): number {
  const cutoff = Date.now() - withinHours * 3600_000;
  return collectAllChangeEvents(items).filter((e) => new Date(e.at).getTime() >= cutoff).length;
}

export function lastTenderChangeAt(items: TenderPipelineItem[]): string | null {
  const events = collectAllChangeEvents(items);
  return events[0]?.at ?? null;
}

export function filterChangeEvents(
  events: TenderChangeEvent[],
  filter: TenderChangeFilter,
): TenderChangeEvent[] {
  if (filter === "all") return events;
  if (filter === "deadline") return events.filter((e) => e.type === "DEADLINE_CHANGED");
  if (filter === "qa") return events.filter((e) => e.type === "NEW_QA");
  return events.filter((e) =>
    e.type === "NEW_DOCUMENT"
    || e.type === "DOCUMENT_UPDATED"
    || e.type === "DOCUMENT_REMOVED");
}

export function formatRelativeChangeTime(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = now.getTime() - t;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

export function acknowledgeTenderChanges(item: TenderPipelineItem): Partial<TenderPipelineItem> {
  if (!item.changeMonitor) return {};
  return {
    changeMonitor: {
      ...item.changeMonitor,
      unseenCount: 0,
      events: (item.changeMonitor.events ?? []).map((e) => ({ ...e, acknowledged: true })),
    },
  };
}

export function changeEventPriority(type: TenderChangeEventType): "CRITICAL" | "HIGH" | "MEDIUM" {
  if (type === "DEADLINE_CHANGED") return "CRITICAL";
  if (type === "NEW_DOCUMENT" || type === "NEW_QA") return "HIGH";
  return "MEDIUM";
}

export function changeEventIconLabel(type: TenderChangeEventType): string {
  switch (type) {
    case "NEW_DOCUMENT": return "Nowy dokument";
    case "DOCUMENT_UPDATED": return "Dokument zmieniony";
    case "DOCUMENT_REMOVED": return "Usunięto dokument";
    case "DEADLINE_CHANGED": return "Zmiana terminu";
    case "NEW_QA": return "Odpowiedzi na pytania";
  }
}
