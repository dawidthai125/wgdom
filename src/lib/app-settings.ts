/** Ustawienia aplikacji — sync w chmurze (Super Admin). */

import { fetchKeysFromCloud, persistKey, APP_SETTINGS_KEY } from "@/lib/cloud-sync";
import {
  APP_VERSION,
  PIPELINE_CLOUD_LEAN_MIN_APP_VERSION,
  isAppVersionAtLeast,
} from "@/lib/app-version";

export { APP_SETTINGS_KEY };

/** PB-WRITE-A / #5C-2 — routing zapisu katalogu legacy vs work. Domyślnie work_only. */
export type CatalogWriteMode = "split" | "work_only" | "legacy_only";

/**
 * IK AUTONOMY-05 — P5/P6 MODE A lever (same keys, explicit tri-state).
 * AUTO/ON = read-only MODE A · OFF = explicit Owner kill-switch.
 * Does NOT enable Research (separate boolean levers).
 */
export type IkE2eMode = "AUTO" | "OFF" | "ON";

const CATALOG_WRITE_MODES: CatalogWriteMode[] = ["split", "work_only", "legacy_only"];
const IK_E2E_MODES: readonly IkE2eMode[] = ["AUTO", "OFF", "ON"];

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

/**
 * Parse stored P5/P6 value. `null` = key absent (merge uses the other side).
 * B-POLICY: true → ON · false → AUTO · missing → null (load coerces to AUTO).
 * Never maps legacy false to OFF.
 */
export function parseIkE2eMode(value: unknown): IkE2eMode | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && (IK_E2E_MODES as readonly string[]).includes(value)) {
    return value as IkE2eMode;
  }
  if (value === true) return "ON";
  if (value === false) return "AUTO";
  return null;
}

/** Load/default coerce — missing/unknown → AUTO (B-POLICY). Idempotent for AUTO|OFF|ON. */
export function normalizeIkE2eMode(value: unknown): IkE2eMode {
  return parseIkE2eMode(value) ?? "AUTO";
}

/** MODE A run capability: AUTO or ON. Never `|| true`. Strings are not booleans. */
export function isIkE2eModeActive(mode: IkE2eMode): boolean {
  return mode === "AUTO" || mode === "ON";
}

/**
 * C1 — OFF wins. Explicit kill-switch never becomes AUTO/ON via hydration.
 * Remote present (after parse) wins when neither side is OFF.
 */
