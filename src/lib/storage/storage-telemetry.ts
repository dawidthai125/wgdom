/**
 * LOCALSTORAGE-ARCH-02 A0 — window.__WG_STORAGE__ telemetry.
 */

import {
  STORAGE_CRITICAL,
  STORAGE_LIMIT,
  STORAGE_WARNING,
  budgetStateForTotal,
  measureLocalStorageBytes,
} from "@/lib/storage/storage-budget";

const HISTORY_MAX = 500;
const SESSION_FLAG = "wg-storage-telemetry-enabled";

export type StorageWriteEvent = {
  t: number;
  at: string;
  key: string;
  bytes: number;
  writer: string;
  ok: boolean;
  tier?: 1 | 2 | 3;
  note?: string;
};

type WriterAgg = { writer: string; count: number; lastAt: string; lastKey: string; bytes: number };

type G = {
  __WG_STORAGE__?: {
    enable: () => void;
    disable: () => void;
    report: () => string;
    largest: (n?: number) => Array<{ key: string; bytes: number }>;
    budget: () => {
      total: number;
      warning: number;
      critical: number;
      limit: number;
      state: string;
    };
    writers: () => WriterAgg[];
    history: () => StorageWriteEvent[];
  };
};

let enabled = true;
const history: StorageWriteEvent[] = [];
const writerMap = new Map<string, WriterAgg>();

function g(): G {
  return globalThis as G;
}

function on(): boolean {
  if (enabled) return true;
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

export function recordStorageWrite(input: {
  key: string;
  bytes: number;
  writer: string;
  ok: boolean;
  tier?: 1 | 2 | 3;
  note?: string;
}): void {
  if (!on()) return;
  const row: StorageWriteEvent = {
    t: Date.now(),
    at: new Date().toISOString(),
    key: input.key,
    bytes: input.bytes,
    writer: input.writer,
    ok: input.ok,
    tier: input.tier,
    note: input.note,
  };
  history.push(row);
  if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);

  const prev = writerMap.get(input.writer) ?? {
    writer: input.writer,
    count: 0,
    lastAt: row.at,
    lastKey: input.key,
    bytes: 0,
  };
  prev.count += 1;
  prev.lastAt = row.at;
  prev.lastKey = input.key;
  prev.bytes += input.bytes;
  writerMap.set(input.writer, prev);
}

// ---------------------------------------------------------------------------
// STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 7 (DF §7 C) — warstwa globalna 1.2/1.4/1.5 MiB.
// Wyłącznie TELEMETRIA: nigdy nie blokuje zapisu (blokuje tylko warstwa B per-key i warstwa A
// quota). `measureLocalStorageBytes()` jest pełnym skanem LS, dlatego NIGDY nie wolno go wołać
// w hot-path zapisu (lekcja 02F V-PERF-A): planujemy go po zapisie, w idle, max 1×/60 s.
// ---------------------------------------------------------------------------

export const LS_TOTAL_TELEMETRY_KEY = "__ls_total__";
const LS_TOTAL_MIN_INTERVAL_MS = 60_000;

let lsTotalLastScheduledAt = 0;

type IdleG = { requestIdleCallback?: (cb: () => void) => unknown };

/**
 * Throttled (≤ 1×/60 s), nieblokujące. Wywołanie jest O(1) — sam pomiar biegnie w idle.
 * Zwraca `true`, jeżeli pomiar został zaplanowany (diag/testy).
 */
export function scheduleLocalStorageTotalTelemetry(): boolean {
  if (!on()) return false;
  const now = Date.now();
  if (lsTotalLastScheduledAt !== 0 && now - lsTotalLastScheduledAt < LS_TOTAL_MIN_INTERVAL_MS) {
    return false;
  }
  lsTotalLastScheduledAt = now;
  const run = () => {
    try {
      const { total } = measureLocalStorageBytes();
      recordStorageWrite({
        key: LS_TOTAL_TELEMETRY_KEY,
        bytes: total,
        writer: "storage-budget.ls_total",
        ok: true,
        tier: 3,
        note: `ls_total:${budgetStateForTotal(total)}`,
      });
    } catch {
      /* telemetria best-effort — nigdy nie wpływa na zapis */
    }
  };
  const idle = (globalThis as IdleG).requestIdleCallback;
  if (typeof idle === "function") idle(run);
  else setTimeout(run, 0);
  return true;
}

export function reportStorageTelemetry(): string {
  const { total, perKey } = measureLocalStorageBytes();
  const state = budgetStateForTotal(total);
  const top = Object.entries(perKey)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const lines = [
    "LOCALSTORAGE-ARCH-02 __WG_STORAGE__",
    `total=${total} state=${state}`,
    `warning=${STORAGE_WARNING} critical=${STORAGE_CRITICAL} limit=${STORAGE_LIMIT}`,
    "",
    "--- top 20 keys ---",
    ...top.map(([k, b], i) => `${i + 1}. ${k} = ${b}`),
    "",
    "--- writers ---",
    ...[...writerMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((w) => `${w.writer} count=${w.count} last=${w.lastKey} @ ${w.lastAt}`),
    "",
    `history_events=${history.length}`,
  ];
  const text = lines.join("\n");
  console.info(text);
  return text;
}

export function installStorageTelemetryGlobals(): void {
  g().__WG_STORAGE__ = {
    enable: () => {
      enabled = true;
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* ignore */
      }
    },
    disable: () => {
      enabled = false;
      try {
        sessionStorage.removeItem(SESSION_FLAG);
      } catch {
        /* ignore */
      }
    },
    report: reportStorageTelemetry,
    largest: (n = 20) => {
      const { perKey } = measureLocalStorageBytes();
      return Object.entries(perKey)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([key, bytes]) => ({ key, bytes }));
    },
    budget: () => {
      const { total } = measureLocalStorageBytes();
      return {
        total,
        warning: STORAGE_WARNING,
        critical: STORAGE_CRITICAL,
        limit: STORAGE_LIMIT,
        state: budgetStateForTotal(total),
      };
    },
    writers: () => [...writerMap.values()].sort((a, b) => b.count - a.count),
    history: () => history.slice(),
  };
}

installStorageTelemetryGlobals();
