/** Wybór i parsowanie najlepszego załącznika BZP (ATH/PDF/DOCX/XLSX/ZIP). */

import { fetchTenderDocumentBytes, base64ToBytes, type TenderBzpDocument } from "@/lib/tenders-bzp";
import {
  athPreviewToSnapshot,
  pickBestKosztorysDocument,
  type TenderKosztorysSnapshot,
} from "@/lib/tenders-bzp-brief";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { isWeakWadiumRaw, pickBetterWadiumPln } from "@/lib/tenders-bzp-swz";
import {
  isDocxFilename,
  isZipFilename,
  parsePlnFromKosztorysTotal,
  scoreTenderFilename,
} from "@/lib/tenders-bzp-filename";
import { isPdfFilename } from "@/lib/ath-parser";

type DocParseModule = typeof import("@/lib/tenders-bzp-doc-parse");

let docParsePromise: Promise<DocParseModule> | null = null;

async function loadDocParse(): Promise<DocParseModule> {
  docParsePromise ??= import("@/lib/tenders-bzp-doc-parse");
  return docParsePromise;
}

export interface TenderDocCandidate {
  documentIndex: number;
  filename: string;
  zipInnerPath?: string;
  score: number;
  downloadUrl?: string;
}

export interface TenderDocumentParseResult {
  kosztorys: TenderKosztorysSnapshot | null;
  swzFromDoc: TenderSwzAnalysis | null;
  estimatePln: number | null;
  sourceDocumentIndex?: number;
  zipInnerPath?: string;
  sourceFilename?: string;
}

async function loadDocBytes(tenderId: string, index: number, downloadUrl?: string): Promise<Uint8Array> {
  const { base64 } = await fetchTenderDocumentBytes(tenderId, index, downloadUrl);
  return base64ToBytes(base64);
}

export async function buildTenderDocCandidates(
  tenderId: string,
  docs: TenderBzpDocument[],
): Promise<TenderDocCandidate[]> {
  const candidates: TenderDocCandidate[] = [];
  for (const doc of docs) {
    let score = scoreTenderFilename(doc.filename);
    if (doc.isSwzHint) score += 18;
    candidates.push({
      documentIndex: doc.index,
      filename: doc.filename,
      score,
      downloadUrl: doc.platform ? doc.downloadUrl : undefined,
    });
    if (isZipFilename(doc.filename)) {
      try {
        const { listZipFiles } = await loadDocParse();
        const zipBytes = await loadDocBytes(tenderId, doc.index, doc.platform ? doc.downloadUrl : undefined);
        const inner = await listZipFiles(zipBytes);
        for (const entry of inner.slice(0, 12)) {
          candidates.push({
            documentIndex: doc.index,
            filename: `${doc.filename} → ${entry.filename}`,
            zipInnerPath: entry.path,
            score: entry.score + (doc.isSwzHint ? 10 : 0),
          });
        }
      } catch { /* zip unreadable */ }
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

export async function parseTenderDocumentCandidate(
  tenderId: string,
  candidate: TenderDocCandidate,
  opts?: { ourEstimatePln?: number | null; mergeSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const {
    analyzeSwzFromDocumentText,
    parseDocumentToKosztorys,
    parseDocumentToSwzText,
    pickBestFromZipBytes,
    resolveDocumentBytes,
  } = await loadDocParse();

  const loadBytes = (idx: number) => loadDocBytes(tenderId, idx, candidate.downloadUrl);
  let bytes = await resolveDocumentBytes(
    loadBytes,
    candidate.documentIndex,
    candidate.filename,
    candidate.zipInnerPath,
  );

  let effectiveName = candidate.filename;
  if (isZipFilename(candidate.filename.split(" → ")[0] ?? candidate.filename) && !candidate.zipInnerPath) {
    const outerName = candidate.filename;
    const picked = await pickBestFromZipBytes(bytes, outerName);
    if (picked) {
      bytes = picked.bytes;
      effectiveName = picked.filename;
    }
  } else if (candidate.zipInnerPath) {
    effectiveName = candidate.filename.split(" → ").pop() ?? candidate.filename;
  }

  let kosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;

  const kosztorysPreview = await parseDocumentToKosztorys(bytes, effectiveName);
  if (kosztorysPreview?.ok && (kosztorysPreview.rows.length > 0 || kosztorysPreview.totalValue)) {
    kosztorys = {
      ...athPreviewToSnapshot(kosztorysPreview, effectiveName),
      sourceDocumentIndex: candidate.documentIndex,
      zipInnerPath: candidate.zipInnerPath,
    };
    if (estimatePln == null) {
      estimatePln = parsePlnFromKosztorysTotal(kosztorys.totalValue, kosztorys.currency);
    }
  }

  let swzFromDoc: TenderSwzAnalysis | null = null;
  const canSwzText = isPdfFilename(effectiveName) || isDocxFilename(effectiveName);
  if (canSwzText) {
    const { text, source, warnings } = await parseDocumentToSwzText(bytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...swzFromDoc.qualificationHints, ...warnings].slice(0, 6),
      };
    }
    if (swzFromDoc && estimatePln == null && swzFromDoc.estimatedValuePln != null) {
      estimatePln = swzFromDoc.estimatedValuePln;
    }
  }

  if (!kosztorys && isPdfFilename(effectiveName) && !canSwzText) {
    /* noop */
  }

  if (!kosztorys && isPdfFilename(effectiveName) && !swzFromDoc) {
    const { text, source, warnings } = await parseDocumentToSwzText(bytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...(swzFromDoc.qualificationHints ?? []), ...warnings].slice(0, 6),
      };
    }
  }

  return {
    kosztorys,
    swzFromDoc,
    estimatePln,
    sourceDocumentIndex: candidate.documentIndex,
    zipInnerPath: candidate.zipInnerPath,
    sourceFilename: effectiveName,
  };
}