export function mergeIkE2eMode(remoteValue: unknown, localValue: unknown): IkE2eMode {
  const remote = parseIkE2eMode(remoteValue);
  const local = normalizeIkE2eMode(localValue);
  if (remote === "OFF" || local === "OFF") return "OFF";
  if (remote != null) return remote;
  return local;
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
  /**
   * EXPERT-AI-PRODUCTION-ENABLEMENT-01 — Expert AI · Przebieg i Decydent.
   * Domyślnie OFF. Super Admin ⚙ Moduły. REUSE kw-app-settings.
   * Legacy LS Session/Decision = kill-switch / OV only (nie master).
   */
  expertAiDecydentEnabled: boolean;
  /**
   * IK-MIGRATION-01 P1 leftover (IK ROLE ACTIVATION).
   * Retained for load/merge/cloud-blob compatibility. NOT a runtime IK access gate.
   * Runtime access = isIkEntryEnabled() → adminCanUseIntelligentEstimator (role).
   * Do not AND this key. Do not delete this key in this slice. Do not migrate KV.
   */
  ikEntryEnabled: boolean;
  /**
   * IK ROLE ACTIVATION — IK access for role `admin`. Default OFF.
   * Super Admin always has IK (helper), independent of this flag.
   * Does NOT enable tendersTabForStaffEnabled · Does NOT flip P5/P6/Research.
   */
  ikEntryForAdminEnabled: boolean;
  /**
   * IK ROLE ACTIVATION — IK access for role `moderator`. Default OFF.
   * Independent of ikEntryForAdminEnabled. Super Admin always has IK.
   */
  ikEntryForModeratorEnabled: boolean;
  /**
   * IK-MIGRATION-01 P2 leftover (IK AUTONOMY-08 P0).
   * Retained for load/merge/cloud-blob compatibility. Default OFF.
   * NOT a runtime Documents→BOQ gate — see isIkP2DocumentsBoqActive (ikEntryEnabled).
   * Do not migrate KV. Do not delete this key in 08-P0.
   */
  ikAutoIngestEnabled: boolean;
  /**
   * IK-MIGRATION-01 P3 — Identity Coverage under IkEntryHost (diagnostic).
   * Default OFF. Sole P3 lever. Does NOT enable EXECUTE_RESEARCH / RUN_RATE_EXPERTS.
   */
  ikIdentityCoverageEnabled: boolean;
  /**
   * IK FINALIZATION — provisional tender estimate (mapper binding + catalog companyPricePln).
   * Default OFF. Does NOT mutate Work Catalog / OUR RATE / Price Memory.
   */
  ikProvisionalEstimationEnabled: boolean;
  /**
   * IK-MIGRATION-01 P4 — Chief Wiring under IK Entry (scoped session).
   * Default OFF. Requires ikEntryEnabled + pricingReady. Does NOT flip Dual Outcome master (D).
   * Does NOT enable Labor/Material research.
   */
  ikChiefWiringEnabled: boolean;
  /**
   * IK AUTONOMY-05 P5 — Labor E2E under IK (MODE A: CURRENT + internal-first).
   * AUTO|ON = read-only MODE A · OFF = explicit kill-switch.
   * Does NOT enable Material (P6) · Does NOT flip Chief (P4) · Does NOT flip D.
   * Does NOT enable Research (ikLaborResearchEnabled stays boolean === true).
   */
  ikLaborE2eEnabled: IkE2eMode;
  /**
   * IK-MIGRATION-01 P5 — selective Labor HTTP research (MODE B).
   * Default OFF. Requires P5 MODE A active (AUTO|ON). Does NOT imply Material research.
   */
  ikLaborResearchEnabled: boolean;
  /**
   * IK AUTONOMY-05 P6 — Material E2E under IK (MODE A: Price Memory + identity).
   * AUTO|ON = read-only MODE A · OFF = explicit kill-switch.
   * Does NOT enable Labor (P5) · Does NOT flip Chief (P4) · Does NOT flip D.
   * Does NOT enable Research (ikMaterialResearchEnabled stays boolean === true).
   */
  ikMaterialE2eEnabled: IkE2eMode;
  /**
   * IK-MIGRATION-01 P6 — selective Material DIY HTTP research (MODE B).
   * Default OFF. Requires ikMaterialE2eEnabled. Does NOT imply Labor research.
   */
  ikMaterialResearchEnabled: boolean;
  /**
   * IK AUTONOMY-06 / IK-MIGRATION-01 P7 — Position Cost → F5 → Bid → SUM → EC under IK.
   * AUTO|ON = autonomous READ-ONLY calc · OFF = kill-switch.
   * Does NOT enable research/HTTP/Accept · Does NOT mutate CatalogWork / Price Memory
   * · Does NOT flip P4–P6 / D · Final Bid remains OWNER.
   */
  ikF5E2eEnabled: IkE2eMode;
  /**
   * IK AUTONOMY-07 / IK-MIGRATION-01 P8 — Risk → Validation → DW prepare under IK.
   * AUTO|ON = autonomous READ-ONLY prepare · OFF = kill-switch.
   * Does NOT enable research/HTTP/Accept · Does NOT flip D / Chief · Does NOT mutate P4–P7
   * · Does NOT write CatalogWork/PM · Accept / Price Commit / Final Bid remain OWNER.
   */
  ikRiskDecisionE2eEnabled: IkE2eMode;
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
  /**
   * GLOBAL LABOR commercial margin policy (read-time).
   * Used by resolveMarginPct when work.commercialPricing.marginPct is UNSET.
   * Scope = LABOR only — callers must not pass this into material resolve paths.
   * null = policy absent → labor Candidate/SELL GAP when local also UNSET.
   * Owner GO 2026-08-30: default 25 (explicit policy, not copied from A01/paint).
   * Does NOT batch-write commercialPricing onto workIds.
   */
  defaultLaborCommercialMarginPct: number | null;
  /** OD-OCR-25 — lean cloud pipeline body + guard (default OFF). */
  pipelineCloudLeanGuardV1: boolean;
  /** OD-OCR-25 — leftover SHA field. OD-OCR-34 gate does not read it. */
  pipelineCloudLeanMinCommit: string;
  /** OD-OCR-25 — resumable migration revision counter. */
  pipelineCloudLeanMigrationRev: number;
  /** OD-OCR-25 — one-time FULL→LEAN+guard migration complete. */
  pipelineCloudLeanMigrationComplete: boolean;
  /** OD-OCR-25 — rollback flag (legacy full-body cloud writes). */
  pipelineCloudLeanRollback: boolean;
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
    expertAiDecydentEnabled: false,
    ikEntryEnabled: true,
    ikEntryForAdminEnabled: false,
    ikEntryForModeratorEnabled: false,
    ikAutoIngestEnabled: false,
    ikIdentityCoverageEnabled: false,
    ikProvisionalEstimationEnabled: false,
    ikChiefWiringEnabled: false,
    ikLaborE2eEnabled: "AUTO",
    ikLaborResearchEnabled: false,
    ikMaterialE2eEnabled: "AUTO",
    ikMaterialResearchEnabled: false,
    ikF5E2eEnabled: "AUTO",
    ikRiskDecisionE2eEnabled: "AUTO",
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
    // Owner GO — GLOBAL LABOR commercial margin policy (explicit 25; ≠ A01/paint copy).
    defaultLaborCommercialMarginPct: 25,
    pipelineCloudLeanGuardV1: false,
    pipelineCloudLeanMinCommit: "",
    pipelineCloudLeanMigrationRev: 0,
    pipelineCloudLeanMigrationComplete: false,
    pipelineCloudLeanRollback: false,
  };
}

