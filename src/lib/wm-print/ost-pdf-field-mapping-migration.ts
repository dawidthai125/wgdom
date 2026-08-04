/**
 * WM-DRUK-OST-MAPPING-MIGRATION-01 — idempotent data migration for OST pdfFieldMapping.
 * Generator / generate-zip — NO TOUCH (AR / DF).
 */
import { WM_PRINT_OST_PDF_FIELD_MAPPING } from "@/lib/wm-print/default-templates";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

export function hasNonEmptyWmPrintPdfFieldMapping(
  mapping: WmPrintTemplate["pdfFieldMapping"],
): boolean {
  return (
    mapping != null &&
    typeof mapping === "object" &&
    !Array.isArray(mapping) &&
    Object.keys(mapping).length > 0
  );
}

export type OstPdfFieldMappingMigrationResult = {
  templates: WmPrintTemplate[];
  migratedCount: number;
};

/**
 * Uzupełnia `pdfFieldMapping` wyłącznie dla:
 * name.trim() === "OST" ∧ type === "pdf_form" ∧ !hasNonEmptyMapping
 * Treść = kopia `WM_PRINT_OST_PDF_FIELD_MAPPING` (SSOT).
 * Nie nadpisuje niepustych mappingów. Nie rusza files[] / id / enabled.
 */
export function migrateOstPdfFieldMapping(
  templates: WmPrintTemplate[],
): OstPdfFieldMappingMigrationResult {
  const now = new Date().toISOString();
  let migratedCount = 0;
  const next = templates.map((t) => {
    if (String(t.name ?? "").trim() !== "OST") return t;
    if (t.type !== "pdf_form") return t;
    if (hasNonEmptyWmPrintPdfFieldMapping(t.pdfFieldMapping)) return t;
    migratedCount++;
    return {
      ...t,
      pdfFieldMapping: { ...WM_PRINT_OST_PDF_FIELD_MAPPING },
      updatedAt: now,
    };
  });
  return { templates: next, migratedCount };
}
