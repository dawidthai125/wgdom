/**
 * IK-OCR-PHASE-01 MVP-B1 — provider registry + trust gate (OD-OCR-3/4).
 * Default: browser/local tesseract adapter. Tests inject via setIkOcrProviderForTests.
 */

import type { IkOcrProvider, IkOcrResult } from "./ocr-types";

let providerOverride: IkOcrProvider | null = null;
let ocrCallCountForTests = 0;

export function resetIkOcrCallCountForTests(): void {
  ocrCallCountForTests = 0;
}

export function getIkOcrCallCountForTests(): number {
  return ocrCallCountForTests;
}

/** @internal tests / runner */
export function recordIkOcrCallForTests(): void {
  ocrCallCountForTests += 1;
}

export function setIkOcrProviderForTests(provider: IkOcrProvider | null): void {
  providerOverride = provider;
}

export function getIkOcrProviderOverrideForTests(): IkOcrProvider | null {
  return providerOverride;
}

/**
 * OD-OCR-4 qualitative trust for feeding OCR text into parsePdfPrzedmiarHeuristic.
 * HARD: null confidence → NON-TRUSTED. No invented numeric T_* threshold.
 */
export function isIkOcrTrustedForHeuristic(result: IkOcrResult): boolean {
  if (result.status !== "ok") return false;
  if (!result.documentText.replace(/\s/g, "").length) return false;
  if (result.ocrConfidence == null) return false;
  return true;
}

export async function resolveIkOcrProvider(): Promise<IkOcrProvider | null> {
  if (providerOverride) return providerOverride;
  if (typeof window === "undefined") {
    // Node/vite-node: no browser canvas perimeter — fail-soft unless test injects.
    return null;
  }
  const { createBrowserLocalOcrProvider } = await import("./ocr-browser-local");
  return createBrowserLocalOcrProvider();
}
