/**
 * EM-P2 — ZIP pojedynczy / wielokrotny dla Katalogu Pomiarów.
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Job } from "@/app/app-domain";
import {
  buildCatalogIndexTxt,
  catalogRowsWithDocuments,
  catalogZipFolderName,
  type MeasurementCatalogRow,
} from "@/lib/electrical-measurements/measurement-catalog";
import {
  EM_DOCX_DOCUMENT_KINDS,
  generateEmDocxBytes,
  loadEmDocxTemplateBytesFromFs,
  type EmDocxDocumentKind,
} from "@/lib/electrical-measurements/generate-em-docx";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import { localIsoDate } from "@/lib/electrical-measurements/report";

const CATALOG_DOCX_SUFFIX: Record<EmDocxDocumentKind, string> = {
  protokol: "PROTOKOL",
  "dane-informacyjne": "DANE-INFORMACYJNE",
  "badanie-adsc": "ADSC",
  "badanie-rezystancji": "REZYSTANCJA",
  "parametry-rcd": "RCD",
};

export function catalogDocxFileName(rapNumber: string, kind: EmDocxDocumentKind): string {
  const rap = String(rapNumber || "RAP")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${rap}-${CATALOG_DOCX_SUFFIX[kind]}.docx`;
}

export type CatalogZipTemplateLoader = (kind: EmDocxDocumentKind) => Promise<Uint8Array>;

export async function appendMeasurementDocxToZip(
  zip: JSZip,
  zipPathPrefix: string,
  measurement: ElectricalMeasurement,
  job: Pick<Job, "id" | "address" | "flatNumber">,
  templateLoader?: CatalogZipTemplateLoader,
): Promise<void> {
  const load = templateLoader ?? undefined;
  const loader =
    load ??
    (async (kind: EmDocxDocumentKind) => {
      const { fetchEmDocxTemplateBytes } = await import("@/lib/electrical-measurements/generate-em-docx");
      return fetchEmDocxTemplateBytes(kind);
    });

  for (const kind of EM_DOCX_DOCUMENT_KINDS) {
    const bytes = await generateEmDocxBytes(kind, { measurement, job }, undefined, loader);
    const fileName = catalogDocxFileName(measurement.reportNumber, kind);
    const path = zipPathPrefix ? `${zipPathPrefix}/${fileName}` : fileName;
    zip.file(path, bytes);
  }
}

export async function buildSingleRapZipBytes(
  row: MeasurementCatalogRow,
  job: Pick<Job, "id" | "address" | "flatNumber">,
  templateLoader?: CatalogZipTemplateLoader,
): Promise<Uint8Array> {
  if (!row.measurement) {
    throw new Error("Brak raportu pomiarowego do spakowania.");
  }
  const zip = new JSZip();
  await appendMeasurementDocxToZip(zip, "", row.measurement, job, templateLoader);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function buildSingleRapZipBlob(
  row: MeasurementCatalogRow,
  job: Pick<Job, "id" | "address" | "flatNumber">,
  templateLoader?: CatalogZipTemplateLoader,
): Promise<Blob> {
  const bytes = await buildSingleRapZipBytes(row, job, templateLoader);
  return new Blob([bytes], { type: "application/zip" });
}

export async function buildMultiRapArchiveZipBytes(
  rows: MeasurementCatalogRow[],
  jobs: Pick<Job, "id" | "address" | "flatNumber">[],
  templateLoader?: CatalogZipTemplateLoader,
): Promise<Uint8Array> {
  const packRows = catalogRowsWithDocuments(rows);
  if (packRows.length === 0) {
    throw new Error("Brak aktywnych raportów do spakowania.");
  }
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const zip = new JSZip();

  for (const row of packRows) {
    const job = jobById.get(row.jobId);
    if (!job || !row.measurement) continue;
    const folder = catalogZipFolderName(row.rapNumber, row.address);
    await appendMeasurementDocxToZip(zip, folder, row.measurement, job, templateLoader);
  }

  zip.file("INDEX.txt", buildCatalogIndexTxt(packRows));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function buildMultiRapArchiveZipBlob(
  rows: MeasurementCatalogRow[],
  jobs: Pick<Job, "id" | "address" | "flatNumber">[],
  templateLoader?: CatalogZipTemplateLoader,
): Promise<Blob> {
  const bytes = await buildMultiRapArchiveZipBytes(rows, jobs, templateLoader);
  return new Blob([bytes], { type: "application/zip" });
}

export function catalogSingleZipDownloadName(rapNumber: string): string {
  const rap = String(rapNumber || "RAP")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${rap}.zip`;
}

export function catalogMultiZipDownloadName(date = new Date()): string {
  return `Pomiary-WGDOM-${localIsoDate(date)}.zip`;
}

export async function downloadCatalogSingleZip(
  row: MeasurementCatalogRow,
  job: Pick<Job, "id" | "address" | "flatNumber">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const blob = await buildSingleRapZipBlob(row, job);
    saveAs(blob, catalogSingleZipDownloadName(row.rapNumber));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd generowania ZIP" };
  }
}

export async function downloadCatalogMultiZip(
  rows: MeasurementCatalogRow[],
  jobs: Pick<Job, "id" | "address" | "flatNumber">[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const blob = await buildMultiRapArchiveZipBlob(rows, jobs);
    saveAs(blob, catalogMultiZipDownloadName());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd generowania ZIP" };
  }
}

/** Testy Node — loader szablonów z public/. */
export function createFsCatalogZipTemplateLoader(publicDir: string): CatalogZipTemplateLoader {
  return (kind) => loadEmDocxTemplateBytesFromFs(kind, publicDir);
}
