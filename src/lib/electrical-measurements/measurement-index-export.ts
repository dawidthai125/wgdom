/**
 * EM-P3.5 — INDEX-POMIARY.txt / INDEX-POMIARY.csv generowane na żywo przy eksporcie ZIP.
 */

import type JSZip from "jszip";
import {
  MEASUREMENT_CATALOG_STATUS_LABELS,
  type MeasurementCatalogRow,
} from "@/lib/electrical-measurements/measurement-catalog";

export const MEASUREMENT_INDEX_TXT_FILE = "INDEX-POMIARY.txt";
export const MEASUREMENT_INDEX_CSV_FILE = "INDEX-POMIARY.csv";

const TXT_HEADER = "WGDOM - REJESTR POMIARÓW";

export function sortRowsForMeasurementIndex(rows: MeasurementCatalogRow[]): MeasurementCatalogRow[] {
  return [...rows].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.sequence !== b.sequence) return b.sequence - a.sequence;
    return b.measurementDate.localeCompare(a.measurementDate);
  });
}

export function buildMeasurementIndexTxt(rows: MeasurementCatalogRow[]): string {
  const sorted = sortRowsForMeasurementIndex(rows);
  if (sorted.length === 0) return `${TXT_HEADER}\n\n`;

  const blocks = sorted.map((row) => {
    const status = MEASUREMENT_CATALOG_STATUS_LABELS[row.status];
    return [
      row.rapNumber,
      `Adres: ${row.address}`,
      `Data: ${row.measurementDate}`,
      `Status: ${status}`,
    ].join("\n");
  });

  return `${TXT_HEADER}\n\n${blocks.join("\n\n")}\n`;
}

function csvEscape(value: string): string {
  const v = String(value ?? "");
  if (/[;"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function buildMeasurementIndexCsv(rows: MeasurementCatalogRow[]): string {
  const sorted = sortRowsForMeasurementIndex(rows);
  const lines = ["RAP;Data;Adres;Status"];
  for (const row of sorted) {
    lines.push(
      [
        csvEscape(row.rapNumber),
        csvEscape(row.measurementDate),
        csvEscape(row.address),
        csvEscape(MEASUREMENT_CATALOG_STATUS_LABELS[row.status]),
      ].join(";"),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Dodaje INDEX-POMIARY.txt + INDEX-POMIARY.csv do ZIP (opcjonalny prefix folderu). */
export function appendMeasurementIndexFiles(
  zip: JSZip,
  rows: MeasurementCatalogRow[],
  pathPrefix = "",
): void {
  const prefix = pathPrefix ? `${pathPrefix.replace(/\/+$/, "")}/` : "";
  zip.file(`${prefix}${MEASUREMENT_INDEX_TXT_FILE}`, buildMeasurementIndexTxt(rows));
  zip.file(`${prefix}${MEASUREMENT_INDEX_CSV_FILE}`, buildMeasurementIndexCsv(rows));
}
