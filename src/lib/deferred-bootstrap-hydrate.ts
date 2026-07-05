/**
 * Bundle #6E — odczyt DEFERRED keys z LS → patch dla React (logika poza App.tsx).
 */

import type { EmailContact } from "@/lib/email-contacts";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import type { OperationalNote } from "@/lib/operational-notes";
import { normalizeOperationalNotes } from "@/lib/operational-notes";
import type { OperationalNoteAuditEntry } from "@/lib/operational-notes-audit";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import { normalizeWmPrintHistory } from "@/lib/wm-print/history";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import type { WmPrintJobDocument, WmPrintSettings, WmPrintTemplate } from "@/lib/wm-print/types";
import type { ElectricalMeasurement, ElectricalMeasurementRegistryState, ElectricalMeasurementSettings } from "@/lib/electrical-measurements/types";
import {
  ensureRegistryWithMigration,
  normalizeElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/registry";
import type { SingleLineDiagram } from "@/lib/electrical-schematics/types";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";
import {
  getDeletedEmployeeLeaveIds,
  getDeletedOperationalNoteIds,
  getDeletedRecoverableChargeIds,
  pullOperationalNotesAuxFromCloud,
  readLocalStorageDataKey,
} from "@/lib/cloud-sync";
import { refreshUserClassificationDictionaryCacheFromLocalStorage } from "@/lib/wgdom-user-classification-dictionary";

export type DeferredAdminHydrationPatch = {
  contacts?: EmailContact[];
  employeeLeaves?: EmployeeLeave[];
  recoverableCharges?: RecoverableCharge[];
  operationalNotes?: OperationalNote[];
  operationalNotesReadState?: OperationalNoteReadReceipt[];
  operationalNotesAuditLog?: OperationalNoteAuditEntry[];
  wmPrintTemplates?: WmPrintTemplate[];
  wmPrintJobDocs?: WmPrintJobDocument[];
  wmPrintSettings?: WmPrintSettings;
  wmPrintHistory?: WmPrintHistoryEntry[];
  deliveryPackagePublications?: DeliveryPackagePublication[];
  electricalMeasurements?: ElectricalMeasurement[];
  electricalMeasurementRegistry?: ElectricalMeasurementRegistryState;
  electricalMeasurementSettings?: ElectricalMeasurementSettings;
  electricalSchematics?: SingleLineDiagram[];
};

function readJsonLs(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function filterByTombstones<T extends { id: string }>(items: T[], deletedIds: string[]): T[] {
  if (deletedIds.length === 0) return items;
  const tombstones = new Set(deletedIds);
  return items.filter((item) => !tombstones.has(item.id));
}

/** Zbiera świeży stan DEFERRED admin z LS (parity z applyAdminDataBundle tombstone filter). */
export async function collectDeferredAdminHydrationPatch(): Promise<DeferredAdminHydrationPatch> {
  const patch: DeferredAdminHydrationPatch = {};

  const contactsRaw = readLocalStorageDataKey("kw-contacts");
  if (Array.isArray(contactsRaw)) {
    patch.contacts = contactsRaw as EmailContact[];
  }

  const leavesRaw = readLocalStorageDataKey("kw-employee-leaves");
  if (Array.isArray(leavesRaw)) {
    patch.employeeLeaves = filterByTombstones(
      leavesRaw as EmployeeLeave[],
      getDeletedEmployeeLeaveIds(),
    );
  }

  const chargesRaw = readLocalStorageDataKey("kw-recoverable-charges");
  if (Array.isArray(chargesRaw)) {
    patch.recoverableCharges = filterByTombstones(
      chargesRaw as RecoverableCharge[],
      getDeletedRecoverableChargeIds(),
    );
  }

  const notesRaw = readLocalStorageDataKey("kw-operational-notes");
  if (Array.isArray(notesRaw)) {
    const normalized = normalizeOperationalNotes(notesRaw);
    patch.operationalNotes = filterByTombstones(
      normalized,
      getDeletedOperationalNoteIds(),
    );
  }

  try {
    const aux = await pullOperationalNotesAuxFromCloud();
    patch.operationalNotesReadState = aux.readState;
    patch.operationalNotesAuditLog = aux.auditLog;
  } catch {
    /* offline — aux pozostaje w LS */
  }

  const wmTemplatesRaw = readLocalStorageDataKey("kw-wm-print-templates");
  if (Array.isArray(wmTemplatesRaw)) {
    patch.wmPrintTemplates = wmTemplatesRaw as WmPrintTemplate[];
  }

  const wmDocsRaw = readLocalStorageDataKey("kw-wm-print-job-docs");
  if (Array.isArray(wmDocsRaw)) {
    patch.wmPrintJobDocs = normalizeWmPrintJobDocuments(wmDocsRaw);
  }

  const wmSettingsRaw = readJsonLs("kw-wm-print-settings");
  if (wmSettingsRaw && typeof wmSettingsRaw === "object") {
    patch.wmPrintSettings = normalizeWmPrintSettings(wmSettingsRaw as WmPrintSettings);
  }

  const wmHistoryRaw = readLocalStorageDataKey("kw-wm-print-history");
  if (Array.isArray(wmHistoryRaw)) {
    patch.wmPrintHistory = normalizeWmPrintHistory(wmHistoryRaw);
  }

  const deliveryRaw = readLocalStorageDataKey("kw-delivery-package-publications");
  if (Array.isArray(deliveryRaw)) {
    patch.deliveryPackagePublications = deliveryRaw as DeliveryPackagePublication[];
  }

  const measurementsRaw = readLocalStorageDataKey("kw-electrical-measurements");
  const measurements = Array.isArray(measurementsRaw)
    ? (measurementsRaw as ElectricalMeasurement[])
    : [];
  if (measurements.length > 0) {
    patch.electricalMeasurements = measurements;
  }

  const registryRaw = readLocalStorageDataKey("kw-electrical-measurement-registry");
  if (registryRaw != null) {
    patch.electricalMeasurementRegistry = ensureRegistryWithMigration(
      normalizeElectricalMeasurementRegistryState(registryRaw),
      measurements,
    );
  }

  const emSettingsRaw = readJsonLs("kw-electrical-measurement-settings");
  if (emSettingsRaw && typeof emSettingsRaw === "object") {
    patch.electricalMeasurementSettings = emSettingsRaw as ElectricalMeasurementSettings;
  }

  const schematicsRaw = readLocalStorageDataKey("kw-electrical-schematics");
  if (Array.isArray(schematicsRaw)) {
    patch.electricalSchematics = schematicsRaw as SingleLineDiagram[];
  }

  refreshUserClassificationDictionaryCacheFromLocalStorage();

  return patch;
}
