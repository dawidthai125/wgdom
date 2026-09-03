/**
 * IK-OCR-PHASE-01 MVP-B1 — local PDF → page images (browser canvas only).
 * OD-OCR-3: rasterization stays in WGDOM client; no upload.
 * B1: full-document OCR (all pages). Mixed page-selective = B2 DEFERRED.
 */

import type { IkOcrPageImage } from "./ocr-types";

const OCR_RASTER_SCALE = 2;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Render PDF pages to canvas elements for local OCR.
 * Node / no-DOM → empty list (caller fail-soft unavailable).
 */
export async function rasterizePdfPagesForOcr(bytes: Uint8Array): Promise<{
  pageImages: IkOcrPageImage[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  if (!isBrowser()) {
    return {
      pageImages: [],
      warnings: ["OCR raster: brak DOM (Node) — browser/local OCR niedostępne w tym runtime."],
    };
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    // Reuse worker pattern from tenders-bzp-doc-parse (dynamic import of worker URL).
    const pdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

    const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    const pageImages: IkOcrPageImage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_RASTER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        warnings.push(`OCR raster: brak canvas 2d (strona ${pageNumber - 1}).`);
        continue;
      }
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      pageImages.push({ pageIndex: pageNumber - 1, image: canvas });
    }

    if (!pageImages.length) {
      warnings.push("OCR raster: nie udało się zrasteryzować żadnej strony.");
    }
    return { pageImages, warnings };
  } catch (e) {
    return {
      pageImages: [],
      warnings: [`OCR raster: ${e instanceof Error ? e.message : "błąd pdf.js"}`],
    };
  }
}
