/**
 * IK-OCR-PHASE-01 MVP-B1 — OCR result contract (text evidence only).
 * HARD: OCR MUST NOT emit trusted AthPreviewRow / OfferBoq / Master BOQ / OUR RATE / Accept / Final Bid.
 * OPTIONAL FUTURE (OUT): engineId · bbox · field-level confidence · table grid.
 */

export type IkOcrPageStatus =
  | "ok"
  | "empty"
  | "error"
  | "timeout"
  | "unavailable"
  | "partial"
  | "ambiguous";

export type IkOcrTriggerReason = "no_text_layer" | "likely_scan";

/** Per-page OCR evidence. pageIndex is 0-based. */
export type IkOcrPageResult = {
  pageIndex: number;
  text: string;
  /** Provider-reported; null = NON-TRUSTED (OD-OCR-4). No invented DF numeric T_*. */
  confidence: number | null;
  status: IkOcrPageStatus;
};

export type IkOcrResult = {
  documentText: string;
  pages: IkOcrPageResult[];
  providerId: string | null;
  /** Document-level; null = NON-TRUSTED. */
  ocrConfidence: number | null;
  status: IkOcrPageStatus;
  warnings: string[];
  reason: IkOcrTriggerReason;
};

export type IkOcrPageImage = {
  pageIndex: number;
  /** Browser: canvas / ImageBitmap / Blob / data URL — opaque to callers. */
  image: unknown;
};

export type IkOcrRunInput = {
  reason: IkOcrTriggerReason;
  languageHint?: string;
  /** PDF bytes (rasterized locally) OR pre-rasterized page images. */
  pdfBytes?: Uint8Array;
  pageImages?: IkOcrPageImage[];
  /** Soft timeout ms; default applied by runner. */
  timeoutMs?: number;
};

/**
 * Browser/local OCR provider — MUST keep PDF/page images inside WGDOM client runtime.
 * External OCR APIs that upload documents are FORBIDDEN (OD-OCR-3).
 */
export type IkOcrProvider = {
  readonly providerId: string;
  /** Class: browser/local only for B1. */
  readonly providerClass: "browser_local";
  recognize(input: {
    pageImages: IkOcrPageImage[];
    languageHint: string;
    signal?: AbortSignal;
  }): Promise<IkOcrResult>;
};

/** Document extraction provenance on AthPreviewResult (B1). pageIndex in DwellingLineProvenance = B1.1 deferred. */
export type IkExtractionMethod = "pdf_text" | "ocr";
