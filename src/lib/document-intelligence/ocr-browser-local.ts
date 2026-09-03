/**
 * IK-OCR-PHASE-01 MVP-B1 — browser/local OCR adapter (tesseract.js).
 * OD-OCR-3: PDF/page images MUST NOT leave the browser / WGDOM-controlled client runtime.
 * OD-OCR-10: deterministic PSM 11 (SPARSE_TEXT) for scanned BOQ tables (Norma).
 */

import type { IkOcrPageImage, IkOcrPageResult, IkOcrProvider, IkOcrResult } from "./ocr-types";

export const BROWSER_LOCAL_OCR_PROVIDER_ID = "browser_local_tesseract_v5";

/**
 * tesseract.js PSM.SPARSE_TEXT — OD-OCR-10 (experiment E5).
 * Single deterministic value; no per-page / fallback PSM selection.
 */
export const BROWSER_LOCAL_OCR_PSM = "11";

function aggregateDocumentConfidence(pages: IkOcrPageResult[]): number | null {
  const vals: number[] = [];
  for (const p of pages) {
    if (p.confidence == null) return null;
    vals.push(p.confidence);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function aggregateStatus(pages: IkOcrPageResult[]): IkOcrResult["status"] {
  if (!pages.length) return "empty";
  if (pages.every((p) => p.status === "unavailable")) return "unavailable";
  if (pages.some((p) => p.status === "timeout")) return "timeout";
  if (pages.some((p) => p.status === "error")) return "error";
  if (pages.some((p) => p.status === "ambiguous")) return "ambiguous";
  if (pages.every((p) => p.status === "empty")) return "empty";
  if (pages.some((p) => p.status === "partial" || p.status === "empty")) return "partial";
  if (pages.every((p) => p.status === "ok")) return "ok";
  return "partial";
}

type BrowserLocalTesseractWorker = {
  setParameters: (params: { tessedit_pageseg_mode: string }) => Promise<unknown>;
  recognize: (img: unknown) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};

export function createBrowserLocalOcrProvider(): IkOcrProvider {
  return {
    providerId: BROWSER_LOCAL_OCR_PROVIDER_ID,
    providerClass: "browser_local",
    async recognize(input): Promise<IkOcrResult> {
      const warnings: string[] = [];
      const pages: IkOcrPageResult[] = [];
      const languageHint = input.languageHint || "pol";

      if (!input.pageImages.length) {
        return {
          documentText: "",
          pages: [],
          providerId: BROWSER_LOCAL_OCR_PROVIDER_ID,
          ocrConfidence: null,
          status: "empty",
          warnings: ["OCR: brak obrazów stron do rozpoznania."],
          reason: "no_text_layer",
        };
      }

      let worker: BrowserLocalTesseractWorker | null = null;

      try {
        if (input.signal?.aborted) {
          return unavailableTimeoutResult(input.pageImages, "timeout", "OCR: przerwano (timeout/abort).");
        }

        const { createWorker } = await import("tesseract.js");
        // Polish + Latin digits; stays in-browser (CDN/wasm worker under same origin policy of tesseract.js).
        worker = (await createWorker(languageHint === "pl" ? "pol" : languageHint)) as BrowserLocalTesseractWorker;
        // OD-OCR-10 — PSM 11 SPARSE_TEXT (proven on Norma STANDARD scans; deterministic).
        await worker.setParameters({ tessedit_pageseg_mode: BROWSER_LOCAL_OCR_PSM });

        for (const page of input.pageImages) {
          if (input.signal?.aborted) {
            pages.push({
              pageIndex: page.pageIndex,
              text: "",
              confidence: null,
              status: "timeout",
            });
            continue;
          }
          try {
            const { data } = await worker!.recognize(page.image);
            const text = (data.text ?? "").trim();
            const confidence =
              typeof data.confidence === "number" && Number.isFinite(data.confidence)
                ? data.confidence
                : null;
            pages.push({
              pageIndex: page.pageIndex,
              text,
              confidence,
              status: text ? "ok" : "empty",
            });
          } catch (e) {
            pages.push({
              pageIndex: page.pageIndex,
              text: "",
              confidence: null,
              status: "error",
            });
            warnings.push(
              `OCR strona ${page.pageIndex}: ${e instanceof Error ? e.message : "błąd rozpoznania"}`,
            );
          }
        }
      } catch (e) {
        warnings.push(`OCR niedostępne: ${e instanceof Error ? e.message : "błąd providera"}`);
        return {
          documentText: "",
          pages: input.pageImages.map((p) => ({
            pageIndex: p.pageIndex,
            text: "",
            confidence: null,
            status: "unavailable" as const,
          })),
          providerId: BROWSER_LOCAL_OCR_PROVIDER_ID,
          ocrConfidence: null,
          status: "unavailable",
          warnings,
          reason: "no_text_layer",
        };
      } finally {
        try {
          await worker?.terminate();
        } catch {
          /* ignore */
        }
      }

      const documentText = pages
        .map((p) => p.text)
        .filter(Boolean)
        .join("\n");
      const status = aggregateStatus(pages);
      const ocrConfidence = status === "ok" ? aggregateDocumentConfidence(pages) : null;

      if (status !== "ok") {
        warnings.push("OCR: wynik niejednoznaczny lub niepełny — wymaga weryfikacji Ownera.");
      }

      return {
        documentText,
        pages,
        providerId: BROWSER_LOCAL_OCR_PROVIDER_ID,
        ocrConfidence,
        status,
        warnings,
        reason: "no_text_layer",
      };
    },
  };
}

function unavailableTimeoutResult(
  pageImages: IkOcrPageImage[],
  status: "timeout" | "unavailable",
  warning: string,
): IkOcrResult {
  return {
    documentText: "",
    pages: pageImages.map((p) => ({
      pageIndex: p.pageIndex,
      text: "",
      confidence: null,
      status,
    })),
    providerId: BROWSER_LOCAL_OCR_PROVIDER_ID,
    ocrConfidence: null,
    status,
    warnings: [warning],
    reason: "no_text_layer",
  };
}
