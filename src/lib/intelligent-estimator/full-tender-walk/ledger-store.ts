/**
 * Persistent Full Walk execution ledger — audit only · ≠ rates/BOM/finance SSOT.
 */

import {
  IK_FULL_TENDER_WALK_KIND,
  IK_FULL_TENDER_WALK_LEDGER_KEY,
  IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION,
  type IkFullWalkLineLedgerEntry,
  type IkFullWalkLedgerStore,
  type IkFullWalkTenderLedger,
  type IkTenderWalkStatus,
} from "./types";

export {
  IK_FULL_TENDER_WALK_LEDGER_KEY,
  IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION,
};

export function emptyIkFullWalkLedgerStore(
  nowIso = new Date().toISOString(),
): IkFullWalkLedgerStore {
  return {
    schemaVersion: IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION,
    kind: IK_FULL_TENDER_WALK_KIND,
    updatedAt: nowIso,
    byTenderId: {},
  };
}

export function normalizeIkFullWalkLedgerStore(raw: unknown): IkFullWalkLedgerStore {
  if (!raw || typeof raw !== "object") return emptyIkFullWalkLedgerStore();
  const r = raw as Partial<IkFullWalkLedgerStore>;
  const by: Record<string, IkFullWalkTenderLedger> = {};
  const src = r.byTenderId && typeof r.byTenderId === "object" ? r.byTenderId : {};
  for (const [tid, t] of Object.entries(src)) {
    if (!t || typeof t !== "object") continue;
    const lines = Array.isArray(t.lines)
      ? t.lines.filter(
          (l): l is IkFullWalkLineLedgerEntry =>
            !!l && typeof l === "object" && typeof l.lineId === "string",
        )
      : [];
    by[tid] = {
      tenderId: String(t.tenderId || tid),
      walkId: String(t.walkId || `walk-${tid}`),
      startedAt: typeof t.startedAt === "string" ? t.startedAt : new Date().toISOString(),
      updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : new Date().toISOString(),
      tenderStatus: (t.tenderStatus as IkTenderWalkStatus) || "TENDER_ANALYSIS_PENDING",
      lines,
      counts: t.counts ?? {
        total: lines.length,
        visited: lines.filter((l) => l.status !== "NOT_STARTED").length,
        complete: lines.filter((l) => l.status === "POSITION_COMPLETE").length,
        hold: lines.filter((l) => l.status === "IDENTITY_HOLD").length,
        researchBlocked: lines.filter(
          (l) => l.researchOutcome === "RESEARCH_BLOCKED_BY_IDENTITY",
        ).length,
        dataBlock: lines.filter((l) => l.status === "DATA_BLOCK").length,
        ownerException: lines.filter((l) => l.status === "OWNER_EXCEPTION").length,
        conflict: lines.filter((l) => l.status === "CONFLICT").length,
      },
    };
  }
  return {
    schemaVersion: IK_FULL_TENDER_WALK_LEDGER_SCHEMA_VERSION,
    kind: IK_FULL_TENDER_WALK_KIND,
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim()
        ? r.updatedAt
        : new Date().toISOString(),
    byTenderId: by,
  };
}

let memory: IkFullWalkLedgerStore | null = null;

export function loadIkFullWalkLedgerStoreLocal(): IkFullWalkLedgerStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(IK_FULL_TENDER_WALK_LEDGER_KEY);
      if (raw) {
        memory = normalizeIkFullWalkLedgerStore(JSON.parse(raw));
        return memory;
      }
    }
  } catch {
    /* ignore */
  }
  if (!memory) memory = emptyIkFullWalkLedgerStore();
  return memory;
}

export function saveIkFullWalkLedgerStoreLocal(store: IkFullWalkLedgerStore): void {
  const normalized = normalizeIkFullWalkLedgerStore(store);
  memory = normalized;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(IK_FULL_TENDER_WALK_LEDGER_KEY, JSON.stringify(normalized));
    }
  } catch {
    /* ignore quota */
  }
}

export function getTenderWalkLedger(
  tenderId: string,
  store?: IkFullWalkLedgerStore,
): IkFullWalkTenderLedger | null {
  const s = store ?? loadIkFullWalkLedgerStoreLocal();
  return s.byTenderId[tenderId] ?? null;
}

export function upsertTenderWalkLedger(
  tender: IkFullWalkTenderLedger,
  store?: IkFullWalkLedgerStore,
): IkFullWalkLedgerStore {
  const s = normalizeIkFullWalkLedgerStore(store ?? loadIkFullWalkLedgerStoreLocal());
  const now = new Date().toISOString();
  s.byTenderId[tender.tenderId] = { ...tender, updatedAt: now };
  s.updatedAt = now;
  saveIkFullWalkLedgerStoreLocal(s);
  return s;
}

/** LWW per tender · prefer newer updatedAt · merge lines by lineId. */
export function mergeIkFullWalkLedgerDataKey(local: unknown, cloud: unknown): IkFullWalkLedgerStore {
  const a = normalizeIkFullWalkLedgerStore(local);
  const b = normalizeIkFullWalkLedgerStore(cloud);
  const out = emptyIkFullWalkLedgerStore(
    a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  );
  const ids = new Set([...Object.keys(a.byTenderId), ...Object.keys(b.byTenderId)]);
  for (const id of ids) {
    const la = a.byTenderId[id];
    const lb = b.byTenderId[id];
    if (!la) {
      out.byTenderId[id] = lb!;
      continue;
    }
    if (!lb) {
      out.byTenderId[id] = la;
      continue;
    }
    const prefer = la.updatedAt >= lb.updatedAt ? la : lb;
    const other = prefer === la ? lb : la;
    const byLine = new Map<string, IkFullWalkLineLedgerEntry>();
    for (const line of other.lines) byLine.set(line.lineId, line);
    for (const line of prefer.lines) {
      const prev = byLine.get(line.lineId);
      if (!prev || line.updatedAt >= prev.updatedAt) byLine.set(line.lineId, line);
    }
    out.byTenderId[id] = {
      ...prefer,
      lines: [...byLine.values()],
    };
  }
  return out;
}

export function emptyIkFullWalkLedgerStoreForPersist(): IkFullWalkLedgerStore {
  return emptyIkFullWalkLedgerStore();
}

export async function pushIkFullWalkLedgerToCloudSafe(): Promise<void> {
  try {
    const store = loadIkFullWalkLedgerStoreLocal();
    const { pushKeysToCloudSafe } = await import("@/lib/cloud-sync");
    await pushKeysToCloudSafe([IK_FULL_TENDER_WALK_LEDGER_KEY], [store]);
  } catch {
    /* non-fatal audit push */
  }
}
