/** Statystyki logowań i wejść inspektora — sync w chmurze (kw-inspector-stats). */

import { fetchKeysFromCloud, persistKey, INSPECTOR_STATS_KEY } from "@/lib/cloud-sync";
import { collectInspectorFeed, type InspectorFeedItem, type JobWithActivity } from "@/lib/job-activity";

export { INSPECTOR_STATS_KEY };
export const INSPECTOR_FEED_SEEN_KEY = "kw-inspector-feed-seen-at";
export const JOB_NOTES_SEEN_KEY = "kw-job-notes-seen-at";
export const ALERTS_SEEN_KEY = "kw-inspector-alerts-seen";

export type InspectorEventType = "login" | "visit";

export interface InspectorStatsEvent {
  id: string;
  userId: string;
  displayName: string;
  type: InspectorEventType;
  at: string;
}

export interface InspectorStatsStore {
  events: InspectorStatsEvent[];
}

export interface UserAlertsSeen {
  feedSeenAt?: string;
  adminNotesSeenAt?: string;
  inspectorNotesSeenAt?: string;
}

export interface AlertsSeenStore {
  users: Record<string, UserAlertsSeen>;
}

const MAX_EVENTS = 300;

export function defaultInspectorStats(): InspectorStatsStore {
  return { events: [] };
}

export function defaultAlertsSeen(): AlertsSeenStore {
  return { users: {} };
}

function maxIso(a?: string, b?: string): string {
  if (!a) return b || "";
  if (!b) return a;
  return a >= b ? a : b;
}

function mergeUserAlertsSeen(a: UserAlertsSeen, b: UserAlertsSeen): UserAlertsSeen {
  return {
    feedSeenAt: maxIso(a.feedSeenAt, b.feedSeenAt),
    adminNotesSeenAt: maxIso(a.adminNotesSeenAt, b.adminNotesSeenAt),
    inspectorNotesSeenAt: maxIso(a.inspectorNotesSeenAt, b.inspectorNotesSeenAt),
  };
}

export function mergeAlertsSeenStores(a: AlertsSeenStore, b: AlertsSeenStore): AlertsSeenStore {
  const users = { ...a.users };
  for (const [userId, row] of Object.entries(b.users)) {
    users[userId] = mergeUserAlertsSeen(users[userId] || {}, row);
  }
  return { users };
}

export function loadAlertsSeenLocal(): AlertsSeenStore {
  try {
    const raw = localStorage.getItem(ALERTS_SEEN_KEY);
    if (!raw) return migrateLegacyAlertsSeen(defaultAlertsSeen());
    const parsed = JSON.parse(raw) as AlertsSeenStore;
    if (!parsed.users || typeof parsed.users !== "object") return migrateLegacyAlertsSeen(defaultAlertsSeen());
    return parsed;
  } catch {
    return migrateLegacyAlertsSeen(defaultAlertsSeen());
  }
}

