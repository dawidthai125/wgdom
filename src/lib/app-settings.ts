/** Ustawienia aplikacji — sync w chmurze (Super Admin). */

import { fetchKeysFromCloud, persistKey, APP_SETTINGS_KEY } from "@/lib/cloud-sync";

export { APP_SETTINGS_KEY };

/** PB-WRITE-A / #5C-2 — routing zapisu katalogu legacy vs work. Domyślnie work_only. */
export type CatalogWriteMode = "split" | "work_only" | "legacy_only";

const CATALOG_WRITE_MODES: CatalogWriteMode[] = ["split", "work_only", "legacy_only"];

export function normalizeCatalogWriteMode(value: unknown): CatalogWriteMode {
  if (typeof value === "string" && (CATALOG_WRITE_MODES as string[]).includes(value)) {
    return value as CatalogWriteMode;
  }
  return "split";
}

/** Chmura ma pierwszeństwo — nieznana wartość → split. */
export function mergeCatalogWriteMode(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): CatalogWriteMode {
  if (remote?.catalogWriteMode != null) {
    return normalizeCatalogWriteMode(remote.catalogWriteMode);
  }
  return normalizeCatalogWriteMode(local.catalogWriteMode);
}

export interface AppSettings {
  /** Podgląd kosztorysów ATH/NOR w przeglądarce (parser best-effort). Domyślnie włączone. */
  athPreviewEnabled: boolean;
  /**
   * TENDER-MODULE-ENABLEMENT-01 — master gate całego modułu Przetargi dla Admin/Moderator.
   * Super Admin zawsze widzi i może wejść (niezależnie od flagi).
   * Domyślnie OFF (bezpieczny default = obecne zachowanie prod).
   * REUSE: nie tworzyć drugiej flagi / LS / Expert Session gate.
   */
  tendersTabForStaffEnabled: boolean;
  /** Biblioteka Robót w Przetargach dla roli Administrator (Super Admin zawsze; moderator/inspektor — nie). */
  workCatalogForAdminEnabled: boolean;
  /** Instrukcja obsługi w menu dla roli Administrator (Super Admin zawsze). */
  instructionsForAdminEnabled: boolean;
  /** Zakładka Zmiany (changelog) w menu dla roli Administrator (Super Admin zawsze). */
  changesForAdminEnabled: boolean;
  /**
   * WM-RYSUNKI-01 P1B — zakładka Rysunki w Odbiory WM Druk.
   * Domyślnie OFF. Super Admin toggle (⚙ / mirror WM Ustawienia).
   */
  wmRysunkiEnabled: boolean;
  /**
   * WM-WORKER-SKETCH-01 — Dokumentacja → Szkice (Worker).
   * Domyślnie OFF. Niezależne od wmRysunkiEnabled.
   */
  wmWorkerSketchEnabled: boolean;
  /** PB-WRITE-A — split = dual write; work_only / legacy_only = single-writer prep + rollback. */
  catalogWriteMode: CatalogWriteMode;
  /** Skan BZP — ile dni wstecz. */
  bzpScanDays: number;
  /** Skan BZP — strony ogólne PL02. */
  bzpScanPages: number;
  /** Skan BZP — strony per kluczowy zamawiający. */
  bzpScanOrgPages: number;
  /** Auto-odświeżenie listy BZP (godziny). */
  bzpAutoRefreshHours: number;
  /** NG11-Q3 — debounced cloud persist pipeline przetargów (LS sync natychmiast). Domyślnie wyłączone. */
  pipelinePerfDebouncePersist: boolean;
  /** NG11-Q1 — równoległy parse dossier cost/metadata (≤3+3). Domyślnie wyłączone. */
  pipelinePerfParseConcurrency: boolean;
  /** NG11-Q2 — równoległy unpack ZIP/7Z w dossier (≤2). Domyślnie wyłączone. */
  pipelinePerfUnpackParallel: boolean;
  /** NG11-A2 — sesyjny cache artefaktów heavy parse dossier (cost/full). Domyślnie wyłączone. */
  pipelinePerfArtifactCache: boolean;
  /** NG11-A3 — speculative external discovery fork (∥ BZP) w auto bootstrap. Domyślnie wyłączone. */
  pipelinePerfDiscoveryFork: boolean;
  /**
   * WGDOM-HARDENING-01A — bootstrap discovery/shell mid-flight local + ≤1 terminal cloud.
   * Default ON. Kill-switch OFF = legacy immediate cloud per patch (pre-01A).
   */
  pipelineBootstrapPersistLocal: boolean;
}