/** Parsowanie pliku z zewnętrznego źródła (BIP / link z ogłoszenia) — bez e-Zamówień. */
export async function parseExternalTenderFile(
  bytes: Uint8Array,
  filename: string,
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const {
    analyzeSwzFromDocumentText,
    parseDocumentToKosztorys,
    parseDocumentToSwzText,
    pickBestFromZipBytes,
  } = await loadDocParse();

  let effectiveBytes = bytes;
  let effectiveName = filename;

  if (isZipFilename(filename)) {
    const picked = await pickBestFromZipBytes(bytes, filename);
    if (picked) {
      effectiveBytes = picked.bytes;
      effectiveName = picked.filename;
    }
  }

  let kosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;

  const kosztorysPreview = await parseDocumentToKosztorys(effectiveBytes, effectiveName);
  if (kosztorysPreview?.ok && (kosztorysPreview.rows.length > 0 || kosztorysPreview.totalValue)) {
    kosztorys = {
      ...athPreviewToSnapshot(kosztorysPreview, effectiveName),
      sourceDocumentIndex: undefined,
    };
    if (estimatePln == null) {
      estimatePln = parsePlnFromKosztorysTotal(kosztorys.totalValue, kosztorys.currency);
    }
  }

  let swzFromDoc: TenderSwzAnalysis | null = null;
  const canSwzText = isPdfFilename(effectiveName) || isDocxFilename(effectiveName);
  if (canSwzText) {
    const { text, source, warnings } = await parseDocumentToSwzText(effectiveBytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...swzFromDoc.qualificationHints, ...warnings].slice(0, 6),
      };
    }
    if (swzFromDoc && estimatePln == null && swzFromDoc.estimatedValuePln != null) {
      estimatePln = swzFromDoc.estimatedValuePln;
    }
  }

  if (!kosztorys && !swzFromDoc && isPdfFilename(effectiveName)) {
    const { text, source, warnings } = await parseDocumentToSwzText(effectiveBytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...(swzFromDoc.qualificationHints ?? []), ...warnings].slice(0, 6),
      };
    }
  }

  return {
    kosztorys,
    swzFromDoc,
    estimatePln,
    sourceFilename: effectiveName,
  };
}

export async function parseExternalTenderDocuments(
  files: { filename: string; score: number; publicUrl: string }[],
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const sorted = [...files].sort((a, b) => b.score - a.score).slice(0, 6);
  let bestKosztorys: TenderKosztorysSnapshot | null = null;
  let bestSwz: TenderSwzAnalysis | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;
  let sourceFilename: string | undefined;

  for (const file of sorted) {
    try {
      const res = await fetch(file.publicUrl);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024 || bytes.byteLength < 80) continue;
      const parsed = await parseExternalTenderFile(bytes, file.filename, {
        ourEstimatePln: estimatePln,
        existingSwz: opts?.existingSwz,
      });
      if (parsed.kosztorys?.ok && !bestKosztorys) {
        bestKosztorys = parsed.kosztorys;
        sourceFilename = parsed.sourceFilename;
        if (parsed.estimatePln != null) estimatePln = parsed.estimatePln;
      }
      if (parsed.swzFromDoc && !bestSwz) {
        bestSwz = parsed.swzFromDoc;
        if (!sourceFilename) sourceFilename = parsed.sourceFilename;
      }
      if (bestKosztorys?.ok && bestSwz) break;
    } catch {
      /* kolejny plik */
    }
  }

  return {
    kosztorys: bestKosztorys,
    swzFromDoc: bestSwz,
    estimatePln,
    sourceFilename,
  };
}

