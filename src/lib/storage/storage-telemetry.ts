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
