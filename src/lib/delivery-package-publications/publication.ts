import type { Job } from "@/app/app-domain";
import { REQUIRED_DOCS } from "@/lib/job-documents";
import type { ElectricalMeasurement, ElectricalMeasurementRegistryState } from "@/lib/electrical-measurements/types";
import { getProductionMeasurementForJob } from "@/lib/electrical-measurements/measurement-catalog";
import { getWmPrintJobDocumentsForJob } from "@/lib/wm-print/job-documents";
import { getEnabledWmPrintTemplates, getWmPrintTemplateFiles } from "@/lib/wm-print/templates";
import type {
  WmPrintGenerateOptions,
  WmPrintJobDocument,
  WmPrintSettings,
  WmPrintTemplate,
} from "@/lib/wm-print/types";
import { buildWmPrintVariableMap } from "@/lib/wm-print/variables";
import { wmPrintZipBaseName } from "@/lib/wm-print/address-vars";
import { mergeDeliveryPackagePublications } from "@/lib/delivery-package-publications/merge";
import { normalizeDeliveryPackagePublications } from "@/lib/delivery-package-publications/normalize";
import {
  DELIVERY_PACKAGE_PUBLICATIONS_KEY,
  type DeliveryPackageGenerationFingerprint,
  type DeliveryPackageManifestEntry,
  type DeliveryPackagePublication,
} from "@/lib/delivery-package-publications/types";
import { uploadDeliveryPackageZip } from "@/lib/delivery-package-publications/storage";
import { fetchKeysFromCloud, isSupabaseConfigured, pushKeysToCloud } from "@/lib/cloud-sync";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function checklistDigest(job: Job): string {
  const flags = REQUIRED_DOCS.map((d) => (job.documents?.[d] ? "1" : "0")).join("");
  return `docs:${flags}`;
}

function settingsDigest(settings: WmPrintSettings): string {
  return stableStringify({
    defaultCity: settings.defaultCity ?? "",
    zipNameSuffix: settings.zipNameSuffix ?? "",
  });
}

function jobVariableDigest(
  job: Job,
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
): string {
  const vars = buildWmPrintVariableMap(job, settings, opts);
  return stableStringify({
    address: job.address ?? "",
    flatNumber: job.flatNumber ?? "",
    DATE: vars.DATE,
    YEAR: vars.YEAR,
    JOB_ADDRESS: vars.JOB_ADDRESS,
  });
}