export async function parseBestTenderDocuments(
  tenderId: string,
  docs: TenderBzpDocument[],
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  if (!docs.length) {
    return { kosztorys: null, swzFromDoc: null, estimatePln: opts?.ourEstimatePln ?? null };
  }

  const candidates = await buildTenderDocCandidates(tenderId, docs);
  const top = candidates.filter((c) => c.score >= 8).slice(0, 6);
  const toTry = top.length > 0 ? top : candidates.slice(0, 3);

  let bestKosztorys: TenderKosztorysSnapshot | null = null;
  let bestSwz: TenderSwzAnalysis | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;
  let sourceDocumentIndex: number | undefined;
  let zipInnerPath: string | undefined;
  let sourceFilename: string | undefined;

  for (const cand of toTry) {
    const parsed = await parseTenderDocumentCandidate(tenderId, cand, {
      ourEstimatePln: estimatePln,
      mergeSwz: opts?.existingSwz,
    });
    if (parsed.kosztorys?.ok && !bestKosztorys) {
      bestKosztorys = parsed.kosztorys;
      sourceDocumentIndex = parsed.sourceDocumentIndex;
      zipInnerPath = parsed.zipInnerPath;
      sourceFilename = parsed.sourceFilename;
      if (parsed.estimatePln != null) estimatePln = parsed.estimatePln;
    }
    if (parsed.swzFromDoc && !bestSwz) {
      bestSwz = parsed.swzFromDoc;
      if (!sourceDocumentIndex) {
        sourceDocumentIndex = parsed.sourceDocumentIndex;
        zipInnerPath = parsed.zipInnerPath;
        sourceFilename = parsed.sourceFilename;
      }
    }
    if (bestKosztorys?.ok && bestSwz) break;
  }

  if (!bestKosztorys && !bestSwz) {
    const legacy = pickBestKosztorysDocument(docs);
    if (legacy) {
      const cand: TenderDocCandidate = {
        documentIndex: legacy.index,
        filename: legacy.filename,
        score: scoreTenderFilename(legacy.filename),
      };
      const parsed = await parseTenderDocumentCandidate(tenderId, cand, { ourEstimatePln: estimatePln });
      bestKosztorys = parsed.kosztorys;
      bestSwz = parsed.swzFromDoc;
      estimatePln = parsed.estimatePln ?? estimatePln;
      sourceDocumentIndex = parsed.sourceDocumentIndex;
      zipInnerPath = parsed.zipInnerPath;
      sourceFilename = parsed.sourceFilename;
    }
  }

  return {
    kosztorys: bestKosztorys,
    swzFromDoc: bestSwz,
    estimatePln,
    sourceDocumentIndex,
    zipInnerPath,
    sourceFilename,
  };
}

export function mergeSwzAnalysis(
  primary: TenderSwzAnalysis | null | undefined,
  fromDoc: TenderSwzAnalysis | null | undefined,
): TenderSwzAnalysis | null {
  if (!primary && !fromDoc) return null;
  if (!primary) return fromDoc ?? null;
  if (!fromDoc) return primary;
  return {
    ...primary,
    estimatedValuePln: primary.estimatedValuePln ?? fromDoc.estimatedValuePln,
    estimatedValueRaw: primary.estimatedValueRaw ?? fromDoc.estimatedValueRaw,
    wadiumPln: pickBetterWadiumPln(primary.wadiumPln, fromDoc.wadiumPln),
    wadiumRaw: isWeakWadiumRaw(primary.wadiumRaw)
      ? (fromDoc.wadiumRaw ?? primary.wadiumRaw)
      : (primary.wadiumRaw ?? fromDoc.wadiumRaw),
    wadiumPercent: primary.wadiumPercent ?? fromDoc.wadiumPercent,
    referenceRequirement: primary.referenceRequirement ?? fromDoc.referenceRequirement,
    qualificationHints: [...new Set([...primary.qualificationHints, ...fromDoc.qualificationHints])].slice(0, 8),
    implementationDeadlineRaw: primary.implementationDeadlineRaw ?? fromDoc.implementationDeadlineRaw,
    implementationDays: primary.implementationDays ?? fromDoc.implementationDays,
    technicalRequirements: primary.technicalRequirements.length >= fromDoc.technicalRequirements.length
      ? primary.technicalRequirements
      : fromDoc.technicalRequirements,
    costLines: primary.costLines.length >= fromDoc.costLines.length ? primary.costLines : fromDoc.costLines,
    tableExtracts: [...new Set([...primary.tableExtracts, ...fromDoc.tableExtracts])].slice(0, 12),
    source: primary.source === "html" && fromDoc.source !== "html" ? fromDoc.source : primary.source,
    sourceFilename: fromDoc.sourceFilename ?? primary.sourceFilename,
    parsedAt: new Date().toISOString(),
    profitabilityHint: primary.profitabilityHint !== "unknown" ? primary.profitabilityHint : fromDoc.profitabilityHint,
    profitabilityNote: primary.profitabilityNote || fromDoc.profitabilityNote,
  };
}
