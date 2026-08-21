import { mergeWeekEmployeesList, weekEmployeeMergeKey } from "./payroll-week-employee-merge.ts";
import { maySkipPayrollShrinkGuard } from "./payroll-hours-collapse-gate.ts";
import { previousWeekRange } from "./payroll-cycle.ts";
import {
  evaluatePayrollResurrectionFence,
  stripLocalOnlyArchiveWeek,
  bootstrapPayrollPushAllowed,
  type ResurrectionFenceDecision,
} from "./payroll-bootstrap-resurrection-fence.ts";
import {
  supabaseProjectId,
  supabaseAnonKey,
  supabaseFunctionsBase,
  isSupabaseConfigured,
} from "@/config/supabase";
import { filterJobFilesByTombstones, mergeJobFileTombstones, mergeJobFiles, mergeJobsDocumentsOnConflict, mergeReportDocSaOverrideOnConflict } from "@/lib/job-documents";
import { filterJobAttachmentsByTombstones, mergeJobAttachmentTombstones, mergeJobAttachments } from "@/lib/job-attachments";
import { mergeWorkEntryTombstones, type WorkEntryTombstone } from "@/lib/payroll-job-assignments";
import {
  mergeJobNotes,
  mergeInspectorPhotos,
  mergeHandoverStage,
  mergePlannedHandoverDate,
  mergeExecutionLeadDirectoryId,
  mergeExecutionAssigneeDirectoryIds,
} from "@/lib/job-wm";
import { mergeAssignedInspectorId } from "@/lib/inspector-job-assignment";
import { mergeJobAddressField } from "@/lib/job-address-fields";
import { mergePhotoTombstones, mergePhotos } from "@/lib/job-photos";
import { mergeHiddenInspectorFeedIds } from "@/lib/job-activity";
import {
  mergeTenderDataKey,
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  WGDOM_COST_CATALOG_KEY,
  WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY,
  COMPANY_QUALIFICATION_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
  TENDER_CALIBRATION_KEY,
  TENDER_PRICE_OVERRIDES_KEY,
  WGDOM_COST_CATALOG_HISTORY_KEY,
  TENDERS_DELETED_IDS_KEY,
} from "@/lib/tenders-sync";
import { mergeEmployeeLeaves, normalizeEmployeeLeaves } from "@/lib/employee-leaves";
import { mergeRecoverableCharges, normalizeRecoverableCharges } from "@/lib/recoverable-charges";
import { mergeElectricalMeasurements } from "@/lib/electrical-measurements/merge";
import {
  ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY,
  getDeletedElectricalMeasurementIds,
  mergeDeletedElectricalMeasurementIds,
  saveDeletedElectricalMeasurementIds,
} from "@/lib/electrical-measurements/deleted-ids";
import { mergeElectricalMeasurementRegistry, createEmptyRegistryState } from "@/lib/electrical-measurements/registry";
import { mergeElectricalMeasurementSettings, normalizeElectricalMeasurementSettings } from "@/lib/electrical-measurements/settings";
import { normalizeElectricalMeasurements } from "@/lib/electrical-measurements/normalize";
import { mergeElectricalSchematics } from "@/lib/electrical-schematics/merge";
import { normalizeElectricalSchematics } from "@/lib/electrical-schematics/normalize";
import {
  ELECTRICAL_SCHEMATICS_KEY,
} from "@/lib/electrical-schematics/types";
import { mergeWmTechnicalDrawings } from "@/lib/wm-technical-drawings/merge";
import { WM_TECHNICAL_DRAWINGS_KEY } from "@/lib/wm-technical-drawings/types";
import {
  ELECTRICAL_MEASUREMENT_REGISTRY_KEY,
  ELECTRICAL_MEASUREMENT_SETTINGS_KEY,
  ELECTRICAL_MEASUREMENTS_KEY,
} from "@/lib/electrical-measurements/types";
import { mergeOperationalNotes, normalizeOperationalNotes, OPERATIONAL_NOTES_KEY } from "@/lib/operational-notes";
import {
  mergeOperationalNotesAuditLog,
  normalizeOperationalNotesAuditLog,
  OPERATIONAL_NOTES_AUDIT_LOG_KEY,
} from "@/lib/operational-notes-audit";
import {
  mergeOperationalNotesReadState,
  normalizeOperationalNotesReadState,
  OPERATIONAL_NOTES_READ_STATE_KEY,
} from "@/lib/operational-notes-read-state";
import {
  mergeWmPrintHistory,
  mergeWmPrintJobDocuments,
  mergeWmPrintTemplates,
  getDeletedWmPrintTemplateIds,
  getDeletedWmPrintJobDocIds,
  mergeDeletedWmPrintTemplateIds,
  mergeDeletedWmPrintJobDocIds,
  saveDeletedWmPrintTemplateIds,
  saveDeletedWmPrintJobDocIds,
  normalizeWmPrintHistory,
} from "@/lib/wm-print/wm-print-sync";
import { normalizeWmPrintTemplates } from "@/lib/wm-print/templates";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { mergeWmPrintSettings, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import {
  WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
  WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
} from "@/lib/wm-print/types";
import { defaultWgdomCostCatalogStore } from "@/lib/wgdom-cost-catalog";
import {
  defaultUserClassificationDictionaryStore,
  refreshUserClassificationDictionaryCacheFromLocalStorage,
} from "@/lib/wgdom-user-classification-dictionary";
import { mergeDeliveryPackagePublications } from "@/lib/delivery-package-publications/merge";
import { recordBatchGet, recordBatchSet, recordBatchSetRetry, bundleFingerprint } from "@/lib/cloud-sync-throttle";
import {
  BATCH_SET_MAX_ATTEMPTS,
  delayBeforeBatchSetAttempt,
  isTransientBatchSetError,
  sleepMs,
} from "@/lib/cloud-batch-set-retry";
import {
  mergeSecurityAuditLog,
  normalizeSecurityAuditLog,
  SECURITY_AUDIT_LOG_KEY,
} from "@/lib/security-audit-log";
import {
  mergeWmDrukAuditLog,
  normalizeWmDrukAuditLog,
  WM_DRUK_AUDIT_LOG_KEY,
} from "@/lib/wm-druk-audit";
import {
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  mergeWorkBundleStore,
  normalizeWorkBundleStore,
} from "@/lib/work-catalog/work-bundle-store";
import {
  WORK_CATALOG_STORAGE_KEY,
  defaultWorkCatalogStoreForPersist,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
} from "@/lib/work-catalog/work-catalog-store";
import {
  KNR_CATALOG_STORAGE_KEY,
  emptyKnrCatalogStore,
  normalizeKnrCatalogStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-store";
import {
  mergeKnrCatalogStore,
  shouldPushKnrCatalogToCloud,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge";
import {
  emptyKnrDiscoveryEvidenceStore,
  normalizeKnrDiscoveryEvidenceStore,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store";
import {
  mergeKnrDiscoveryEvidenceStore,
  shouldPushKnrDiscoveryEvidenceToCloud,
} from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-merge";
import { KNR_DISCOVERY_EVIDENCE_STORAGE_KEY } from "@/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types";
import { mergeLaborSourceEvidenceDataKey } from "@/lib/labor-source-evidence";
import {
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  emptyLaborSourceEvidenceStore,
  normalizeLaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence";
import {
  OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY,
  defaultCompanyKnowledgeStoreForPersist,
  mergeCompanyKnowledgeStore,
  normalizeCompanyKnowledgeStore,
} from "@/lib/tender-offer-boq-company-knowledge";
import {
  defaultPriceDemandStoreForPersist,
  mergePriceDemandStore,
  normalizePriceDemandStore,
} from "@/lib/price-intelligence/demand-queue";
import { PRICE_DEMAND_STORAGE_KEY } from "@/lib/price-intelligence/demand-types";
import { mergeWeekEmployeeRecord } from "./payroll-week-employee-record-merge.ts";
import {
  PAYROLL_WEEK_META_KEY,
  buildPayrollWeekMetaPlaceholder,
  getExpectedPayrollRevision,
  normalizePayrollWeekMeta,
  writePayrollWeekMetaToLs,
} from "./payroll-week-meta.ts";
import { APP_VERSION } from "@/lib/app-version";
import {
  payrollTraceBumpRosterRevision,
  payrollTraceCreateBootstrapPushId,
  payrollTraceCreateMergeTraceId,
  payrollTraceCreatePushTraceId,
  payrollTraceEmit,
  payrollTraceGetSubjectMergeKey,
  payrollTraceNextHttpRequestId,
  payrollTraceNextHttpSeq,
  rosterTraceSnapshot,
} from "@/lib/payroll-runtime-trace";
import { logPayrollAntiLeakRuntimeTrace } from "@/lib/payroll-anti-leak-runtime-trace";
import { logPayrollBootstrapTraceFromWeekKeys } from "@/lib/payroll-bootstrap-runtime-trace";
function traceWeekRangeFromLs(): { weekFrom: string; weekTo: string } {
  try {
    const wf = JSON.parse(localStorage.getItem("kw-weekFrom") ?? '""');
    const wt = JSON.parse(localStorage.getItem("kw-weekTo") ?? '""');
    return { weekFrom: typeof wf === "string" ? wf : "", weekTo: typeof wt === "string" ? wt : "" };
  } catch {
    return { weekFrom: "", weekTo: "" };
  }
}

/** Klucze danych biznesowych — każdy nowy typ zapisu MUSI być tutaj. */
export const DATA_KEYS = [
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-contacts",
  "kw-employee-leaves",
  "kw-recoverable-charges",
  "kw-operational-notes",
  "kw-wm-print-templates",
  "kw-wm-print-job-docs",
  "kw-wm-print-settings",
  "kw-wm-print-history",
  "kw-delivery-package-publications",
  "kw-electrical-measurements",
  "kw-electrical-measurement-registry",
  "kw-electrical-measurement-settings",
  "kw-electrical-schematics",
  "kw-wm-technical-drawings",
  "kw-tenders-pipeline",
  "kw-tenders-company-profile",
  "kw-wgdom-classification-dictionary",
  "kw-company-profile",
  "kw-tenders-custom-keywords",
  "kw-tender-calibration",
  "kw-tender-price-overrides",
  "kw-wgdom-cost-catalog-history",
  "kw-wgdom-work-catalog",
  "kw-wgdom-work-bundles",
  /** KL-7-P0 — OUR KNR CATALOG (norms · VERIFIED SSOT · ≠ OUR RATE / PLN). */
  "kw-knr-catalog",
  /** KL-7-P2A — Discovery evidence memory (≠ catalog authority · ≠ ATH · ZERO HTTP). */
  "kw-knr-discovery-evidence",
  /** WR-SOURCE-EVIDENCE-DB-01 — labor market observations (≠ OUR RATE / catalog). */
  "kw-wgdom-labor-source-evidence",
  /** P3.1 — company knowledge mirror (Purchase / OfferBoq learning). */
  "kw-offer-boq-company-knowledge",
  /** P3.2 — PRICE DATA MISSING demand queue (dedup blob). */
  "kw-price-intelligence-demand",
] as const;

export type DataKey = (typeof DATA_KEYS)[number];

/** Faza 1 CloudLoader — klucze blokujące ready. */
export const BOOTSTRAP_CORE_KEYS = [
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-employee-leaves",
] as const satisfies readonly DataKey[];

/** Faza 2 CloudLoader — pobierane w tle po ready. */
export const BOOTSTRAP_DEFERRED_KEYS = [
  "kw-tenders-pipeline",
  "kw-tenders-company-profile",
  "kw-wgdom-classification-dictionary",
  "kw-company-profile",
  "kw-tenders-custom-keywords",
  "kw-tender-calibration",
  "kw-tender-price-overrides",
  "kw-wgdom-cost-catalog-history",
  "kw-wgdom-work-catalog",
  "kw-wgdom-work-bundles",
  "kw-knr-catalog",
  "kw-knr-discovery-evidence",
  "kw-wgdom-labor-source-evidence",
  "kw-offer-boq-company-knowledge",
  "kw-price-intelligence-demand",
  "kw-contacts",
  "kw-recoverable-charges",
  "kw-operational-notes",
  "kw-wm-print-templates",
  "kw-wm-print-job-docs",
  "kw-wm-print-settings",
  "kw-wm-print-history",
  "kw-delivery-package-publications",
  "kw-electrical-measurements",
  "kw-electrical-measurement-registry",
  "kw-electrical-measurement-settings",
  "kw-electrical-schematics",
  "kw-wm-technical-drawings",
] as const satisfies readonly DataKey[];

export const WGDOM_DEFERRED_BOOTSTRAP_EVENT = "wgdom-deferred-bootstrap";

export const ADMIN_HASH_KEY = "kw-admin-hash";
export const ADMIN_PASSWORDS_KEY = "kw-admin-passwords";
export const ADMIN_USERS_CONFIG_KEY = "kw-admin-users-config";
export const INSPECTOR_STATS_KEY = "kw-inspector-stats";
export const APP_SETTINGS_KEY = "kw-app-settings";

export { isSupabaseConfigured } from "@/config/supabase";

/** CLOUD-P0-DEADLOCK-N1 — transient batch-set retry (pure helpers). */
export {
  isTransientBatchSetError,
  BATCH_SET_TRANSIENT_RETRY_DELAYS_MS,
  BATCH_SET_MAX_ATTEMPTS,
} from "@/lib/cloud-batch-set-retry";

export const API_BASE = supabaseFunctionsBase;

export const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${supabaseAnonKey}`,
};

export function isDataKey(key: string): key is DataKey {
  return (DATA_KEYS as readonly string[]).includes(key);
}

/** Odrzuca wpisy kartoteki / śmieci w tablicy kw-jobs (np. dir-6 bez adresu). */
export function isValidJobRecord(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const j = raw as { id?: string; address?: string; client?: string; status?: string };
  if (!j.id || typeof j.id !== "string") return false;
  if (j.status !== "in_progress" && j.status !== "completed") return false;
  const addr = typeof j.address === "string" ? j.address.trim() : "";
  const client = typeof j.client === "string" ? j.client.trim() : "";
  return addr.length > 0 || client.length > 0;
}

/** kw-jobs musi być tablicą — w chmurze czasem lądował pojedynczy obiekt. */
export function normalizeJobsValue(raw: unknown): unknown[] {
  let arr: unknown[];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && "id" in (raw as object)) arr = [raw];
  else return [];
  return arr.filter(isValidJobRecord);
}

function jobMergeScore(j: {
  workEntries?: unknown[];
  photos?: unknown[];
  jobFiles?: unknown[];
  activityLog?: unknown[];
  jobNotes?: unknown[];
  inspectorPhotos?: unknown[];
}): number {
  return (
    (j.workEntries?.length ?? 0)
    + (j.photos?.length ?? 0)
    + (j.jobFiles?.length ?? 0) * 4
    + (j.activityLog?.length ?? 0)
    + (j.jobNotes?.length ?? 0) * 2
    + (j.inspectorPhotos?.length ?? 0) * 2
  );
}

function mergeActivityLogs(
  a: { id: string; at: string }[] | undefined,
  b: { id: string; at: string }[] | undefined,
): { id: string; at: string }[] {
  const map = new Map<string, { id: string; at: string }>();
  for (const ev of [...(a || []), ...(b || [])]) {
    if (ev?.id) map.set(ev.id, ev);
  }
  return [...map.values()]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 200);
}

type WorkEntryMergeLike = {
  id?: string;
  directoryId?: string;
  employeeName?: string;
  date?: string;
  hours?: number;
  rate?: number;
  notes?: string;
};

function workEntryRichness(e: WorkEntryMergeLike | undefined): number {
  if (!e) return 0;
  let s = 0;
  const hours = typeof e.hours === "number" ? e.hours : parseFloat(String(e.hours ?? "")) || 0;
  if (hours > 0) s += 8;
  s += Math.min(String(e.notes ?? "").trim().length, 200);
  if (String(e.directoryId ?? "").trim()) s += 1;
  if (String(e.employeeName ?? "").trim()) s += 1;
  if (String(e.date ?? "").trim()) s += 1;
  return s;
}

function pickWorkEntryOnConflict(
  fromA: WorkEntryMergeLike,
  fromB: WorkEntryMergeLike,
  aParentAt: number,
  bParentAt: number,
): WorkEntryMergeLike {
  if (aParentAt > 0 || bParentAt > 0) {
    if (aParentAt > bParentAt) return fromA;
    if (bParentAt > aParentAt) return fromB;
  }
  const pr = workEntryRichness(fromA);
  const cr = workEntryRichness(fromB);
  if (cr > pr) return fromB;
  if (pr > cr) return fromA;
  return fromB;
}

/** Union job.workEntries po id — nowszy job.updatedAt wygrywa; remis → bogatszy wpis; tombstone usuwa wpis. */
export function mergeWorkEntriesById(
  a: unknown[] | undefined,
  b: unknown[] | undefined,
  tombstones: WorkEntryTombstone[] = [],
  aParentUpdatedAt?: string,
  bParentUpdatedAt?: string,
): unknown[] {
  const deletedIds = new Set(tombstones.map((t) => t.id).filter(Boolean));
  const aParentAt = parseRecordTs(aParentUpdatedAt);
  const bParentAt = parseRecordTs(bParentUpdatedAt);
  const map = new Map<string, WorkEntryMergeLike>();
  const ingest = (list: unknown[] | undefined, fromB: boolean) => {
    for (const raw of list || []) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as WorkEntryMergeLike;
      const id = String(e.id ?? "").trim();
      if (!id || deletedIds.has(id)) continue;
      const prev = map.get(id);
      if (!prev) {
        map.set(id, e);
        continue;
      }
      const chosen = fromB
        ? pickWorkEntryOnConflict(prev, e, aParentAt, bParentAt)
        : pickWorkEntryOnConflict(e, prev, aParentAt, bParentAt);
      map.set(id, chosen);
    }
  };
  ingest(a, false);
  ingest(b, true);
  return [...map.values()].sort((x, y) => {
    const dc = String(x.date ?? "").localeCompare(String(y.date ?? ""));
    if (dc) return dc;
    return String(x.id ?? "").localeCompare(String(y.id ?? ""));
  });
}

export const JOBS_DELETED_IDS_KEY = "kw-jobs-deleted-ids";
export const DIRECTORY_DELETED_IDS_KEY = "kw-directory-deleted-ids";
export const CONTACTS_DELETED_IDS_KEY = "kw-contacts-deleted-ids";
export const ARCHIVE_DELETED_IDS_KEY = "kw-archive-deleted-ids";
export const EMPLOYEE_LEAVES_DELETED_IDS_KEY = "kw-employee-leaves-deleted-ids";
export const RECOVERABLE_CHARGES_DELETED_IDS_KEY = "kw-recoverable-charges-deleted-ids";
export const OPERATIONAL_NOTES_DELETED_IDS_KEY = "kw-operational-notes-deleted-ids";
/** PR-PAY-S2 — tombstones usuniętych Week Employees (per-tydzień, analog deletedArchiveIds). */
export const WEEK_EMPLOYEES_DELETED_KEYS_KEY = "kw-week-employees-deleted-ids";

/** SYNC-ARCH-01 S1-1 — Payroll klucze wyłączone z Full Bundle RS push (domain sync owns push). */
export const RS_PUSH_EXCLUDED_PAYROLL_DATA_KEYS = [
  "kw-week-employees",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-archive",
] as const satisfies readonly DataKey[];

export const RS_PUSH_EXCLUDED_PAYROLL_KEYS: readonly string[] = [
  ...RS_PUSH_EXCLUDED_PAYROLL_DATA_KEYS,
  ARCHIVE_DELETED_IDS_KEY,
  WEEK_EMPLOYEES_DELETED_KEYS_KEY,
];

const RS_PUSH_EXCLUDED_PAYROLL_KEY_SET = new Set<string>(RS_PUSH_EXCLUDED_PAYROLL_KEYS);

/** SYNC-ARCH-01 S1-1 — filtr payload RS push (bez payroll). */
export function filterRsPushKeysAndValues(
  keys: string[],
  values: unknown[],
): { keys: string[]; values: unknown[] } {
  const outKeys: string[] = [];
  const outValues: unknown[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (!RS_PUSH_EXCLUDED_PAYROLL_KEY_SET.has(keys[i])) {
      outKeys.push(keys[i]);
      outValues.push(values[i]);
    }
  }
  payrollTraceEmit("sync.rs.push.filtered", "RS", "debug", {
    excludedPayrollKeys: keys.filter((k) => RS_PUSH_EXCLUDED_PAYROLL_KEY_SET.has(k)),
    outKeyCount: outKeys.length,
  });
  return { keys: outKeys, values: outValues };
}

export { OPERATIONAL_NOTES_KEY, OPERATIONAL_NOTES_READ_STATE_KEY, OPERATIONAL_NOTES_AUDIT_LOG_KEY };
export { SECURITY_AUDIT_LOG_KEY };
export { WM_DRUK_AUDIT_LOG_KEY };

/** Pełny zestaw KV notatek operacyjnych w backupie UI / email (v2.58.1). */
export const OPERATIONAL_NOTES_BACKUP_KEYS = [
  OPERATIONAL_NOTES_KEY,
  OPERATIONAL_NOTES_READ_STATE_KEY,
  OPERATIONAL_NOTES_AUDIT_LOG_KEY,
  OPERATIONAL_NOTES_DELETED_IDS_KEY,
] as const;

/** Klucze poza DATA_KEYS (`kw-operational-notes` jest już w DATA_KEYS). */
export const OPERATIONAL_NOTES_BACKUP_AUX_KEYS = [
  OPERATIONAL_NOTES_READ_STATE_KEY,
  OPERATIONAL_NOTES_AUDIT_LOG_KEY,
  OPERATIONAL_NOTES_DELETED_IDS_KEY,
] as const;

function jobIdOf(j: unknown): string | undefined {
  if (!j || typeof j !== "object" || !("id" in j)) return undefined;
  return String((j as { id: string }).id);
}

export function normalizeDeletedJobIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function getDeletedJobIds(): string[] {
  try {
    const raw = localStorage.getItem(JOBS_DELETED_IDS_KEY);
    if (!raw) return [];
    return normalizeDeletedJobIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDeletedJobIds(ids: string[]): void {
  try {
    localStorage.setItem(JOBS_DELETED_IDS_KEY, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function addDeletedJobId(id: string): string[] {
  const next = [...new Set([...getDeletedJobIds(), id])].slice(-500);
  saveDeletedJobIds(next);
  return next;
}

export function mergeDeletedJobIds(local: string[], cloud: string[]): string[] {
  return [...new Set([...local, ...cloud])].slice(-500);
}

function dirIdOf(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("id" in item)) return undefined;
  return String((item as { id: string }).id);
}

export function normalizeDeletedDirectoryIds(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedDirectoryIds(): string[] {
  try {
    const raw = localStorage.getItem(DIRECTORY_DELETED_IDS_KEY);
    if (!raw) return [];
    return normalizeDeletedDirectoryIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDeletedDirectoryIds(ids: string[]): void {
  try {
    localStorage.setItem(DIRECTORY_DELETED_IDS_KEY, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function addDeletedDirectoryId(id: string): string[] {
  const next = [...new Set([...getDeletedDirectoryIds(), id])].slice(-500);
  saveDeletedDirectoryIds(next);
  return next;
}

export function mergeDeletedDirectoryIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

function filterDeletedDirectory(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((item) => {
    const id = dirIdOf(item);
    return id && !deleted.has(id);
  });
}

function recordIdOf(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("id" in item)) return undefined;
  return String((item as { id: string }).id);
}

function getDeletedIdsFromKey(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return normalizeDeletedJobIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveDeletedIdsToKey(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function getDeletedContactsIds(): string[] {
  return getDeletedIdsFromKey(CONTACTS_DELETED_IDS_KEY);
}

export function saveDeletedContactsIds(ids: string[]): void {
  saveDeletedIdsToKey(CONTACTS_DELETED_IDS_KEY, ids);
}

export function addDeletedContactId(id: string): string[] {
  const next = [...new Set([...getDeletedContactsIds(), id])].slice(-500);
  saveDeletedContactsIds(next);
  return next;
}

export function mergeDeletedContactsIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

export function getDeletedArchiveIds(): string[] {
  return getDeletedIdsFromKey(ARCHIVE_DELETED_IDS_KEY);
}

export function saveDeletedArchiveIds(ids: string[]): void {
  saveDeletedIdsToKey(ARCHIVE_DELETED_IDS_KEY, ids);
}

export function addDeletedArchiveId(id: string): string[] {
  const next = [...new Set([...getDeletedArchiveIds(), id])].slice(-500);
  saveDeletedArchiveIds(next);
  return next;
}

export function mergeDeletedArchiveIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

// ─── PR-PAY-S2 — Week Employee deletion tombstones ──────────────────────────
// Analog deletedArchiveIds, ale kluczowany po weekEmployeeMergeKey i ograniczony
// do KONKRETNEGO tygodnia (weekFrom|weekTo). Dzięki temu usunięcie pracownika z
// bieżącego tygodnia NIE blokuje jego legalnego dodania w kolejnych tygodniach
// (rollover / carry-forward pozostają nietknięte). Tombstone jest lokalny per
// urządzenie — merge każdego urządzenia respektuje własne tombstony, więc
// usunięty pracownik nie wraca z Cloud Sync / Restore / Merge / Bootstrap.

const WEEK_EMPLOYEE_TOMBSTONE_SEP = "::";

export function normalizeDeletedWeekEmployeeKeys(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedWeekEmployeeKeys(): string[] {
  return getDeletedIdsFromKey(WEEK_EMPLOYEES_DELETED_KEYS_KEY);
}

/** @internal RC-B-1 — zapis tombstonów PWRB (tylko kernel / facade). */
export function saveDeletedWeekEmployeeKeys(keys: string[]): void {
  saveDeletedIdsToKey(WEEK_EMPLOYEES_DELETED_KEYS_KEY, keys);
}

export function mergeDeletedWeekEmployeeKeys(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

/** Złożony identyfikator tombstone: `${weekFrom}|${weekTo}::${weekEmployeeMergeKey}`. */
export function weekEmployeeTombstoneId(
  weekFrom: unknown,
  weekTo: unknown,
  emp: { id?: string; directoryId?: string; name?: string },
): string {
  const wk = weekRangeKey(weekFrom, weekTo);
  return `${wk}${WEEK_EMPLOYEE_TOMBSTONE_SEP}${weekEmployeeMergeKey(emp)}`;
}

/** @internal RC-B-1 — append tombstone (tylko facade `pwrRemove`). */
export function addDeletedWeekEmployeeKey(
  weekFrom: unknown,
  weekTo: unknown,
  emp: { id?: string; directoryId?: string; name?: string },
): string[] {
  const id = weekEmployeeTombstoneId(weekFrom, weekTo, emp);
  const next = [...new Set([...getDeletedWeekEmployeeKeys(), id])].slice(-500);
  saveDeletedWeekEmployeeKeys(next);
  return next;
}

/** @internal RC-B-1 — revoke tombstoneId(W,K) dla podanych tożsamości w tygodniu W. */
export function removeDeletedWeekEmployeeKeysForWeek(
  weekFrom: unknown,
  weekTo: unknown,
  identities: Array<{ id?: string; directoryId?: string; name?: string }>,
): string[] {
  if (!identities.length) return getDeletedWeekEmployeeKeys();
  const keysToRevoke = new Set(
    identities.map((e) => weekEmployeeTombstoneId(weekFrom, weekTo, e)),
  );
  const tombs = getDeletedWeekEmployeeKeys();
  const next = tombs.filter((id) => !keysToRevoke.has(id));
  if (next.length !== tombs.length) {
    saveDeletedWeekEmployeeKeys(next);
    payrollTraceEmit("payroll.roster.tombstone.revoke", "PUSH", "info", {
      revokedCount: tombs.length - next.length,
      weekFrom: String(weekFrom ?? ""),
      weekTo: String(weekTo ?? ""),
    });
  }
  return next;
}

/** RC-B-1 I-3 — tombstones spełniają G-0 względem rosteru bieżącego tygodnia. */
export function reconcileTombstonesWithRoster(
  weekFrom: string,
  weekTo: string,
  roster: unknown[],
): string[] {
  const wk = weekRangeKey(weekFrom, weekTo);
  const rosterKeys = new Set<string>();
  for (const item of normalizeArrayValue(roster)) {
    if (!item || typeof item !== "object") continue;
    rosterKeys.add(weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }));
  }
  const tombs = getDeletedWeekEmployeeKeys();
  const next = tombs.filter((id) => {
    const sepIdx = id.indexOf(WEEK_EMPLOYEE_TOMBSTONE_SEP);
    if (sepIdx < 0) return true;
    const idWeek = id.slice(0, sepIdx);
    if (!wk || idWeek !== wk) return true;
    const mergeKey = id.slice(sepIdx + WEEK_EMPLOYEE_TOMBSTONE_SEP.length);
    return !rosterKeys.has(mergeKey);
  });
  if (next.length !== tombs.length) {
    saveDeletedWeekEmployeeKeys(next);
    payrollTraceEmit("payroll.roster.tombstone.revoke", "MERGE", "info", {
      revokedCount: tombs.length - next.length,
      trigger: "reconcile" as const,
      weekFrom,
      weekTo,
    });
  }
  return next;
}

/** RC-B-1 I-1 — strip tombstonów gdy mergeKey ∈ cloud roster (ten sam tydzień). */
function applyI1CloudRosterTombstoneRevocation(
  mergedTombs: string[],
  cloudRoster: unknown[],
  weekFrom: unknown,
  weekTo: unknown,
): string[] {
  const wk = weekRangeKey(weekFrom, weekTo);
  if (!wk) return mergedTombs;
  const rosterKeys = new Set<string>();
  for (const item of normalizeArrayValue(cloudRoster)) {
    if (!item || typeof item !== "object") continue;
    rosterKeys.add(weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }));
  }
  if (rosterKeys.size === 0) return mergedTombs;
  return mergedTombs.filter((id) => {
    const sepIdx = id.indexOf(WEEK_EMPLOYEE_TOMBSTONE_SEP);
    if (sepIdx < 0) return true;
    const idWeek = id.slice(0, sepIdx);
    if (idWeek !== wk) return true;
    const mergeKey = id.slice(sepIdx + WEEK_EMPLOYEE_TOMBSTONE_SEP.length);
    return !rosterKeys.has(mergeKey);
  });
}

/** Zbiór weekEmployeeMergeKey usuniętych DLA danego tygodnia (zdejmuje prefix). */
export function deletedWeekEmployeeMergeKeySet(
  deleted: string[],
  weekFrom: unknown,
  weekTo: unknown,
): Set<string> {
  const wk = weekRangeKey(weekFrom, weekTo);
  const prefix = `${wk}${WEEK_EMPLOYEE_TOMBSTONE_SEP}`;
  const set = new Set<string>();
  if (!wk) return set;
  for (const id of normalizeDeletedWeekEmployeeKeys(deleted)) {
    if (id.startsWith(prefix)) set.add(id.slice(prefix.length));
  }
  return set;
}

/** Usuń z listy rekordy, których weekEmployeeMergeKey znajduje się w tombstonach tygodnia. */
export function filterDeletedWeekEmployees(list: unknown[], tombstoned: Set<string>): unknown[] {
  if (tombstoned.size === 0) return list;
  return list.filter((item) => {
    if (!item || typeof item !== "object") return true;
    return !tombstoned.has(weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }));
  });
}

// ─── PR-PAY-S6 · S6-1 — Archive Restore Eligibility (eligible archive roster) ─
/**
 * „Eligible archive roster" = skład archiwum tygodnia po odjęciu tombstonów Week
 * Employee (PR-PAY-S2). Pure — reuse `deletedWeekEmployeeMergeKeySet` +
 * `filterDeletedWeekEmployees` (Zero Duplicate Logic, week-scope zachowany).
 *
 * Używany przez baner (G1) i restore (G2), aby nie liczyć/wskrzeszać usuniętych
 * (starych / smoke) pracowników obecnych wyłącznie w `kw-archive`.
 *
 * `deletedKeys` można wstrzyknąć (testy). Domyślnie czyta lokalne tombstony
 * (`getDeletedWeekEmployeeKeys`, bezpieczne — try/catch na braku storage).
 * Bez `weekFrom/weekTo` (pusty `weekRangeKey`) zbiór tombstonów jest pusty →
 * zwraca surowy skład (kompatybilność wsteczna).
 */
export function eligibleArchiveWeekEmployees(
  archivedWeekEmployees: unknown,
  weekFrom: unknown,
  weekTo: unknown,
  deletedKeys: string[] = getDeletedWeekEmployeeKeys(),
): unknown[] {
  const list = Array.isArray(archivedWeekEmployees) ? archivedWeekEmployees : [];
  const tombstoned = deletedWeekEmployeeMergeKeySet(deletedKeys, weekFrom, weekTo);
  return filterDeletedWeekEmployees(list, tombstoned);
}

export function normalizeDeletedEmployeeLeaveIds(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedEmployeeLeaveIds(): string[] {
  return getDeletedIdsFromKey(EMPLOYEE_LEAVES_DELETED_IDS_KEY);
}

export function saveDeletedEmployeeLeaveIds(ids: string[]): void {
  saveDeletedIdsToKey(EMPLOYEE_LEAVES_DELETED_IDS_KEY, ids);
}

export function addDeletedEmployeeLeaveId(id: string): string[] {
  const next = [...new Set([...getDeletedEmployeeLeaveIds(), id])].slice(-500);
  saveDeletedEmployeeLeaveIds(next);
  return next;
}

export function mergeDeletedEmployeeLeaveIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

export function normalizeDeletedRecoverableChargeIds(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedRecoverableChargeIds(): string[] {
  return getDeletedIdsFromKey(RECOVERABLE_CHARGES_DELETED_IDS_KEY);
}

export function saveDeletedRecoverableChargeIds(ids: string[]): void {
  saveDeletedIdsToKey(RECOVERABLE_CHARGES_DELETED_IDS_KEY, ids);
}

export function addDeletedRecoverableChargeId(id: string): string[] {
  const next = [...new Set([...getDeletedRecoverableChargeIds(), id])].slice(-500);
  saveDeletedRecoverableChargeIds(next);
  return next;
}

export function mergeDeletedRecoverableChargeIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

export function normalizeDeletedOperationalNoteIds(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedOperationalNoteIds(): string[] {
  return getDeletedIdsFromKey(OPERATIONAL_NOTES_DELETED_IDS_KEY);
}

export function saveDeletedOperationalNoteIds(ids: string[]): void {
  saveDeletedIdsToKey(OPERATIONAL_NOTES_DELETED_IDS_KEY, ids);
}

export function addDeletedOperationalNoteId(id: string): string[] {
  const next = [...new Set([...getDeletedOperationalNoteIds(), id])].slice(-500);
  saveDeletedOperationalNoteIds(next);
  return next;
}

export function mergeDeletedOperationalNoteIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

function filterDeletedByRecordId(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((item) => {
    const id = recordIdOf(item);
    return id && !deleted.has(id);
  });
}

function filterDeletedJobs(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((j) => {
    const id = jobIdOf(j);
    return id && !deleted.has(id);
  });
}

function parseRecordTs(v: unknown): number {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function jobUpdatedTs(j: {
  updatedAt?: string;
  activityLog?: { at: string }[];
  startDate?: string;
}): number {
  const direct = parseRecordTs(j.updatedAt);
  if (direct) return direct;
  if (Array.isArray(j.activityLog)) {
    let max = 0;
    for (const ev of j.activityLog) max = Math.max(max, parseRecordTs(ev.at));
    if (max) return max;
  }
  return parseRecordTs(j.startDate);
}

/** Scal roboty po id — nie gub starszych wpisów; przy konflikcie wygrywa nowszy updatedAt. */
export function mergeJobsById(local: unknown[], cloud: unknown[], deletedJobIds: string[] = []): unknown[] {
  type J = {
    id?: string;
    updatedAt?: string;
    workEntries?: unknown[];
    photos?: unknown[];
    deletedPhotoTombstones?: import("@/lib/job-photos").PhotoTombstone[];
    startDate?: string;
    documents?: Record<string, boolean>;
    reportDocSaOverride?: import("@/lib/job-documents").ReportDocSaOverride;
    jobFiles?: import("@/lib/job-documents").JobFileAttachment[];
    deletedJobFileTombstones?: import("@/lib/job-documents").JobFileTombstone[];
    jobAttachments?: import("@/lib/job-attachments").JobAttachment[];
    deletedJobAttachmentTombstones?: import("@/lib/job-attachments").JobAttachmentTombstone[];
    deletedWorkEntryTombstones?: WorkEntryTombstone[];
    activityLog?: { id: string; at: string }[];
    jobNotes?: import("@/lib/job-wm").JobNote[];
    inspectorPhotos?: import("@/lib/job-wm").InspectorPhotoEntry[];
    handoverStage?: string;
    plannedHandoverDate?: string;
    hiddenInspectorFeedIds?: string[];
    executionLeadDirectoryId?: string;
    executionAssigneeDirectoryIds?: string[];
    assignedInspectorId?: string;
  };
  const map = new Map<string, J>();
  const mergePair = (prev: J, j: J): J => {
    const prevTs = jobUpdatedTs(prev);
    const jTs = jobUpdatedTs(j);
    let newer: J;
    let older: J;
    if (jTs >= prevTs) {
      newer = j;
      older = prev;
    } else {
      newer = prev;
      older = j;
    }
    if (prevTs === jTs) {
      const winnerFirst = jobMergeScore(j) >= jobMergeScore(prev);
      newer = winnerFirst ? j : prev;
      older = winnerFirst ? prev : j;
    }
    const pick = { ...older, ...newer };
    const mergedLogs = mergeActivityLogs(prev.activityLog, j.activityLog);
    const mergedTombstones = mergeJobFileTombstones(
      prev.deletedJobFileTombstones,
      j.deletedJobFileTombstones,
    );
    const hiddenInspectorFeedIds = mergeHiddenInspectorFeedIds(
      prev.hiddenInspectorFeedIds,
      j.hiddenInspectorFeedIds,
    );
    const latestTs = new Date(Math.max(prevTs, jTs, Date.now())).toISOString();
    const mergedJobFiles = jTs !== prevTs
      ? filterJobFilesByTombstones(
          jTs >= prevTs ? (j.jobFiles || []) : (prev.jobFiles || []),
          mergedTombstones,
        )
      : mergeJobFiles(prev.jobFiles, j.jobFiles, mergedTombstones);
    const mergedAttachmentTombstones = mergeJobAttachmentTombstones(
      prev.deletedJobAttachmentTombstones,
      j.deletedJobAttachmentTombstones,
    );
    const mergedWorkEntryTombstones = mergeWorkEntryTombstones(
      prev.deletedWorkEntryTombstones,
      j.deletedWorkEntryTombstones,
    );
    const mergedPhotoTombstones = mergePhotoTombstones(
      prev.deletedPhotoTombstones,
      j.deletedPhotoTombstones,
    );
    const mergedJobAttachments = jTs !== prevTs
      ? filterJobAttachmentsByTombstones(
          jTs >= prevTs ? (j.jobAttachments || []) : (prev.jobAttachments || []),
          mergedAttachmentTombstones,
        )
      : mergeJobAttachments(prev.jobAttachments, j.jobAttachments, mergedAttachmentTombstones);
    return {
      ...pick,
      documents: mergeJobsDocumentsOnConflict(prev, j),
      reportDocSaOverride: mergeReportDocSaOverrideOnConflict(prev, j),
      jobFiles: mergedJobFiles,
      deletedJobFileTombstones: mergedTombstones.length ? mergedTombstones : undefined,
      jobAttachments: mergedJobAttachments.length ? mergedJobAttachments : undefined,
      deletedJobAttachmentTombstones: mergedAttachmentTombstones.length ? mergedAttachmentTombstones : undefined,
      deletedWorkEntryTombstones: mergedWorkEntryTombstones.length ? mergedWorkEntryTombstones : undefined,
      activityLog: mergedLogs,
      workEntries: mergeWorkEntriesById(
        prev.workEntries,
        j.workEntries,
        mergedWorkEntryTombstones,
        String(prev.updatedAt ?? ""),
        String(j.updatedAt ?? ""),
      ),
      jobNotes: mergeJobNotes(prev.jobNotes, j.jobNotes),
      inspectorPhotos: jTs !== prevTs
        ? (jTs >= prevTs ? (j.inspectorPhotos || []) : (prev.inspectorPhotos || []))
        : mergeInspectorPhotos(prev.inspectorPhotos, j.inspectorPhotos),
      plannedHandoverDate: mergePlannedHandoverDate(prev.plannedHandoverDate, j.plannedHandoverDate),
      executionLeadDirectoryId: mergeExecutionLeadDirectoryId(
        prev.executionLeadDirectoryId,
        j.executionLeadDirectoryId,
        jTs >= prevTs,
      ),
      executionAssigneeDirectoryIds: mergeExecutionAssigneeDirectoryIds(
        prev.executionAssigneeDirectoryIds,
        j.executionAssigneeDirectoryIds,
      ),
      assignedInspectorId: mergeAssignedInspectorId(
        prev.assignedInspectorId,
        j.assignedInspectorId,
        jTs >= prevTs,
      ),
      photos: mergePhotos(prev.photos, j.photos, mergedPhotoTombstones),
      deletedPhotoTombstones: mergedPhotoTombstones.length ? mergedPhotoTombstones : undefined,
      address: mergeJobAddressField(prev.address, j.address, jTs >= prevTs),
      flatNumber: mergeJobAddressField(prev.flatNumber, j.flatNumber, jTs >= prevTs),
      handoverStage: mergeHandoverStage(
        prev.handoverStage as import("@/lib/job-wm").JobHandoverStage | undefined,
        j.handoverStage as import("@/lib/job-wm").JobHandoverStage | undefined,
        mergedLogs as { type: string; at: string; text: string }[],
      ) || pick.handoverStage,
      hiddenInspectorFeedIds,
      updatedAt: newer.updatedAt ?? older.updatedAt ?? latestTs,
    };
  };
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      const j = item as J;
      if (!j?.id) continue;
      const prev = map.get(j.id);
      if (!prev) {
        map.set(j.id, j);
        continue;
      }
      map.set(j.id, mergePair(prev, j));
    }
  };
  ingest(filterDeletedJobs(cloud, deletedJobIds));
  ingest(filterDeletedJobs(local, deletedJobIds));
  return [...map.values()].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

type DayLike = {
  active?: boolean;
  from?: string;
  to?: string;
  extraHours?: unknown[];
  notes?: unknown[];
  zaliczka?: string;
};

function pickRateByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): unknown {
  const lAt = parseRecordTs(l.rateUpdatedAt);
  const cAt = parseRecordTs(c.rateUpdatedAt);
  if (lAt && cAt && lAt !== cAt) return lAt > cAt ? l.rate : c.rate;
  if (lAt && !cAt) return l.rate;
  if (cAt && !lAt) return c.rate;
  if (c.rate !== undefined && String(c.rate).trim() !== "") return c.rate;
  if (l.rate !== undefined && String(l.rate).trim() !== "") return l.rate;
  return c.rate;
}

export { weekEmployeeMergeKey, mergeWeekEmployeesList, hasWeekEmployeesRosterExpansion } from "./payroll-week-employee-merge.ts";
export {
  mergeWeekEmployeeRecord,
  mergePayrollDaysByRichness as mergeDaysByRichness,
  isPayrollZeroedDay,
  pickPayrollDaysByTimestamps,
} from "./payroll-week-employee-record-merge.ts";
export {
  PAYROLL_WEEK_META_KEY,
  normalizePayrollWeekMeta,
  readPayrollWeekMetaFromLs,
  writePayrollWeekMetaToLs,
  getExpectedPayrollRevision,
  buildPayrollWeekMetaPlaceholder,
  type PayrollWeekMeta,
} from "./payroll-week-meta.ts";
export {
  rebasePayrollRosterIntent,
  rebasePayrollExtraCostsIntent,
  isPayrollExtraCostsOnlyIntent,
} from "./payroll-roster-rebase.ts";

/** PAYROLL-DI-P0 — Edge 409 concurrency conflict (DF-04). */
export const PAYROLL_STALE_REVISION_CODE = "stale_revision";
export const PAYROLL_LEGACY_CLIENT_CODE = "legacy_client_rejected";

export class PayrollStaleRevisionError extends Error {
  readonly code: string;
  readonly serverRevision: number;
  readonly roster?: unknown[];

  constructor(code: string, serverRevision: number, roster?: unknown[], message?: string) {
    super(message ?? `Payroll revision conflict (${code})`);
    this.name = "PayrollStaleRevisionError";
    this.code = code;
    this.serverRevision = serverRevision;
    this.roster = roster;
  }
}

export function weekEmployeesSamePerson(
  a: { id?: string; directoryId?: string; name?: string },
  b: { id?: string; directoryId?: string; name?: string },
): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  return weekEmployeeMergeKey(a) === weekEmployeeMergeKey(b);
}

/** settled=false z tym samym czasem co dataUpdatedAt — stary bug syncu, nie prawdziwe cofnięcie wypłaty. */
function isLikelySpuriousUnsettle(rec: Record<string, unknown>): boolean {
  if (Boolean(rec.settled)) return false;
  const sAt = parseRecordTs(rec.settledUpdatedAt);
  const dAt = parseRecordTs(rec.dataUpdatedAt);
  if (sAt <= 0 || dAt <= 0) return false;
  return Math.abs(sAt - dAt) <= 1500;
}

function pickSettledUpdatedAtForMerge(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
  settled: boolean,
): string | undefined {
  const lAt = parseRecordTs(l.settledUpdatedAt);
  const cAt = parseRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (settled) {
    if (lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt as string | undefined;
    if (cSettled) return c.settledUpdatedAt as string | undefined;
  } else {
    if (!lSettled && (!cSettled || lAt >= cAt)) return l.settledUpdatedAt as string | undefined;
    if (!cSettled) return c.settledUpdatedAt as string | undefined;
  }
  return lAt >= cAt
    ? (l.settledUpdatedAt ?? c.settledUpdatedAt) as string | undefined
    : (c.settledUpdatedAt ?? l.settledUpdatedAt) as string | undefined;
}

function pickSettledByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): boolean {
  const lAt = parseRecordTs(l.settledUpdatedAt);
  const cAt = parseRecordTs(c.settledUpdatedAt);
  const lSettled = Boolean(l.settled);
  const cSettled = Boolean(c.settled);
  if (lAt > 0 || cAt > 0) {
    if (lAt > cAt) return lSettled;
    if (cAt > lAt) {
      if (!cSettled && lSettled && isLikelySpuriousUnsettle(c)) return true;
      if (!lSettled && cSettled && isLikelySpuriousUnsettle(l)) return false;
      return cSettled;
    }
    // PR-PAY-S5 — remis settledUpdatedAt (oba > 0): deterministycznie LOCAL.
    // Świadome cofnięcie Rozliczony→Oczekujący na bieżącym urządzeniu nie może być
    // przywracane przez OR (localSettled || cloudSettled).
    return lSettled;
  }
  // Legacy (brak settledUpdatedAt po OBU stronach): brak sygnału czasowego świadomej
  // decyzji (realne cofnięcie zawsze ustawia settledUpdatedAt > 0 → gałąź LWW powyżej).
  // Zachowujemy OR, aby nie zgubić istniejącego rozliczenia (np. rekord świeżo dodany
  // z katalogu z settled=false vs zarchiwizowane settled=true bez znacznika).
  return lSettled || cSettled;
}

function collapseWeekEmployeesByIdentity(list: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string });
    const prev = map.get(key);
    map.set(key, prev ? mergeWeekEmployeeRecord(prev, item) : item);
  }
  return [...map.values()];
}

/** @deprecated use isPayrollZeroedDay from record-merge SSOT */
function isZeroedDay(d: DayLike | undefined): boolean {
  if (!d) return true;
  if (d.active === true) return false;
  return (d.extraHours?.length ?? 0) === 0;
}

function pickPrevSaturdayByTimestamps(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
): DayLike | undefined {
  const lps = l.prevSaturday as DayLike | undefined;
  const cps = c.prevSaturday as DayLike | undefined;
  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  if (lAt > cAt) return lps !== undefined ? lps : cps;
  if (cAt > lAt) return cps !== undefined ? cps : lps;
  return mergePrevSaturdayByRichness(lps, cps);
}

function dayRichness(d: DayLike | undefined): number {
  if (!d) return 0;
  let s = 0;
  if (d.active) s += 2;
  if (d.from || d.to) s += 1;
  s += (d.extraHours?.length ?? 0) * 8;
  s += (d.notes?.length ?? 0) * 4;
  if (parseFloat(String(d.zaliczka || "")) > 0) s += 1;
  return s;
}

/** Sob.pr. przy remisie dataUpdatedAt — bogatszy wygrywa; remis → local. */
export function mergePrevSaturdayByRichness(
  lps: DayLike | undefined,
  cps: DayLike | undefined,
): DayLike | undefined {
  if (!lps && !cps) return undefined;
  if (lps && !cps) return lps;
  if (!lps && cps) return cps;
  const lr = dayRichness(lps);
  const cr = dayRichness(cps);
  if (lr > cr) return lps;
  if (cr > lr) return cps;
  return lps;
}

/** Im wyżej, tym więcej godzin / Sob.pr. / dodatkowych wpisów. */
export function weekEmployeeRichness(emp: unknown): number {
  if (!emp || typeof emp !== "object") return 0;
  const e = emp as Record<string, unknown>;
  let s = 0;
  const days = e.days as Record<string, DayLike> | undefined;
  if (days) {
    for (const d of Object.values(days)) s += dayRichness(d);
  }
  s += dayRichness(e.prevSaturday as DayLike);
  s += ((e.extraCosts as unknown[])?.length ?? 0) * 3;
  return s;
}

export function weekEmployeesListRichness(list: unknown): number {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, e) => sum + weekEmployeeRichness(e), 0);
}

export type PayrollMetricsSnapshot = {
  activeDays: number;
  totalHours: number;
};

function parsePayrollTime(t: unknown): number | null {
  const m = String(t ?? "").match(/^(\d+):(\d+)$/);
  return m ? +m[1] * 60 + +m[2] : null;
}

function payrollDayHours(day: DayLike | undefined): number {
  if (!day?.active) return 0;
  const f = parsePayrollTime(day.from);
  const to = parsePayrollTime(day.to);
  let h = f != null && to != null && to > f ? (to - f) / 60 : 0;
  for (const ex of day.extraHours ?? []) {
    const ef = parsePayrollTime(ex?.from);
    const et = parsePayrollTime(ex?.to);
    if (ef != null && et != null && et > ef) h += (et - ef) / 60;
  }
  return h;
}

/** Metryki listy płac — aktywne dni i łączne godziny (Pn–Pt + Sob.pr.). */
export function payrollMetrics(list: unknown): PayrollMetricsSnapshot {
  const arr = normalizeArrayValue(list);
  let activeDays = 0;
  let totalHours = 0;
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const emp = item as Record<string, unknown>;
    for (const d of Object.values((emp.days as Record<string, DayLike>) || {})) {
      if (d?.active) {
        activeDays++;
        totalHours += payrollDayHours(d);
      }
    }
    const ps = emp.prevSaturday as DayLike | undefined;
    if (ps?.active) {
      activeDays++;
      totalHours += payrollDayHours(ps);
    }
  }
  return { activeDays, totalHours: +totalHours.toFixed(1) };
}

/** Tolerancja remisu godzin — baner „Przywróć z archiwum” (RB v2.63.24). */
export const PAYROLL_RESTORE_BANNER_EPS_HOURS = 0.05;

/** Archiwum ma więcej dni aktywnych lub godzin niż live (PRIMARY warunek banera RB). */
export function archivePayrollRicherThanLive(
  archivedWeekEmployees: unknown,
  liveWeekEmployees: unknown,
  epsHours = PAYROLL_RESTORE_BANNER_EPS_HOURS,
): boolean {
  const archiveM = payrollMetrics(archivedWeekEmployees);
  const liveM = payrollMetrics(liveWeekEmployees);
  return (
    archiveM.activeDays > liveM.activeDays
    || archiveM.totalHours > liveM.totalHours + epsHours
  );
}

/**
 * Czy pokazać baner przywrócenia z archiwum (bez gate closed week — PayrollView).
 *
 * PR-PAY-S6 · G1 — porównanie liczone WYŁĄCZNIE na eligible archive roster (bez
 * tombstonów PR-PAY-S2). Gdy podano `weekFrom/weekTo`, usunięci (starzy / smoke)
 * pracownicy obecni tylko w archiwum nie wywołują false positive banera (AC1).
 * Realna utrata nietombstonowanych danych nadal daje baner ON (AC2/AC7).
 * Bez `weekFrom/weekTo` zachowanie jak dawniej (RB v2.63.24).
 */
export function shouldShowPayrollRestoreBanner(
  weekEmployees: unknown[],
  archivedWeekEmployees?: unknown[] | null,
  weekFrom?: unknown,
  weekTo?: unknown,
  deletedKeys?: string[],
): boolean {
  if (!Array.isArray(archivedWeekEmployees) || archivedWeekEmployees.length === 0) return false;
  const eligible = eligibleArchiveWeekEmployees(
    archivedWeekEmployees,
    weekFrom,
    weekTo,
    deletedKeys ?? getDeletedWeekEmployeeKeys(),
  );
  if (eligible.length === 0) return false;
  return archivePayrollRicherThanLive(eligible, weekEmployees);
}

/** Czy outgoing spada >50% vs chmura (dni aktywne lub godziny). */
export function wouldBlockPayrollShrink(cloud: unknown, outgoing: unknown): boolean {
  const c = payrollMetrics(cloud);
  const o = payrollMetrics(outgoing);
  if (c.activeDays >= 4 && o.activeDays < c.activeDays * 0.5) return true;
  if (c.totalHours >= 8 && o.totalHours < c.totalHours * 0.5) return true;
  return false;
}

function readArchiveFromBatchOrLocal(keys: string[], values: unknown[]): unknown[] {
  const archIdx = keys.indexOf("kw-archive");
  if (archIdx >= 0) return normalizeArrayValue(values[archIdx]);
  try {
    return normalizeArrayValue(JSON.parse(localStorage.getItem("kw-archive") || "[]"));
  } catch {
    return [];
  }
}

function readWeekRangeFromBatchOrLocal(keys: string[], values: unknown[]): { from: string; to: string } {
  const fromIdx = keys.indexOf("kw-weekFrom");
  const toIdx = keys.indexOf("kw-weekTo");
  let from = fromIdx >= 0 && typeof values[fromIdx] === "string" ? (values[fromIdx] as string) : "";
  let to = toIdx >= 0 && typeof values[toIdx] === "string" ? (values[toIdx] as string) : "";
  if (!from) {
    try {
      from = localStorage.getItem("kw-weekFrom") || "";
    } catch {
      /* ignore */
    }
  }
  if (!to) {
    try {
      to = localStorage.getItem("kw-weekTo") || "";
    } catch {
      /* ignore */
    }
  }
  return { from, to };
}

function archiveWeekHasPayroll(week: unknown): boolean {
  if (!week || typeof week !== "object") return false;
  return weekEmployeesListRichness((week as { weekEmployees?: unknown[] }).weekEmployees) >= 8;
}

/** Pusty skład po zapisie tygodnia / cyklu archiwum — świadome wyczyszczenie, nie blokuj. */
function isIntentionalPayrollWeekClear(keys: string[], values: unknown[], outgoingEmps: unknown): boolean {
  if (normalizeArrayValue(outgoingEmps).length > 0) return false;
  const { from, to } = readWeekRangeFromBatchOrLocal(keys, values);
  const archive = readArchiveFromBatchOrLocal(keys, values);
  if (from && to) {
    return archive.some((w) => {
      const snap = w as { weekFrom?: string; weekTo?: string };
      return snap.weekFrom === from && snap.weekTo === to && archiveWeekHasPayroll(w);
    });
  }
  return archive.some((w) => archiveWeekHasPayroll(w));
}

/** Cross-week rollover — pusty W2 po archiwum poprzedniego tygodnia (Option B). Flaga sprawdzana w guard, nie tutaj. */
function isPayrollRolloverWeekClear(keys: string[], values: unknown[], outgoingEmps: unknown): boolean {
  if (normalizeArrayValue(outgoingEmps).length > 0) return false;
  const { from: targetFrom, to: targetTo } = readWeekRangeFromBatchOrLocal(keys, values);
  if (!targetFrom || !targetTo) return false;
  const prev = previousWeekRange(targetFrom);
  const archive = readArchiveFromBatchOrLocal(keys, values);
  return archive.some((w) => {
    const snap = w as { weekFrom?: string; weekTo?: string; backlog?: boolean };
    if (snap.backlog === true) return false;
    if (snap.weekFrom !== prev.from || snap.weekTo !== prev.to) return false;
    if (snap.weekFrom === targetFrom && snap.weekTo === targetTo) return false;
    return archiveWeekHasPayroll(w);
  });
}

/** Komunikat błędu gdy Payroll Guard odrzuci push listy płac (P0 fail-loud). */
export const PAYROLL_GUARD_BLOCKED_MESSAGE =
  "Zapis listy płac do chmury został zablokowany (ochrona przed utratą danych). Sprawdź godziny na liście płac i spróbuj ponownie lub odśwież stronę (Ctrl+F5).";

export function isPayrollGuardBlockedError(err: unknown): boolean {
  return err instanceof Error && err.message === PAYROLL_GUARD_BLOCKED_MESSAGE;
}

export type PushKeysToCloudOptions = {
  replaceJobsKeys?: string[];
  replaceDirectoryKeys?: string[];
  replaceWeekEmployeesKeys?: string[];
  /** PAYROLL-DI-P0 — CAS merge-on-write (replaces forceReplace for field edits). */
  payrollWeekCas?: boolean;
  expectedRevision?: number;
  clientAppVersion?: string;
  /**
   * Legacy bare bypass — D3: ignored when guardStrict ON unless intentionalHoursClear.
   * Prefer intentionalHoursClear after D2 ACK.
   */
  skipPayrollGuard?: boolean;
  /**
   * PAYROLL-DF D3 — intentional hours clear (sole skipPayrollGuard trigger when guardStrict ON).
   * ≠ isIntentionalPayrollWeekClear (empty week after archive).
   */
  intentionalHoursClear?: boolean;
  /** Opcjonalnie — unikaj drugiego batch-get w pushKeysToCloudSafe. */
  cloudWeekEmployees?: unknown;
  /**
   * Internal / rollover-only — ustawiane WYŁĄCZNIE przez pushPayrollWeekAfterRollover.
   * Pozwala guardowi rozpoznać legalny cross-week clear W1→W2.
   */
  payrollWeekRolloverPush?: true;
};

export type PushWeekEmployeesOptions = {
  skipPayrollGuard?: boolean;
  /**
   * PAYROLL-DF D3 — intentional hours clear (guard bypass).
   * skipPayrollGuard effective only when this is true (guardStrict ON).
   */
  intentionalHoursClear?: boolean;
};

async function applyPayrollGuardBeforePush(
  keys: string[],
  values: unknown[],
  options?: PushKeysToCloudOptions,
): Promise<{ keys: string[]; values: unknown[]; options: PushKeysToCloudOptions; blocked: boolean }> {
  const opts: PushKeysToCloudOptions = { ...(options ?? {}) };
  const empIdx = keys.indexOf("kw-week-employees");
  if (empIdx < 0) return { keys, values, options: opts, blocked: false };
  // D3: skip shrink guard only via intentionalHoursClear (or legacy kill-switch)
  if (maySkipPayrollShrinkGuard(opts)) {
    return {
      keys,
      values,
      options: { ...opts, skipPayrollGuard: true },
      blocked: false,
    };
  }

  const outgoing = values[empIdx];
  if (isIntentionalPayrollWeekClear(keys, values, outgoing)) {
    return { keys, values, options: opts, blocked: false };
  }

  if (opts.payrollWeekRolloverPush === true && isPayrollRolloverWeekClear(keys, values, outgoing)) {
    return { keys, values, options: opts, blocked: false };
  }

  let cloudEmps = opts.cloudWeekEmployees;
  if (cloudEmps === undefined) {
    try {
      [cloudEmps] = await fetchKeysFromCloud(["kw-week-employees"]);
    } catch {
      return { keys, values, options: opts, blocked: false };
    }
  }

  if (!wouldBlockPayrollShrink(cloudEmps, outgoing)) {
    return { keys, values, options: opts, blocked: false };
  }

  console.warn("[PAYROLL-GUARD] blocked suspicious payroll shrink", {
    cloud: payrollMetrics(cloudEmps),
    outgoing: payrollMetrics(outgoing),
  });

  payrollTraceEmit("sync.guard.payroll.before_push", "GUARD", "warn", {
    blocked: true,
    skipReason: "guard_blocked" as const,
  });

  const newKeys = keys.filter((_, i) => i !== empIdx);
  const newValues = values.filter((_, i) => i !== empIdx);
  return {
    keys: newKeys,
    values: newValues,
    options: {
      ...opts,
      replaceWeekEmployeesKeys: (opts.replaceWeekEmployeesKeys ?? []).filter((k) => k !== "kw-week-employees"),
    },
    blocked: true,
  };
}

/** Scal dwa wpisy tego samego pracownika — stawka i godziny osobno (rateUpdatedAt / dataUpdatedAt). */
type PayrollCarryForwardLike = { amount?: number; createdAt?: string };

/** Nie gub payrollCarryForward przy merge — chmura bez pola nie może wyczyścić lokalnego defer. */
function pickPayrollCarryForward(l: Record<string, unknown>, c: Record<string, unknown>): PayrollCarryForwardLike | undefined {
  const lCf = l.payrollCarryForward as PayrollCarryForwardLike | undefined;
  const cCf = c.payrollCarryForward as PayrollCarryForwardLike | undefined;
  const lAmt = lCf?.amount ?? 0;
  const cAmt = cCf?.amount ?? 0;
  if (lAmt > 0 && cAmt <= 0) return lCf;
  if (cAmt > 0 && lAmt <= 0) return cCf;
  if (lAmt > 0 && cAmt > 0) {
    const lAt = parseRecordTs(lCf?.createdAt);
    const cAt = parseRecordTs(cCf?.createdAt);
    return lAt >= cAt ? lCf : cCf;
  }
  return undefined;
}

/** Odczyt klucza danych z localStorage (między kartami / przed zapisem do chmury). */
export function readLocalStorageDataKey(key: DataKey): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function reconcileFreshnessScore(key: DataKey, value: unknown): number {
  const parseTs = (v: unknown): number => {
    if (typeof v !== "string") return 0;
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  };
  switch (key) {
    case "kw-jobs": {
      if (!Array.isArray(value)) return 0;
      let max = 0;
      for (const item of value) {
        const j = item as { updatedAt?: string; activityLog?: { at: string }[]; startDate?: string };
        let ts = parseTs(j.updatedAt);
        if (!ts && Array.isArray(j.activityLog)) {
          for (const ev of j.activityLog) ts = Math.max(ts, parseTs(ev.at));
        }
        if (!ts) ts = parseTs(j.startDate);
        max = Math.max(max, ts);
      }
      return max;
    }
    case "kw-week-employees": {
      if (!Array.isArray(value)) return 0;
      let max = 0;
      for (const e of value) max = Math.max(max, parseTs((e as { dataUpdatedAt?: string }).dataUpdatedAt));
      return max;
    }
    case "kw-archive": {
      if (!Array.isArray(value)) return 0;
      let max = 0;
      for (const w of value) max = Math.max(max, parseTs((w as { savedAt?: string }).savedAt));
      return max;
    }
    case "kw-operational-notes": {
      if (!Array.isArray(value)) return 0;
      let max = 0;
      for (const n of value) max = Math.max(max, parseTs((n as { updatedAt?: string }).updatedAt));
      return max;
    }
    default:
      return 0;
  }
}

/** JOBS-SYNC-FIX-01 MF-1 — explicit React fresh wins over stale LS when newer (tie → explicit). */
export function resolveReconcileFreshForKey(
  key: DataKey,
  explicitFresh?: unknown | null,
): unknown | null {
  const lsFresh = readLocalStorageDataKey(key);
  if (explicitFresh == null) return lsFresh;
  if (lsFresh == null) return explicitFresh;
  const explicitScore = reconcileFreshnessScore(key, explicitFresh);
  const lsScore = reconcileFreshnessScore(key, lsFresh);
  if (explicitScore > lsScore) return explicitFresh;
  if (lsScore > explicitScore) return lsFresh;
  return explicitFresh;
}

/** Przed pushem do chmury — localStorage może być świeższy niż React (inna karta). stored wygrywa nad incoming. */
export function mergeIncomingWithStored(key: DataKey, stored: unknown, incoming: unknown): unknown {
  if (stored == null) return incoming;
  if (incoming == null) return stored;
  return mergeDataKey(key, stored, incoming);
}

/** Przed pushem do chmury — uwzględnij localStorage (inna karta mogła zapisać świeższe dane). */
export function prepareDataBundleForCloudPush(values: unknown[]): unknown[] {
  const prepared = [...values];
  for (let i = 0; i < DATA_KEYS.length; i++) {
    const key = DATA_KEYS[i];
    const stored = readLocalStorageDataKey(key);
    if (stored == null) continue;
    const incoming = prepared[i];
    const hasIncoming =
      incoming != null && !(Array.isArray(incoming) && incoming.length === 0) && incoming !== "";
    const hasStored =
      stored != null && !(Array.isArray(stored) && stored.length === 0) && stored !== "";
    if (!hasIncoming && !hasStored) continue;
    prepared[i] = mergeIncomingWithStored(key, stored, incoming);
  }
  return prepared;
}


/**
 * Scal listę płac tygodnia — UNION po weekEmployeeMergeKey (directoryId / legacy name|id).
 * Lokalne dodanie nie ginie, gdy rekordu jeszcze nie ma w starszym snapshotcie chmury (#009).
 * Per klucz: oba → mergeWeekEmployeeRecord; tylko local → local; tylko cloud → cloud.
 */
export function mergeWeekEmployees(local: unknown[], cloud: unknown[]): unknown[] {
  return mergeWeekEmployeesList(local, cloud, mergeWeekEmployeeRecord);
}

/** Scal archiwum tygodni — lokalna lista decyduje o składzie; usunięte tygodnie nie wracają z chmury. */
export function mergeArchive(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedArchiveIds(),
  /** PAYROLL-CLOUD-RESURRECTION-01 — nie przywracaj local-only current week gdy cloud live jest puste. */
  resurrectionCtx?: {
    cloudLiveFrom?: string;
    cloudLiveTo?: string;
    cloudLiveEmpty?: boolean;
  },
): unknown[] {
  type W = { id?: string; weekFrom?: string; weekTo?: string; savedAt?: string; weekEmployees?: unknown[] };
  const localArr = filterDeletedByRecordId(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedByRecordId(normalizeArrayValue(cloud), deletedIds);
  const keyOf = (w: W) => (w.id ? w.id : `${w.weekFrom}|${w.weekTo}`);
  const rangeKeyOf = (w: W) =>
    w.weekFrom && w.weekTo ? `${w.weekFrom}|${w.weekTo}` : "";
  const score = (w: W) => {
    const we = w.weekEmployees;
    const richness = Array.isArray(we) ? weekEmployeesListRichness(we) : 0;
    return richness + (Array.isArray(we) ? we.length * 5 : 0);
  };
  const mergeWeek = (a: W, b: W): W => {
    const aSaved = parseRecordTs(a.savedAt);
    const bSaved = parseRecordTs(b.savedAt);
    const winner = aSaved > bSaved ? a : bSaved > aSaved ? b : score(a) >= score(b) ? a : b;
    const other = winner === a ? b : a;
    return {
      ...other,
      ...winner,
      weekEmployees: mergeWeekEmployees(
        normalizeArrayValue(winner.weekEmployees),
        normalizeArrayValue(other.weekEmployees),
      ),
    };
  };
  const cloudMap = new Map<string, W>();
  const cloudRangeKeys = new Set<string>();
  for (const item of cloudArr) {
    const w = item as W;
    if (!w?.weekFrom) continue;
    cloudMap.set(keyOf(w), w);
    const rk = rangeKeyOf(w);
    if (rk) cloudRangeKeys.add(rk);
  }
  const suppressLiveRange =
    resurrectionCtx?.cloudLiveEmpty &&
    resurrectionCtx.cloudLiveFrom &&
    resurrectionCtx.cloudLiveTo
      ? `${resurrectionCtx.cloudLiveFrom}|${resurrectionCtx.cloudLiveTo}`
      : "";
  const localKeys = new Set<string>();
  const result: W[] = [];
  for (const item of localArr) {
    const w = item as W;
    if (!w?.weekFrom) continue;
    const k = keyOf(w);
    localKeys.add(k);
    const cloudItem = cloudMap.get(k);
    if (cloudItem) {
      result.push(mergeWeek(w, cloudItem));
      continue;
    }
    // Local-only week: do not resurrect current live week archive onto empty cloud live
    const rk = rangeKeyOf(w);
    if (suppressLiveRange && rk === suppressLiveRange && !cloudRangeKeys.has(rk)) {
      continue;
    }
    result.push(w);
  }
  for (const [k, item] of cloudMap) {
    if (!localKeys.has(k)) result.push(item);
  }
  return result.sort((a, b) => (b.weekFrom || "").localeCompare(a.weekFrom || ""));
}

export function normalizeArrayValue(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function recordRichness(obj: unknown): number {
  if (!obj || typeof obj !== "object") return 0;
  let s = 0;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (typeof v === "string" && v.trim()) s += 1;
    if (typeof v === "number") s += 1;
    if (typeof v === "boolean") s += 0.5;
    if (Array.isArray(v)) s += v.length * 2;
    if (typeof v === "object") s += recordRichness(v) * 0.25;
  }
  return s;
}

/** Scal tablice obiektów po id — bogatszy wpis wygrywa. */
export function mergeRecordsById(local: unknown[], cloud: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: string }).id || "");
      if (!id) continue;
      const prev = map.get(id);
      if (!prev || recordRichness(item) >= recordRichness(prev)) {
        map.set(id, item);
      }
    }
  };
  ingest(Array.isArray(local) ? local : []);
  ingest(Array.isArray(cloud) ? cloud : []);
  return [...map.values()];
}

function pickContactRecord(localItem: unknown, cloudItem: unknown | undefined): unknown {
  if (!cloudItem) return localItem;
  const l = localItem as Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  const c = cloudItem as Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  const lTs = parseRecordTs(l.updatedAt);
  const cTs = parseRecordTs(c.updatedAt);
  let pick: Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  if (lTs && cTs && lTs !== cTs) {
    pick = lTs > cTs ? l : c;
  } else {
    pick = recordRichness(l) >= recordRichness(c) ? l : c;
  }
  return {
    ...l,
    ...c,
    ...pick,
    allowJobs: l.allowJobs !== false || c.allowJobs !== false,
    allowPayroll: l.allowPayroll === true || c.allowPayroll === true,
  };
}

/** Kontakty — lokalna lista decyduje o składzie; usunięte kontakty nie wracają z chmury. */
export function mergeContacts(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedContactsIds(),
): unknown[] {
  const localArr = filterDeletedByRecordId(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedByRecordId(normalizeArrayValue(cloud), deletedIds);
  const cloudMap = new Map<string, unknown>();
  for (const item of cloudArr) {
    const id = recordIdOf(item);
    if (id) cloudMap.set(id, item);
  }
  const localIds = new Set<string>();
  const result: unknown[] = [];
  for (const item of localArr) {
    const id = recordIdOf(item);
    if (!id) continue;
    localIds.add(id);
    result.push(pickContactRecord(item, cloudMap.get(id)));
  }
  for (const [id, item] of cloudMap) {
    if (!localIds.has(id)) result.push(item);
  }
  return result;
}

function pickDirectoryRecord(localItem: unknown, cloudItem: unknown | undefined): unknown {
  if (!cloudItem) return localItem;
  const l = localItem as Record<string, unknown>;
  const c = cloudItem as Record<string, unknown>;
  const lTs = parseRecordTs(l.updatedAt);
  const cTs = parseRecordTs(c.updatedAt);
  if (lTs && cTs && lTs !== cTs) return lTs > cTs ? localItem : cloudItem;
  return recordRichness(l) >= recordRichness(c) ? localItem : cloudItem;
}

/** Kartoteka: lokalna lista decyduje o składzie; pola scalane po id (nowszy updatedAt / bogatszy). */
export function mergeDirectory(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedDirectoryIds(),
): unknown[] {
  const localArr = filterDeletedDirectory(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedDirectory(normalizeArrayValue(cloud), deletedIds);
  const cloudMap = new Map<string, unknown>();
  for (const item of cloudArr) {
    const id = dirIdOf(item);
    if (id) cloudMap.set(id, item);
  }
  const localIds = new Set<string>();
  const result: unknown[] = [];
  for (const item of localArr) {
    const id = dirIdOf(item);
    if (!id) continue;
    localIds.add(id);
    const cloudItem = cloudMap.get(id);
    result.push(pickDirectoryRecord(item, cloudItem));
  }
  for (const [id, item] of cloudMap) {
    if (!localIds.has(id)) result.push(item);
  }
  return result;
}

const PAYROLL_DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"] as const;

function defaultPayrollDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

function defaultPayrollDays() {
  return Object.fromEntries(PAYROLL_DAY_KEYS.map((d) => [d, defaultPayrollDay()]));
}

function parsePayrollIsoDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0);
}

function payrollIsoFromDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Pn–So: weekTo = sobota; niedziela (Pn+6) traktowana jak sobota (Pn+5) przy porównaniu tygodni. */
function canonicalPayrollWeekTo(weekFrom: string, weekTo: string): string {
  const mon = parsePayrollIsoDate(weekFrom);
  if (!mon) return weekTo;
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  if (weekTo === payrollIsoFromDate(sun)) {
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    return payrollIsoFromDate(sat);
  }
  return weekTo;
}

function weekRangeKey(from: unknown, to: unknown): string {
  if (typeof from !== "string" || !from || typeof to !== "string" || !to) return "";
  return `${from}|${canonicalPayrollWeekTo(from, to)}`;
}

/** Usuwa godziny / Sob.pr. / koszty — zostawia kartotekę wpisu (imię, stawka, id). */
export function stripWeekEmployeeHours(emp: unknown): unknown {
  if (!emp || typeof emp !== "object") return emp;
  const e = emp as Record<string, unknown>;
  return {
    ...e,
    days: defaultPayrollDays(),
    prevSaturday: defaultPayrollDay(),
    extraCosts: [],
    settled: false,
    settledUpdatedAt: undefined,
    dataUpdatedAt: undefined,
  };
}

function stripWeekEmployeeHoursList(list: unknown[]): unknown[] {
  return list.map(stripWeekEmployeeHours);
}

/**
 * Scal listę płac tylko w kontekście docelowego tygodnia Pn–So.
 * Godziny ze źródła z innym weekFrom/weekTo nie przechodzą na nowy tydzień.
 */
export function mergeWeekEmployeesForWeekRange(
  weekFrom: string,
  weekTo: string,
  localFrom: unknown,
  localTo: unknown,
  localEmps: unknown,
  cloudFrom: unknown,
  cloudTo: unknown,
  cloudEmps: unknown,
  archive: unknown,
  deleted: string[] = getDeletedWeekEmployeeKeys(),
): unknown[] {
  const target = weekRangeKey(weekFrom, weekTo);
  if (!target) return mergeWeekEmployees(normalizeArrayValue(localEmps), normalizeArrayValue(cloudEmps));

  // PR-PAY-S2 — tombstones: odfiltruj usuniętych z OBU stron zanim zadziała UNION,
  // aby usunięty pracownik nie wrócił z chmury/lokalu (Cloud Sync / Restore / Bootstrap).
  const tombstoned = deletedWeekEmployeeMergeKeySet(deleted, weekFrom, weekTo);
  const localNorm = normalizeArrayValue(localEmps);
  const cloudNorm = normalizeArrayValue(cloudEmps);
  const local = filterDeletedWeekEmployees(localNorm, tombstoned);
  const cloud = filterDeletedWeekEmployees(cloudNorm, tombstoned);
  const localMatch = weekRangeKey(localFrom, localTo) === target;
  const cloudMatch = weekRangeKey(cloudFrom, cloudTo) === target;

  const archSnap = normalizeArrayValue(archive).find(
    (w) => (w as { weekFrom?: string; weekTo?: string }).weekFrom === weekFrom
      && (w as { weekFrom?: string; weekTo?: string }).weekTo === weekTo,
  ) as { weekEmployees?: unknown[] } | undefined;
  const hasArchivedWeek = (archSnap?.weekEmployees?.length ?? 0) > 0;

  if (localMatch && cloudMatch) {
    const localEmpty = local.length === 0;
    const cloudEmpty = cloud.length === 0;
    // PAYROLL-CLOUD-RESURRECTION-01 — empty cloud wins over stale local clone of archived week
    if (cloudEmpty && !localEmpty) {
      const fence = evaluatePayrollResurrectionFence({
        localEmps: local,
        cloudEmps: cloud,
        localFrom: weekFrom,
        localTo: weekTo,
        cloudFrom: weekFrom,
        cloudTo: weekTo,
        localArchive: archive,
        cloudArchive: archive,
      });
      if (fence.preferCloudEmptyRoster) {
        payrollTraceEmit("sync.merge.week_range.pick_side", "MERGE", "info", {
          pickedSide: "cloud",
          localEmpty,
          cloudEmpty,
          resurrectionFence: fence.reason,
          hasArchivedWeek,
          out: rosterTraceSnapshot(cloud, weekFrom, weekTo, "MERGED", "MERGED"),
        });
        return cloud;
      }
    }
    if (!hasArchivedWeek && localEmpty !== cloudEmpty) {
      const picked = localEmpty ? "cloud" : "local";
      const { weekFrom: wf, weekTo: wt } = { weekFrom, weekTo };
      payrollTraceEmit("sync.merge.week_range.pick_side", "MERGE", "info", {
        pickedSide: picked,
        localEmpty,
        cloudEmpty,
        out: rosterTraceSnapshot(
          localEmpty ? cloud : local,
          wf,
          wt,
          "MERGED",
          "MERGED",
        ),
      });
      return localEmpty ? cloud : local;
    }
    return mergeWeekEmployees(local, cloud);
  }

  // PR-PAY-S1 — twardy strażnik tygodnia: NIE dodawaj składu z obcego tygodnia.
  // Usunięty cross-week UNION (kontaminacja P0). Zachowujemy wyłącznie skład
  // należący do bieżącego zakresu Pn–So.
  if (localMatch && !cloudMatch) {
    // chmura należy do innego tygodnia → zachowaj wyłącznie bieżący skład lokalny
    return mergeWeekEmployees(local, []);
  }
  if (!localMatch && cloudMatch) {
    // lokalny skład należy do innego tygodnia → bieżący skład wyłącznie z chmury
    return mergeWeekEmployees([], cloud);
  }

  const roster = mergeWeekEmployees(local, cloud);
  if (roster.length === 0) return roster;
  if (!hasArchivedWeek) return stripWeekEmployeeHoursList(roster);
  return roster;
}

/** Po ustaleniu weekFrom/weekTo — nie przenoś godzin ze starego tygodnia. */
export function sanitizeWeekEmployeesForTargetRange(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
): unknown[] {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return merged;

  const weekFrom = merged[fromIdx] as string;
  const weekTo = merged[toIdx] as string;
  if (!weekFrom || !weekTo) return merged;

  const out = [...merged];
  const empBefore = normalizeArrayValue(out[empIdx]).length;
  out[empIdx] = mergeWeekEmployeesForWeekRange(
    weekFrom,
    weekTo,
    localValues[fromIdx],
    localValues[toIdx],
    localValues[empIdx],
    cloudValues[fromIdx],
    cloudValues[toIdx],
    cloudValues[empIdx],
    archIdx >= 0 ? merged[archIdx] : [],
  );
  const empAfter = normalizeArrayValue(out[empIdx]).length;
  logPayrollBootstrapTraceFromWeekKeys({
    caller: "sanitizeWeekEmployeesForWeekRange",
    reason: "sanitize_complete",
    targetFrom: weekFrom,
    targetTo: weekTo,
    cloudFrom: cloudValues[fromIdx],
    cloudTo: cloudValues[toIdx],
    localFrom: localValues[fromIdx],
    localTo: localValues[toIdx],
    employeeCountBefore: empBefore,
    employeeCountAfter: empAfter,
    employeeCount: empAfter,
  });

  return out;
}

/**
 * SSOT payroll merge po mergeAllDataKeys — bootstrap i runtime (B4).
 * align + sanitize + week mismatch (20.1C.1) + P11 richness override (ten sam tydzień).
 * Anti-leak — wyłącznie runtime: applyRuntimePayrollAntiLeak().
 */
/**
 * PR-PAY-S5 — po adopcji bogatszego składu z chmury (richness override) zachowaj wynik
 * LWW statusu rozliczenia względem lokalu. Zmienia WYŁĄCZNIE settled/settledUpdatedAt
 * (godziny/dni/pozostałe pola adoptowanego rekordu pozostają nietknięte).
 */
function preserveSettledLwwFromLocal(adopted: unknown[], localEmps: unknown): unknown[] {
  const local = normalizeArrayValue(localEmps);
  if (local.length === 0) return adopted;
  const localByKey = new Map<string, Record<string, unknown>>();
  for (const item of local) {
    if (item && typeof item === "object") {
      localByKey.set(
        weekEmployeeMergeKey(item as { id?: string; directoryId?: string; name?: string }),
        item as Record<string, unknown>,
      );
    }
  }
  return adopted.map((item) => {
    if (!item || typeof item !== "object") return item;
    const c = item as Record<string, unknown>;
    const l = localByKey.get(weekEmployeeMergeKey(c as { id?: string; directoryId?: string; name?: string }));
    if (!l) return item;
    const settled = pickSettledByTimestamps(l, c);
    return { ...c, settled, settledUpdatedAt: pickSettledUpdatedAtForMerge(l, c, settled) };
  });
}

export function finalizePayrollBundleMerge(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
): unknown[] {
  const empIdxIn = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdxIn = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdxIn = DATA_KEYS.indexOf("kw-weekTo");
  logPayrollBootstrapTraceFromWeekKeys({
    caller: "finalizePayrollBundleMerge",
    reason: "finalize_enter",
    targetFrom: merged[fromIdxIn],
    targetTo: merged[toIdxIn],
    cloudFrom: cloudValues[fromIdxIn],
    cloudTo: cloudValues[toIdxIn],
    localFrom: localValues[fromIdxIn],
    localTo: localValues[toIdxIn],
    employeeCount: empIdxIn >= 0 ? normalizeArrayValue(merged[empIdxIn]).length : 0,
  });

  let out = alignWeekRangeInMerged(merged, localValues, cloudValues);
  out = sanitizeWeekEmployeesForTargetRange(out, localValues, cloudValues);

  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return out;

  const targetFrom = out[fromIdx];
  const targetTo = out[toIdx];
  const cloudFrom = cloudValues[fromIdx];
  const cloudTo = cloudValues[toIdx];
  const localFrom = localValues[fromIdx];
  const localTo = localValues[toIdx];
  const targetKey = weekRangeKey(targetFrom, targetTo);
  const cloudKey = weekRangeKey(cloudFrom, cloudTo);
  const localKey = weekRangeKey(localFrom, localTo);

  // Sprint 20.1C.1 — nie adoptuj bogatszej chmury z innego tygodnia (rollover leak).
  if (targetKey && cloudKey && targetKey !== cloudKey) {
    logPayrollBootstrapTraceFromWeekKeys({
      caller: "finalizePayrollBundleMerge",
      reason: "finalize_early_return_week_mismatch_target_cloud",
      targetFrom,
      targetTo,
      cloudFrom,
      cloudTo,
      localFrom,
      localTo,
      employeeCount: normalizeArrayValue(out[empIdx]).length,
    });
    return applyPayrollResurrectionFenceToBundle(out, localValues, cloudValues);
  }
  if (localKey && cloudKey && localKey !== cloudKey && localKey === targetKey) {
    logPayrollBootstrapTraceFromWeekKeys({
      caller: "finalizePayrollBundleMerge",
      reason: "finalize_early_return_week_mismatch_local_cloud",
      targetFrom,
      targetTo,
      cloudFrom,
      cloudTo,
      localFrom,
      localTo,
      employeeCount: normalizeArrayValue(out[empIdx]).length,
    });
    return applyPayrollResurrectionFenceToBundle(out, localValues, cloudValues);
  }

  const localEmps = normalizeArrayValue(localValues[empIdx]);
  const cloudEmps = normalizeArrayValue(cloudValues[empIdx]);
  const wf = String(targetFrom ?? "");
  const wt = String(targetTo ?? "");
  // PAYROLL-DI-P0 DF-10 — roster richnessOverride for hours/days REMOVED.
  // Per-record merge (mergeWeekEmployeeRecord + per-day updatedAt) is SSOT on pull.

  payrollTraceEmit("sync.merge.payroll.finalize", "MERGE", "info", {
    localR: weekEmployeesListRichness(localEmps),
    cloudR: weekEmployeesListRichness(cloudEmps),
    localActiveDays: payrollMetrics(localEmps).activeDays,
    cloudActiveDays: payrollMetrics(cloudEmps).activeDays,
    richnessOverride: false,
    weekKeyMismatch: false,
    out: rosterTraceSnapshot(normalizeArrayValue(out[empIdx]), wf, wt, "MERGED", "PRESENT"),
  });

  const finalEmps = normalizeArrayValue(out[empIdx]);
  logPayrollBootstrapTraceFromWeekKeys({
    caller: "finalizePayrollBundleMerge",
    reason: "finalize_exit",
    targetFrom,
    targetTo,
    cloudFrom,
    cloudTo,
    localFrom,
    localTo,
    employeeCount: finalEmps.length,
  });

  return applyPayrollResurrectionFenceToBundle(out, localValues, cloudValues);
}

/** PAYROLL-CLOUD-RESURRECTION-01 — apply empty-cloud fence after payroll finalize. */
export function applyPayrollResurrectionFenceToBundle(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
  calendarFrom?: string,
  calendarTo?: string,
): unknown[] {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return merged;

  const fence = evaluatePayrollResurrectionFence({
    localEmps: localValues[empIdx],
    cloudEmps: cloudValues[empIdx],
    localFrom: localValues[fromIdx],
    localTo: localValues[toIdx],
    cloudFrom: cloudValues[fromIdx],
    cloudTo: cloudValues[toIdx],
    localArchive: archIdx >= 0 ? localValues[archIdx] : [],
    cloudArchive: archIdx >= 0 ? cloudValues[archIdx] : [],
    calendarFrom,
    calendarTo,
  });

  if (!fence.preferCloudEmptyRoster && !fence.stripLocalOnlyCurrentArchive) {
    return merged;
  }

  const next = [...merged];
  if (fence.preferCloudEmptyRoster) {
    next[empIdx] = [];
  }
  if (fence.stripLocalOnlyCurrentArchive && archIdx >= 0) {
    next[archIdx] = stripLocalOnlyArchiveWeek(
      next[archIdx],
      cloudValues[archIdx],
      cloudValues[fromIdx],
      cloudValues[toIdx],
    );
  }
  payrollTraceEmit("sync.merge.payroll.resurrection_fence", "MERGE", "info", {
    reason: fence.reason,
    preferCloudEmptyRoster: fence.preferCloudEmptyRoster,
    stripLocalOnlyCurrentArchive: fence.stripLocalOnlyCurrentArchive,
  });
  return next;
}

/** Expose fence for bootstrap push gate. */
export function evaluatePayrollResurrectionFenceForBundle(
  localValues: unknown[],
  cloudValues: unknown[],
  calendarFrom?: string,
  calendarTo?: string,
): ResurrectionFenceDecision {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  return evaluatePayrollResurrectionFence({
    localEmps: empIdx >= 0 ? localValues[empIdx] : [],
    cloudEmps: empIdx >= 0 ? cloudValues[empIdx] : [],
    localFrom: fromIdx >= 0 ? localValues[fromIdx] : "",
    localTo: toIdx >= 0 ? localValues[toIdx] : "",
    cloudFrom: fromIdx >= 0 ? cloudValues[fromIdx] : "",
    cloudTo: toIdx >= 0 ? cloudValues[toIdx] : "",
    localArchive: archIdx >= 0 ? localValues[archIdx] : [],
    cloudArchive: archIdx >= 0 ? cloudValues[archIdx] : [],
    calendarFrom,
    calendarTo,
  });
}

/**
 * PAYROLL-ANTI-LEAK-FIX-01 (Wariant B) — cross-week leak tylko.
 * Same-week Cloud SSOT z poprawnym rosterem nie jest czyszczony.
 */
function isStaleArchiveRosterRepublishedUnderTargetWeek(
  targetFrom: unknown,
  targetTo: unknown,
  cloudEmps: unknown[],
  archive: unknown[],
): boolean {
  const targetFromStr = typeof targetFrom === "string" ? targetFrom : "";
  if (!targetFromStr || cloudEmps.length === 0) return false;

  const prevSnaps = archive
    .filter((w) => {
      const wt = (w as { weekTo?: string }).weekTo;
      return typeof wt === "string" && wt < targetFromStr;
    })
    .sort((a, b) =>
      String((b as { weekTo?: string }).weekTo).localeCompare(
        String((a as { weekTo?: string }).weekTo),
      ),
    );
  const prev = prevSnaps[0] as { weekEmployees?: unknown[] } | undefined;
  const prevEmps = normalizeArrayValue(prev?.weekEmployees);
  if (prevEmps.length === 0) return false;

  const prevKeys = new Set(
    prevEmps.map((e) =>
      weekEmployeeMergeKey(e as { id?: string; directoryId?: string; name?: string }),
    ),
  );
  const cloudKeys = cloudEmps.map((e) =>
    weekEmployeeMergeKey(e as { id?: string; directoryId?: string; name?: string }),
  );
  return (
    cloudKeys.length > 0
    && cloudKeys.every((k) => prevKeys.has(k))
    && cloudKeys.length === prevEmps.length
  );
}

/** Runtime-only: pusty skład nowego tygodnia po rolloverze — nie przenoś osób z chmury (cross-week). */
export function applyRuntimePayrollAntiLeak(
  merged: unknown[],
  valuesForMerge: unknown[],
  cloudValues: unknown[] = valuesForMerge,
): unknown[] {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || archIdx < 0 || fromIdx < 0 || toIdx < 0) return merged;

  const payrollSourceForAntiLeak = normalizeArrayValue(valuesForMerge[empIdx]);
  const archiveSourceForAntiLeak = normalizeArrayValue(valuesForMerge[archIdx]);
  const mergedRichness = weekEmployeesListRichness(merged[empIdx]);
  const archiveRich = archiveSourceForAntiLeak.some(
    (w) => weekEmployeesListRichness((w as { weekEmployees?: unknown[] })?.weekEmployees) >= 8,
  );
  const baseConditions =
    payrollSourceForAntiLeak.length === 0 && archiveRich && mergedRichness > 0;

  const targetFrom = merged[fromIdx];
  const targetTo = merged[toIdx];
  const targetKey = weekRangeKey(targetFrom, targetTo);
  const cloudKey = weekRangeKey(cloudValues[fromIdx], cloudValues[toIdx]);
  const localKey = weekRangeKey(valuesForMerge[fromIdx], valuesForMerge[toIdx]);
  const cloudEmps = normalizeArrayValue(cloudValues[empIdx]);
  const crossWeekLeak = Boolean(
    (targetKey && cloudKey && cloudKey !== targetKey)
    || (localKey && cloudKey && localKey !== cloudKey),
  );
  const sameWeekCloudSsot = Boolean(
    targetKey && cloudKey && cloudKey === targetKey && cloudEmps.length > 0,
  );
  const staleArchiveRepublish = sameWeekCloudSsot
    && isStaleArchiveRosterRepublishedUnderTargetWeek(
      targetFrom,
      targetTo,
      cloudEmps,
      archiveSourceForAntiLeak,
    );
  const shouldFireAntiLeak = baseConditions && (crossWeekLeak || staleArchiveRepublish);
  const mergedEmployeeCountBefore = normalizeArrayValue(merged[empIdx]).length;
  let archiveRichness = 0;
  for (const w of archiveSourceForAntiLeak) {
    archiveRichness = Math.max(
      archiveRichness,
      weekEmployeesListRichness((w as { weekEmployees?: unknown[] })?.weekEmployees),
    );
  }
  logPayrollAntiLeakRuntimeTrace({
    shouldFireAntiLeak,
    baseConditions,
    crossWeekLeak,
    staleArchiveRepublish,
    sameWeekCloudSsot,
    payrollSourceLength: payrollSourceForAntiLeak.length,
    archiveRich,
    archiveRichness,
    mergedRichness,
    cloudWeekKey: cloudKey,
    targetWeekKey: targetKey,
    localWeekKey: localKey,
    mergedEmployeeCountBefore,
    mergedEmployeeCountAfter: shouldFireAntiLeak ? 0 : mergedEmployeeCountBefore,
  });

  const { weekFrom, weekTo } = traceWeekRangeFromLs();
  if (!shouldFireAntiLeak) {
    if (baseConditions && sameWeekCloudSsot && !staleArchiveRepublish) {
      payrollTraceEmit("sync.merge.payroll.anti_leak", "MERGE", "info", {
        fired: false,
        reason: "skipped_same_week_cloud_ssot" as const,
        cloudWeekKey: cloudKey,
        targetWeekKey: targetKey,
        out: rosterTraceSnapshot(
          normalizeArrayValue(merged[empIdx]),
          String(targetFrom ?? weekFrom),
          String(targetTo ?? weekTo),
          "MERGED",
          "PRESENT",
        ),
      });
    }
    return merged;
  }

  const next = [...merged];
  next[empIdx] = [];
  payrollTraceEmit("sync.merge.payroll.anti_leak", "MERGE", "warn", {
    fired: true,
    reason: crossWeekLeak ? ("cross_week_leak" as const) : ("stale_archive_republish" as const),
    cloudWeekKey: cloudKey,
    targetWeekKey: targetKey,
    out: rosterTraceSnapshot([], weekFrom, weekTo, "MERGED", "REMOVED"),
  });
  return next;
}

/**
 * CloudLoader bootstrap — finalizePayrollBundleMerge (SSOT B4).
 */
export function applyBootstrapPayrollMerge(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
): unknown[] {
  const empIdxPre = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdxPre = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdxPre = DATA_KEYS.indexOf("kw-weekTo");
  logPayrollBootstrapTraceFromWeekKeys({
    caller: "applyBootstrapPayrollMerge",
    reason: "bootstrap_merge_enter",
    targetFrom: merged[fromIdxPre],
    targetTo: merged[toIdxPre],
    cloudFrom: cloudValues[fromIdxPre],
    cloudTo: cloudValues[toIdxPre],
    localFrom: localValues[fromIdxPre],
    localTo: localValues[toIdxPre],
    employeeCount: empIdxPre >= 0 ? normalizeArrayValue(merged[empIdxPre]).length : 0,
  });
  const out = finalizePayrollBundleMerge(merged, localValues, cloudValues);
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  logPayrollBootstrapTraceFromWeekKeys({
    caller: "applyBootstrapPayrollMerge",
    reason: "bootstrap_merge_exit",
    targetFrom: out[fromIdx],
    targetTo: out[toIdx],
    cloudFrom: cloudValues[fromIdx],
    cloudTo: cloudValues[toIdx],
    localFrom: localValues[fromIdx],
    localTo: localValues[toIdx],
    employeeCount: empIdx >= 0 ? normalizeArrayValue(out[empIdx]).length : 0,
  });
  if (empIdx >= 0) {
    const wf = String(out[fromIdx] ?? "");
    const wt = String(out[toIdx] ?? "");
    payrollTraceEmit("sync.bootstrap.payroll.finalize", "MERGE", "info", {
      trigger: "bootstrap" as const,
      out: rosterTraceSnapshot(normalizeArrayValue(out[empIdx]), wf, wt, "MERGED", "PRESENT"),
    });
  }
  return out;
}

function pickWeekRange(localFrom: unknown, localTo: unknown, cloudFrom: unknown, cloudTo: unknown, localEmps: unknown, cloudEmps: unknown): { from: string; to: string } {
  const lf = typeof localFrom === "string" ? localFrom : "";
  const cf = typeof cloudFrom === "string" ? cloudFrom : "";
  const lt = typeof localTo === "string" ? localTo : "";
  const ct = typeof cloudTo === "string" ? cloudTo : "";
  const localR = weekEmployeesListRichness(localEmps);
  const cloudR = weekEmployeesListRichness(cloudEmps);

  let picked: { from: string; to: string };
  let reason = "pick_week_range_default";

  if (lf && lt && cf && ct && (lf !== cf || lt !== ct)) {
    const localEmpty = localR === 0;
    const cloudEmpty = cloudR === 0;
    if (localEmpty && !cloudEmpty) {
      picked = { from: cf, to: ct };
      reason = "local_empty_cloud_rich_adopt_cloud_week";
    } else if (cloudEmpty && !localEmpty) {
      picked = { from: lf, to: lt };
      reason = "cloud_empty_local_rich_adopt_local_week";
    } else if (cf >= lf) {
      picked = { from: cf, to: ct };
      reason = "both_weeks_cloud_newer_or_equal";
    } else {
      picked = { from: lf, to: lt };
      reason = "both_weeks_local_newer";
    }
  } else if (localR > cloudR + 1 && lf && lt) {
    picked = { from: lf, to: lt };
    reason = "local_richness_dominant";
  } else if (cloudR > localR + 1 && cf && ct) {
    picked = { from: cf, to: ct };
    reason = "cloud_richness_dominant";
  } else if (lf && lt) {
    picked = { from: lf, to: lt };
    reason = "prefer_local_week_keys";
  } else {
    picked = { from: cf || lf, to: ct || lt };
    reason = "fallback_cloud_or_local";
  }

  logPayrollBootstrapTraceFromWeekKeys({
    caller: "pickWeekRange",
    reason,
    targetFrom: picked.from,
    targetTo: picked.to,
    cloudFrom: cloudFrom,
    cloudTo: cloudTo,
    localFrom: localFrom,
    localTo: localTo,
    employeeCount: Math.max(normalizeArrayValue(localEmps).length, normalizeArrayValue(cloudEmps).length),
  });

  return picked;
}

/** Scal local + chmura dla jednego klucza danych. */
export function mergeDataKey(
  key: DataKey,
  local: unknown,
  cloud: unknown,
  deletedJobIds: string[] = getDeletedJobIds(),
  deletedDirectoryIds: string[] = getDeletedDirectoryIds(),
  deletedContactsIds: string[] = getDeletedContactsIds(),
  deletedArchiveIds: string[] = getDeletedArchiveIds(),
  deletedEmployeeLeaveIds: string[] = getDeletedEmployeeLeaveIds(),
  deletedRecoverableChargeIds: string[] = getDeletedRecoverableChargeIds(),
  deletedOperationalNoteIds: string[] = getDeletedOperationalNoteIds(),
): unknown {
  switch (key) {
    case "kw-jobs":
      return mergeJobsById(normalizeJobsValue(local ?? []), normalizeJobsValue(cloud), deletedJobIds);
    case "kw-week-employees":
      return mergeWeekEmployees(normalizeArrayValue(local), normalizeArrayValue(cloud));
    case "kw-archive":
      return mergeArchive(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedArchiveIds);
    case "kw-directory":
      return mergeDirectory(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedDirectoryIds);
    case "kw-contacts":
      return mergeContacts(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedContactsIds);
    case "kw-employee-leaves":
      return mergeEmployeeLeaves(local, cloud, deletedEmployeeLeaveIds);
    case "kw-recoverable-charges":
      return mergeRecoverableCharges(local, cloud, deletedRecoverableChargeIds);
    case "kw-operational-notes":
      return mergeOperationalNotes(local, cloud, deletedOperationalNoteIds);
    case "kw-wm-print-templates":
      return mergeWmPrintTemplates(
        normalizeWmPrintTemplates(local),
        cloud,
        getDeletedWmPrintTemplateIds(),
      );
    case "kw-wm-print-job-docs":
      return mergeWmPrintJobDocuments(
        normalizeWmPrintJobDocuments(local),
        cloud,
        getDeletedWmPrintJobDocIds(),
      );
    case "kw-wm-print-settings":
      return mergeWmPrintSettings(normalizeWmPrintSettings(local), normalizeWmPrintSettings(cloud));
    case "kw-wm-print-history":
      return mergeWmPrintHistory(normalizeWmPrintHistory(local), cloud);
    case "kw-delivery-package-publications":
      return mergeDeliveryPackagePublications(local, cloud);
    case "kw-electrical-measurements":
      return mergeElectricalMeasurements(local, cloud, getDeletedElectricalMeasurementIds());
    case "kw-electrical-measurement-registry":
      return mergeElectricalMeasurementRegistry(local, cloud);
    case "kw-electrical-measurement-settings":
      return mergeElectricalMeasurementSettings(local, cloud);
    case "kw-electrical-schematics":
      return mergeElectricalSchematics(local, cloud);
    case "kw-wm-technical-drawings":
      return mergeWmTechnicalDrawings(local, cloud);
    case "kw-tenders-pipeline":
      return mergeTenderDataKey(TENDERS_PIPELINE_KEY, local, cloud);
    case "kw-tenders-company-profile":
      return mergeTenderDataKey(TENDERS_COMPANY_PROFILE_KEY, local, cloud);
    case "kw-wgdom-classification-dictionary":
      return mergeTenderDataKey(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, local, cloud);
    case "kw-company-profile":
      return mergeTenderDataKey(COMPANY_QUALIFICATION_PROFILE_KEY, local, cloud);
    case "kw-tenders-custom-keywords":
      return mergeTenderDataKey(TENDERS_CUSTOM_KEYWORDS_KEY, local, cloud);
    case "kw-tender-calibration":
      return mergeTenderDataKey(TENDER_CALIBRATION_KEY, local, cloud);
    case "kw-tender-price-overrides":
      return mergeTenderDataKey(TENDER_PRICE_OVERRIDES_KEY, local, cloud);
    case "kw-wgdom-cost-catalog-history":
      return mergeTenderDataKey(WGDOM_COST_CATALOG_HISTORY_KEY, local, cloud);
    case "kw-wgdom-work-catalog":
      return mergeWorkCatalogStore(local, cloud);
    case "kw-wgdom-work-bundles":
      return mergeWorkBundleStore(local, cloud);
    case "kw-knr-catalog":
      return mergeKnrCatalogStore(local, cloud);
    case "kw-knr-discovery-evidence":
      return mergeKnrDiscoveryEvidenceStore(local, cloud);
    case "kw-wgdom-labor-source-evidence":
      return mergeLaborSourceEvidenceDataKey(local, cloud);
    case "kw-offer-boq-company-knowledge":
      return mergeCompanyKnowledgeStore(local, cloud);
    case "kw-price-intelligence-demand":
      return mergePriceDemandStore(local, cloud);
    case "kw-weekFrom":
    case "kw-weekTo":
      return typeof local === "string" && local ? local : (typeof cloud === "string" && cloud ? cloud : local ?? cloud);
    default:
      return local ?? cloud;
  }
}

export function bootstrapMergedShouldPersist(
  key: DataKey,
  merged: unknown,
  /** PAYROLL-CLOUD-RESURRECTION-01 — force persist empty roster when fence clears stale local */
  forcePersistEmptyWeekEmployees = false,
): boolean {
  if (
    forcePersistEmptyWeekEmployees &&
    key === "kw-week-employees" &&
    Array.isArray(merged) &&
    merged.length === 0
  ) {
    return true;
  }
  const hasRealData =
    merged != null && !(Array.isArray(merged) && merged.length === 0) && merged !== "";
  return hasRealData || ((key === "kw-weekFrom" || key === "kw-weekTo") && Boolean(merged));
}

export function bootstrapMergedShouldPush(
  key: DataKey,
  merged: unknown,
  cloudVal: unknown,
  fence?: ResurrectionFenceDecision,
): boolean {
  if (!isSupabaseConfigured()) return false;
  if (fence) {
    const gate = bootstrapPayrollPushAllowed({
      key,
      mergedValue: merged,
      cloudValue: cloudVal,
      fence,
    });
    if (!gate.allow) return false;
  }
  if (key === "kw-knr-catalog" || key === KNR_CATALOG_STORAGE_KEY) {
    return shouldPushKnrCatalogToCloud(merged, cloudVal);
  }
  if (
    key === "kw-knr-discovery-evidence"
    || key === KNR_DISCOVERY_EVIDENCE_STORAGE_KEY
  ) {
    return shouldPushKnrDiscoveryEvidenceToCloud(merged, cloudVal);
  }
  const hasRealData =
    merged != null && !(Array.isArray(merged) && merged.length === 0) && merged !== "";
  const cloudEmpty = cloudVal == null || (Array.isArray(cloudVal) && cloudVal.length === 0);
  const richnessIncreased =
    key === "kw-week-employees"
      ? weekEmployeesListRichness(merged) > weekEmployeesListRichness(cloudVal) + 1
      : key === "kw-jobs"
        ? normalizeJobsValue(merged).length > normalizeJobsValue(cloudVal).length
        : Array.isArray(merged) && Array.isArray(cloudVal) && merged.length > cloudVal.length;
  return (
    (cloudEmpty && hasRealData) ||
    richnessIncreased ||
    (hasRealData && JSON.stringify(merged) !== JSON.stringify(cloudVal))
  );
}

export type LocalStoragePersistResult = {
  ok: boolean;
  /** true gdy setItem rzucił (QuotaExceeded / inne) — NIE jest to failure fetch/merge */
  storageFailure: boolean;
  errorName?: string;
};

/**
 * PAYROLL-P0-FIX-01 — jedyny kontrakt zapisu LS w bootstrap.
 * QuotaExceeded → log + storageFailure; nigdy throw.
 */
function classifyLocalStorageWriteError(e: unknown): { errorName: string; quota: boolean } {
  const errorName =
    e instanceof DOMException
      ? e.name
      : e instanceof Error
        ? e.name
        : typeof e === "object" && e !== null && "name" in e
          ? String((e as { name: unknown }).name)
          : "Error";
  const quota =
    errorName === "QuotaExceededError" ||
    (typeof e === "object" &&
      e !== null &&
      "code" in e &&
      ((e as { code: unknown }).code === 22 || (e as { code: unknown }).code === 1014));
  return { errorName, quota };
}

/** Zapis JSON — QuotaExceeded → log + storageFailure; nigdy throw. */
export function safeSetLocalStorageJson(key: string, value: unknown): LocalStoragePersistResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true, storageFailure: false };
  } catch (e) {
    const { errorName, quota } = classifyLocalStorageWriteError(e);
    console.warn(
      `[storage-failure] localStorage.setItem(${key}) name=${errorName} quota=${quota}`,
      e,
    );
    return { ok: false, storageFailure: true, errorName };
  }
}

/** Zapis surowego stringa (flagi typu WORKER_PINS_RESET) — ten sam kontrakt, bez JSON.stringify. */
export function safeSetLocalStorageRaw(key: string, raw: string): LocalStoragePersistResult {
  try {
    localStorage.setItem(key, raw);
    return { ok: true, storageFailure: false };
  } catch (e) {
    const { errorName, quota } = classifyLocalStorageWriteError(e);
    console.warn(
      `[storage-failure] localStorage.setItem(${key}) raw name=${errorName} quota=${quota}`,
      e,
    );
    return { ok: false, storageFailure: true, errorName };
  }
}

export function safeRemoveLocalStorageKey(key: string): LocalStoragePersistResult {
  try {
    localStorage.removeItem(key);
    return { ok: true, storageFailure: false };
  } catch (e) {
    const errorName = e instanceof Error ? e.name : "Error";
    console.warn(`[storage-failure] localStorage.removeItem(${key}) name=${errorName}`, e);
    return { ok: false, storageFailure: true, errorName };
  }
}

/** Bootstrap / deferred — ten sam kontrakt co safeSetLocalStorageJson + shouldPersist. */
export function persistBootstrapMergedKey(key: DataKey, merged: unknown): LocalStoragePersistResult {
  if (!bootstrapMergedShouldPersist(key, merged)) {
    return { ok: true, storageFailure: false };
  }
  const result = safeSetLocalStorageJson(key, merged);
  if (result.ok && key === WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY) {
    refreshUserClassificationDictionaryCacheFromLocalStorage();
  }
  return result;
}

/** Faza 2 — deferred klucze + tombstone kontaktów; na końcu wgdom-deferred-bootstrap. */
export async function fetchAndMergeDeferredBootstrap(): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;
    const keys = [...BOOTSTRAP_DEFERRED_KEYS];
    const allValues = await fetchKeysFromCloud([
      ...keys,
      CONTACTS_DELETED_IDS_KEY,
      EMPLOYEE_LEAVES_DELETED_IDS_KEY,
      RECOVERABLE_CHARGES_DELETED_IDS_KEY,
    ]);
    const cloudValues = allValues.slice(0, keys.length);
    const cloudContactsDeleted = normalizeDeletedJobIds(allValues[keys.length]);
    const cloudLeavesDeleted = normalizeDeletedEmployeeLeaveIds(allValues[keys.length + 1]);
    const cloudChargesDeleted = normalizeDeletedRecoverableChargeIds(allValues[keys.length + 2]);
    const mergedContactsDeleted = mergeDeletedContactsIds(getDeletedContactsIds(), cloudContactsDeleted);
    saveDeletedContactsIds(mergedContactsDeleted);
    const mergedLeavesDeleted = mergeDeletedEmployeeLeaveIds(getDeletedEmployeeLeaveIds(), cloudLeavesDeleted);
    saveDeletedEmployeeLeaveIds(mergedLeavesDeleted);
    const mergedChargesDeleted = mergeDeletedRecoverableChargeIds(getDeletedRecoverableChargeIds(), cloudChargesDeleted);
    saveDeletedRecoverableChargeIds(mergedChargesDeleted);

    const deletedJobIds = getDeletedJobIds();
    const deletedDirIds = getDeletedDirectoryIds();
    const deletedArchiveIds = getDeletedArchiveIds();

    const pushKeys: string[] = [];
    const pushValues: unknown[] = [];

    keys.forEach((key, i) => {
      const local = readLocalStorageDataKey(key);
      const cloudVal = cloudValues[i];
      const merged = mergeDataKey(
        key,
        local,
        cloudVal,
        deletedJobIds,
        deletedDirIds,
        mergedContactsDeleted,
        deletedArchiveIds,
        mergedLeavesDeleted,
        mergedChargesDeleted,
      );
      persistBootstrapMergedKey(key, merged);
      if (bootstrapMergedShouldPush(key, merged, cloudVal)) {
        pushKeys.push(key);
        pushValues.push(merged);
      }
    });

    if (pushKeys.length > 0) {
      void pushKeysToCloud(
        [...pushKeys, CONTACTS_DELETED_IDS_KEY, EMPLOYEE_LEAVES_DELETED_IDS_KEY, RECOVERABLE_CHARGES_DELETED_IDS_KEY],
        [...pushValues, mergedContactsDeleted, mergedLeavesDeleted, mergedChargesDeleted],
      ).catch(() => {});
    }

    const { finalizeWorkCatalogAfterDeferredMerge } = await import("@/lib/work-catalog-bootstrap");
    const workCatalogIdx = keys.indexOf(WORK_CATALOG_STORAGE_KEY);
    await finalizeWorkCatalogAfterDeferredMerge({
      cloud: workCatalogIdx >= 0 ? cloudValues[workCatalogIdx] : undefined,
    });

    if (keys.includes(OPERATIONAL_NOTES_KEY)) {
      await pullOperationalNotesAuxFromCloud();
    }
  } catch {
    /* offline — zostaw lokalne dane */
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(WGDOM_DEFERRED_BOOTSTRAP_EVENT));
    }
  }
}

/** Scal wszystkie klucze naraz (np. przed zapisem do chmury). */
export function mergeAllDataKeys(
  localValues: unknown[],
  cloudValues: unknown[],
  deletedJobIds: string[] = getDeletedJobIds(),
  deletedDirectoryIds: string[] = getDeletedDirectoryIds(),
  deletedContactsIds: string[] = getDeletedContactsIds(),
  deletedArchiveIds: string[] = getDeletedArchiveIds(),
  deletedEmployeeLeaveIds: string[] = getDeletedEmployeeLeaveIds(),
  deletedRecoverableChargeIds: string[] = getDeletedRecoverableChargeIds(),
  deletedOperationalNoteIds: string[] = getDeletedOperationalNoteIds(),
): unknown[] {
  const merged = DATA_KEYS.map((key, i) =>
    mergeDataKey(
      key,
      localValues[i],
      cloudValues[i],
      deletedJobIds,
      deletedDirectoryIds,
      deletedContactsIds,
      deletedArchiveIds,
      deletedEmployeeLeaveIds,
      deletedRecoverableChargeIds,
      deletedOperationalNoteIds,
    ),
  );
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx >= 0) {
    logPayrollBootstrapTraceFromWeekKeys({
      caller: "mergeAllDataKeys",
      reason: "merge_all_keys_complete",
      targetFrom: merged[fromIdx],
      targetTo: merged[toIdx],
      cloudFrom: cloudValues[fromIdx],
      cloudTo: cloudValues[toIdx],
      localFrom: localValues[fromIdx],
      localTo: localValues[toIdx],
      employeeCountBefore: normalizeArrayValue(localValues[empIdx]).length,
      employeeCountAfter: normalizeArrayValue(merged[empIdx]).length,
      employeeCount: normalizeArrayValue(merged[empIdx]).length,
    });
  }
  return merged;
}

/** Po merge weekFrom/weekTo — dopasuj do tygodnia z bogatszą listą płac (local vs chmura). */
export function alignWeekRangeInMerged(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
): unknown[] {
  const out = [...merged];
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return out;
  const range = pickWeekRange(
    localValues[fromIdx],
    localValues[toIdx],
    cloudValues[fromIdx],
    cloudValues[toIdx],
    localValues[empIdx],
    cloudValues[empIdx],
  );
  if (range.from) out[fromIdx] = range.from;
  if (range.to) out[toIdx] = range.to;
  return out;
}

/** Przed pushem wybranych kluczy — uwzględnij localStorage (inna karta / admin). */
export function prepareKeysForCloudPush(keys: string[], values: unknown[]): unknown[] {
  return keys.map((key, i) => {
    if (!isDataKey(key)) return values[i];
    const stored = readLocalStorageDataKey(key);
    if (stored == null) return values[i];
    return mergeIncomingWithStored(key, stored, values[i]);
  });
}

export function dataKeyRichness(key: DataKey, value: unknown): number {
  switch (key) {
    case "kw-jobs":
      return normalizeJobsValue(value).reduce((s, j) => s + jobMergeScore(j as { workEntries?: unknown[]; photos?: unknown[] }), 0) + normalizeJobsValue(value).length * 3;
    case "kw-week-employees":
      return weekEmployeesListRichness(value);
    case "kw-archive":
      return normalizeArrayValue(value).reduce((s, w) => s + recordRichness(w) + weekEmployeesListRichness((w as { weekEmployees?: unknown[] })?.weekEmployees), 0);
    case "kw-directory":
    case "kw-contacts":
    case "kw-employee-leaves":
    case "kw-recoverable-charges":
    case "kw-operational-notes":
    case "kw-electrical-measurements":
    case "kw-electrical-measurement-registry":
    case "kw-electrical-schematics":
    case "kw-wm-technical-drawings":
      return normalizeArrayValue(value).length + (typeof value === "object" && value && "entries" in value ? recordRichness(value) : 0);
    default:
      return value != null && value !== "" ? 1 : 0;
  }
}

/** Supabase JSONB NOT NULL — null psuje batch-set (np. kw-tenders-company-profile). */
export function coerceValueForCloudKey(key: string, value: unknown): unknown {
  if (value != null && value !== "") return value;
  if (key.endsWith("-deleted-ids")) return [];
  if (key === "kw-weekFrom" || key === "kw-weekTo") return "";
  if (key === TENDERS_COMPANY_PROFILE_KEY) return {};
  if (key === WGDOM_COST_CATALOG_KEY) return defaultWgdomCostCatalogStore();
  if (key === WORK_CATALOG_STORAGE_KEY) return defaultWorkCatalogStoreForPersist();
  if (key === WORK_BUNDLE_STORAGE_KEY) return defaultWorkBundleStore();
  if (key === KNR_CATALOG_STORAGE_KEY || key === "kw-knr-catalog") return emptyKnrCatalogStore();
  if (
    key === KNR_DISCOVERY_EVIDENCE_STORAGE_KEY
    || key === "kw-knr-discovery-evidence"
  ) {
    return emptyKnrDiscoveryEvidenceStore();
  }
  if (key === LABOR_SOURCE_EVIDENCE_STORAGE_KEY) return emptyLaborSourceEvidenceStore();
  if (key === OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY) return defaultCompanyKnowledgeStoreForPersist();
  if (key === PRICE_DEMAND_STORAGE_KEY) return defaultPriceDemandStoreForPersist();
  if (key === WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY) return defaultUserClassificationDictionaryStore();
  if (key === TENDERS_CUSTOM_KEYWORDS_KEY) {
    return { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
  }
  if (key === ELECTRICAL_MEASUREMENT_SETTINGS_KEY) return normalizeElectricalMeasurementSettings(null);
  if (key === ELECTRICAL_MEASUREMENT_REGISTRY_KEY) return createEmptyRegistryState();
  if (key === ELECTRICAL_SCHEMATICS_KEY) return [];
  if (key === WM_TECHNICAL_DRAWINGS_KEY) return [];
  if (key.startsWith("kw-")) return [];
  return {};
}

function sanitizeValueForCloud(key: string, value: unknown): unknown {
  const coerced = coerceValueForCloudKey(key, value);
  if (key === "kw-jobs") return normalizeJobsValue(coerced);
  if (key === "kw-week-employees" || key === "kw-archive" || key === "kw-directory" || key === "kw-contacts" || key === "kw-employee-leaves" || key === "kw-recoverable-charges" || key === "kw-operational-notes" || key === ELECTRICAL_MEASUREMENTS_KEY || key === ELECTRICAL_MEASUREMENT_REGISTRY_KEY) {
    return normalizeArrayValue(coerced);
  }
  if (key === ELECTRICAL_SCHEMATICS_KEY) {
    return normalizeElectricalSchematics(coerced);
  }
  if (key === ELECTRICAL_MEASUREMENT_SETTINGS_KEY) return normalizeElectricalMeasurementSettings(coerced);
  if (key === ELECTRICAL_MEASUREMENT_REGISTRY_KEY) {
    return mergeElectricalMeasurementRegistry(coerced, coerced);
  }
  if (key === WORK_CATALOG_STORAGE_KEY) return normalizeWorkCatalogStore(coerced);
  if (key === WORK_BUNDLE_STORAGE_KEY) return normalizeWorkBundleStore(coerced);
  if (key === KNR_CATALOG_STORAGE_KEY || key === "kw-knr-catalog") {
    return normalizeKnrCatalogStore(coerced);
  }
  if (
    key === KNR_DISCOVERY_EVIDENCE_STORAGE_KEY
    || key === "kw-knr-discovery-evidence"
  ) {
    return normalizeKnrDiscoveryEvidenceStore(coerced);
  }
  if (key === LABOR_SOURCE_EVIDENCE_STORAGE_KEY) return normalizeLaborSourceEvidenceStore(coerced);
  if (key === OFFER_BOQ_COMPANY_KNOWLEDGE_STORAGE_KEY) return normalizeCompanyKnowledgeStore(coerced);
  if (key === PRICE_DEMAND_STORAGE_KEY) return normalizePriceDemandStore(coerced);
  return coerced;
}

/** Zapis wielu kluczy do Supabase KV (kolejność keys = kolejność values). */
export async function pushKeysToCloud(
  keys: string[],
  values: unknown[],
  options?: PushKeysToCloudOptions,
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_*)");
  }
  const guarded = await applyPayrollGuardBeforePush(keys, values, options);
  if (guarded.blocked) {
    throw new Error(PAYROLL_GUARD_BLOCKED_MESSAGE);
  }
  if (guarded.keys.length === 0) {
    payrollTraceEmit("payroll.roster.push.skip", "PUSH", "warn", {
      skipReason: "keys_empty" as const,
    });
    return;
  }
  const pushKeys = guarded.keys;
  const pushValues = guarded.values;
  const pushOptions = guarded.options;
  const safeValues = pushKeys.map((k, i) => sanitizeValueForCloud(k, pushValues[i]));
  const empIdx = pushKeys.indexOf("kw-week-employees");
  const { weekFrom, weekTo } = traceWeekRangeFromLs();
  const weekEmpPayload = empIdx >= 0
    ? rosterTraceSnapshot(normalizeArrayValue(safeValues[empIdx]), weekFrom, weekTo, "LS", "PRESENT")
    : undefined;
  const requestBody = JSON.stringify({
    keys: pushKeys,
    values: safeValues,
    replaceJobsKeys: pushOptions.replaceJobsKeys ?? [],
    replaceDirectoryKeys: pushOptions.replaceDirectoryKeys ?? [],
    replaceWeekEmployeesKeys: pushOptions.replaceWeekEmployeesKeys ?? [],
    payrollWeekCas: pushOptions.payrollWeekCas === true,
    expectedRevision: pushOptions.expectedRevision,
    clientAppVersion: pushOptions.clientAppVersion ?? APP_VERSION,
  });
  const keysCount = pushKeys.length;
  const batchSizeBytes = requestBody.length;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= BATCH_SET_MAX_ATTEMPTS; attempt++) {
    const delayMs = delayBeforeBatchSetAttempt(attempt);
    if (attempt > 1) {
      recordBatchSetRetry();
      payrollTraceEmit("sync.http.batch_set.retry", "HTTP_OUT", "warn", {
        attempt,
        delayMs,
        keysCount,
        batchSizeBytes,
        retryCounter: attempt - 1,
        keys: pushKeys,
      });
      await sleepMs(delayMs);
    }

    const httpRequestId = payrollTraceNextHttpRequestId();
    const httpSeq = payrollTraceNextHttpSeq();
    payrollTraceEmit("sync.http.batch_set.attempt", "HTTP_OUT", "info", {
      keys: pushKeys,
      replaceWeekEmployeesKeys: pushOptions.replaceWeekEmployeesKeys ?? [],
      skipPayrollGuard: pushOptions.skipPayrollGuard ?? false,
      forceReplaceWeekEmployees: (pushOptions.replaceWeekEmployeesKeys ?? []).includes("kw-week-employees"),
      httpRequestId,
      httpSeq,
      weekEmpPayload,
      attempt,
      delayMs,
      keysCount,
      batchSizeBytes,
      retryCounter: attempt - 1,
    });
    recordBatchSet(); // AC5 — production metrics (per HTTP)
    const t0 = Date.now();
    const res = await fetch(`${API_BASE}/batch-set`, {
      method: "POST",
      headers: { ...API_HEADERS, "X-WGDOM-Trace-Id": httpRequestId },
      body: requestBody,
    });
    const latencyMs = Date.now() - t0;
    let edgeRequestId: string | undefined;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errJson: Record<string, unknown> = {};
      try {
        errJson = JSON.parse(errText) as Record<string, unknown>;
      } catch { /* ignore */ }
      const edgeRequestIdFromErr = typeof errJson.requestId === "string" ? errJson.requestId : undefined;
      if (edgeRequestIdFromErr) edgeRequestId = edgeRequestIdFromErr;
      const errCode = typeof errJson.code === "string" ? errJson.code : "";
      if (
        res.status === 409 &&
        (errCode === PAYROLL_STALE_REVISION_CODE || errCode === PAYROLL_LEGACY_CLIENT_CODE)
      ) {
        const serverRevision = typeof errJson.serverRevision === "number" ? errJson.serverRevision : -1;
        const roster = Array.isArray(errJson.roster) ? errJson.roster : undefined;
        payrollTraceEmit("sync.http.batch_set.result", "HTTP_OUT", "warn", {
          httpStatus: 409,
          ok: false,
          edgeRequestId,
          latencyMs,
          httpSeq,
          httpRequestId,
          attempt,
          code: errCode,
          serverRevision,
        });
        throw new PayrollStaleRevisionError(
          errCode,
          serverRevision,
          roster,
          typeof errJson.error === "string" ? errJson.error : errCode,
        );
      }
      payrollTraceEmit("sync.http.batch_set.result", "HTTP_OUT", "error", {
        httpStatus: res.status,
        ok: false,
        edgeRequestId,
        latencyMs,
        httpSeq,
        httpRequestId,
        attempt,
        delayMs,
        keysCount,
        batchSizeBytes,
        retryCounter: attempt - 1,
        error: { message: errText.slice(0, 120) },
      });
      lastError = new Error(`batch-set ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
      if (
        isTransientBatchSetError(res.status, errText) &&
        attempt < BATCH_SET_MAX_ATTEMPTS
      ) {
        continue;
      }
      throw lastError;
    }
    let resJson: Record<string, unknown> = {};
    try {
      resJson = (await res.json()) as Record<string, unknown>;
      if (typeof resJson.requestId === "string") edgeRequestId = resJson.requestId;
    } catch { /* ignore */ }
    if (pushOptions.payrollWeekCas && resJson.payrollWeekMeta) {
      const { weekFrom, weekTo } = traceWeekRangeFromLs();
      writePayrollWeekMetaToLs(
        normalizePayrollWeekMeta(resJson.payrollWeekMeta, weekFrom, weekTo),
      );
    }
    payrollTraceEmit("sync.http.batch_set.result", "HTTP_OUT", "info", {
      httpStatus: res.status,
      ok: true,
      edgeRequestId,
      latencyMs,
      httpSeq,
      httpRequestId,
      attempt,
      delayMs,
      keysCount,
      batchSizeBytes,
      retryCounter: attempt - 1,
    });
    if (empIdx >= 0) {
      const inCount = normalizeArrayValue(safeValues[empIdx]).length;
      const forceReplace = (pushOptions.replaceWeekEmployeesKeys ?? []).includes("kw-week-employees");
      payrollTraceEmit("edge.kv.week_employees.write", "EDGE_KV", "info", {
        forceReplaceWeekEmployees: forceReplace,
        inCount,
        writtenCount: inCount,
        prevCount: undefined,
        afterTombstoneCount: inCount,
        tombstoneHitsOnSubject: false,
        clientProxy: true,
      });
    }
    return;
  }
  throw lastError ?? new Error("batch-set failed after retries");
}

/** Natychmiastowy zapis po usunięciu roboty — z listą skasowanych id (tombstones). */
export async function pushJobsAfterDelete(jobs: unknown[], deletedIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  try {
    const [raw] = await fetchKeysFromCloud([JOBS_DELETED_IDS_KEY]);
    cloudDeleted = normalizeDeletedJobIds(raw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedJobIds(deletedIds, cloudDeleted);
  saveDeletedJobIds(mergedDeleted);
  await pushKeysToCloud(
    ["kw-jobs", JOBS_DELETED_IDS_KEY],
    [jobs, mergedDeleted],
    { replaceJobsKeys: ["kw-jobs"] },
  );
}

/** Wszystkie dane aplikacji naraz (kolejność jak DATA_KEYS). Zwraca scalony bundle. */
export async function pushAllDataToCloud(values: unknown[]): Promise<unknown[]> {
  return pushAllDataToCloudSafe(values);
}

/**
 * Bezpieczny zapis: pobierz chmurę → scal z lokalnym → zapisz scalone.
 * Chroni przed nadpisaniem pustszą wersją z innej karty / urządzenia.
 */
/** Natychmiastowy zapis kartoteki po usunięciu / edycji pracownika. */
/** @internal RC-B-1 I-4 — domain push PWRB (tylko facade `pwrPush`). */
export async function pushWeekEmployeesToCloud(
  weekEmployees: unknown[],
  options?: PushWeekEmployeesOptions,
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) {
    payrollTraceEmit("payroll.roster.push.skip", "PUSH", "warn", {
      skipReason: !isSupabaseConfigured() ? "no_supabase" as const : "no_api_base" as const,
    });
    return;
  }
  const pushTraceId = payrollTraceCreatePushTraceId();
  const { weekFrom, weekTo } = traceWeekRangeFromLs();
  const beforeCollapse = normalizeArrayValue(weekEmployees);
  payrollTraceEmit("payroll.roster.collapse", "PUSH", "debug", {
    pushTraceId,
    beforeCount: beforeCollapse.length,
  });
  const normalized = collapseWeekEmployeesByIdentity(beforeCollapse);
  const tombstones = reconcileTombstonesWithRoster(weekFrom, weekTo, normalized);
  payrollTraceEmit("payroll.roster.push.start", "PUSH", "info", {
    pushTraceId,
    subjectPresent: rosterTraceSnapshot(normalized, weekFrom, weekTo, "LOCAL", "PRESENT").subjectPresent,
    count: normalized.length,
    tombstoneCount: tombstones.length,
  });
  try {
    payrollTraceBumpRosterRevision();
    localStorage.setItem("kw-week-employees", JSON.stringify(normalized));
    payrollTraceEmit("payroll.roster.ls.write", "LS", "info", {
      trigger: "ui_add" as const,
      roster: rosterTraceSnapshot(normalized, weekFrom, weekTo, "LS", "PRESENT"),
    });
  } catch { /* ignore */ }
  // D3 — force-couple skipPayrollGuard to intentionalHoursClear (guardStrict ON)
  const resolvedSkip = maySkipPayrollShrinkGuard(options);
  const expectedRevision = getExpectedPayrollRevision();
  try {
    await pushKeysToCloud(
      ["kw-week-employees", WEEK_EMPLOYEES_DELETED_KEYS_KEY, PAYROLL_WEEK_META_KEY],
      [normalized, tombstones, buildPayrollWeekMetaPlaceholder(weekFrom, weekTo)],
      {
        payrollWeekCas: true,
        expectedRevision,
        clientAppVersion: APP_VERSION,
        intentionalHoursClear: options?.intentionalHoursClear === true,
        skipPayrollGuard: resolvedSkip,
      },
    );
    payrollTraceEmit("payroll.roster.push.complete", "PUSH", "info", { pushTraceId });
  } catch (e) {
    payrollTraceEmit("payroll.roster.push.error", "PUSH", "error", {
      pushTraceId,
      error: { message: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
}

/** Atomowy push po rolloverze — nowy tydzień + archiwum starego (Sprint 20.1C.1). */
export async function pushPayrollWeekAfterRollover(params: {
  weekFrom: string;
  weekTo: string;
  weekEmployees: unknown[];
  archive: unknown[];
}): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  const normalized = collapseWeekEmployeesByIdentity(normalizeArrayValue(params.weekEmployees));
  const archive = normalizeArrayValue(params.archive);
  try {
    localStorage.setItem("kw-weekFrom", JSON.stringify(params.weekFrom));
    localStorage.setItem("kw-weekTo", JSON.stringify(params.weekTo));
    localStorage.setItem("kw-week-employees", JSON.stringify(normalized));
    localStorage.setItem("kw-archive", JSON.stringify(archive));
  } catch { /* ignore */ }
  // IC-7 — rollover: CAS + merge-on-write (PAYROLL-DI-P0)
  await pushKeysToCloud(
    ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive", PAYROLL_WEEK_META_KEY],
    [
      params.weekFrom,
      params.weekTo,
      normalized,
      archive,
      buildPayrollWeekMetaPlaceholder(params.weekFrom, params.weekTo),
    ],
    {
      payrollWeekCas: true,
      expectedRevision: getExpectedPayrollRevision(),
      clientAppVersion: APP_VERSION,
      payrollWeekRolloverPush: true,
    },
  );
}

/** Smoke / diag — czy Payroll Guard zablokuje push (bez batch-set). */
export async function evaluatePayrollGuardBeforePush(
  keys: string[],
  values: unknown[],
  options?: PushKeysToCloudOptions,
): Promise<{ blocked: boolean; keys: string[] }> {
  const guarded = await applyPayrollGuardBeforePush(keys, values, options);
  return { blocked: guarded.blocked, keys: guarded.keys };
}

export async function pushDirectoryToCloud(directory: unknown[]): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  let cloudDir: unknown[] = [];
  try {
    const [cloudRaw, deletedRaw] = await fetchKeysFromCloud(["kw-directory", DIRECTORY_DELETED_IDS_KEY]);
    cloudDir = normalizeArrayValue(cloudRaw);
    cloudDeleted = normalizeDeletedDirectoryIds(deletedRaw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDeleted);
  saveDeletedDirectoryIds(mergedDeleted);
  const merged = mergeDirectory(directory, cloudDir, mergedDeleted);
  await pushKeysToCloud(
    ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
    [merged, mergedDeleted],
    { replaceDirectoryKeys: ["kw-directory"] },
  );
}

export async function pushEmployeeLeavesToCloud(
  leaves: unknown[],
  deletedIds: string[] = getDeletedEmployeeLeaveIds(),
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  let cloudLeaves: unknown[] = [];
  try {
    const [cloudRaw, deletedRaw] = await fetchKeysFromCloud(["kw-employee-leaves", EMPLOYEE_LEAVES_DELETED_IDS_KEY]);
    cloudLeaves = normalizeEmployeeLeaves(cloudRaw);
    cloudDeleted = normalizeDeletedEmployeeLeaveIds(deletedRaw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedEmployeeLeaveIds(deletedIds, cloudDeleted);
  saveDeletedEmployeeLeaveIds(mergedDeleted);
  const merged = mergeEmployeeLeaves(leaves, cloudLeaves, mergedDeleted);
  try {
    localStorage.setItem("kw-employee-leaves", JSON.stringify(merged));
  } catch { /* ignore */ }
  await pushKeysToCloud(["kw-employee-leaves", EMPLOYEE_LEAVES_DELETED_IDS_KEY], [merged, mergedDeleted]);
}

export async function pushRecoverableChargesToCloud(
  charges: unknown[],
  deletedIds: string[] = getDeletedRecoverableChargeIds(),
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  let cloudCharges: unknown[] = [];
  try {
    const [cloudRaw, deletedRaw] = await fetchKeysFromCloud(["kw-recoverable-charges", RECOVERABLE_CHARGES_DELETED_IDS_KEY]);
    cloudCharges = normalizeRecoverableCharges(cloudRaw);
    cloudDeleted = normalizeDeletedRecoverableChargeIds(deletedRaw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedRecoverableChargeIds(deletedIds, cloudDeleted);
  saveDeletedRecoverableChargeIds(mergedDeleted);
  const merged = mergeRecoverableCharges(charges, cloudCharges, mergedDeleted);
  try {
    localStorage.setItem("kw-recoverable-charges", JSON.stringify(merged));
  } catch { /* ignore */ }
  await pushKeysToCloud(["kw-recoverable-charges", RECOVERABLE_CHARGES_DELETED_IDS_KEY], [merged, mergedDeleted]);
}

export async function pushOperationalNotesToCloud(
  notes: unknown[],
  deletedIds: string[] = getDeletedOperationalNoteIds(),
  readState: unknown[] = [],
  auditLog: unknown[] = [],
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  let cloudNotes: unknown[] = [];
  let cloudReadState: unknown[] = [];
  let cloudAudit: unknown[] = [];
  try {
    const fetched = await fetchKeysFromCloud([
      OPERATIONAL_NOTES_KEY,
      OPERATIONAL_NOTES_DELETED_IDS_KEY,
      OPERATIONAL_NOTES_READ_STATE_KEY,
      OPERATIONAL_NOTES_AUDIT_LOG_KEY,
    ]);
    cloudNotes = normalizeOperationalNotes(fetched[0]);
    cloudDeleted = normalizeDeletedOperationalNoteIds(fetched[1]);
    cloudReadState = normalizeOperationalNotesReadState(fetched[2]);
    cloudAudit = normalizeOperationalNotesAuditLog(fetched[3]);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedOperationalNoteIds(deletedIds, cloudDeleted);
  saveDeletedOperationalNoteIds(mergedDeleted);
  const mergedNotes = mergeOperationalNotes(notes, cloudNotes, mergedDeleted);
  const mergedReadState = mergeOperationalNotesReadState(readState, cloudReadState);
  const mergedAudit = mergeOperationalNotesAuditLog(auditLog, cloudAudit);
  try {
    localStorage.setItem(OPERATIONAL_NOTES_KEY, JSON.stringify(mergedNotes));
    localStorage.setItem(OPERATIONAL_NOTES_READ_STATE_KEY, JSON.stringify(mergedReadState));
    localStorage.setItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY, JSON.stringify(mergedAudit));
  } catch { /* ignore */ }
  await pushKeysToCloud(
    [
      OPERATIONAL_NOTES_KEY,
      OPERATIONAL_NOTES_DELETED_IDS_KEY,
      OPERATIONAL_NOTES_READ_STATE_KEY,
      OPERATIONAL_NOTES_AUDIT_LOG_KEY,
    ],
    [mergedNotes, mergedDeleted, mergedReadState, mergedAudit],
  );
}

function readOperationalNotesAuxFromLocalStorage(): {
  readState: ReturnType<typeof normalizeOperationalNotesReadState>;
  auditLog: ReturnType<typeof normalizeOperationalNotesAuditLog>;
  deletedIds: string[];
} {
  try {
    const rawRead = localStorage.getItem(OPERATIONAL_NOTES_READ_STATE_KEY);
    const rawAudit = localStorage.getItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY);
    return {
      readState: normalizeOperationalNotesReadState(rawRead ? JSON.parse(rawRead) : []),
      auditLog: normalizeOperationalNotesAuditLog(rawAudit ? JSON.parse(rawAudit) : []),
      deletedIds: getDeletedOperationalNoteIds(),
    };
  } catch {
    return { readState: [], auditLog: [], deletedIds: getDeletedOperationalNoteIds() };
  }
}

export async function pullOperationalNotesAuxFromCloud(): Promise<{
  readState: ReturnType<typeof normalizeOperationalNotesReadState>;
  auditLog: ReturnType<typeof normalizeOperationalNotesAuditLog>;
  deletedIds: string[];
}> {
  if (!isSupabaseConfigured() || !API_BASE) {
    return readOperationalNotesAuxFromLocalStorage();
  }
  try {
    const localAux = readOperationalNotesAuxFromLocalStorage();
    const localRead = localAux.readState;
    const localAudit = localAux.auditLog;
    const fetched = await fetchKeysFromCloud([
      OPERATIONAL_NOTES_DELETED_IDS_KEY,
      OPERATIONAL_NOTES_READ_STATE_KEY,
      OPERATIONAL_NOTES_AUDIT_LOG_KEY,
    ]);
    const mergedDeleted = mergeDeletedOperationalNoteIds(getDeletedOperationalNoteIds(), normalizeDeletedOperationalNoteIds(fetched[0]));
    saveDeletedOperationalNoteIds(mergedDeleted);
    const readState = mergeOperationalNotesReadState(localRead, fetched[1]);
    const auditLog = mergeOperationalNotesAuditLog(localAudit, fetched[2]);
    localStorage.setItem(OPERATIONAL_NOTES_READ_STATE_KEY, JSON.stringify(readState));
    localStorage.setItem(OPERATIONAL_NOTES_AUDIT_LOG_KEY, JSON.stringify(auditLog));
    return { readState, auditLog, deletedIds: mergedDeleted };
  } catch {
    return readOperationalNotesAuxFromLocalStorage();
  }
}

export async function pullSecurityAuditLogFromCloud(): Promise<
  ReturnType<typeof normalizeSecurityAuditLog>
> {
  if (!isSupabaseConfigured() || !API_BASE) {
    try {
      const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
      return normalizeSecurityAuditLog(raw ? JSON.parse(raw) : []);
    } catch {
      return [];
    }
  }
  try {
    const localRaw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
    const local = normalizeSecurityAuditLog(localRaw ? JSON.parse(localRaw) : []);
    const [cloud] = await fetchKeysFromCloud([SECURITY_AUDIT_LOG_KEY]);
    const merged = mergeSecurityAuditLog(local, cloud);
    localStorage.setItem(SECURITY_AUDIT_LOG_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    try {
      const raw = localStorage.getItem(SECURITY_AUDIT_LOG_KEY);
      return normalizeSecurityAuditLog(raw ? JSON.parse(raw) : []);
    } catch {
      return [];
    }
  }
}

export async function pullWmDrukAuditLogFromCloud(): Promise<
  ReturnType<typeof normalizeWmDrukAuditLog>
> {
  if (!isSupabaseConfigured() || !API_BASE) {
    try {
      const raw = localStorage.getItem(WM_DRUK_AUDIT_LOG_KEY);
      return normalizeWmDrukAuditLog(raw ? JSON.parse(raw) : []);
    } catch {
      return [];
    }
  }
  try {
    const localRaw = localStorage.getItem(WM_DRUK_AUDIT_LOG_KEY);
    const local = normalizeWmDrukAuditLog(localRaw ? JSON.parse(localRaw) : []);
    const [cloud] = await fetchKeysFromCloud([WM_DRUK_AUDIT_LOG_KEY]);
    const merged = mergeWmDrukAuditLog(local, cloud);
    localStorage.setItem(WM_DRUK_AUDIT_LOG_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    try {
      const raw = localStorage.getItem(WM_DRUK_AUDIT_LOG_KEY);
      return normalizeWmDrukAuditLog(raw ? JSON.parse(raw) : []);
    } catch {
      return [];
    }
  }
}

export async function computeMergedDataBundle(
  values: unknown[],
): Promise<{ merged: unknown[]; cloudReachable: boolean }> {
  const mergeTraceId = payrollTraceCreateMergeTraceId();
  const t0 = Date.now();
  payrollTraceEmit("sync.merge.bundle.start", "MERGE", "info", { mergeTraceId });
  const keys = [...DATA_KEYS];
  const valuesForMerge = prepareDataBundleForCloudPush(values);

  let cloudValues: unknown[] = keys.map(() => null);
  let cloudDeleted: string[] = [];
  let cloudDirDeleted: string[] = [];
  let cloudContactsDeleted: string[] = [];
  let cloudArchiveDeleted: string[] = [];
  let cloudLeavesDeleted: string[] = [];
  let cloudChargesDeleted: string[] = [];
  let cloudOpNotesDeleted: string[] = [];
  let cloudWmTplDeleted: string[] = [];
  let cloudWmDocDeleted: string[] = [];
  let cloudEmDeleted: string[] = [];
  let cloudWeekEmpDeleted: string[] = []; // PR-PAY-S7-5-1
  let cloudReachable = false;
  try {
    const fetched = await fetchKeysFromCloud([
      ...keys,
      JOBS_DELETED_IDS_KEY,
      DIRECTORY_DELETED_IDS_KEY,
      CONTACTS_DELETED_IDS_KEY,
      ARCHIVE_DELETED_IDS_KEY,
      EMPLOYEE_LEAVES_DELETED_IDS_KEY,
      RECOVERABLE_CHARGES_DELETED_IDS_KEY,
      OPERATIONAL_NOTES_DELETED_IDS_KEY,
      WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
      WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
      ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY,
      WEEK_EMPLOYEES_DELETED_KEYS_KEY,
    ], { trigger: "run_cloud_sync" });
    cloudValues = fetched.slice(0, keys.length);
    cloudDeleted = normalizeDeletedJobIds(fetched[keys.length]);
    cloudDirDeleted = normalizeDeletedDirectoryIds(fetched[keys.length + 1]);
    cloudContactsDeleted = normalizeDeletedJobIds(fetched[keys.length + 2]);
    cloudArchiveDeleted = normalizeDeletedJobIds(fetched[keys.length + 3]);
    cloudLeavesDeleted = normalizeDeletedEmployeeLeaveIds(fetched[keys.length + 4]);
    cloudChargesDeleted = normalizeDeletedRecoverableChargeIds(fetched[keys.length + 5]);
    cloudOpNotesDeleted = normalizeDeletedOperationalNoteIds(fetched[keys.length + 6]);
    cloudWmTplDeleted = mergeDeletedWmPrintTemplateIds([], fetched[keys.length + 7]);
    cloudWmDocDeleted = mergeDeletedWmPrintJobDocIds([], fetched[keys.length + 8]);
    cloudEmDeleted = mergeDeletedElectricalMeasurementIds([], fetched[keys.length + 9]);
    cloudWeekEmpDeleted = normalizeDeletedWeekEmployeeKeys(fetched[keys.length + 10]); // PR-PAY-S7-5-1
    cloudReachable = true;
  } catch {
    /* offline — scal tylko lokalne źródła */
  }
  const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
  saveDeletedJobIds(mergedDeleted);
  const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
  saveDeletedDirectoryIds(mergedDirDeleted);
  const mergedContactsDeleted = mergeDeletedContactsIds(getDeletedContactsIds(), cloudContactsDeleted);
  saveDeletedContactsIds(mergedContactsDeleted);
  const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
  saveDeletedArchiveIds(mergedArchiveDeleted);
  const mergedLeavesDeleted = mergeDeletedEmployeeLeaveIds(getDeletedEmployeeLeaveIds(), cloudLeavesDeleted);
  saveDeletedEmployeeLeaveIds(mergedLeavesDeleted);
  const mergedChargesDeleted = mergeDeletedRecoverableChargeIds(getDeletedRecoverableChargeIds(), cloudChargesDeleted);
  saveDeletedRecoverableChargeIds(mergedChargesDeleted);
  const mergedOpNotesDeleted = mergeDeletedOperationalNoteIds(getDeletedOperationalNoteIds(), cloudOpNotesDeleted);
  saveDeletedOperationalNoteIds(mergedOpNotesDeleted);
  const mergedWmTplDeleted = mergeDeletedWmPrintTemplateIds(getDeletedWmPrintTemplateIds(), cloudWmTplDeleted);
  saveDeletedWmPrintTemplateIds(mergedWmTplDeleted);
  const mergedWmDocDeleted = mergeDeletedWmPrintJobDocIds(getDeletedWmPrintJobDocIds(), cloudWmDocDeleted);
  saveDeletedWmPrintJobDocIds(mergedWmDocDeleted);
  const mergedEmDeleted = mergeDeletedElectricalMeasurementIds(getDeletedElectricalMeasurementIds(), cloudEmDeleted);
  saveDeletedElectricalMeasurementIds(mergedEmDeleted);
  // PR-PAY-S7-5-1 — współdziel tombstony week-employees między urządzeniami i zapisz
  // PRZED finalizePayrollBundleMerge, aby cross-device usunięcia zadziałały w tym cyklu merge.
  let mergedWeekEmpDeleted = mergeDeletedWeekEmployeeKeys(getDeletedWeekEmployeeKeys(), cloudWeekEmpDeleted);
  const empCloudIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  const cloudRosterForI1 = empCloudIdx >= 0 ? normalizeArrayValue(cloudValues[empCloudIdx]) : [];
  const i1WeekFrom = valuesForMerge[fromIdx] ?? cloudValues[fromIdx] ?? traceWeekRangeFromLs().weekFrom;
  const i1WeekTo = valuesForMerge[toIdx] ?? cloudValues[toIdx] ?? traceWeekRangeFromLs().weekTo;
  mergedWeekEmpDeleted = applyI1CloudRosterTombstoneRevocation(
    mergedWeekEmpDeleted,
    cloudRosterForI1,
    i1WeekFrom,
    i1WeekTo,
  );
  saveDeletedWeekEmployeeKeys(mergedWeekEmpDeleted);
  const { weekFrom: wfT, weekTo: wtT } = traceWeekRangeFromLs();
  const subjectKey = payrollTraceGetSubjectMergeKey();
  let subjectInTombstoneSet = false;
  if (subjectKey) {
    const ts = deletedWeekEmployeeMergeKeySet(mergedWeekEmpDeleted, wfT, wtT);
    subjectInTombstoneSet = ts.has(subjectKey);
  }
  payrollTraceEmit("sync.merge.tombstones.week_employees", "MERGE", "info", {
    mergedTombstoneCount: mergedWeekEmpDeleted.length,
    subjectInTombstoneSet,
  });
  let merged = mergeAllDataKeys(
    valuesForMerge,
    cloudValues,
    mergedDeleted,
    mergedDirDeleted,
    mergedContactsDeleted,
    mergedArchiveDeleted,
    mergedLeavesDeleted,
    mergedChargesDeleted,
    mergedOpNotesDeleted,
  );
  if (empCloudIdx >= 0) {
    const wf = String(merged[fromIdx] ?? wfT);
    const wt = String(merged[toIdx] ?? wtT);
    payrollTraceEmit("sync.merge.all_keys.week_employees", "MERGE", "info", {
      local: rosterTraceSnapshot(normalizeArrayValue(valuesForMerge[empCloudIdx]), wf, wt, "LOCAL", "PRESENT"),
      cloud: rosterTraceSnapshot(normalizeArrayValue(cloudValues[empCloudIdx]), wf, wt, "CLOUD", "PRESENT"),
      out: rosterTraceSnapshot(normalizeArrayValue(merged[empCloudIdx]), wf, wt, "MERGED", "MERGED"),
    });
  }
  merged = finalizePayrollBundleMerge(merged, valuesForMerge, cloudValues);
  merged = applyRuntimePayrollAntiLeak(merged, valuesForMerge, cloudValues);

  payrollTraceEmit("sync.merge.bundle.complete", "MERGE", "info", {
    mergeTraceId,
    durationMs: Date.now() - t0,
    cloudReachable,
  });

  return { merged, cloudReachable };
}

/**
 * PLATFORM-SYNC-01A — po await merge: świeży LS notatek + reconcile przed apply/push.
 * Zapobiega cofnięciu archiwizacji gdy runCloudSync zaczął ze stale snapshot.
 */
export function reconcileOperationalNotesInMergedBundle(
  merged: unknown[],
  freshLocal?: unknown | null,
): unknown[] {
  const opIdx = DATA_KEYS.indexOf(OPERATIONAL_NOTES_KEY);
  if (opIdx < 0 || opIdx >= merged.length) return merged;
  const fresh = resolveReconcileFreshForKey(OPERATIONAL_NOTES_KEY, freshLocal);
  const out = [...merged];
  out[opIdx] = mergeOperationalNotes(
    fresh,
    merged[opIdx],
    getDeletedOperationalNoteIds(),
  );
  return out;
}

/**
 * PAYROLL-RACE-01 — po await merge: świeży LS week-employees + reconcile przed apply/push.
 * Zapobiega cofnięciu edycji dni gdy runCloudSync zaczął ze stale snapshot.
 * (kw-jobs → reconcileJobsWithFreshLocal)
 */
export function reconcilePayrollKeysWithFreshLocal(
  merged: unknown[],
  fresh?: { weekEmployees?: unknown | null },
): unknown[] {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const out = [...merged];

  if (empIdx >= 0 && empIdx < out.length) {
    const freshEmps = resolveReconcileFreshForKey("kw-week-employees", fresh?.weekEmployees);
    out[empIdx] = mergeIncomingWithStored("kw-week-employees", freshEmps, merged[empIdx]);
  }

  return out;
}

/**
 * ROBOTS-INSPECTOR-01 (A) — po await merge: świeży LS kw-jobs + reconcile przed apply/push.
 * Zapobiega utracie assignedInspectorId / workEntries gdy runCloudSync zaczął ze stale snapshot.
 */
export function reconcileJobsWithFreshLocal(
  merged: unknown[],
  freshJobs?: unknown | null,
): unknown[] {
  const jobsIdx = DATA_KEYS.indexOf("kw-jobs");
  if (jobsIdx < 0 || jobsIdx >= merged.length) return merged;
  const fresh = resolveReconcileFreshForKey("kw-jobs", freshJobs);
  const out = [...merged];
  out[jobsIdx] = mergeIncomingWithStored("kw-jobs", fresh, merged[jobsIdx]);
  return out;
}

/**
 * ROBOTS-INSPECTOR-01 (D) + PAYROLL-RACE / PAYROLL-ARCHIVE — SSOT reconcile chain przed apply/push/fingerprint.
 */
export function reconcileAdminBundleWithFreshLocal(
  merged: unknown[],
  fresh?: {
    operationalNotes?: unknown | null;
    weekEmployees?: unknown | null;
    jobs?: unknown | null;
    archive?: unknown | null;
  },
): unknown[] {
  const op = reconcileOperationalNotesInMergedBundle(merged, fresh?.operationalNotes);
  const payroll = reconcilePayrollKeysWithFreshLocal(op, {
    weekEmployees: fresh?.weekEmployees,
  });
  const jobs = reconcileJobsWithFreshLocal(payroll, fresh?.jobs);
  return reconcileArchiveWithFreshLocal(jobs, fresh?.archive);
}

/**
 * PAYROLL-ARCHIVE-01 — po await pull merge: świeży LS archiwum + reconcile przed apply.
 * Zapobiega cofnięciu edycji dni w Archiwum gdy runCloudSync zaczął ze stale snapshot.
 */
export function reconcileArchiveWithFreshLocal(
  merged: unknown[],
  freshArchive?: unknown | null,
): unknown[] {
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  if (archIdx < 0 || archIdx >= merged.length) return merged;
  const fresh = resolveReconcileFreshForKey("kw-archive", freshArchive);
  const out = [...merged];
  out[archIdx] = mergeIncomingWithStored("kw-archive", fresh, merged[archIdx]);
  return out;
}

/** Pobierz chmurę i scal z lokalnym — bez zapisu (do odświeżenia UI / pull on focus). */
export async function pullAndMergeDataBundle(values: unknown[]): Promise<unknown[]> {
  payrollTraceEmit("sync.pull.bundle.start", "MERGE", "info", { trigger: "focus_pull" as const });
  const { merged } = await computeMergedDataBundle(values);
  payrollTraceEmit("sync.pull.bundle.complete", "MERGE", "info", { trigger: "focus_pull" as const });
  return merged;
}

/** SYNC-ARCH-01 S1-2 — RS push subset (S1-1 filter); SSOT dla push i fingerprint. */
function assembleRsPushKeysAndValues(merged: unknown[]): { keys: string[]; values: unknown[] } {
  const rsKeys = [
    ...DATA_KEYS,
    JOBS_DELETED_IDS_KEY,
    DIRECTORY_DELETED_IDS_KEY,
    CONTACTS_DELETED_IDS_KEY,
    ARCHIVE_DELETED_IDS_KEY,
    EMPLOYEE_LEAVES_DELETED_IDS_KEY,
    RECOVERABLE_CHARGES_DELETED_IDS_KEY,
    OPERATIONAL_NOTES_DELETED_IDS_KEY,
    ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY,
    WEEK_EMPLOYEES_DELETED_KEYS_KEY,
  ];
  const rsValues = [
    ...merged,
    getDeletedJobIds(),
    getDeletedDirectoryIds(),
    getDeletedContactsIds(),
    getDeletedArchiveIds(),
    getDeletedEmployeeLeaveIds(),
    getDeletedRecoverableChargeIds(),
    getDeletedOperationalNoteIds(),
    getDeletedElectricalMeasurementIds(),
    getDeletedWeekEmployeeKeys(), // PR-PAY-S7-5-1
  ];
  return filterRsPushKeysAndValues(rsKeys, rsValues);
}

/** SYNC-ARCH-01 S1-2 — AC4 fingerprint tylko RS subset (non-payroll; parity z push). */
export function rsBundleFingerprintFromMerged(merged: unknown[]): string {
  const { values: pushValues } = assembleRsPushKeysAndValues(merged);
  return bundleFingerprint(pushValues);
}

/** Zapis już scalonego bundle do chmury (bez ponownego merge). */
export async function pushMergedDataBundleToCloud(merged: unknown[]): Promise<void> {
  payrollTraceEmit("sync.rs.push.start", "RS", "info", {});
  const { keys: pushKeys, values: pushValues } = assembleRsPushKeysAndValues(merged);
  if (pushKeys.length === 0) {
    payrollTraceEmit("sync.rs.push.skip", "RS", "debug", { skipReason: "keys_empty" as const });
    return;
  }
  await pushKeysToCloud(pushKeys, pushValues, {
    replaceJobsKeys: ["kw-jobs"],
    replaceDirectoryKeys: ["kw-directory"],
    // SYNC-ARCH-01 S1-1: brak replaceWeekEmployeesKeys w RS — roster via domain push
  });
  payrollTraceEmit("sync.rs.push.complete", "RS", "info", { keyCount: pushKeys.length });
}

export async function pushAllDataToCloudSafe(values: unknown[]): Promise<unknown[]> {
  const { merged } = await computeMergedDataBundle(values);
  await pushMergedDataBundleToCloud(merged);
  return merged;
}

/** Zapis wielu kluczy z merge względem localStorage i chmury. */
export async function pushKeysToCloudSafe(keys: string[], values: unknown[]): Promise<void> {
  const prepared = prepareKeysForCloudPush(keys, values);
  let cloudValues: unknown[] = keys.map(() => null);
  try {
    cloudValues = await fetchKeysFromCloud(keys);
  } catch { /* ignore */ }
  const merged = keys.map((key, i) => {
    if (!isDataKey(key)) return prepared[i];
    return mergeDataKey(
      key,
      prepared[i],
      cloudValues[i],
      getDeletedJobIds(),
      getDeletedDirectoryIds(),
      getDeletedContactsIds(),
      getDeletedArchiveIds(),
      getDeletedEmployeeLeaveIds(),
      getDeletedRecoverableChargeIds(),
    );
  });
  const empIdx = keys.indexOf("kw-week-employees");
  await pushKeysToCloud(keys, merged, {
    cloudWeekEmployees: empIdx >= 0 ? cloudValues[empIdx] : undefined,
  });
}

/** Pobranie wielu kluczy z chmury. */
export async function fetchKeysFromCloud(
  keys: string[],
  traceOpts?: { trigger?: import("@/lib/payroll-runtime-trace").TraceTrigger },
): Promise<unknown[]> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_*)");
  }
  const httpRequestId = payrollTraceNextHttpRequestId();
  const httpSeq = payrollTraceNextHttpSeq();
  recordBatchGet(); // AC5 — production metrics
  const t0 = Date.now();
  const res = await fetch(`${API_BASE}/batch-get`, {
    method: "POST",
    headers: { ...API_HEADERS, "X-WGDOM-Trace-Id": httpRequestId },
    body: JSON.stringify({ keys }),
  });
  const latencyMs = Date.now() - t0;
  if (!res.ok) {
    payrollTraceEmit("sync.http.batch_get.result", "HTTP_IN", "error", {
      keys,
      httpStatus: res.status,
      ok: false,
      httpRequestId,
      httpSeq,
      latencyMs,
      trigger: traceOpts?.trigger,
    });
    throw new Error(`batch-get failed: ${res.status}`);
  }
  const { values } = await res.json();
  const empIdx = keys.indexOf("kw-week-employees");
  const { weekFrom, weekTo } = traceWeekRangeFromLs();
  const weekEmpRaw = empIdx >= 0
    ? rosterTraceSnapshot(normalizeArrayValue((values as unknown[])[empIdx]), weekFrom, weekTo, "CLOUD", "PRESENT")
    : undefined;
  payrollTraceEmit("sync.http.batch_get.result", "HTTP_IN", "info", {
    keys,
    httpStatus: res.status,
    ok: true,
    httpRequestId,
    httpSeq,
    latencyMs,
    trigger: traceOpts?.trigger,
    weekEmpRaw,
  });
  return values as unknown[];
}

export interface JobsBackupStatus {
  current: number;
  prev: number;
  prev2: number;
  today: number;
}

export async function fetchJobsBackupStatus(): Promise<JobsBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/jobs-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return { current: data.current, prev: data.prev, prev2: data.prev2, today: data.today };
}

export async function restoreCloudJobsBackup(
  source: "prev" | "prev2" | "today" = "prev",
): Promise<{ count: number }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-jobs-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore failed (${res.status})`);
  }
  return { count: data.count as number };
}

/** Przywróć listę płac / archiwum z kopii chmurowej (prev / prev2). */
export async function restoreCloudPayrollBackup(
  source: "prev" | "prev2" = "prev",
): Promise<{ employees: number; archiveWeeks: number }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-payroll-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore payroll failed (${res.status})`);
  }
  return { employees: data.employees as number, archiveWeeks: data.archiveWeeks as number };
}

export interface PayrollBackupStatus {
  employees: number;
  employeesPrev: number;
  employeesPrev2: number;
  archiveWeeks: number;
  archivePrev: number;
  archivePrev2: number;
}

export async function fetchPayrollBackupStatus(): Promise<PayrollBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/payroll-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return {
    employees: data.employees,
    employeesPrev: data.employeesPrev,
    employeesPrev2: data.employeesPrev2,
    archiveWeeks: data.archiveWeeks,
    archivePrev: data.archivePrev,
    archivePrev2: data.archivePrev2,
  };
}

export interface FullDataBackupStatus {
  ok: boolean;
  keys: Record<string, { current: number; prev: number; prev2: number; richness: number }>;
  dailyBackupDate: string | null;
}

export async function fetchFullDataBackupStatus(): Promise<FullDataBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/data-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return data as FullDataBackupStatus;
}

/** Przywróć wszystkie dane firmy z kopii chmurowej (prev / prev2 / dziś). */
export async function restoreAllCloudDataBackup(
  source: "prev" | "prev2" | "today" = "prev",
): Promise<{ restoredKeys: string[] }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-data-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore failed (${res.status})`);
  }
  return { restoredKeys: (data.restoredKeys as string[]) || [] };
}

/** Zapis jednego klucza — z merge dla kluczy danych. */
export async function pushKeyToCloud(
  key: string,
  value: unknown,
): Promise<void> {
  if (isDataKey(key)) {
    await pushKeysToCloudSafe([key], [value]);
    return;
  }
  await pushKeysToCloud([key], [value]);
}

/** Zapis do localStorage + chmura (gdy klucz jest w DATA_KEYS lub ADMIN_HASH_KEY). */
export async function persistKey(
  key: string,
  value: unknown,
  options?: { cloud?: boolean },
): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
  const shouldSync =
    options?.cloud !== false &&
    (isDataKey(key) || key === ADMIN_HASH_KEY || key === ADMIN_PASSWORDS_KEY || key === ADMIN_USERS_CONFIG_KEY || key === INSPECTOR_STATS_KEY || key === APP_SETTINGS_KEY || key === TENDERS_DELETED_IDS_KEY || key === SECURITY_AUDIT_LOG_KEY || key === WM_DRUK_AUDIT_LOG_KEY);
  if (shouldSync) {
    await pushKeyToCloud(key, value);
  }
}

/** Jednorazowy reset kodów pracownika — flaga w localStorage po udanym zapisie do chmury. */
export const WORKER_PINS_RESET_FLAG = "wg-worker-pins-reset-v2026-05-27";

export function stripWorkerPinHashesFromDirectory<T extends Record<string, unknown>>(
  directory: T[],
): { directory: T[]; cleared: number } {
  let cleared = 0;
  const next = directory.map((item) => {
    if (!item || typeof item !== "object") return item;
    if (!item.workerPinHash) return item;
    cleared += 1;
    const copy = { ...item };
    delete copy.workerPinHash;
    return copy;
  });
  return { directory: next, cleared };
}