export function defaultAppSettings(): AppSettings {
  return {
    athPreviewEnabled: true,
    tendersTabForStaffEnabled: false,
    workCatalogForAdminEnabled: false,
    instructionsForAdminEnabled: false,
    changesForAdminEnabled: false,
    wmRysunkiEnabled: false,
    wmWorkerSketchEnabled: false,
    catalogWriteMode: "work_only",
    bzpScanDays: 90,
    bzpScanPages: 4,
    bzpScanOrgPages: 5,
    bzpAutoRefreshHours: 20,
    pipelinePerfDebouncePersist: false,
    pipelinePerfParseConcurrency: false,
    pipelinePerfUnpackParallel: false,
    pipelinePerfArtifactCache: false,
    pipelinePerfDiscoveryFork: false,
    pipelineBootstrapPersistLocal: true,
  };
}

/** NG11-Q3 — debounced persist pipeline (feature flag, default OFF). */
export function isPipelinePerfDebouncePersistEnabled(): boolean {
  return loadAppSettingsLocal().pipelinePerfDebouncePersist === true;
}

/** NG11-Q1 — parallel dossier parse (feature flag, default OFF). */
export function isPipelinePerfParseConcurrencyEnabled(): boolean {
  return loadAppSettingsLocal().pipelinePerfParseConcurrency === true;
}

/** NG11-Q2 — parallel archive unpack dossier (feature flag, default OFF). */
export function isPipelinePerfUnpackParallelEnabled(): boolean {
  return loadAppSettingsLocal().pipelinePerfUnpackParallel === true;
}

/** NG11-A2 — dossier artifact cache (feature flag, default OFF). */
export function isPipelinePerfArtifactCacheEnabled(): boolean {
  return loadAppSettingsLocal().pipelinePerfArtifactCache === true;
}

/** NG11-A3 — discovery fork speculative external (feature flag, default OFF). */
export function isPipelinePerfDiscoveryForkEnabled(): boolean {
  return loadAppSettingsLocal().pipelinePerfDiscoveryFork === true;
}

/** HARDENING-01A — bootstrap local mid-flight (default ON; kill-switch = false). */
export function isPipelineBootstrapPersistLocalEnabled(): boolean {
  return loadAppSettingsLocal().pipelineBootstrapPersistLocal !== false;
}

/** Chmura ma pierwszeństwo — default true (C3: !== false). */
export function mergePipelineBootstrapPersistLocal(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.pipelineBootstrapPersistLocal === false) return false;
  if (remote?.pipelineBootstrapPersistLocal === true) return true;
  return local.pipelineBootstrapPersistLocal !== false;
}

function numSetting(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Chmura ma pierwszeństwo — lokalne false z starej wersji nie blokuje podglądu. */
export function mergeAthPreviewEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.athPreviewEnabled === false) return false;
  if (remote?.athPreviewEnabled === true) return true;
  return local.athPreviewEnabled !== false;
}

/** Chmura ma pierwszeństwo — domyślnie wyłączone dla staff. */
export function mergeTendersTabForStaffEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.tendersTabForStaffEnabled === true) return true;
  if (remote?.tendersTabForStaffEnabled === false) return false;
  return local.tendersTabForStaffEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie wyłączone dla administratorów. */
export function mergeWorkCatalogForAdminEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.workCatalogForAdminEnabled === true) return true;
  if (remote?.workCatalogForAdminEnabled === false) return false;
  return local.workCatalogForAdminEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie wyłączone dla administratorów. */
export function mergeInstructionsForAdminEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.instructionsForAdminEnabled === true) return true;
  if (remote?.instructionsForAdminEnabled === false) return false;
  return local.instructionsForAdminEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie wyłączone dla administratorów. */
export function mergeChangesForAdminEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.changesForAdminEnabled === true) return true;
  if (remote?.changesForAdminEnabled === false) return false;
  return local.changesForAdminEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie OFF (WM-RYSUNKI-01 P1B). */
export function mergeWmRysunkiEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.wmRysunkiEnabled === true) return true;
  if (remote?.wmRysunkiEnabled === false) return false;
  return local.wmRysunkiEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie OFF (WM-WORKER-SKETCH-01). */
export function mergeWmWorkerSketchEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.wmWorkerSketchEnabled === true) return true;
  if (remote?.wmWorkerSketchEnabled === false) return false;
  return local.wmWorkerSketchEnabled === true;
}

