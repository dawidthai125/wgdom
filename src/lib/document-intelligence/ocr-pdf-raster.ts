/**
 * IK-OCR-PHASE-01 MVP-B1 — local PDF → page images (browser canvas only).
 * OD-OCR-3: rasterization stays in WGDOM client; no upload.
 * OD-OCR-8: pdf.js wasmUrl (jbig2) required for scan-page decode.
 * B1: full-document OCR (all pages). Mixed page-selective = B2 DEFERRED.
 */

import type { IkOcrPageImage } from "./ocr-types";

const OCR_RASTER_SCALE = 2;

/**
 * pdf.js DocumentInitParameters.wasmUrl — directory with trailing slash.
 * Served same-origin from /pdfjs-wasm/ (copied from pdfjs-dist/wasm at build).
 */
export const PDFJS_OCR_WASM_URL = "/pdfjs-wasm/";

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

    const pdf = await pdfjs.getDocument({
      data: bytes.slice(),
      // OD-OCR-8 — JBig2/OpenJPEG/QCMS wasm for scan decode (pdf.js 5.x API).
      wasmUrl: PDFJS_OCR_WASM_URL,
      useWasm: true,
    }).promise;
    const pageImages: IkOcrPageImage[] = [];
    let decodeWarnings = 0;

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
      try {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        pageImages.push({ pageIndex: pageNumber - 1, image: canvas });
      } catch (e) {
        decodeWarnings += 1;
        warnings.push(
          `OCR raster strona ${pageNumber - 1}: ${e instanceof Error ? e.message : "błąd render"}`,
        );
      }
    }

    if (!pageImages.length) {
      warnings.push("OCR raster: nie udało się zrasteryzować żadnej strony.");
    } else if (decodeWarnings > 0) {
      warnings.push(`OCR raster: ${decodeWarnings} stron z błędem dekodowania (pozostałe OK).`);
    }
    return { pageImages, warnings };
  } catch (e) {
    return {
      pageImages: [],
      warnings: [`OCR raster: ${e instanceof Error ? e.message : "błąd pdf.js"}`],
    };
  }
}
