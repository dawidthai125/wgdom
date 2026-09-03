/**
 * IK-OCR-PHASE-01 MVP-B1 — TEXT-FIRST OCR runner for scan-only PDF.
 * Feeds text evidence only; parsePdfPrzedmiarHeuristic remains STRUCTURE AUTHORITY.
 * NOTE: no import from tenders-bzp-doc-parse (ARCH-001 cycle avoidance).
 */

import { rasterizePdfPagesForOcr } from "./ocr-pdf-raster";
import {
  getIkOcrProviderOverrideForTests,
  isIkOcrTrustedForHeuristic,
  recordIkOcrCallForTests,
  resolveIkOcrProvider,
} from "./ocr-provider";
import type { IkOcrResult, IkOcrTriggerReason } from "./ocr-types";

export const IK_OCR_B1_DEFAULT_TIMEOUT_MS = 180_000;

/** Subset of PdfTextExtractResult — local to avoid import cycle. */
export type IkOcrExtractFlags = {
  text: string;
  likelyScan: boolean;
  noTextLayer: boolean;
  extractError: boolean;
};

/** B1 trigger: noTextLayer / likelyScan. extractError ≠ OCR path. */
export function needsIkOcrB1(extract: IkOcrExtractFlags): boolean {
  if (extract.extractError) return false;
  if (extract.noTextLayer) return true;
  if (extract.likelyScan) return true;
  return false;
}

/** TEXT-FIRST: usable native text → OCR calls must stay 0. */
export function hasUsableNativePdfText(extract: IkOcrExtractFlags): boolean {
  if (extract.extractError) return false;
  if (extract.noTextLayer || extract.likelyScan) return false;
  return extract.text.replace(/\s/g, "").length > 0;
}

function triggerReason(extract: Pick<IkOcrExtractFlags, "noTextLayer" | "likelyScan">): IkOcrTriggerReason {
  return extract.noTextLayer ? "no_text_layer" : "likely_scan";
}

function unavailableResult(reason: IkOcrTriggerReason, warnings: string[]): IkOcrResult {
  return {
    documentText: "",
    pages: [],
    providerId: null,
    ocrConfidence: null,
    status: "unavailable",
    warnings,
    reason,
  };
}

/**
 * Run B1 OCR when needed. Always increments call counter when invoked
 * (tests assert TEXT-FIRST skips this function entirely).
 */
export async function runIkPdfScanOcrB1(
  bytes: Uint8Array,
  extract: IkOcrExtractFlags,
  opts?: { timeoutMs?: number },
): Promise<IkOcrResult> {
  recordIkOcrCallForTests();
  const reason = triggerReason(extract);
  const timeoutMs = opts?.timeoutMs ?? IK_OCR_B1_DEFAULT_TIMEOUT_MS;

  const provider = await resolveIkOcrProvider();
  if (!provider) {
    return unavailableResult(reason, [
      "OCR B1: brak browser/local providera w tym runtime — CASE HOLD (fail-soft).",
    ]);
  }

  const testOverride = getIkOcrProviderOverrideForTests();
  let pageImages: import("./ocr-types").IkOcrPageImage[] = [];

  if (testOverride) {
    // Injected provider may ignore images (fixture text). Skip DOM raster in Node.
    pageImages = [];
  } else {
    const raster = await rasterizePdfPagesForOcr(bytes);
    if (!raster.pageImages.length) {
      return unavailableResult(reason, [
        "OCR B1: nie udało się zrasteryzować stron PDF lokalnie.",
        ...raster.warnings,
      ]);
    }
    pageImages = raster.pageImages;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const recognized = await provider.recognize({
      pageImages,
      languageHint: "pol",
      signal: controller.signal,
    });
    return {
      ...recognized,
      reason,
      warnings: recognized.warnings?.length ? recognized.warnings : [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OCR error";
    const status = controller.signal.aborted ? "timeout" : "error";
    return {
      documentText: "",
      pages: [],
      providerId: provider.providerId,
      ocrConfidence: null,
      status,
      warnings: [`OCR B1: ${msg}`],
      reason,
    };
  } finally {
    clearTimeout(timer);
  }
}

export { isIkOcrTrustedForHeuristic };
