/** INSPECTOR-P1A — opublikowany pakiet odbiorowy (read-only artefakt dla inspektora). */

export const DELIVERY_PACKAGE_PUBLICATIONS_KEY = "kw-delivery-package-publications";

export const DELIVERY_PACKAGE_PUBLICATIONS_CAP = 500;

export type DeliveryPackagePublicationStatus = "ACTIVE" | "SUPERSEDED" | "REVOKED";

export type DeliveryPackageManifestFolder = "Odbiory" | "Pomiary";

/** Wpis manifestu — tylko metadane pliku w opublikowanym ZIP (bez regeneracji). */
export interface DeliveryPackageManifestEntry {
  folder: DeliveryPackageManifestFolder;
  fileName: string;
  relativePath: string;
  displayLabel: string;
  mimeType: string;
  sizeBytes?: number;
}

/** Wejścia generacji ZIP — zapisane przy publikacji (P1C: porównanie stale). */
export interface DeliveryPackageGenerationFingerprint {
  schemaVersion: 1;
  jobId: string;
  selectedTemplateIds: string[];
  includeMeasurements: boolean;
  measurementId: string | null;
  measurementUpdatedAt: string | null;
  measurementReportNumber: string | null;
  dateMode: "today" | "custom";
  customDateIso: string | null;
  /** ZI + zmienne adresu (DATE, JOB_ADDRESS, …) */
  jobVariableDigest: string;
  checklistDigest: string;
  wmJobDocDigests: { id: string; uploadedAt: string }[];
  templateFileDigests: { templateId: string; fileId: string }[];
  settingsDigest: string;
}

export interface DeliveryPackagePublication {
  id: string;
  jobId: string;
  zipVersion: number;

  publishedAt: string;
  publishedByUserId: string;
  publishedByUserName: string;

  /** SHA-256(canonicalJSON(generationFingerprint)) */
  generationFingerprint: string;
  fingerprintPayload: DeliveryPackageGenerationFingerprint;

  storagePath: string;
  zipPublicUrl: string;
  fileName: string;
  fileSizeBytes: number;
  fileCount: number;
  odbiorFileCount: number;
  pomiaryFileCount: number;
  includesMeasurements: boolean;

  /** Lista plików w opublikowanym ZIP — read-only dla inspektora (P1B). */
  manifest: DeliveryPackageManifestEntry[];

  status: DeliveryPackagePublicationStatus;

  createdAt: string;
  updatedAt: string;

  supersededAt?: string;
  supersededByPublicationId?: string;
}
