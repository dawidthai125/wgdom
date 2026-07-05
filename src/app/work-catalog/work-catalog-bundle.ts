/**
 * P2.7 — mutacje WorkBundleStore (app layer; P1 lib zamrożony).
 */

import {
  getWorkByIdFromStore,
  type TradeId,
  type WorkBundle,
  type WorkBundleStep,
  type WorkBundleStore,
  type WorkCatalogStore,
} from "@/lib/work-catalog";

export type BundleSaveValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type BundleStepWorkRefResult = {
  ok: boolean;
  workNamePl?: string;
  warning?: string;
};

function generateBundleId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bundle-${Date.now()}`;
}

function reindexStepOrders(steps: WorkBundleStep[]): WorkBundleStep[] {
  return steps
    .slice()
    .sort((a, b) => a.order - b.order || a.workId.localeCompare(b.workId, "pl"))
    .map((step, index) => ({ ...step, order: index }));
}

function patchStoreBundles(
  store: WorkBundleStore,
  bundles: WorkBundle[],
  updatedAtIso: string,
): WorkBundleStore {
  return {
    ...store,
    bundles,
    updatedAt: updatedAtIso,
  };
}

/** Pusty szablon pakietu do edycji w UI. */
export function createEmptyBundleDraft(
  primaryTradeId: TradeId = "MALOWANIE",
  updatedAtIso: string,
): WorkBundle {
  return {
    id: generateBundleId(),
    namePl: "",
    primaryTradeId,
    steps: [],
    active: true,
    favorite: false,
    usageCount: 0,
    updatedAt: updatedAtIso,
    source: "custom",
  };
}

export function validateBundleEstimatedDurationDays(
  value: number | undefined,
): BundleSaveValidationResult {
  if (value === undefined) return { ok: true };
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return { ok: false, message: "Podaj liczbę dni (minimum 1) lub zostaw puste" };
  }
  return { ok: true };
}

/** P2.8.1 — walidacja przed zapisem; workId wymaga catalogStore. */
export function validateBundleForSave(
  bundle: WorkBundle,
  catalogStore?: WorkCatalogStore,
): BundleSaveValidationResult {
  if (!bundle.namePl.trim()) {
    return { ok: false, message: "Podaj nazwę pakietu" };
  }
  if (!bundle.primaryTradeId) {
    return { ok: false, message: "Wybierz branżę pakietu" };
  }
  if (bundle.steps.length === 0) {
    return { ok: false, message: "Dodaj co najmniej jeden krok do pakietu" };
  }

  const durationCheck = validateBundleEstimatedDurationDays(bundle.estimatedDurationDays);
  if (!durationCheck.ok) return durationCheck;

  if (catalogStore) {
    for (let index = 0; index < bundle.steps.length; index += 1) {
      const step = bundle.steps[index];
      if (!step.workId?.trim()) {
        return {
          ok: false,
          message: `Krok ${index + 1}: wybierz robotę z katalogu regionu`,
        };
      }
      const ref = resolveBundleStepWorkRef(catalogStore, step.workId);
      if (!ref.ok) {
        return {
          ok: false,
          message: `Krok ${index + 1}: ${ref.warning ?? "Robota nie ma w katalogu regionu"}`,
        };
      }
    }
  }

  return { ok: true };
}

export function normalizeBundleEstimatedDurationDays(
  value: number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) return undefined;
  return value;
}

export function upsertBundleInStore(
  store: WorkBundleStore,
  bundle: WorkBundle,
  updatedAtIso: string,
): WorkBundleStore {
  const nextBundle: WorkBundle = {
    ...bundle,
    namePl: bundle.namePl.trim(),
    descriptionPl: bundle.descriptionPl?.trim() || undefined,
    estimatedDurationDays: normalizeBundleEstimatedDurationDays(bundle.estimatedDurationDays),
    steps: reindexStepOrders(bundle.steps),
    updatedAt: updatedAtIso,
  };

  const index = store.bundles.findIndex((entry) => entry.id === nextBundle.id);
  const bundles =
    index >= 0
      ? store.bundles.map((entry, i) => (i === index ? nextBundle : entry))
      : [...store.bundles, nextBundle];

  return patchStoreBundles(store, bundles, updatedAtIso);
}

export function removeBundleFromStore(
  store: WorkBundleStore,
  bundleId: string,
  updatedAtIso: string,
): WorkBundleStore {
  return patchStoreBundles(
    store,
    store.bundles.filter((bundle) => bundle.id !== bundleId),
    updatedAtIso,
  );
}

export function duplicateBundleInStore(
  store: WorkBundleStore,
  bundleId: string,
  updatedAtIso: string,
): { store: WorkBundleStore; newBundleId: string } | null {
  const source = store.bundles.find((bundle) => bundle.id === bundleId);
  if (!source) return null;

  const newId = generateBundleId();
  const copy: WorkBundle = {
    ...source,
    id: newId,
    namePl: `${source.namePl.trim()} (kopia)`,
    steps: source.steps.map((step) => ({ ...step })),
    usageCount: 0,
    favorite: false,
    source: "custom",
    updatedAt: updatedAtIso,
  };

  return {
    store: patchStoreBundles(store, [...store.bundles, copy], updatedAtIso),
    newBundleId: newId,
  };
}

export function patchBundleActiveInStore(
  store: WorkBundleStore,
  bundleId: string,
  active: boolean,
  updatedAtIso: string,
): WorkBundleStore | null {
  const index = store.bundles.findIndex((bundle) => bundle.id === bundleId);
  if (index < 0) return null;

  const previous = store.bundles[index];
  if (previous.active === active) return store;

  const bundles = [...store.bundles];
  bundles[index] = { ...previous, active, updatedAt: updatedAtIso };
  return patchStoreBundles(store, bundles, updatedAtIso);
}

export function patchBundleFavoriteInStore(
  store: WorkBundleStore,
  bundleId: string,
  favorite: boolean,
  updatedAtIso: string,
): WorkBundleStore | null {
  const index = store.bundles.findIndex((bundle) => bundle.id === bundleId);
  if (index < 0) return null;

  const previous = store.bundles[index];
  if (previous.favorite === favorite) return store;

  const bundles = [...store.bundles];
  bundles[index] = { ...previous, favorite, updatedAt: updatedAtIso };
  return patchStoreBundles(store, bundles, updatedAtIso);
}

export function addStepToBundle(
  bundle: WorkBundle,
  workId: string,
  updatedAtIso: string,
): WorkBundle {
  const order = bundle.steps.length;
  return {
    ...bundle,
    steps: reindexStepOrders([
      ...bundle.steps,
      { order, workId, quantityDefault: undefined, notePl: undefined },
    ]),
    updatedAt: updatedAtIso,
  };
}

export function updateStepInBundle(
  bundle: WorkBundle,
  stepIndex: number,
  patch: Partial<Pick<WorkBundleStep, "workId" | "quantityDefault" | "notePl">>,
  updatedAtIso: string,
): WorkBundle {
  if (stepIndex < 0 || stepIndex >= bundle.steps.length) return bundle;

  const steps = bundle.steps.map((step, index) => {
    if (index !== stepIndex) return step;
    const quantityDefault =
      patch.quantityDefault === undefined
        ? step.quantityDefault
        : patch.quantityDefault > 0
          ? patch.quantityDefault
          : undefined;
    const notePl =
      patch.notePl === undefined
        ? step.notePl
        : patch.notePl.trim()
          ? patch.notePl.trim()
          : undefined;
    return {
      ...step,
      workId: patch.workId?.trim() ? patch.workId.trim() : step.workId,
      quantityDefault,
      notePl,
    };
  });

  return {
    ...bundle,
    steps: reindexStepOrders(steps),
    updatedAt: updatedAtIso,
  };
}

export function removeStepFromBundle(
  bundle: WorkBundle,
  stepIndex: number,
  updatedAtIso: string,
): WorkBundle {
  if (stepIndex < 0 || stepIndex >= bundle.steps.length) return bundle;
  return {
    ...bundle,
    steps: reindexStepOrders(bundle.steps.filter((_, index) => index !== stepIndex)),
    updatedAt: updatedAtIso,
  };
}

export function reorderBundleStep(
  bundle: WorkBundle,
  stepIndex: number,
  direction: "up" | "down",
  updatedAtIso: string,
): WorkBundle {
  const sorted = reindexStepOrders(bundle.steps);
  const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1;
  if (stepIndex < 0 || stepIndex >= sorted.length || targetIndex < 0 || targetIndex >= sorted.length) {
    return bundle;
  }

  const steps = [...sorted];
  const [moved] = steps.splice(stepIndex, 1);
  steps.splice(targetIndex, 0, moved);

  return {
    ...bundle,
    steps: steps.map((step, index) => ({ ...step, order: index })),
    updatedAt: updatedAtIso,
  };
}

export function resolveBundleStepWorkRef(
  catalogStore: WorkCatalogStore,
  workId: string,
): BundleStepWorkRefResult {
  const work = getWorkByIdFromStore(catalogStore, workId);
  if (!work) {
    return { ok: false, warning: "Robota nie ma w katalogu regionu" };
  }
  if (!work.active) {
    return {
      ok: true,
      workNamePl: work.namePl,
      warning: "Robota jest nieaktywna",
    };
  }
  return { ok: true, workNamePl: work.namePl };
}
