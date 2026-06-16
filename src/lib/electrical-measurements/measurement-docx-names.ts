/**
 * EM-P2 / P2.5 — nazwy plików DOCX/ZIP dla raportów RAP i TEST-RAP.
 */

import type { EmDocxDocumentKind } from "@/lib/electrical-measurements/generate-em-docx";
import { isTestMeasurement, isTestReportNumber } from "@/lib/electrical-measurements/test-report";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";

const PRODUCTION_DOCX_SUFFIX: Record<EmDocxDocumentKind, string> = {
  protokol: "PROTOKOL",
  "dane-informacyjne": "DANE-INFORMACYJNE",
  "badanie-adsc": "ADSC",
  "badanie-rezystancji": "REZYSTANCJA",
  "parametry-rcd": "RCD",
};

const TEST_DOCX_SUFFIX: Record<EmDocxDocumentKind, string> = {
  protokol: "PROTOKOL",
  "dane-informacyjne": "DANE",
  "badanie-adsc": "ADSC",
  "badanie-rezystancji": "REZYSTANCJA",
  "parametry-rcd": "RCD",
};

function slugReportNumber(reportNumber: string): string {
  return String(reportNumber || "RAP")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Slug adresu do nazw ZIP / folderów archiwum (EM-P3A). */
export function catalogAddressSlug(address: string): string {
  return String(address || "adres")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

/** Nazwa folderu w archiwum ZIP: RAP-45-2026_Kleczkowska_26_m3 */
export function catalogZipFolderName(rapNumber: string, address: string): string {
  const rap = slugReportNumber(rapNumber);
  const addr = catalogAddressSlug(address);
  return `${rap}_${addr || "adres"}`;
}

export function measurementDocxFileName(
  reportNumber: string,
  kind: EmDocxDocumentKind,
  options?: { test?: boolean },
): string {
  const test = options?.test ?? isTestReportNumber(reportNumber);
  const suffix = test ? TEST_DOCX_SUFFIX[kind] : PRODUCTION_DOCX_SUFFIX[kind];
  return `${slugReportNumber(reportNumber)}-${suffix}.docx`;
}

export function measurementDocxFileNameForMeasurement(
  measurement: Pick<ElectricalMeasurement, "reportNumber" | "flags">,
  kind: EmDocxDocumentKind,
): string {
  return measurementDocxFileName(measurement.reportNumber, kind, {
    test: isTestMeasurement(measurement),
  });
}

export function measurementZipDownloadName(reportNumber: string, address?: string): string {
  const rap = slugReportNumber(reportNumber);
  if (address?.trim()) {
    return `${rap}_${catalogAddressSlug(address)}.zip`;
  }
  return `${rap}.zip`;
}

export function catalogSingleZipDownloadName(reportNumber: string, address?: string): string {
  return measurementZipDownloadName(reportNumber, address);
}

export { measurementDocxFileName as catalogDocxFileName };