export function loadAppSettingsLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    const d = defaultAppSettings();
    if (!raw) return d;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      athPreviewEnabled: parsed.athPreviewEnabled !== false,
      tendersTabForStaffEnabled: parsed.tendersTabForStaffEnabled === true,
      workCatalogForAdminEnabled: parsed.workCatalogForAdminEnabled === true,
      instructionsForAdminEnabled: parsed.instructionsForAdminEnabled === true,
      changesForAdminEnabled: parsed.changesForAdminEnabled === true,
      wmRysunkiEnabled: parsed.wmRysunkiEnabled === true,
      wmWorkerSketchEnabled: parsed.wmWorkerSketchEnabled === true,
      catalogWriteMode:
        parsed.catalogWriteMode === undefined
          ? d.catalogWriteMode
          : normalizeCatalogWriteMode(parsed.catalogWriteMode),
      bzpScanDays: numSetting(parsed.bzpScanDays, d.bzpScanDays, 7, 365),
      bzpScanPages: numSetting(parsed.bzpScanPages, d.bzpScanPages, 1, 20),
      bzpScanOrgPages: numSetting(parsed.bzpScanOrgPages, d.bzpScanOrgPages, 1, 20),
      bzpAutoRefreshHours: numSetting(parsed.bzpAutoRefreshHours, d.bzpAutoRefreshHours, 1, 168),
      pipelinePerfDebouncePersist: parsed.pipelinePerfDebouncePersist === true,
      pipelinePerfParseConcurrency: parsed.pipelinePerfParseConcurrency === true,
      pipelinePerfUnpackParallel: parsed.pipelinePerfUnpackParallel === true,
      pipelinePerfArtifactCache: parsed.pipelinePerfArtifactCache === true,
      pipelinePerfDiscoveryFork: parsed.pipelinePerfDiscoveryFork === true,
      pipelineBootstrapPersistLocal: parsed.pipelineBootstrapPersistLocal !== false,
    };
  } catch {
    return defaultAppSettings();
  }
}

function saveAppSettingsLocal(settings: AppSettings): void {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export async function syncAppSettingsFromCloud(): Promise<AppSettings> {
  try {
    const [cloud] = await fetchKeysFromCloud([APP_SETTINGS_KEY]);
    const local = loadAppSettingsLocal();
    if (!cloud || typeof cloud !== "object") return local;
    const remote = cloud as Partial<AppSettings>;
    const merged: AppSettings = mergeAppSettings(remote, local);
    saveAppSettingsLocal(merged);
    return merged;
  } catch {
    return loadAppSettingsLocal();
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  saveAppSettingsLocal(settings);
  await persistKey(APP_SETTINGS_KEY, settings);
}

export function mergeAppSettings(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): AppSettings {
  return {
    athPreviewEnabled: mergeAthPreviewEnabled(remote, local),
    tendersTabForStaffEnabled: mergeTendersTabForStaffEnabled(remote, local),
    workCatalogForAdminEnabled: mergeWorkCatalogForAdminEnabled(remote, local),
    instructionsForAdminEnabled: mergeInstructionsForAdminEnabled(remote, local),
    changesForAdminEnabled: mergeChangesForAdminEnabled(remote, local),
    wmRysunkiEnabled: mergeWmRysunkiEnabled(remote, local),
    wmWorkerSketchEnabled: mergeWmWorkerSketchEnabled(remote, local),
    catalogWriteMode: mergeCatalogWriteMode(remote, local),
    bzpScanDays: numSetting(remote?.bzpScanDays, local.bzpScanDays, 7, 365),
    bzpScanPages: numSetting(remote?.bzpScanPages, local.bzpScanPages, 1, 20),
    bzpScanOrgPages: numSetting(remote?.bzpScanOrgPages, local.bzpScanOrgPages, 1, 20),
    bzpAutoRefreshHours: numSetting(remote?.bzpAutoRefreshHours, local.bzpAutoRefreshHours, 1, 168),
    pipelinePerfDebouncePersist:
      remote?.pipelinePerfDebouncePersist === true
        ? true
        : remote?.pipelinePerfDebouncePersist === false
          ? false
          : local.pipelinePerfDebouncePersist === true,
    pipelinePerfParseConcurrency:
      remote?.pipelinePerfParseConcurrency === true
        ? true
        : remote?.pipelinePerfParseConcurrency === false
          ? false
          : local.pipelinePerfParseConcurrency === true,
    pipelinePerfUnpackParallel:
      remote?.pipelinePerfUnpackParallel === true
        ? true
        : remote?.pipelinePerfUnpackParallel === false
          ? false
          : local.pipelinePerfUnpackParallel === true,
    pipelinePerfArtifactCache:
      remote?.pipelinePerfArtifactCache === true
        ? true
        : remote?.pipelinePerfArtifactCache === false
          ? false
          : local.pipelinePerfArtifactCache === true,
    pipelinePerfDiscoveryFork:
      remote?.pipelinePerfDiscoveryFork === true
        ? true
        : remote?.pipelinePerfDiscoveryFork === false
          ? false
          : local.pipelinePerfDiscoveryFork === true,
    pipelineBootstrapPersistLocal: mergePipelineBootstrapPersistLocal(remote, local),
  };
}