function saveAlertsSeenLocal(store: AlertsSeenStore): void {
  try {
    localStorage.setItem(ALERTS_SEEN_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

function migrateLegacyAlertsSeen(store: AlertsSeenStore): AlertsSeenStore {
  try {
    const feed = localStorage.getItem(INSPECTOR_FEED_SEEN_KEY) || "";
    const notes = localStorage.getItem(JOB_NOTES_SEEN_KEY) || "";
    if (!feed && !notes) return store;
    const legacy = store.users._legacy || {};
    store.users._legacy = {
      feedSeenAt: maxIso(legacy.feedSeenAt, feed),
      adminNotesSeenAt: maxIso(legacy.adminNotesSeenAt, notes),
      inspectorNotesSeenAt: legacy.inspectorNotesSeenAt || "",
    };
    saveAlertsSeenLocal(store);
  } catch { /* ignore */ }
  return store;
}

export async function syncAlertsSeenFromCloud(): Promise<AlertsSeenStore> {
  try {
    const [cloud] = await fetchKeysFromCloud([ALERTS_SEEN_KEY]);
    const local = loadAlertsSeenLocal();
    if (!cloud || typeof cloud !== "object" || !(cloud as AlertsSeenStore).users) {
      return local;
    }
    const merged = mergeAlertsSeenStores(local, cloud as AlertsSeenStore);
    saveAlertsSeenLocal(merged);
    return merged;
  } catch {
    return loadAlertsSeenLocal();
  }
}

async function persistAlertsSeen(store: AlertsSeenStore): Promise<void> {
  saveAlertsSeenLocal(store);
  await persistKey(ALERTS_SEEN_KEY, store);
}

export function getFeedSeenAt(userId?: string): string {
  if (userId) {
    return loadAlertsSeenLocal().users[userId]?.feedSeenAt || "";
  }
  try {
    return localStorage.getItem(INSPECTOR_FEED_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getAdminJobNotesSeenAt(userId?: string): string {
  if (userId) {
    return loadAlertsSeenLocal().users[userId]?.adminNotesSeenAt || "";
  }
  try {
    return localStorage.getItem(JOB_NOTES_SEEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getInspectorJobNotesSeenAt(userId: string): string {
  return loadAlertsSeenLocal().users[userId]?.inspectorNotesSeenAt || "";
}

export async function markInspectorFeedSeen(userId?: string, at?: string): Promise<void> {
  const ts = at || new Date().toISOString();
  if (userId) {
    const store = loadAlertsSeenLocal();
    store.users[userId] = { ...store.users[userId], feedSeenAt: ts };
    await persistAlertsSeen(store);
  }
  try {
    localStorage.setItem(INSPECTOR_FEED_SEEN_KEY, ts);
  } catch { /* ignore */ }
}

export async function markAdminJobNotesSeen(userId?: string, at?: string): Promise<void> {
  const ts = at || new Date().toISOString();
  if (userId) {
    const store = loadAlertsSeenLocal();
    store.users[userId] = { ...store.users[userId], adminNotesSeenAt: ts };
    await persistAlertsSeen(store);
  }
  try {
    localStorage.setItem(JOB_NOTES_SEEN_KEY, ts);
  } catch { /* ignore */ }
}

export async function markInspectorJobNotesSeen(userId: string, at?: string): Promise<void> {
  const ts = at || new Date().toISOString();
  const store = loadAlertsSeenLocal();
  store.users[userId] = { ...store.users[userId], inspectorNotesSeenAt: ts };
  await persistAlertsSeen(store);
}

/** @deprecated use markInspectorFeedSeen */
export function markInspectorFeedSeenSync(at?: string): void {
  markInspectorFeedSeen(undefined, at).catch(() => {});
}

/** @deprecated use markAdminJobNotesSeen */
export function markJobNotesSeen(at?: string): void {
  markAdminJobNotesSeen(undefined, at).catch(() => {});
}

/** @deprecated use getAdminJobNotesSeenAt */
export function getJobNotesSeenAt(): string {
  return getAdminJobNotesSeenAt();
}

export function loadInspectorStatsLocal(): InspectorStatsStore {
  try {
    const raw = localStorage.getItem(INSPECTOR_STATS_KEY);
    if (!raw) return defaultInspectorStats();
    const parsed = JSON.parse(raw) as InspectorStatsStore;
    if (!Array.isArray(parsed.events)) return defaultInspectorStats();
    return { events: parsed.events };
  } catch {
    return defaultInspectorStats();
  }
}

export async function syncInspectorStatsFromCloud(): Promise<InspectorStatsStore> {
  try {
    const [cloud] = await fetchKeysFromCloud([INSPECTOR_STATS_KEY]);
    const local = loadInspectorStatsLocal();
    if (!cloud || typeof cloud !== "object" || !Array.isArray((cloud as InspectorStatsStore).events)) {
      return local;
    }
    const remote = cloud as InspectorStatsStore;
    const merged = mergeInspectorStats(local, remote);
    try {
      localStorage.setItem(INSPECTOR_STATS_KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
    return merged;
  } catch {
    return loadInspectorStatsLocal();
  }
}

function mergeInspectorStats(a: InspectorStatsStore, b: InspectorStatsStore): InspectorStatsStore {
  const map = new Map<string, InspectorStatsEvent>();
  for (const ev of [...a.events, ...b.events]) {
    if (ev?.id) map.set(ev.id, ev);
  }
  return {
    events: [...map.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, MAX_EVENTS),
  };
}

export async function recordInspectorEvent(
  userId: string,
  displayName: string,
  type: InspectorEventType,
): Promise<void> {
  const store = await syncInspectorStatsFromCloud();
  const event: InspectorStatsEvent = {
    id: crypto.randomUUID(),
    userId,
    displayName,
    type,
    at: new Date().toISOString(),
  };
  const next: InspectorStatsStore = {
    events: [event, ...store.events].slice(0, MAX_EVENTS),
  };
  await persistKey(INSPECTOR_STATS_KEY, next);
}

export interface InspectorStatsSummary {
  totalLogins: number;
  totalVisits: number;
  loginsLast7Days: number;
  visitsLast7Days: number;
  lastLoginAt: string | null;
  lastVisitAt: string | null;
  byUser: { userId: string; displayName: string; logins: number; visits: number; lastAt: string }[];
}

export function summarizeInspectorStats(store: InspectorStatsStore): InspectorStatsSummary {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const logins = store.events.filter((e) => e.type === "login");
  const visits = store.events.filter((e) => e.type === "visit");
  const inLast7 = (at: string) => new Date(at).getTime() >= weekAgo;

  const userMap = new Map<string, { userId: string; displayName: string; logins: number; visits: number; lastAt: string }>();
  for (const ev of store.events) {
    const row = userMap.get(ev.userId) ?? {
      userId: ev.userId,
      displayName: ev.displayName,
      logins: 0,
      visits: 0,
      lastAt: ev.at,
    };
    if (ev.type === "login") row.logins += 1;
    else row.visits += 1;
    if (ev.at > row.lastAt) row.lastAt = ev.at;
    row.displayName = ev.displayName;
    userMap.set(ev.userId, row);
  }

  return {
    totalLogins: logins.length,
    totalVisits: visits.length,
    loginsLast7Days: logins.filter((e) => inLast7(e.at)).length,
    visitsLast7Days: visits.filter((e) => inLast7(e.at)).length,
    lastLoginAt: logins[0]?.at ?? null,
    lastVisitAt: visits[0]?.at ?? null,
    byUser: [...userMap.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
  };
}

export function getUnseenInspectorFeed(jobs: JobWithActivity[], seenAt?: string, userId?: string): InspectorFeedItem[] {
  const watermark = seenAt ?? getFeedSeenAt(userId);
  const feed = collectInspectorFeed(jobs);
  if (!watermark) return feed.slice(0, 15);
  return feed.filter((item) => item.at > watermark).slice(0, 15);
}

export function countUnseenInspectorAlerts(
  jobs: JobWithActivity[],
  adminUserId?: string,
  notesNeedingAdmin?: number,
): number {
  const unseenFeed = getUnseenInspectorFeed(jobs, undefined, adminUserId).length;
  const notes = notesNeedingAdmin ?? 0;
  return unseenFeed + notes;
}

export function fmtInspectorStatsTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
