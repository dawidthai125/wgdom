import type {
  DeliveryPackageGenerationFingerprint,
  DeliveryPackageManifestEntry,
  DeliveryPackagePublication,
  DeliveryPackagePublicationStatus,
} from "@/lib/delivery-package-publications/types";

const VALID_STATUS = new Set<string>(["ACTIVE", "SUPERSEDED", "REVOKED"]);

function parseDrawingDigests(
  raw: unknown,
): { id: string; updatedAt: string; status: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && typeof d === "object")
    .map((d) => ({
      id: String((d as { id: string }).id ?? ""),
      updatedAt: String((d as { updatedAt: string }).updatedAt ?? ""),
      status: String((d as { status: string }).status ?? ""),
    }))
    .filter((d) => d.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function parseFingerprint(raw: unknown): DeliveryPackageGenerationFingerprint | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DeliveryPackageGenerationFingerprint>;
  if (r.schemaVersion !== 1 || !r.jobId) return null;
  return {
    schemaVersion: 1,
    jobId: String(r.jobId),
    selectedTemplateIds: Array.isArray(r.selectedTemplateIds)
      ? r.selectedTemplateIds.map(String).filter(Boolean)
      : [],
    includeMeasurements: r.includeMeasurements === true,
    measurementId: r.measurementId ? String(r.measurementId) : null,
    measurementUpdatedAt: r.measurementUpdatedAt ? String(r.measurementUpdatedAt) : null,
    measurementReportNumber: r.measurementReportNumber ? String(r.measurementReportNumber) : null,
    includeDrawings: r.includeDrawings === true,
    drawingDigests: parseDrawingDigests(r.drawingDigests),
    dateMode: r.dateMode === "custom" ? "custom" : "today",
    customDateIso: r.customDateIso ? String(r.customDateIso) : null,
    jobVariableDigest: String(r.jobVariableDigest ?? ""),
    checklistDigest: String(r.checklistDigest ?? ""),
    wmJobDocDigests: Array.isArray(r.wmJobDocDigests)
      ? r.wmJobDocDigests
          .filter((d) => d && typeof d === "object")
          .map((d) => ({
            id: String((d as { id: string }).id),
            uploadedAt: String((d as { uploadedAt: string }).uploadedAt ?? ""),
          }))
      : [],
    templateFileDigests: Array.isArray(r.templateFileDigests)
      ? r.templateFileDigests
          .filter((d) => d && typeof d === "object")
          .map((d) => ({
            templateId: String((d as { templateId: string }).templateId),
            fileId: String((d as { fileId: string }).fileId),
          }))
      : [],
    settingsDigest: String(r.settingsDigest ?? ""),
  };
}

function parseManifestFolder(raw: unknown): DeliveryPackageManifestEntry["folder"] {
  if (raw === "Pomiary") return "Pomiary";
  if (raw === "Rysunki") return "Rysunki";
  return "Odbiory";
}

function parseManifestEntry(raw: unknown): DeliveryPackageManifestEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DeliveryPackageManifestEntry>;
  if (!r.fileName || !r.relativePath) return null;
  return {
    folder: parseManifestFolder(r.folder),
    fileName: String(r.fileName),
    relativePath: String(r.relativePath),
    displayLabel: String(r.displayLabel ?? r.fileName),
    mimeType: String(r.mimeType ?? "application/octet-stream"),
    sizeBytes: typeof r.sizeBytes === "number" ? r.sizeBytes : undefined,
  };
}

function parseManifest(raw: unknown): DeliveryPackageManifestEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DeliveryPackageManifestEntry[] = [];
  for (const item of raw) {
    const parsed = parseManifestEntry(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseStatus(raw: unknown): DeliveryPackagePublicationStatus {
  const s = String(raw ?? "ACTIVE");
  return VALID_STATUS.has(s) ? (s as DeliveryPackagePublicationStatus) : "ACTIVE";
}

export function parseDeliveryPackagePublication(raw: unknown): DeliveryPackagePublication | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DeliveryPackagePublication>;
  if (!r.id || !r.jobId) return null;
  const fp = parseFingerprint(r.fingerprintPayload);
  if (!fp || !r.generationFingerprint || !r.storagePath || !r.zipPublicUrl) return null;

  const now = new Date().toISOString();
  const odbiorFileCount = typeof r.odbiorFileCount === "number" ? r.odbiorFileCount : 0;
  const pomiaryFileCount = typeof r.pomiaryFileCount === "number" ? r.pomiaryFileCount : 0;
  const rysunkiFileCount = typeof r.rysunkiFileCount === "number" ? r.rysunkiFileCount : 0;
  const fileCount =
    typeof r.fileCount === "number" ? r.fileCount : odbiorFileCount + pomiaryFileCount + rysunkiFileCount;

  return {
    id: String(r.id),
    jobId: String(r.jobId),
    zipVersion: typeof r.zipVersion === "number" && r.zipVersion >= 1 ? r.zipVersion : 1,
    publishedAt: String(r.publishedAt ?? now),
    publishedByUserId: String(r.publishedByUserId ?? "unknown"),
    publishedByUserName: String(r.publishedByUserName ?? "Administrator"),
    generationFingerprint: String(r.generationFingerprint),
    fingerprintPayload: fp,
    storagePath: String(r.storagePath),
    zipPublicUrl: String(r.zipPublicUrl),
    fileName: String(r.fileName ?? "ODBIOR_WM.zip"),
    fileSizeBytes: typeof r.fileSizeBytes === "number" ? r.fileSizeBytes : 0,
    fileCount,
    odbiorFileCount,
    pomiaryFileCount,
    rysunkiFileCount,
    includesMeasurements: r.includesMeasurements === true,
    includesDrawings: r.includesDrawings === true,
    manifest: parseManifest(r.manifest),
    status: parseStatus(r.status),
    createdAt: String(r.createdAt ?? r.publishedAt ?? now),
    updatedAt: String(r.updatedAt ?? r.publishedAt ?? now),
    supersededAt: r.supersededAt ? String(r.supersededAt) : undefined,
    supersededByPublicationId: r.supersededByPublicationId
      ? String(r.supersededByPublicationId)
      : undefined,
  };
}

export function normalizeDeliveryPackagePublications(raw: unknown): DeliveryPackagePublication[] {
  if (!Array.isArray(raw)) return [];
  const out: DeliveryPackagePublication[] = [];
  for (const item of raw) {
    const parsed = parseDeliveryPackagePublication(item);
    if (parsed) out.push(parsed);
  }
  return out;
}
