/** Wybór i parsowanie najlepszego załącznika BZP (ATH/PDF/DOCX/XLSX/ZIP). */

import { fetchTenderDocumentBytes, base64ToBytes, resolveTenderDocumentDownload, type TenderBzpDocument } from "@/lib/tenders-bzp";
import {
  athPreviewToSnapshot,
  pickBestKosztorysDocument,
  type TenderKosztorysSnapshot,
} from "@/lib/tenders-bzp-brief";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { isWeakWadiumRaw, pickBetterWadiumPln, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import {
  isDocxFilename,
  isZipFilename,
  parsePlnFromKosztorysTotal,
  scoreTenderFilename,
} from "@/lib/tenders-bzp-filename";
import { isPdfFilename, isKosztorysPreviewExt, type AthPreviewResult } from "@/lib/ath-parser";
import {
  classifyDocumentRole,
  is7zFilename,
  roleParsePriority,
  shouldParseRoleForDossier,
} from "@/lib/tender-document-role";
import { traceDossierPipeline } from "@/lib/tender-dossier-trace";
import { enrichSwzFromText } from "@/lib/tenders-bzp-swz-enrich";
import { applyMetadataConfidence, scoreEstimatedValueConfidence } from "@/lib/tender-metadata-confidence";
import { roleContributesMetadata } from "@/lib/tender-metadata-sources";
import { discoverBestCostDocument, type TenderCostDiscoveryResult } from "@/lib/tender-cost-discovery";
import { enrichKosztorysSnapshotFromPreview, estimatePlnFromKosztorysSnapshot, traceCostPipeline } from "@/lib/tender-cost-snapshot";
import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import { mergeFormalRequirements } from "@/lib/tender-formal-requirements";

const DOSSIER_MAX_CANDIDATES = 15;
const ZIP_INNER_MAX = 20;

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
  platform?: string;
}

export interface TenderDocumentParseResult {
  kosztorys: TenderKosztorysSnapshot | null;
  swzFromDoc: TenderSwzAnalysis | null;
  estimatePln: number | null;
  sourceDocumentIndex?: number;
  zipInnerPath?: string;
  sourceFilename?: string;
}

export interface TenderDossierParseResult extends TenderDocumentParseResult {
  swzMerged: TenderSwzAnalysis | null;
  scannedCount: number;
  parsedCount: number;
  warnings: string[];
  costDiscovery: TenderCostDiscoveryResult | null;
}

async function loadDocBytes(
  tenderId: string,
  index: number,
  docs: TenderBzpDocument[],
  downloadUrl?: string,
): Promise<Uint8Array> {
  const resolved = downloadUrl ?? resolveTenderDocumentDownload(docs, index)?.downloadUrl;
  const { base64 } = await fetchTenderDocumentBytes(tenderId, index, resolved);
  return base64ToBytes(base64);
}

function parentDownloadUrl(doc: TenderBzpDocument): string | undefined {
  return doc.downloadUrl?.trim() || undefined;
}