/** Owner-declared GLOBAL LABOR default (SSOT constant · same as defaultAppSettings). */
export const OWNER_DEFAULT_LABOR_COMMERCIAL_MARGIN_PCT = 25 as const;

/** Normalize settings field — null = policy absent; 0 is valid. */
export function normalizeDefaultLaborCommercialMarginPct(
  value: unknown,
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1000, n));
}

/**
 * Cloud-first merge for labor margin policy.
 * Remote finite/null wins when key present; else local.
 */
export function mergeDefaultLaborCommercialMarginPct(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): number | null {
  if (remote != null && Object.prototype.hasOwnProperty.call(remote, "defaultLaborCommercialMarginPct")) {
    return normalizeDefaultLaborCommercialMarginPct(
      remote.defaultLaborCommercialMarginPct,
    );
  }
  return normalizeDefaultLaborCommercialMarginPct(
    local.defaultLaborCommercialMarginPct,
  );
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

/** OD-OCR-25 — lean cloud body + guard master flag (default OFF). */
export function isPipelineCloudLeanGuardEnabled(): boolean {
  const s = loadAppSettingsLocal();
  if (s.pipelineCloudLeanRollback === true) return false;
  return s.pipelineCloudLeanGuardV1 === true;
}

/** OD-OCR-25 — migration complete marker. */
export function isPipelineCloudLeanMigrationComplete(): boolean {
  return loadAppSettingsLocal().pipelineCloudLeanMigrationComplete === true;
}

export type PipelineLeanClientPolicy = {
  pipelineCloudLeanGuardV1: boolean;
  pipelineCloudLeanMigrationComplete: boolean;
  pipelineCloudLeanRollback: boolean;
};

/**
 * OD-OCR-34 — numeric APP_VERSION gate when lean+guard is required.
 * Does not read APP_COMMIT or pipelineCloudLeanMinCommit.
 */
export function evaluatePipelineCloudLeanClientVersionAllowed(
  appVersion: unknown,
  policy: PipelineLeanClientPolicy,
): boolean {
  if (policy.pipelineCloudLeanRollback === true) return true;
  if (policy.pipelineCloudLeanGuardV1 !== true) return true;
  if (policy.pipelineCloudLeanMigrationComplete !== true) return true;
  return isAppVersionAtLeast(appVersion, PIPELINE_CLOUD_LEAN_MIN_APP_VERSION);
}

/** OD-OCR-34 — client APP_VERSION gate when lean+guard active. */
export function isPipelineCloudLeanClientVersionAllowed(): boolean {
  if (!isPipelineCloudLeanGuardEnabled()) return true;
  if (!isPipelineCloudLeanMigrationComplete()) return true;
  return isAppVersionAtLeast(APP_VERSION, PIPELINE_CLOUD_LEAN_MIN_APP_VERSION);
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

/** Chmura ma pierwszeństwo — domyślnie OFF (EXPERT-AI-PRODUCTION-ENABLEMENT-01). */
export function mergeExpertAiDecydentEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.expertAiDecydentEnabled === true) return true;
  if (remote?.expertAiDecydentEnabled === false) return false;
  return local.expertAiDecydentEnabled === true;
}

/** Leftover blob merge — NOT a runtime IK access conjunct. */
export function mergeIkEntryEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikEntryEnabled === true) return true;
  if (remote?.ikEntryEnabled === false) return false;
  return local.ikEntryEnabled === true;
}