export async function buildDeliveryPackageGenerationFingerprint(input: {
  job: Job;
  templates: WmPrintTemplate[];
  jobDocs: WmPrintJobDocument[];
  settings: WmPrintSettings;
  opts: WmPrintGenerateOptions;
  selectedTemplateIds: string[];
  includeMeasurements: boolean;
  measurements?: ElectricalMeasurement[];
  registry?: ElectricalMeasurementRegistryState;
}): Promise<{ payload: DeliveryPackageGenerationFingerprint; hash: string }> {
  const measurement =
    input.includeMeasurements && input.measurements && input.registry
      ? getProductionMeasurementForJob(input.measurements, input.registry, input.job.id)
      : null;

  const selected = [...new Set(input.selectedTemplateIds)].sort();
  const enabled = getEnabledWmPrintTemplates(input.templates).filter((t) => selected.includes(t.id));
  const templateFileDigests: { templateId: string; fileId: string }[] = [];
  for (const t of enabled) {
    if (t.kind === "job_upload") continue;
    for (const tf of getWmPrintTemplateFiles(t)) {
      templateFileDigests.push({ templateId: t.id, fileId: tf.id });
    }
  }
  templateFileDigests.sort((a, b) =>
    `${a.templateId}:${a.fileId}`.localeCompare(`${b.templateId}:${b.fileId}`),
  );

  const wmDocs = getWmPrintJobDocumentsForJob(input.jobDocs, input.job.id)
    .map((d) => ({ id: d.id, uploadedAt: d.uploadedAt ?? "" }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const customDateIso =
    input.opts.dateMode === "custom" && input.opts.customDate
      ? input.opts.customDate.toISOString().slice(0, 10)
      : null;

  const payload: DeliveryPackageGenerationFingerprint = {
    schemaVersion: 1,
    jobId: input.job.id,
    selectedTemplateIds: selected,
    includeMeasurements: input.includeMeasurements,
    measurementId: measurement?.id ?? null,
    measurementUpdatedAt: measurement?.updatedAt ?? null,
    measurementReportNumber: measurement?.reportNumber ?? null,
    dateMode: input.opts.dateMode === "custom" ? "custom" : "today",
    customDateIso,
    jobVariableDigest: jobVariableDigest(input.job, input.settings, input.opts),
    checklistDigest: checklistDigest(input.job),
    wmJobDocDigests: wmDocs,
    templateFileDigests,
    settingsDigest: settingsDigest(input.settings),
  };

  const hash = await sha256Hex(stableStringify(payload));
  return { payload, hash };
}

export function getActiveDeliveryPackagePublication(
  publications: DeliveryPackagePublication[],
  jobId: string,
): DeliveryPackagePublication | null {
  if (!jobId) return null;
  return (
    publications.find((p) => p.jobId === jobId && p.status === "ACTIVE") ?? null
  );
}

export function getNextDeliveryPackageZipVersion(
  publications: DeliveryPackagePublication[],
  jobId: string,
): number {
  let max = 0;
  for (const p of publications) {
    if (p.jobId === jobId && p.zipVersion > max) max = p.zipVersion;
  }
  return max + 1;
}

export function countActivePublicationsPerJob(
  publications: DeliveryPackagePublication[],
  jobId: string,
): number {
  return publications.filter((p) => p.jobId === jobId && p.status === "ACTIVE").length;
}

export function buildDeliveryPackageZipFileName(job: Job, settings: WmPrintSettings): string {
  const base = wmPrintZipBaseName(job.address, job.flatNumber);
  const suffix = settings.zipNameSuffix || "ODBIOR_WM";
  return `${base}_${suffix}.zip`;
}

export function applyDeliveryPackagePublication(input: {
  publications: DeliveryPackagePublication[];
  job: Job;
  settings: WmPrintSettings;
  zipVersion: number;
  publishedByUserId: string;
  publishedByUserName: string;
  fingerprintHash: string;
  fingerprintPayload: DeliveryPackageGenerationFingerprint;
  storagePath: string;
  zipPublicUrl: string;
  fileName: string;
  fileSizeBytes: number;
  odbiorFileCount: number;
  pomiaryFileCount: number;
  includesMeasurements: boolean;
  manifest: DeliveryPackageManifestEntry[];
}): { nextPublications: DeliveryPackagePublication[]; publication: DeliveryPackagePublication } {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const fileCount = input.odbiorFileCount + input.pomiaryFileCount;

  const publication: DeliveryPackagePublication = {
    id,
    jobId: input.job.id,
    zipVersion: input.zipVersion,
    publishedAt: now,
    publishedByUserId: input.publishedByUserId,
    publishedByUserName: input.publishedByUserName,
    generationFingerprint: input.fingerprintHash,
    fingerprintPayload: input.fingerprintPayload,
    storagePath: input.storagePath,
    zipPublicUrl: input.zipPublicUrl,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    fileCount,
    odbiorFileCount: input.odbiorFileCount,
    pomiaryFileCount: input.pomiaryFileCount,
    includesMeasurements: input.includesMeasurements,
    manifest: input.manifest,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  const next = input.publications.map((p) => {
    if (p.jobId !== input.job.id || p.status !== "ACTIVE") return p;
    return {
      ...p,
      status: "SUPERSEDED" as const,
      updatedAt: now,
      supersededAt: now,
      supersededByPublicationId: id,
    };
  });
  next.unshift(publication);

  return { nextPublications: next, publication };
}

export async function publishDeliveryPackageForJob(input: {
  publications: DeliveryPackagePublication[];
  job: Job;
  settings: WmPrintSettings;
  zipBytes: Uint8Array;
  odbiorFileCount: number;
  pomiaryFileCount: number;
  includesMeasurements: boolean;
  fingerprintHash: string;
  fingerprintPayload: DeliveryPackageGenerationFingerprint;
  manifest: DeliveryPackageManifestEntry[];
  publishedByUserId: string;
  publishedByUserName: string;
}): Promise<
  | { ok: true; nextPublications: DeliveryPackagePublication[]; publication: DeliveryPackagePublication }
  | { ok: false; error: string }
> {
  const zipVersion = getNextDeliveryPackageZipVersion(input.publications, input.job.id);
  const fileName = buildDeliveryPackageZipFileName(input.job, input.settings);

  const uploaded = await uploadDeliveryPackageZip(
    input.job.id,
    zipVersion,
    fileName,
    input.zipBytes,
  );
  if ("error" in uploaded) {
    return { ok: false, error: uploaded.error };
  }

  const { nextPublications, publication } = applyDeliveryPackagePublication({
    publications: input.publications,
    job: input.job,
    settings: input.settings,
    zipVersion,
    publishedByUserId: input.publishedByUserId,
    publishedByUserName: input.publishedByUserName,
    fingerprintHash: input.fingerprintHash,
    fingerprintPayload: input.fingerprintPayload,
    manifest: input.manifest,
    storagePath: uploaded.path,
    zipPublicUrl: uploaded.publicUrl,
    fileName,
    fileSizeBytes: input.zipBytes.byteLength,
    odbiorFileCount: input.odbiorFileCount,
    pomiaryFileCount: input.pomiaryFileCount,
    includesMeasurements: input.includesMeasurements,
  });

  if (countActivePublicationsPerJob(nextPublications, input.job.id) !== 1) {
    return { ok: false, error: "Błąd spójności: więcej niż jedna aktywna publikacja" };
  }

  return { ok: true, nextPublications, publication };
}

export async function pushDeliveryPackagePublicationsToCloud(
  publications: DeliveryPackagePublication[],
): Promise<DeliveryPackagePublication[]> {
  const normalized = normalizeDeliveryPackagePublications(publications);
  try {
    localStorage.setItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }

  if (!isSupabaseConfigured()) return normalized;

  let cloud: DeliveryPackagePublication[] = [];
  try {
    const fetched = await fetchKeysFromCloud([DELIVERY_PACKAGE_PUBLICATIONS_KEY]);
    cloud = normalizeDeliveryPackagePublications(fetched[0]);
  } catch {
    /* offline */
  }

  const merged = mergeDeliveryPackagePublications(normalized, cloud);
  try {
    localStorage.setItem(DELIVERY_PACKAGE_PUBLICATIONS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  await pushKeysToCloud([DELIVERY_PACKAGE_PUBLICATIONS_KEY], [merged]);
  return merged;
}

export function deliveryPackageStatusLabel(status: DeliveryPackagePublication["status"]): string {
  if (status === "ACTIVE") return "Aktywny";
  if (status === "SUPERSEDED") return "Zastąpiony";
  return "Wycofany";
}
