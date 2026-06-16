import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Job } from "@/app/app-domain";
import { wmPrintZipBaseName } from "@/lib/wm-print/address-vars";
import { generateDocxFromTemplate } from "@/lib/wm-print/generate-docx";
import { generatePdfFormFromTemplate } from "@/lib/wm-print/generate-pdf";
import { copyStaticPdfTemplate } from "@/lib/wm-print/wm-print-pdf-static";
import {
  detectLegacyLiveCycleZiForm,
  generatePdfZiTauron2026,
} from "@/lib/wm-print/generate-pdf-zi-tauron2026";
import { getWmPrintJobDocumentsForJob } from "@/lib/wm-print/job-documents";
import { getEnabledWmPrintTemplates, getWmPrintTemplateFiles, dedupeWmPrintTemplatesByName } from "@/lib/wm-print/templates";
import { fetchWmPrintFileBytes } from "@/lib/wm-print/upload";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/types";
import { appendMeasurementDocxToZip } from "@/lib/electrical-measurements/measurement-catalog-zip";
import { EM_DOCX_DOCUMENT_KINDS } from "@/lib/electrical-measurements/generate-em-docx";
import type { CatalogZipTemplateLoader } from "@/lib/electrical-measurements/measurement-catalog-zip";
import { getProductionMeasurementForJob } from "@/lib/electrical-measurements/measurement-catalog";
import type {
  WmPrintGenerateOptions,
  WmPrintGeneratedFile,
  WmPrintJobDocument,
  WmPrintSettings,
  WmPrintTemplate,
  WmPrintTemplateFile,
  WmPrintVariableKey,
} from "@/lib/wm-print/types";
import { buildWmPrintVariableMap } from "@/lib/wm-print/variables";

export const WM_PRINT_ZIP_FOLDER_ODBIORY = "Odbiory";
export const WM_PRINT_ZIP_FOLDER_POMIARY = "Pomiary";

export interface WmPrintDeliveryZipOptions {
  includeMeasurements: boolean;
  measurements?: ElectricalMeasurement[];
  registry?: ElectricalMeasurementRegistryState;
  /** Tylko testy Node — loader szablonów EM DOCX z public/. */
  measurementTemplateLoader?: CatalogZipTemplateLoader;
}

export function slugWmPrintFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extFromFileName(name: string, fallback: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : fallback;
}

function mimeForExt(ext: string): string {
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/pdf";
}