/** Chmura ma pierwszeństwo — IK access for Administrator. Default OFF. */
export function mergeIkEntryForAdminEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikEntryForAdminEnabled === true) return true;
  if (remote?.ikEntryForAdminEnabled === false) return false;
  return local.ikEntryForAdminEnabled === true;
}

/** Chmura ma pierwszeństwo — IK access for Moderator. Default OFF. Independent of Admin. */
export function mergeIkEntryForModeratorEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikEntryForModeratorEnabled === true) return true;
  if (remote?.ikEntryForModeratorEnabled === false) return false;
  return local.ikEntryForModeratorEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie OFF (IK-MIGRATION-01 P2). Nie włącza research. */
export function mergeIkAutoIngestEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikAutoIngestEnabled === true) return true;
  if (remote?.ikAutoIngestEnabled === false) return false;
  return local.ikAutoIngestEnabled === true;
}

/** Chmura ma pierwszeństwo — domyślnie OFF (IK-MIGRATION-01 P3). Nie włącza research/experts. */
export function mergeIkIdentityCoverageEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikIdentityCoverageEnabled === true) return true;
  if (remote?.ikIdentityCoverageEnabled === false) return false;
  return local.ikIdentityCoverageEnabled === true;
}

/** IK FINALIZATION — provisional estimate seam. Default OFF. */
export function mergeIkProvisionalEstimationEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikProvisionalEstimationEnabled === true) return true;
  if (remote?.ikProvisionalEstimationEnabled === false) return false;
  return local.ikProvisionalEstimationEnabled === true;
}

/** P4 Chief-under-IK preference — independent of Dual Outcome master (D). */
export function mergeIkChiefWiringEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikChiefWiringEnabled === true) return true;
  if (remote?.ikChiefWiringEnabled === false) return false;
  return local.ikChiefWiringEnabled === true;
}

/** P5 Labor E2E — C1 OFF wins · B-POLICY legacy bool. Independent of D. */
export function mergeIkLaborE2eEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): IkE2eMode {
  return mergeIkE2eMode(remote?.ikLaborE2eEnabled, local.ikLaborE2eEnabled);
}

/** P5 Labor selective research — requires Labor E2E; never arms Material. */
export function mergeIkLaborResearchEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikLaborResearchEnabled === true) return true;
  if (remote?.ikLaborResearchEnabled === false) return false;
  return local.ikLaborResearchEnabled === true;
}

/** P6 Material E2E — C1 OFF wins · B-POLICY legacy bool. Independent of D. */
export function mergeIkMaterialE2eEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): IkE2eMode {
  return mergeIkE2eMode(remote?.ikMaterialE2eEnabled, local.ikMaterialE2eEnabled);
}

/** P6 Material selective research — requires Material E2E; never arms Labor. */
export function mergeIkMaterialResearchEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): boolean {
  if (remote?.ikMaterialResearchEnabled === true) return true;
  if (remote?.ikMaterialResearchEnabled === false) return false;
  return local.ikMaterialResearchEnabled === true;
}

/** P7 F5/Bid — OFF wins · B-POLICY via mergeIkE2eMode · independent of Research / D. */
export function mergeIkF5E2eEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): IkE2eMode {
  return mergeIkE2eMode(remote?.ikF5E2eEnabled, local.ikF5E2eEnabled);
}

