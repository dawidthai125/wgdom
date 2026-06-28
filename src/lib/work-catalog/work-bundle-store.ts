/**
 * Biblioteka Robót i Cennik v3.0 — persystencja lokalna WorkBundleStore (P1.8).
 * Pusty store infrastrukturalny — bez pakietów produktowych, bez cloud-sync.
 */

import { isTradeId } from "@/lib/work-catalog/trades";
import {
  WORK_BUNDLE_SCHEMA_VERSION,
  type WorkBundle,
  type WorkBundleSource,
  type WorkBundleStep,
  type WorkBundleStore,
} from "@/lib/work-catalog/types";

export const WORK_BUNDLE_STORAGE_KEY = "kw-wgdom-work-bundles";

/** Stała domyślna `updatedAt` (determinizm normalize — bez Date.now()). */
export const WORK_BUNDLE_DEFAULT_UPDATED_AT = "2026-06-13T00:00:00.000Z";

const VALID_SOURCES: WorkBundleSource[] = ["seed", "custom"];

export interface SaveWorkBundleStoreLocalOptions {
  /** Jawny znacznik zapisu (testy). */
  updatedAtIso?: string;
}

function parseUpdatedAtMs(iso: string | undefined | null): number {
  if (!iso?.trim()) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isValidBundleSource(value: unknown): value is WorkBundleSource {
  return typeof value === "string" && (VALID_SOURCES as readonly string[]).includes(value as WorkBundleSource);
}

function normalizeBundleStep(raw: unknown): WorkBundleStep | null {
  if (!raw || typeof raw !== "object") return null;
  const step = raw as Partial<WorkBundleStep>;
  const order = Number(step.order);
  if (!Number.isFinite(order) || order < 0) return null;
  if (typeof step.workId !== "string" || !step.workId.trim()) return null;

  const quantityDefault = Number(step.quantityDefault);
  return {
    order: Math.floor(order),
    workId: step.workId.trim(),
    quantityDefault: Number.isFinite(quantityDefault) && quantityDefault > 0 ? quantityDefault : undefined,
    notePl: typeof step.notePl === "string" && step.notePl.trim() ? step.notePl.trim() : undefined,
  };
}

function normalizeWorkBundle(raw: unknown, fallbackUpdatedAt: string): WorkBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const bundle = raw as Partial<WorkBundle>;
  if (typeof bundle.id !== "string" || !bundle.id.trim()) return null;
  if (typeof bundle.namePl !== "string" || !bundle.namePl.trim()) return null;
  if (!isTradeId(bundle.primaryTradeId)) return null;

  const usageCount = Number(bundle.usageCount);
  const estimatedDurationDays = Number(bundle.estimatedDurationDays);

  const steps: WorkBundleStep[] = [];
  if (Array.isArray(bundle.steps)) {
    for (const entry of bundle.steps) {
      const step = normalizeBundleStep(entry);
      if (step) steps.push(step);
    }
  }
  steps.sort((a, b) => a.order - b.order || a.workId.localeCompare(b.workId, "pl"));

  return {
    id: bundle.id.trim(),
    namePl: bundle.namePl.trim(),
    descriptionPl:
      typeof bundle.descriptionPl === "string" && bundle.descriptionPl.trim()
        ? bundle.descriptionPl.trim()
        : undefined,
    primaryTradeId: bundle.primaryTradeId,
    steps,
    estimatedDurationDays:
      Number.isFinite(estimatedDurationDays) && estimatedDurationDays > 0
        ? estimatedDurationDays
        : undefined,
    active: typeof bundle.active === "boolean" ? bundle.active : true,
    favorite: typeof bundle.favorite === "boolean" ? bundle.favorite : false,
    usageCount: Number.isFinite(usageCount) && usageCount >= 0 ? usageCount : 0,
    updatedAt:
      typeof bundle.updatedAt === "string" && bundle.updatedAt.trim()
        ? bundle.updatedAt
        : fallbackUpdatedAt,
    source: isValidBundleSource(bundle.source) ? bundle.source : "custom",
  };
}

/** Pusty store v3 — gotowy pod P6 (bez seed pakietów w P1.8). */
export function defaultWorkBundleStore(
  updatedAtIso: string = WORK_BUNDLE_DEFAULT_UPDATED_AT,
): WorkBundleStore {
  return {
    schemaVersion: WORK_BUNDLE_SCHEMA_VERSION,
    bundles: [],
    updatedAt: updatedAtIso,
  };
}

/** Sanityzacja store pakietów — bez I/O. */
export function normalizeWorkBundleStore(raw: unknown): WorkBundleStore {
  const base = defaultWorkBundleStore();
  if (!raw || typeof raw !== "object") return base;

  const input = raw as Partial<WorkBundleStore>;
  const updatedAt =
    typeof input.updatedAt === "string" && input.updatedAt.trim()
      ? input.updatedAt
      : WORK_BUNDLE_DEFAULT_UPDATED_AT;

  const bundles: WorkBundle[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(input.bundles)) {
    for (const entry of input.bundles) {
      const bundle = normalizeWorkBundle(entry, updatedAt);
      if (!bundle || seenIds.has(bundle.id)) continue;
      seenIds.add(bundle.id);
      bundles.push(bundle);
    }
  }

  bundles.sort((a, b) => a.id.localeCompare(b.id, "pl"));

  return {
    schemaVersion: WORK_BUNDLE_SCHEMA_VERSION,
    bundles,
    updatedAt,
  };
}

/**
 * Merge LWW (D5) — porównanie `updatedAt` na poziomie całego store.
 * Bez synchronizacji chmury; używane przez warstwę cloud-sync w P1.11.
 */
export function mergeWorkBundleStore(local: unknown, cloud: unknown): WorkBundleStore {
  const left = normalizeWorkBundleStore(local);
  const right = normalizeWorkBundleStore(cloud);
  const leftTs = parseUpdatedAtMs(left.updatedAt);
  const rightTs = parseUpdatedAtMs(right.updatedAt);

  if (rightTs === 0 && leftTs === 0) return left;
  if (leftTs >= rightTs) return left;
  return right;
}

export function loadWorkBundleStoreLocal(): WorkBundleStore {
  try {
    if (typeof localStorage === "undefined") {
      return defaultWorkBundleStore();
    }
    const raw = localStorage.getItem(WORK_BUNDLE_STORAGE_KEY);
    if (!raw) return defaultWorkBundleStore();
    return normalizeWorkBundleStore(JSON.parse(raw));
  } catch {
    return defaultWorkBundleStore();
  }
}

/** Zapis do localStorage — normalizuje payload; nie wywołuje cloud-sync. */
export function saveWorkBundleStoreLocal(
  store: WorkBundleStore,
  options: SaveWorkBundleStoreLocalOptions = {},
): void {
  if (typeof localStorage === "undefined") return;

  const updatedAt = options.updatedAtIso ?? store.updatedAt ?? WORK_BUNDLE_DEFAULT_UPDATED_AT;
  const next = normalizeWorkBundleStore({
    ...store,
    schemaVersion: WORK_BUNDLE_SCHEMA_VERSION,
    updatedAt,
  });

  localStorage.setItem(WORK_BUNDLE_STORAGE_KEY, JSON.stringify(next));
}
