import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Job } from "@/app/app-domain";
import { wmPrintZipBaseName } from "@/lib/wm-print/address-vars";
import { generateDocxFromTemplate, generatePdfTextFromTemplate } from "@/lib/wm-print/generate-docx";
import { generatePdfFormFromTemplate, generatePdfPlainFromTemplate } from "@/lib/wm-print/generate-pdf";
import { getWmPrintJobDocumentsForJob } from "@/lib/wm-print/job-documents";
import { getEnabledWmPrintTemplates } from "@/lib/wm-print/templates";
import { fetchWmPrintFileBytes } from "@/lib/wm-print/upload";
import type {
  WmPrintGenerateOptions,
  WmPrintGeneratedFile,
  WmPrintJobDocument,
  WmPrintSettings,
  WmPrintTemplate,
  WmPrintVariableKey,
} from "@/lib/wm-print/types";
import { buildWmPrintVariableMap } from "@/lib/wm-print/variables";

function slugFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function extForTemplate(t: WmPrintTemplate): string {
  if (t.type === "docx") return "docx";
  return "pdf";
}

function mimeForExt(ext: string): string {
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/pdf";
}

async function generateFromTemplate(
  t: WmPrintTemplate,
  vars: Record<WmPrintVariableKey, string>,
): Promise<Uint8Array | null> {
  if (!t.storageUrl) return null;
  const bytes = await fetchWmPrintFileBytes(t.storageUrl);
  if (t.type === "docx") return generateDocxFromTemplate(bytes, vars);
  if (t.type === "pdf_form") return generatePdfFormFromTemplate(bytes, vars, t.pdfFieldMapping);
  if (t.type === "pdf") {
    try {
      return await generatePdfPlainFromTemplate(bytes, vars);
    } catch {
      return generatePdfTextFromTemplate(bytes, vars);
    }
  }
  return null;
}

export async function buildWmPrintFilesForJob(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
  selectedTemplateIds?: string[],
): Promise<WmPrintGeneratedFile[]> {
  const vars = buildWmPrintVariableMap(job, settings, opts);
  const enabled = getEnabledWmPrintTemplates(templates);
  const pool = selectedTemplateIds?.length
    ? enabled.filter((t) => selectedTemplateIds.includes(t.id))
    : enabled;

  const files: WmPrintGeneratedFile[] = [];
  const jobDocList = getWmPrintJobDocumentsForJob(jobDocs, job.id);

  for (const t of pool) {
    if (t.kind === "job_upload") {
      const doc = jobDocList.find((d) => d.templateId === t.id) ?? jobDocList.find((d) => d.name === t.name);
      if (!doc) continue;
      const bytes = await fetchWmPrintFileBytes(doc.publicUrl);
      const ext = doc.originalFileName.split(".").pop()?.toLowerCase() ?? "pdf";
      files.push({
        fileName: `${String(t.sortOrder).padStart(2, "0")}-${slugFileName(t.name)}.${ext}`,
        bytes,
        mimeType: mimeForExt(ext),
        templateId: t.id,
        jobDocId: doc.id,
        sortOrder: t.sortOrder,
      });
      continue;
    }

    if (!t.storageUrl) continue;
    const bytes = await generateFromTemplate(t, vars);
    if (!bytes) continue;
    const ext = extForTemplate(t);
    files.push({
      fileName: `${String(t.sortOrder).padStart(2, "0")}-${slugFileName(t.name)}.${ext}`,
      bytes,
      mimeType: mimeForExt(ext),
      templateId: t.id,
      sortOrder: t.sortOrder,
    });
  }

  if (!selectedTemplateIds?.length) {
    for (const doc of jobDocList.filter((d) => !d.templateId)) {
      const bytes = await fetchWmPrintFileBytes(doc.publicUrl);
      const ext = doc.originalFileName.split(".").pop()?.toLowerCase() ?? "pdf";
      files.push({
        fileName: `${slugFileName(doc.name)}.${ext}`,
        bytes,
        mimeType: mimeForExt(ext),
        jobDocId: doc.id,
        sortOrder: 9000 + files.length,
      });
    }
  }

  return files.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function downloadWmPrintZip(
  job: Job,
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
  selectedTemplateIds?: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const files = await buildWmPrintFilesForJob(job, templates, jobDocs, settings, opts, selectedTemplateIds);
    if (files.length === 0) return { ok: false, error: "Brak dokumentów do wygenerowania" };

    const zip = new JSZip();
    for (const f of files) zip.file(f.fileName, f.bytes);

    const blob = await zip.generateAsync({ type: "blob" });
    const base = wmPrintZipBaseName(job.address, job.flatNumber);
    const suffix = settings.zipNameSuffix || "ODBIOR_WM";
    saveAs(blob, `${base}_${suffix}.zip`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function downloadWmPrintSingleFile(
  job: Job,
  template: WmPrintTemplate,
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  opts: WmPrintGenerateOptions,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const files = await buildWmPrintFilesForJob(job, [template], jobDocs, settings, opts, [template.id]);
    const f = files[0];
    if (!f) return { ok: false, error: "Nie udało się wygenerować dokumentu" };
    const blob = new Blob([f.bytes], { type: f.mimeType });
    saveAs(blob, f.fileName);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