function candidateKey(c: TenderDocCandidate): string {
  return `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
}

function isKosztorysPreviewUsable(preview: AthPreviewResult): boolean {
  if (preview.rows.length > 0) return true;
  if (preview.totalValue?.trim()) return true;
  if ((preview.summaryLines?.length ?? 0) > 0) return true;
  return preview.ok && Boolean(preview.rawPreview?.trim());
}

/** P2-E.1B — kosztorys zawsze parsowany (standalone ATH + inner ZIP ATH). */
function pickCostParseCandidates(
  all: TenderDocCandidate[],
  costDiscovery: TenderCostDiscoveryResult | null,
): TenderDocCandidate[] {
  const out = new Map<string, TenderDocCandidate>();
  if (costDiscovery?.found) {
    const match = all.find((c) => c.filename === costDiscovery.source);
    if (match) out.set(candidateKey(match), match);
  }
  for (const c of all) {
    if (classifyDocumentRole(c.filename) === "kosztorys") {
      out.set(candidateKey(c), c);
    }
    const base = c.filename.split(" → ").pop() ?? c.filename;
    if (isKosztorysPreviewExt(base)) {
      out.set(candidateKey(c), c);
    }
  }
  return [...out.values()];
}

export async function buildTenderDocCandidates(
  tenderId: string,
  docs: TenderBzpDocument[],
): Promise<TenderDocCandidate[]> {
  const candidates: TenderDocCandidate[] = [];
  for (const doc of docs) {
    const dl = parentDownloadUrl(doc);
    let score = scoreTenderFilename(doc.filename);
    if (doc.isSwzHint) score += 18;
    candidates.push({
      documentIndex: doc.index,
      filename: doc.filename,
      score,
      downloadUrl: dl,
      platform: doc.platform,
    });
    if (isZipFilename(doc.filename)) {
      try {
        traceDossierPipeline("zip_downloaded", doc.filename, {
          documentIndex: doc.index,
          downloadUrl: Boolean(dl),
        });
        const { listZipFiles } = await loadDocParse();
        const zipBytes = await loadDocBytes(tenderId, doc.index, docs, dl);
        traceDossierPipeline("zip_opened", doc.filename, { bytes: zipBytes.byteLength });
        const inner = await listZipFiles(zipBytes);
        traceDossierPipeline("zip_inner_files_found", doc.filename, {
          count: inner.length,
          ath: inner.filter((e) => /\.ath$/i.test(e.filename)).map((e) => e.filename).slice(0, 5),
        });
        traceCostPipeline("zip_found", doc.filename, { innerCount: inner.length });
        for (const entry of inner.slice(0, ZIP_INNER_MAX)) {
          const innerName = `${doc.filename} → ${entry.filename}`;
          if (/\.ath$/i.test(entry.filename)) {
            traceDossierPipeline("ath_detected", innerName, { path: entry.path, score: entry.score });
            traceCostPipeline("ath_found", innerName, { path: entry.path });
          }
          candidates.push({
            documentIndex: doc.index,
            filename: innerName,
            zipInnerPath: entry.path,
            score: entry.score + (doc.isSwzHint ? 10 : 0),
            downloadUrl: dl,
            platform: doc.platform,
          });
        }
      } catch (e) {
        traceDossierPipeline("zip_open_failed", doc.filename, {
          documentIndex: doc.index,
          downloadUrl: Boolean(dl),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function mergeAwardCriteria(
  a: TenderSwzAnalysis["awardCriteria"],
  b: TenderSwzAnalysis["awardCriteria"],
): TenderAwardCriterion[] {
  const combined = [...(a ?? []), ...(b ?? [])];
  const seen = new Set<string>();
  return combined.filter((c) => {
    const key = `${c.name.toLowerCase()}|${c.weightPct ?? ""}|${c.maxPoints ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function selectDossierCandidates(candidates: TenderDocCandidate[]): TenderDocCandidate[] {
  const ranked = [...candidates].sort((a, b) => {
    const ra = roleParsePriority(classifyDocumentRole(a.filename));
    const rb = roleParsePriority(classifyDocumentRole(b.filename));
    if (ra !== rb) return ra - rb;
    return b.score - a.score;
  });
  const selected = new Map<string, TenderDocCandidate>();
  for (const c of ranked) {
    const role = classifyDocumentRole(c.filename);
    if (!shouldParseRoleForDossier(role, c.score)) continue;
    const key = `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
    selected.set(key, c);
    if (selected.size >= DOSSIER_MAX_CANDIDATES) break;
  }
  if (selected.size < 5) {
    for (const c of ranked) {
      const key = `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
      selected.set(key, c);
      if (selected.size >= DOSSIER_MAX_CANDIDATES) break;
    }
  }
  return [...selected.values()];
}

export async function parseTenderDocumentCandidate(
  tenderId: string,
  candidate: TenderDocCandidate,
  docs: TenderBzpDocument[],
  opts?: { ourEstimatePln?: number | null; mergeSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const {
    analyzeSwzFromDocumentText,
    parseDocumentToKosztorys,
    parseDocumentToSwzText,
    pickBestFromZipBytes,
    resolveDocumentBytes,
  } = await loadDocParse();

  const loadBytes = (idx: number) => loadDocBytes(
    tenderId,
    idx,
    docs,
    candidate.downloadUrl ?? resolveTenderDocumentDownload(docs, idx)?.downloadUrl,
  );
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

  if (isKosztorysPreviewExt(effectiveName)) {
    traceDossierPipeline("ath_bytes_loaded", candidate.filename, {
      effectiveName,
      bytes: bytes.byteLength,
      zipInner: Boolean(candidate.zipInnerPath),
      downloadUrl: Boolean(candidate.downloadUrl),
    });
  }

  let kosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;

  const kosztorysPreview = await parseDocumentToKosztorys(bytes, effectiveName);
  if (kosztorysPreview && isKosztorysPreviewUsable(kosztorysPreview)) {
    traceDossierPipeline("ath_parsed", candidate.filename, {
      ok: kosztorysPreview.ok,
      rows: kosztorysPreview.rows.length,
      totalValue: kosztorysPreview.totalValue ?? null,
      summaryLines: kosztorysPreview.summaryLines?.length ?? 0,
    });
    traceCostPipeline("ath_parsed", candidate.filename, {
      rows: kosztorysPreview.rows.length,
      totalValue: kosztorysPreview.totalValue ?? null,
      summaryLines: kosztorysPreview.summaryLines?.length ?? 0,
    });
    const baseSnap = athPreviewToSnapshot({ ...kosztorysPreview, ok: true }, effectiveName);
    kosztorys = enrichKosztorysSnapshotFromPreview(kosztorysPreview, {
      ...baseSnap,
      sourceDocumentIndex: candidate.documentIndex,
      zipInnerPath: candidate.zipInnerPath,
    });
    traceDossierPipeline("kosztorys_created", candidate.filename, {
      rowCount: kosztorys.rowCount,
      totalValue: kosztorys.totalValue ?? null,
    });
    traceCostPipeline("snapshot_created", candidate.filename, {
      rowCount: kosztorys.rowCount,
      totalValue: kosztorys.totalValue ?? null,
      ok: kosztorys.ok,
    });
    if (estimatePln == null) {
      estimatePln = estimatePlnFromKosztorysSnapshot(kosztorys, estimatePln, candidate.filename);
    }
  } else if (kosztorysPreview && isKosztorysPreviewExt(effectiveName)) {
    traceDossierPipeline("ath_parse_failed", candidate.filename, {
      ok: kosztorysPreview.ok,
      warnings: kosztorysPreview.warnings?.slice(0, 3),
    });
  }

  let swzFromDoc: TenderSwzAnalysis | null = null;
  const canSwzText = isPdfFilename(effectiveName) || isDocxFilename(effectiveName);
  if (canSwzText) {
    const { text, source, warnings } = await parseDocumentToSwzText(bytes, effectiveName);
    const base = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    swzFromDoc = base ? enrichSwzFromText(text, base) : null;
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
    const base = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    swzFromDoc = base ? enrichSwzFromText(text, base) : null;
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
    const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, {
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
        downloadUrl: parentDownloadUrl(legacy),
        platform: legacy.platform,
      };
      const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, { ourEstimatePln: estimatePln });
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

/** Pełne parsowanie dossier — wiele dokumentów, merge SWZ + kosztorys (P2-E.0). */
export async function parseTenderDossierDocuments(
  tenderId: string,
  docs: TenderBzpDocument[],
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDossierParseResult> {
  const warnings: string[] = [];
  if (!docs.length) {
    return {
      kosztorys: null,
      swzFromDoc: null,
      swzMerged: opts?.existingSwz ?? null,
      estimatePln: opts?.ourEstimatePln ?? null,
      scannedCount: 0,
      parsedCount: 0,
      warnings,
      costDiscovery: null,
    };
  }

  const allCandidates = await buildTenderDocCandidates(tenderId, docs);
  const costDiscovery = discoverBestCostDocument(allCandidates);
  if (costDiscovery.found) {
    traceDossierPipeline("cost_document_discovered", costDiscovery.source, {
      type: costDiscovery.type,
      confidence: costDiscovery.confidence,
    });
  }

  const candidates = selectDossierCandidates(allCandidates);
  const costCandidates = pickCostParseCandidates(allCandidates, costDiscovery);

  for (const doc of docs) {
    traceDossierPipeline("document_discovered", doc.filename, {
      index: doc.index,
      role: classifyDocumentRole(doc.filename),
    });
    if (is7zFilename(doc.filename)) {
      traceDossierPipeline("document_classified", doc.filename, { role: "7z", supported: false });
      warnings.push(`Wykryto archiwum 7Z: ${doc.filename} — wymagane ręczne pobranie`);
    }
  }

  let swzMerged = opts?.existingSwz ?? null;
  let bestKosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;
  let sourceDocumentIndex: number | undefined;
  let zipInnerPath: string | undefined;
  let sourceFilename: string | undefined;
  let parsedCount = 0;

  /** Faza 1 — kosztorys (standalone ATH + inner ZIP) zawsze przed metadanymi SWZ. */
  for (const cand of costCandidates) {
    try {
      traceDossierPipeline("document_downloaded", cand.filename, {
        documentIndex: cand.documentIndex,
        phase: "cost",
        downloadUrl: Boolean(cand.downloadUrl),
      });
      const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, {
        ourEstimatePln: estimatePln,
        mergeSwz: swzMerged,
      });
      parsedCount += 1;
      if (parsed.kosztorys?.ok) {
        const newRows = parsed.kosztorys.rows?.length ?? 0;
        const oldRows = bestKosztorys?.rows?.length ?? 0;
        if (!bestKosztorys?.ok || newRows > oldRows || !bestKosztorys.totalValue) {
          bestKosztorys = parsed.kosztorys;
          sourceDocumentIndex = parsed.sourceDocumentIndex;
          zipInnerPath = parsed.zipInnerPath;
          sourceFilename = parsed.sourceFilename;
        }
        if (parsed.estimatePln != null) {
          estimatePln = parsed.estimatePln;
          traceDossierPipeline("cost_estimate_extracted", cand.filename, { estimatePln });
        }
      }
    } catch (e) {
      warnings.push(`${cand.filename}: ${e instanceof Error ? e.message : "błąd kosztorysu"}`);
    }
  }

  for (const cand of candidates) {
    const role = classifyDocumentRole(cand.filename);
    traceDossierPipeline("document_classified", cand.filename, { role, score: cand.score });
    const contributesMeta =
      roleContributesMetadata(role, "estimatedValue")
      || roleContributesMetadata(role, "awardCriteria")
      || roleContributesMetadata(role, "wadium")
      || roleContributesMetadata(role, "implementationDeadline");
    if (!contributesMeta && role !== "kosztorys" && roleParsePriority(role) > 7) continue;
    const skipDuplicateCost = costCandidates.some((cc) => candidateKey(cc) === candidateKey(cand))
      && bestKosztorys?.ok
      && classifyDocumentRole(cand.filename) === "kosztorys";
    if (skipDuplicateCost) continue;
    try {
      traceDossierPipeline("document_downloaded", cand.filename, { documentIndex: cand.documentIndex });
      const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, {
        ourEstimatePln: estimatePln,
        mergeSwz: swzMerged,
      });
      parsedCount += 1;
      traceDossierPipeline("document_parsed", cand.filename, {
        kosztorys: Boolean(parsed.kosztorys?.ok),
        swz: Boolean(parsed.swzFromDoc),
      });

      if (parsed.kosztorys?.ok) {
        const newRows = parsed.kosztorys.rows?.length ?? 0;
        const oldRows = bestKosztorys?.rows?.length ?? 0;
        if (!bestKosztorys?.ok || newRows > oldRows) {
          bestKosztorys = parsed.kosztorys;
          sourceDocumentIndex = parsed.sourceDocumentIndex;
          zipInnerPath = parsed.zipInnerPath;
          sourceFilename = parsed.sourceFilename;
        }
        if (parsed.estimatePln != null) {
          estimatePln = parsed.estimatePln;
          traceDossierPipeline("cost_estimate_extracted", cand.filename, { estimatePln });
        }
      }

      if (parsed.swzFromDoc) {
        const valueConf = scoreEstimatedValueConfidence({
          valuePln: parsed.swzFromDoc.estimatedValuePln,
          valueRaw: parsed.swzFromDoc.estimatedValueRaw,
          sourceFilename: parsed.swzFromDoc.sourceFilename,
        });
        traceDossierPipeline("value_document_trace", cand.filename, {
          role,
          valueFound: parsed.swzFromDoc.estimatedValuePln != null,
          value: parsed.swzFromDoc.estimatedValuePln,
          confidence: valueConf,
        });
        if (parsed.swzFromDoc.estimatedValuePln != null) {
          traceDossierPipeline("value_extracted", cand.filename, {
            value: parsed.swzFromDoc.estimatedValuePln,
          });
        }
        if ((parsed.swzFromDoc.awardCriteria?.length ?? 0) > 0) {
          traceDossierPipeline("criteria_extracted", cand.filename, {
            count: parsed.swzFromDoc.awardCriteria?.length,
          });
        }
        swzMerged = mergeSwzAnalysis(swzMerged, parsed.swzFromDoc);
        if (parsed.swzFromDoc.estimatedValuePln != null && estimatePln == null) {
          estimatePln = parsed.swzFromDoc.estimatedValuePln;
        }
      }
    } catch (e) {
      warnings.push(`${cand.filename}: ${e instanceof Error ? e.message : "błąd parsowania"}`);
    }
  }

  if (swzMerged) {
    swzMerged = applyMetadataConfidence(swzMerged);
  }

  traceDossierPipeline("dossier_updated", sourceFilename ?? "dossier", {
    kosztorysOk: Boolean(bestKosztorys?.ok),
    estimatePln,
    valuePln: swzMerged?.estimatedValuePln ?? null,
    wadiumPercent: swzMerged?.wadiumPercent ?? null,
    wadiumPln: swzMerged?.wadiumPln ?? null,
    criteriaCount: swzMerged?.awardCriteria?.length ?? 0,
  });

  return {
    kosztorys: bestKosztorys,
    swzFromDoc: swzMerged,
    swzMerged,
    estimatePln,
    sourceDocumentIndex,
    zipInnerPath,
    sourceFilename,
    scannedCount: candidates.length,
    parsedCount,
    warnings,
    costDiscovery,
  };
}

export function mergeSwzAnalysis(
  primary: TenderSwzAnalysis | null | undefined,
  fromDoc: TenderSwzAnalysis | null | undefined,
): TenderSwzAnalysis | null {
  if (!primary && !fromDoc) return null;
  if (!primary) return fromDoc ?? null;
  if (!fromDoc) return primary;
  const wadiumPercent = primary.wadiumPercent ?? fromDoc.wadiumPercent;
  const wadiumPln = pickBetterWadiumPln(primary.wadiumPln, fromDoc.wadiumPln);
  const rawCandidate = isWeakWadiumRaw(primary.wadiumRaw)
    ? (fromDoc.wadiumRaw ?? primary.wadiumRaw)
    : (primary.wadiumRaw ?? fromDoc.wadiumRaw);
  const wadiumRaw = formatSwzWadiumDisplay({ wadiumPercent, wadiumPln, wadiumRaw: rawCandidate })
    ?? (isWeakWadiumRaw(rawCandidate) ? null : rawCandidate);
  const awardCriteria = mergeAwardCriteria(primary.awardCriteria, fromDoc.awardCriteria);
  return {
    ...primary,
    estimatedValuePln: primary.estimatedValuePln ?? fromDoc.estimatedValuePln,
    estimatedValueRaw: primary.estimatedValueRaw ?? fromDoc.estimatedValueRaw,
    wadiumPln,
    wadiumRaw,
    wadiumPercent,
    awardCriteria: awardCriteria.length > 0 ? awardCriteria : primary.awardCriteria ?? fromDoc.awardCriteria,
    referenceRequirement: primary.referenceRequirement ?? fromDoc.referenceRequirement,
    qualificationHints: [...new Set([...primary.qualificationHints, ...fromDoc.qualificationHints])].slice(0, 8),
    formalRequirements: mergeFormalRequirements(primary.formalRequirements, fromDoc.formalRequirements),
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
