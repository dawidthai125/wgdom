/**
 * EM-P2 — ZIP pojedynczy / wielokrotny dla Katalogu Pomiarów.
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Job } from "@/app/app-domain";
import {
  buildCatalogIndexTxt,
  catalogRowsWithDocuments,
  type MeasurementCatalogRow,
} from "@/lib/electrical-measurements/measurement-catalog";
import { appendMeasurementIndexFiles } from "@/lib/electrical-measurements/measurement-index-export";
import { catalogZipFolderName } from "@/lib/electrical-measurements/measurement-docx-names";
import { resolveMeasurementExportJob } from "@/lib/electrical-measurements/link-status";
import {
  EM_DOCX_DOCUMENT_KINDS,
  generateEmDocxBytes,
  loadEmDocxTemplateBytesFromFs,
  type EmDocxDocumentKind,
} from "@/lib/electrical-measurements/generate-em-docx";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";
import { localIsoDate } from "@/lib/electrical-measurements/report";

import {
  catalogSingleZipDownloadName,
  measurementDocxFileNameForMeasurement,
} from "@/lib/electrical-measurements/measurement-docx-names";

export { catalogDocxFileName, catalogSingleZipDownloadName } from "@/lib/electrical-measurements/measurement-docx-names";

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
    const fileName = measurementDocxFileNameForMeasurement(measurement, kind);
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
  appendMeasurementIndexFiles(zip, [row]);
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
  const zip = new JSZip();

  for (const row of packRows) {
    if (!row.measurement) continue;
    const job = resolveMeasurementExportJob(row.measurement, jobs);
    const folder = catalogZipFolderName(row.rapNumber, row.address);
    await appendMeasurementDocxToZip(zip, folder, row.measurement, job, templateLoader);
  }

  zip.file("INDEX.txt", buildCatalogIndexTxt(packRows));
  appendMeasurementIndexFiles(zip, packRows);
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

export function catalogMultiZipDownloadName(date = new Date()): string {
  return `Pomiary-WGDOM-${localIsoDate(date)}.zip`;
}

export async function downloadCatalogSingleZip(
  row: MeasurementCatalogRow,
  job: Pick<Job, "id" | "address" | "flatNumber">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const blob = await buildSingleRapZipBlob(row, job);
    saveAs(blob, catalogSingleZipDownloadName(row.rapNumber, row.address));
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