/** P8 Risk/Decision — OFF wins · B-POLICY via mergeIkE2eMode · independent of Research / D. */
export function mergeIkRiskDecisionE2eEnabled(
  remote: Partial<AppSettings> | null | undefined,
  local: AppSettings,
): IkE2eMode {
  return mergeIkE2eMode(remote?.ikRiskDecisionE2eEnabled, local.ikRiskDecisionE2eEnabled);
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
      expertAiDecydentEnabled: parsed.expertAiDecydentEnabled === true,
      ikEntryEnabled: parsed.ikEntryEnabled === true,
      ikEntryForAdminEnabled: parsed.ikEntryForAdminEnabled === true,
      ikEntryForModeratorEnabled: parsed.ikEntryForModeratorEnabled === true,
      ikAutoIngestEnabled: parsed.ikAutoIngestEnabled === true,
      ikIdentityCoverageEnabled: parsed.ikIdentityCoverageEnabled === true,
      ikProvisionalEstimationEnabled: parsed.ikProvisionalEstimationEnabled === true,
      ikChiefWiringEnabled: parsed.ikChiefWiringEnabled === true,
      ikLaborE2eEnabled: normalizeIkE2eMode(parsed.ikLaborE2eEnabled),
      ikLaborResearchEnabled: parsed.ikLaborResearchEnabled === true,
      ikMaterialE2eEnabled: normalizeIkE2eMode(parsed.ikMaterialE2eEnabled),
      ikMaterialResearchEnabled: parsed.ikMaterialResearchEnabled === true,
      ikF5E2eEnabled: normalizeIkE2eMode(parsed.ikF5E2eEnabled),
      ikRiskDecisionE2eEnabled: normalizeIkE2eMode(parsed.ikRiskDecisionE2eEnabled),
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
      defaultLaborCommercialMarginPct: Object.prototype.hasOwnProperty.call(
        parsed,
        "defaultLaborCommercialMarginPct",
      )
        ? normalizeDefaultLaborCommercialMarginPct(
            parsed.defaultLaborCommercialMarginPct,
          )
        : d.defaultLaborCommercialMarginPct,
      pipelineCloudLeanGuardV1: parsed.pipelineCloudLeanGuardV1 === true,
      pipelineCloudLeanMinCommit:
        typeof parsed.pipelineCloudLeanMinCommit === "string"
          ? parsed.pipelineCloudLeanMinCommit
          : d.pipelineCloudLeanMinCommit,
      pipelineCloudLeanMigrationRev: numSetting(
        parsed.pipelineCloudLeanMigrationRev,
        d.pipelineCloudLeanMigrationRev,
        0,
        1_000_000,
      ),
      pipelineCloudLeanMigrationComplete: parsed.pipelineCloudLeanMigrationComplete === true,
      pipelineCloudLeanRollback: parsed.pipelineCloudLeanRollback === true,
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
    expertAiDecydentEnabled: mergeExpertAiDecydentEnabled(remote, local),
    ikEntryEnabled: mergeIkEntryEnabled(remote, local),
    ikEntryForAdminEnabled: mergeIkEntryForAdminEnabled(remote, local),
    ikEntryForModeratorEnabled: mergeIkEntryForModeratorEnabled(remote, local),
    ikAutoIngestEnabled: mergeIkAutoIngestEnabled(remote, local),
    ikIdentityCoverageEnabled: mergeIkIdentityCoverageEnabled(remote, local),
    ikProvisionalEstimationEnabled: mergeIkProvisionalEstimationEnabled(remote, local),
    ikChiefWiringEnabled: mergeIkChiefWiringEnabled(remote, local),
    ikLaborE2eEnabled: mergeIkLaborE2eEnabled(remote, local),
    ikLaborResearchEnabled: mergeIkLaborResearchEnabled(remote, local),
    ikMaterialE2eEnabled: mergeIkMaterialE2eEnabled(remote, local),
    ikMaterialResearchEnabled: mergeIkMaterialResearchEnabled(remote, local),
    ikF5E2eEnabled: mergeIkF5E2eEnabled(remote, local),
    ikRiskDecisionE2eEnabled: mergeIkRiskDecisionE2eEnabled(remote, local),
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
    defaultLaborCommercialMarginPct: mergeDefaultLaborCommercialMarginPct(
      remote,
      local,
    ),
    pipelineCloudLeanGuardV1:
      remote?.pipelineCloudLeanGuardV1 === true
        ? true
        : remote?.pipelineCloudLeanGuardV1 === false
          ? false
          : local.pipelineCloudLeanGuardV1 === true,
    pipelineCloudLeanMinCommit:
      typeof remote?.pipelineCloudLeanMinCommit === "string"
        ? remote.pipelineCloudLeanMinCommit
        : local.pipelineCloudLeanMinCommit,
    pipelineCloudLeanMigrationRev:
      remote?.pipelineCloudLeanMigrationRev != null
        ? numSetting(remote.pipelineCloudLeanMigrationRev, local.pipelineCloudLeanMigrationRev, 0, 1_000_000)
        : local.pipelineCloudLeanMigrationRev,
    pipelineCloudLeanMigrationComplete:
      remote?.pipelineCloudLeanMigrationComplete === true
        ? true
        : remote?.pipelineCloudLeanMigrationComplete === false
          ? false
          : local.pipelineCloudLeanMigrationComplete === true,
    pipelineCloudLeanRollback:
      remote?.pipelineCloudLeanRollback === true
        ? true
        : remote?.pipelineCloudLeanRollback === false
          ? false
          : local.pipelineCloudLeanRollback === true,
  };
}