export async function generateFromTemplateBytes(
  t: WmPrintTemplate,
  sourceBytes: Uint8Array,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array | null> {
  const type = t.name === "ZI" ? "pdf_form" : t.type;
  if (type === "docx") return generateDocxFromTemplate(sourceBytes, vars);
  if (type === "pdf_form") {
    if (t.name === "ZI") {
      if (detectLegacyLiveCycleZiForm(sourceBytes)) {
        throw new Error(
          "Szablon ZI LiveCycle (2021) nie jest obsługiwany. Wgraj formularz Tauron ZI 2026 (zi.ashx).",
        );
      }
      return generatePdfZiTauron2026(sourceBytes, vars);
    }
    /** Martwa gałąź prod (KV: jedyny pdf_form = ZI). Zachowana dla bezpieczeństwa API. */
    return generatePdfFormFromTemplate(sourceBytes, vars, t.pdfFieldMapping);
  }
  if (type === "pdf") {
    return copyStaticPdfTemplate(sourceBytes);
  }
  return null;
}

export function buildWmPrintZipEntryName(
  groupOrder: number,
  fileIndex: number,
  originalFileName: string,
  fallbackExt: string,
): string {
  const ext = extFromFileName(originalFileName, fallbackExt);
  const slug = slugWmPrintFileName(originalFileName) || `plik-${fileIndex + 1}`;
  const prefix = String(groupOrder).padStart(2, "0");
  return `${prefix}-${slug}.${ext}`;
}

export type WmPrintBytesFetcher = (url: string) => Promise<Uint8Array>;

export async function buildWmPrintFilesForJob(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
  selectedTemplateIds?: string[],
  fetchBytes: WmPrintBytesFetcher = fetchWmPrintFileBytes,
): Promise<WmPrintGeneratedFile[]> {
  const vars = buildWmPrintVariableMap(job, settings, opts);
  const enabled = dedupeWmPrintTemplatesByName(getEnabledWmPrintTemplates(templates));
  const pool = selectedTemplateIds?.length
    ? enabled.filter((t) => selectedTemplateIds.includes(t.id))
    : enabled;

  const files: WmPrintGeneratedFile[] = [];
  const jobDocList = getWmPrintJobDocumentsForJob(jobDocs, job.id);

  for (const t of pool) {
    if (t.kind === "job_upload") {
      const docs = jobDocList.filter((d) => d.templateId === t.id);
      const fallbackDocs = docs.length > 0 ? docs : jobDocList.filter((d) => d.name === t.name);
      for (let idx = 0; idx < fallbackDocs.length; idx++) {
        const doc = fallbackDocs[idx];
        const bytes = await fetchBytes(doc.publicUrl);
        const ext = extFromFileName(doc.originalFileName, "pdf");
        files.push({
          fileName: buildWmPrintZipEntryName(t.sortOrder, idx, doc.originalFileName, ext),
          bytes,
          mimeType: mimeForExt(ext),
          templateId: t.id,
          jobDocId: doc.id,
          sortOrder: t.sortOrder + idx * 0.01,
        });
      }
      continue;
    }

    const groupFiles = getWmPrintTemplateFiles(t);
    for (let idx = 0; idx < groupFiles.length; idx++) {
      const tf = groupFiles[idx];
      const sourceBytes = await fetchBytes(tf.storageUrl);
      const generated = await generateFromTemplateBytes(t, sourceBytes, vars);
      if (!generated) continue;
      const ext = extFromFileName(tf.originalFileName, t.type === "docx" ? "docx" : "pdf");
      files.push({
        fileName: buildWmPrintZipEntryName(t.sortOrder, idx, tf.originalFileName, ext),
        bytes: generated,
        mimeType: mimeForExt(ext),
        templateId: t.id,
        templateFileId: tf.id,
        sortOrder: t.sortOrder + idx * 0.01,
      });
    }
  }

  for (const doc of jobDocList.filter((d) => !d.templateId)) {
    const bytes = await fetchBytes(doc.storageUrl);
    const ext = extFromFileName(doc.originalFileName, "pdf");
    files.push({
      fileName: `${slugWmPrintFileName(doc.name)}.${ext}`,
      bytes,
      mimeType: mimeForExt(ext),
      jobDocId: doc.id,
      sortOrder: 9000 + files.length,
    });
  }

  return files.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function buildWmPrintDeliveryZipBytes(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
  selectedTemplateIds?: string[],
  fetchBytes: WmPrintBytesFetcher = fetchWmPrintFileBytes,
  delivery?: WmPrintDeliveryZipOptions,
): Promise<{ bytes: Uint8Array; odbiorCount: number; pomiaryCount: number }> {
  const files = await buildWmPrintFilesForJob(job, templates, jobDocs, settings, opts, selectedTemplateIds, fetchBytes);
  if (files.length === 0) {
    throw new Error("Brak dokumentów do wygenerowania");
  }

  const zip = new JSZip();
  for (const f of files) {
    zip.file(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/${f.fileName}`, f.bytes);
  }

  let pomiaryCount = 0;
  const includeMeasurements = delivery?.includeMeasurements === true;
  const measurement =
    includeMeasurements && delivery?.measurements && delivery?.registry
      ? getProductionMeasurementForJob(delivery.measurements, delivery.registry, job.id)
      : null;

  if (includeMeasurements && measurement) {
    await appendMeasurementDocxToZip(
      zip,
      WM_PRINT_ZIP_FOLDER_POMIARY,
      measurement,
      job,
      delivery?.measurementTemplateLoader,
    );
    pomiaryCount = EM_DOCX_DOCUMENT_KINDS.length;
  }

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, odbiorCount: files.length, pomiaryCount };
}

export async function downloadWmPrintZip(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
  selectedTemplateIds?: string[],
  delivery?: WmPrintDeliveryZipOptions,
): Promise<{ ok: boolean; error?: string; pomiaryCount?: number }> {
  try {
    const { bytes, pomiaryCount } = await buildWmPrintDeliveryZipBytes(
      job,
      templates,
      jobDocs,
      settings,
      opts,
      selectedTemplateIds,
      fetchWmPrintFileBytes,
      delivery,
    );

    const blob = new Blob([bytes], { type: "application/zip" });
    const base = wmPrintZipBaseName(job.address, job.flatNumber);
    const suffix = settings.zipNameSuffix || "ODBIOR_WM";
    saveAs(blob, `${base}_${suffix}.zip`);
    return { ok: true, pomiaryCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function downloadWmPrintTemplateFileGenerated(
  job: Job,
  template: WmPrintTemplate,
  templateFile: WmPrintTemplateFile,
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const files = await buildWmPrintFilesForJob(job, [template], jobDocs, settings, opts, [template.id]);
    const f = files.find((x) => x.templateFileId === templateFile.id) ?? files[0];
    if (!f) return { ok: false, error: "Nie udało się wygenerować dokumentu" };
    const blob = new Blob([f.bytes], { type: f.mimeType });
    saveAs(blob, f.fileName);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
