/**
 * IK-MIGRATION-01 P2 — Document Expert orchestration.
 * REUSE: roles, cost discovery, FILE_TYPE_SUPPORT, OfferBoq v5,
 * artifact pool, merge, compose, lineProvenance.
 * ZERO new BOQ model · ZERO parser · ZERO F5/Bid persist · ZERO ATH writer.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  classifyDocumentRoleWithHints,
  DOCUMENT_ROLE_LABEL_PL,
  type DocumentRole,
} from "@/lib/tender-document-role";
import {
  classifyCostDocumentType,
  isFinancialScheduleNotCostFilename,
  type TenderCostDocumentType,
} from "@/lib/tender-cost-discovery";
import { isDocumentDiscoverySettled } from "@/lib/tender-document-discovery";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import {
  extOfFilename,
  FILE_TYPE_SUPPORT,
} from "@/lib/tender-analysis-coverage";
import {
  buildOfferBoqFromSnapshot,
  OFFER_BOQ_SCHEMA_VERSION,
  type OfferBoqDocument,
  type OfferBoqLine,
} from "@/lib/tender-offer-boq";
import { enrichOfferBoqLinesWithQuantityIntelligence } from "@/lib/intelligent-estimator/boq-quantity-intelligence";
import {
  enrichOfferBoqLinesWithDependencyGraph,
  type BoqDependencyGraph,
} from "@/lib/intelligent-estimator/boq-dependency-graph";
import { synchronizeOfferBoqFromMasterLines } from "@/lib/intelligent-estimator/boq-offer-master-sync";
import {
  buildArtifactPoolFromItem,
  composeDwellingOfferBoq,
  mergeDwellingArtifactLines,
  resolveDwellingCostSnapshotForPricing,
  type DwellingCostArtifactRef,
  type DwellingLineProvenance,
} from "@/lib/multi-boq";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { inferBranchHint } from "@/lib/cost-multi-01-classify";
import type { BranchCode } from "@/lib/cost-multi-01-types";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import { getTenderPackage } from "@/lib/multi-dwelling/store";
import {
  assessDwellingMappingCoverage,
  computeCompositionLineIntegrity,
  countKeepOneCollapsedFromWarnings,
  countSourceLinesInArtifacts,
  ensureDeterministicFilenameDwellingMap,
  type IkDwellingMappingAssessment,
  type IkLineIntegrityReport,
} from "./ik-dwelling-mapping";

export type IkDocumentExpertStatus = "ready" | "partial" | "hold" | "gap" | "pending";

export type IkInventorySource = "bzp" | "upload" | "external" | "artifact";

export interface IkInventoryDocument {
  documentId: string;
  filename: string;
  fileType: string;
  source: IkInventorySource;
  tenderId: string;
  role: DocumentRole;
  roleLabelPl: string;
  costType: TenderCostDocumentType;
  isCostDocument: boolean;
  isPrzedmiar: boolean;
  kosztorysParseSupported: boolean;
  pagesSheets: string | null;
}

export interface IkPrzedmiarSource {
  documentId: string;
  filename: string;
  branchHint: BranchCode;
  detectedRowCount: number;
  extractedCount: number;
  validCount: number;
  snapshotOk: boolean;
  unreadable: boolean;
}

export interface IkDwellingComposeUnit {
  dwellingId: string;
  labelPl: string;
  sourceDocumentIds: string[];
  lineCount: number;
  composeOk: boolean;
  completeness: string | null;
}

/** Flat Master BOQ line with dwelling identity — input for Classification Gate (P3). */
export interface IkMasterBoqLineRef {
  dwellingId: string;
  line: OfferBoqLine;
  provenance: DwellingLineProvenance | null;
}

export interface IkDocumentExpertReport {
  tenderId: string;
  discoverySettled: boolean;
  attachmentCount: number;
  documents: IkInventoryDocument[];
  costDocuments: IkInventoryDocument[];
  przedmiary: IkPrzedmiarSource[];
  extraction: {
    detectedRowCount: number;
    extractedCount: number;
    validCount: number;
    executed: boolean;
    gaps: string[];
  };
  validation: {
    missingDescription: number;
    missingQuantity: number;
    missingUnit: number;
    missingLineage: number;
    duplicateSuspicion: number;
    reasons: string[];
  };
  dwellingMapping: IkDwellingMappingAssessment;
  lineIntegrity: IkLineIntegrityReport;
  dwellings: IkDwellingComposeUnit[];
  masterBoq: {
    mode: "legacy_single" | "multi";
    schemaVersion: number | null;
    lineCount: number;
    /** Sum of composed lines across dwellings (Master integrity). */
    composedLineCount: number;
    sourceLineCount: number;
    dwellingCount: number;
    branchCount: number;
    sourceCount: number;
    hasLineProvenance: boolean;
    status: IkDocumentExpertStatus;
    readyForExperts: boolean;
  };
  status: IkDocumentExpertStatus;
  reasons: string[];
  offerBoq: OfferBoqDocument | null;
  lineProvenance: Record<string, DwellingLineProvenance> | null;
  /** All composed Master lines with dwellingId (1:1 with masterBoq.lineCount when READY). */
  masterBoqLines: IkMasterBoqLineRef[];
  /** IK S3 — BOQ semantic dependency graph for Master lines (legacy_single / primary dwelling). */
  boqDependencyGraph: BoqDependencyGraph | null;
  /**
   * IK P0-3 — per-dwelling S3 graphs (multi mode). Keys = normalizeDwellingId(dwellingId).
   * Avoids cross-dwelling LP collisions (poz.5 in A ≠ poz.5 in B).
   */
  boqDependencyGraphsByDwelling: Record<string, BoqDependencyGraph> | null;
}

const COST_ROLES = new Set<DocumentRole>([
  "przedmiar",
  "obmiar",
  "kosztorys",
  "kosztorys_ofertowy",
  "stwior",
]);

const PRZEDMIAR_ROLES = new Set<DocumentRole>(["przedmiar", "obmiar"]);

/** ATH/NOR/XLS/PDF przedmiar = źródło BOQ nawet gdy rola pliku to „kosztorys”. */
const BOQ_SOURCE_COST_TYPES = new Set<TenderCostDocumentType>([
  "ath",
  "zip_ath",
  "nor",
  "zip_nor",
  "xml",
  "zip_xml",
  "xls",
  "zip_xls",
  "xlsx",
  "zip_xlsx",
  "pdf_przedmiar",
  "zip_pdf_przedmiar",
]);

function coverageForExt(ext: string) {
  return FILE_TYPE_SUPPORT.find((r) => r.ext === ext);
}

function isValidLine(line: {
  description?: string;
  quantity?: number;
  unit?: string;
}): boolean {
  const desc = String(line.description ?? "").trim();
  const unit = String(line.unit ?? "").trim();
  const qty = typeof line.quantity === "number" ? line.quantity : 0;
  return Boolean(desc) && Boolean(unit) && Number.isFinite(qty) && qty > 0;
}

function docIdFrom(raw: string | undefined, filename: string, fallback: string): string {
  const id = String(raw ?? "").trim();
  if (id) return id;
  const fn = filename.trim();
  return fn || fallback;
}

export function inventoryIkDocuments(item: TenderPipelineItem): IkInventoryDocument[] {
  const tenderId = item.id || item.tenderId || "";
  const out: IkInventoryDocument[] = [];
  const hints = {
    isSwzHint: false,
    hasSwzAnalysis: item.swzAnalysis != null,
    costDiscoverySource: item.tenderDossier?.kosztorys?.sourceFilename ?? null,
    pricedKosztorys: Boolean(
      item.tenderDossier?.kosztorys?.ok && item.tenderDossier?.kosztorys?.totalValue,
    ),
    przedmiarParsed: Boolean(
      item.tenderDossier?.kosztorys?.ok && (item.tenderDossier?.kosztorys?.rowCount ?? 0) > 0,
    ),
  };

  const push = (
    filename: string,
    documentId: string,
    source: IkInventorySource,
    extra?: { isSwzHint?: boolean },
  ) => {
    const ext = extOfFilename(filename);
    const cost = classifyCostDocumentType(filename);
    const role = classifyDocumentRoleWithHints(filename, {
      ...hints,
      isSwzHint: extra?.isSwzHint === true,
    });
    const cover = coverageForExt(ext);
    const isCost = cost.type !== "none" || COST_ROLES.has(role);
    const isPrzedmiar =
      PRZEDMIAR_ROLES.has(role)
      || BOQ_SOURCE_COST_TYPES.has(cost.type)
      || /przedmiar|pdf_przedmiar/.test(cost.type)
      || (isCost && role !== "kosztorys" && role !== "kosztorys_ofertowy" && role !== "swz");
    out.push({
      documentId,
      filename,
      fileType: ext || "unknown",
      source,
      tenderId,
      role,
      roleLabelPl: DOCUMENT_ROLE_LABEL_PL[role],
      costType: cost.type,
      isCostDocument: isCost && role !== "swz" && role !== "formularz",
      isPrzedmiar: isPrzedmiar && role !== "swz" && role !== "formularz" && role !== "kosztorys_ofertowy",
      kosztorysParseSupported: cover?.kosztorys === true,
      pagesSheets: null,
    });
  };

  (item.bzpDocuments ?? []).forEach((doc, i) => {
    push(
      doc.filename || `bzp-${i}`,
      docIdFrom(doc.documentId, doc.filename || "", `bzp-doc-${i}`),
      "bzp",
      { isSwzHint: doc.isSwzHint },
    );
  });
  if (item.uploadedFile?.filename) {
    push(
      item.uploadedFile.filename,
      docIdFrom(item.uploadedFile.id, item.uploadedFile.filename, "upload-0"),
      "upload",
    );
  }
  (item.externalDocDiscovery?.files ?? []).forEach((file, i) => {
    push(
      file.filename || `ext-${i}`,
      docIdFrom(file.id, file.filename || "", `ext-${i}`),
      "external",
      { isSwzHint: file.isSwzHint },
    );
  });

  return out;
}

/** Defense: Harmonogram rzeczowo-finansowy ≠ Master BOQ (FIX #3). */
function isScheduleKosztorysSnapshot(
  snapshot: Pick<TenderKosztorysSnapshot, "sourceFilename"> | null | undefined,
): boolean {
  const src = snapshot?.sourceFilename;
  return Boolean(src && isFinancialScheduleNotCostFilename(src));
}

function snapshotLineStats(snapshot: TenderKosztorysSnapshot | null | undefined): {
  detected: number;
  extracted: number;
  valid: number;
  unreadable: boolean;
  ok: boolean;
} {
  if (!snapshot) {
    return { detected: 0, extracted: 0, valid: 0, unreadable: false, ok: false };
  }
  const catalog = snapshot.catalogQuantities ?? [];
  const rows = snapshot.rows ?? [];
  const extractedRows = catalog.length > 0 ? catalog : rows;
  const extracted = extractedRows.length;
  const detected =
    Number.isFinite(snapshot.rowCount) && snapshot.rowCount > extracted
      ? snapshot.rowCount
      : extracted;
  const valid = extractedRows.filter((r) => {
    const qty = Number(String(r.quantity ?? "").replace(",", "."));
    return isValidLine({
      description: r.description,
      unit: r.unit,
      quantity: Number.isFinite(qty) ? qty : 0,
    });
  }).length;
  const unreadable = Boolean(
    snapshot.pdfPrzedmiarNoTextLayer
    || snapshot.pdfPrzedmiarExtractError
    || snapshot.ok === false,
  );
  return { detected, extracted, valid, unreadable, ok: snapshot.ok === true };
}

function validateOfferLines(
  lines: OfferBoqLine[],
  provenance: Record<string, DwellingLineProvenance> | null,
): IkDocumentExpertReport["validation"] {
  let missingDescription = 0;
  let missingQuantity = 0;
  let missingUnit = 0;
  let missingLineage = 0;
  const hashes = new Map<string, number>();
  const reasons: string[] = [];

  for (const line of lines) {
    const desc = line.description.trim();
    if (!desc || desc === "(bez opisu)") missingDescription += 1;
    if (!(Number.isFinite(line.quantity) && line.quantity > 0)) missingQuantity += 1;
    if (!line.unit.trim()) missingUnit += 1;
    const prov = provenance?.[line.lineId];
    if (provenance && !prov?.sourceDocumentId) missingLineage += 1;
    const key = `${line.lp}|${desc.slice(0, 160)}|${line.unit}|${line.quantity}`;
    hashes.set(key, (hashes.get(key) ?? 0) + 1);
  }

  let duplicateSuspicion = 0;
  for (const [key, n] of hashes) {
    if (n > 1) {
      duplicateSuspicion += n - 1;
      reasons.push(`DUPLICATE_SUSPICION ${key} x${n}`);
    }
  }
  if (missingDescription) reasons.push(`MISSING_DESCRIPTION=${missingDescription}`);
  if (missingQuantity) reasons.push(`MISSING_QUANTITY=${missingQuantity}`);
  if (missingUnit) reasons.push(`MISSING_UNIT=${missingUnit}`);
  if (missingLineage) reasons.push(`MISSING_LINEAGE=${missingLineage}`);

  return {
    missingDescription,
    missingQuantity,
    missingUnit,
    missingLineage,
    duplicateSuspicion,
    reasons,
  };
}

export function przedmiarBranchLabelPl(code: BranchCode): string {
  switch (code) {
    case "construction": return "roboty budowlane";
    case "electrical": return "instalacje elektryczne";
    case "sanitary": return "instalacje sanitarne";
    case "fire": return "instalacje ppoż";
    case "hvac": return "wentylacja / HVAC";
    case "finishes": return "wykończenia";
    case "other": return "inne";
    default: return "branża nieustalona";
  }
}

export function runIkDocumentExpert(opts: {
  item: TenderPipelineItem;
  package?: TenderPackage | null;
}): IkDocumentExpertReport {
  const item = opts.item;
  const tenderId = item.id || item.tenderId || "";
  const discoverySettled = isDocumentDiscoverySettled(item);
  const documents = inventoryIkDocuments(item);
  const costDocuments = documents.filter((d) => d.isCostDocument);
  const pool: DwellingCostArtifactRef[] = buildArtifactPoolFromItem(item);
  let pkg = opts.package ?? getTenderPackage(tenderId);

  const przedmiary: IkPrzedmiarSource[] = [];
  const seen = new Set<string>();
  const reasons: string[] = [];

  // Owner GO: unambiguous street+building+unit filename → dwelling via existing LS map APIs.
  // Prefer parsed artifact pool; else cost-document filenames (mapping-only, no invent rows).
  // STWIORB stays in inventory (role=stwior) but is NOT a dwelling cost-snapshot coverage
  // source — mapping it forces MISSING_ARTIFACT when it has no costBranch/branchWinner entry.
  const mapFilenameRefs =
    pool.length > 1
      ? pool.map((a) => ({ documentId: a.documentId, filename: a.filename }))
      : costDocuments
          .filter(
            (d) =>
              d.role !== "stwior"
              && (d.isPrzedmiar || d.costType === "pdf_przedmiar"),
          )
          .map((d) => ({ documentId: d.documentId, filename: d.filename }));

  if (mapFilenameRefs.length > 1) {
    const ensured = ensureDeterministicFilenameDwellingMap({
      tenderId,
      artifacts: mapFilenameRefs,
      package: pkg,
    });
    if (ensured.ok && ensured.applied) {
      pkg = ensured.package;
      reasons.push(
        "DETERMINISTIC_FILENAME_DWELLING_MAP — street+building+unit jednoznaczne; mapowanie przez istniejący documentToDwelling.",
      );
    } else if (
      ensured.ok
      && !ensured.applied
      && ensured.reason
      && ensured.reason !== "ALREADY_MAPPED"
    ) {
      reasons.push(
        `DETERMINISTIC_FILENAME_MAP_HOLD — ${ensured.reason} (bez invent).`,
      );
    }
  }

  const noteScheduleBlocked = () => {
    if (!reasons.includes("NOT_MASTER_BOQ_SCHEDULE")) {
      reasons.push("NOT_MASTER_BOQ_SCHEDULE");
    }
  };

  const addPrzedmiar = (
    documentId: string,
    filename: string,
    snapshot: TenderKosztorysSnapshot | null | undefined,
  ) => {
    if (
      isFinancialScheduleNotCostFilename(filename)
      || isScheduleKosztorysSnapshot(snapshot)
    ) {
      noteScheduleBlocked();
      return;
    }
    if (seen.has(documentId)) return;
    seen.add(documentId);
    const stats = snapshotLineStats(snapshot);
    przedmiary.push({
      documentId,
      filename,
      branchHint: inferBranchHint(filename),
      detectedRowCount: stats.detected,
      extractedCount: stats.extracted,
      validCount: stats.valid,
      snapshotOk: stats.ok,
      unreadable: stats.unreadable,
    });
  };

  for (const art of pool) {
    addPrzedmiar(art.documentId, art.filename, art.snapshot);
  }
  for (const doc of costDocuments) {
    if (seen.has(doc.documentId)) continue;
    const match = pool.find((a) => a.documentId === doc.documentId || a.filename === doc.filename);
    const snap =
      match?.snapshot
      ?? (item.tenderDossier?.kosztorys?.sourceFilename === doc.filename
        ? item.tenderDossier.kosztorys
        : null);
    if (doc.isPrzedmiar || match) {
      addPrzedmiar(doc.documentId, doc.filename, snap);
    }
  }
  if (przedmiary.length === 0 && item.tenderDossier?.kosztorys) {
    const snap = item.tenderDossier.kosztorys;
    addPrzedmiar(
      snap.sourceFilename || "dossier-kosztorys",
      snap.sourceFilename || "dossier-kosztorys",
      snap,
    );
  }

  const gaps: string[] = [];
  let offerBoq: OfferBoqDocument | null = null;
  let lineProvenance: Record<string, DwellingLineProvenance> | null = null;
  let mode: "legacy_single" | "multi" = "legacy_single";
  let dwellingCount = 0;
  const dwellingUnits: IkDwellingComposeUnit[] = [];
  let composedLineCount = 0;
  let keepOneCollapsed = 0;
  const allComposedLines: OfferBoqLine[] = [];
  const masterBoqLines: IkMasterBoqLineRef[] = [];

  const tryBuildOfferBoqFromSnapshot = (
    snapshot: TenderKosztorysSnapshot | null | undefined,
  ): OfferBoqDocument | null => {
    if (!snapshot) return null;
    if (isScheduleKosztorysSnapshot(snapshot)) {
      noteScheduleBlocked();
      return null;
    }
    return buildOfferBoqFromSnapshot({ tenderId, snapshot });
  };

  const pushMasterLines = (
    dwellingId: string,
    lines: OfferBoqLine[],
    prov: Record<string, DwellingLineProvenance> | null | undefined,
  ) => {
    for (const line of lines) {
      allComposedLines.push(line);
      masterBoqLines.push({
        dwellingId,
        line,
        provenance: prov?.[line.lineId] ?? null,
      });
    }
  };

  const dwellingMapArts =
    pool.length >= mapFilenameRefs.length && pool.length > 0
      ? pool
      : mapFilenameRefs.map((r, i) => ({
          documentId: r.documentId,
          artifactId: `map-ref:${i}:${r.documentId}`,
          filename: r.filename,
          branchHint: "unknown" as const,
          // Mapping coverage only — empty snapshot never invents lines.
          snapshot: {
            ok: false,
            sourceFilename: r.filename,
            rows: [],
            rowCount: 0,
            warnings: ["MAPPING_REF_NO_SNAPSHOT"],
          } as import("@/lib/tenders-bzp-brief").TenderKosztorysSnapshot,
        }));

  const dwellingMapping = assessDwellingMappingCoverage({
    artifacts: dwellingMapArts,
    package: pkg,
  });
  for (const r of dwellingMapping.reasons) {
    if (!reasons.includes(r)) reasons.push(r);
  }

  const mappedDwellings = pkg?.mode === "multi"
    ? (pkg.dwellings ?? []).filter((d) => (d.sourceDocumentIds?.length ?? 0) > 0)
    : [];

  if (mappedDwellings.length > 0 && dwellingMapping.allMapped) {
    mode = "multi";
    dwellingCount = mappedDwellings.length;
    const composedDocs: OfferBoqDocument[] = [];
    const mergedProv: Record<string, DwellingLineProvenance> = {};
    for (const unit of mappedDwellings) {
      const labelPl = unit.labelPl || unit.dwellingId;
      if (unit.offerBoq && (unit.offerBoq.lines?.length ?? 0) > 0) {
        const unitSrc =
          unit.offerBoq.parserSnapshotRef?.sourceFilename
          ?? null;
        if (unitSrc && isFinancialScheduleNotCostFilename(unitSrc)) {
          noteScheduleBlocked();
          dwellingUnits.push({
            dwellingId: unit.dwellingId,
            labelPl,
            sourceDocumentIds: [...(unit.sourceDocumentIds ?? [])],
            lineCount: 0,
            composeOk: false,
            completeness: "incomplete",
          });
          continue;
        }
        composedDocs.push(unit.offerBoq);
        if (unit.lineProvenance) Object.assign(mergedProv, unit.lineProvenance);
        pushMasterLines(unit.dwellingId, unit.offerBoq.lines ?? [], unit.lineProvenance);
        dwellingUnits.push({
          dwellingId: unit.dwellingId,
          labelPl,
          sourceDocumentIds: [...(unit.sourceDocumentIds ?? [])],
          lineCount: unit.offerBoq.lines?.length ?? 0,
          composeOk: true,
          completeness: "ready",
        });
        continue;
      }
      const snap = resolveDwellingCostSnapshotForPricing({
        tenderId,
        dwellingId: unit.dwellingId,
        item,
        artifacts: pool,
        package: pkg,
      });
      keepOneCollapsed += countKeepOneCollapsedFromWarnings(snap.warnings ?? []);
      const composed = composeDwellingOfferBoq({ snapshot: snap });
      if (composed.ok) {
        const composedSrc = composed.document.parserSnapshotRef?.sourceFilename ?? "";
        if (composedSrc && isFinancialScheduleNotCostFilename(composedSrc)) {
          noteScheduleBlocked();
          dwellingUnits.push({
            dwellingId: unit.dwellingId,
            labelPl,
            sourceDocumentIds: [...(unit.sourceDocumentIds ?? [])],
            lineCount: 0,
            composeOk: false,
            completeness: snap.completeness,
          });
          continue;
        }
        composedDocs.push(composed.document);
        Object.assign(mergedProv, composed.lineProvenance);
        pushMasterLines(unit.dwellingId, composed.document.lines ?? [], composed.lineProvenance);
        dwellingUnits.push({
          dwellingId: unit.dwellingId,
          labelPl,
          sourceDocumentIds: [...(unit.sourceDocumentIds ?? [])],
          lineCount: composed.document.lines?.length ?? 0,
          composeOk: true,
          completeness: snap.completeness,
        });
      } else {
        reasons.push(`DWELLING_${unit.dwellingId}:${composed.reason}`);
        if (snap.completeness === "conflict") reasons.push("CONFLICT_HOLD");
        dwellingUnits.push({
          dwellingId: unit.dwellingId,
          labelPl,
          sourceDocumentIds: [...(unit.sourceDocumentIds ?? [])],
          lineCount: 0,
          composeOk: false,
          completeness: snap.completeness,
        });
      }
    }
    composedLineCount = allComposedLines.length;
    if (composedDocs.length >= 1) {
      // Keep first dwelling OfferBoq for legacy consumers; Master lineCount = sum.
      offerBoq = composedDocs[0]!;
      lineProvenance = Object.keys(mergedProv).length ? mergedProv : null;
      if (composedDocs.length > 1) {
        reasons.push(
          `MULTI_DWELLING_KEEP_STRUCTURE dwellings=${composedDocs.length} composedLines=${composedLineCount} — nie spłaszczam tożsamości lokali.`,
        );
      }
    }
  } else if (mappedDwellings.length > 0 && !dwellingMapping.allMapped) {
    // Partial Owner map — do not compose incomplete package as READY.
    mode = "multi";
    dwellingCount = mappedDwellings.length;
    reasons.push(
      "PARTIAL_OWNER_MAP — mapa niepełna; brak kompletnego Master BOQ multi-dwelling.",
    );
    const primary = item.tenderDossier?.kosztorys ?? pool[0]?.snapshot ?? null;
    offerBoq = tryBuildOfferBoqFromSnapshot(primary);
    composedLineCount = offerBoq?.lines?.length ?? 0;
  } else if (dwellingMapArts.length > 1) {
    const mergePool = pool.length > 1 ? pool : [];
    const merged = mergePool.length > 1
      ? mergeDwellingArtifactLines(mergePool)
      : { warnings: [] as string[], completeness: "hold" as const, lines: [] };
    keepOneCollapsed += countKeepOneCollapsedFromWarnings(merged.warnings);
    if (merged.completeness === "conflict") reasons.push("CONFLICT_HOLD");
    if (!reasons.some((r) => r.includes("MULTI_SOURCE_NO_DWELLING_MAP"))) {
      reasons.push("MULTI_SOURCE_NO_DWELLING_MAP — wiele przedmiarów bez mapy adresów.");
    }
    const primary = item.tenderDossier?.kosztorys ?? pool[0]?.snapshot ?? null;
    offerBoq = tryBuildOfferBoqFromSnapshot(primary);
    composedLineCount = offerBoq?.lines?.length ?? 0;
  } else {
    const snap = item.tenderDossier?.kosztorys ?? pool[0]?.snapshot ?? null;
    if (snap && !isScheduleKosztorysSnapshot(snap)) {
      offerBoq = tryBuildOfferBoqFromSnapshot(snap);
      if (pool[0] && offerBoq) {
        const one = mergeDwellingArtifactLines([pool[0]]);
        keepOneCollapsed += countKeepOneCollapsedFromWarnings(one.warnings);
        if (one.completeness === "ready" && one.lines.length > 0) {
          const composed = composeDwellingOfferBoq({
            snapshot: {
              tenderId,
              dwellingId: "legacy_single",
              sourceDocumentIds: [pool[0].documentId],
              sourceArtifactIds: [pool[0].artifactId],
              lines: one.lines,
              completeness: "ready",
              warnings: one.warnings,
            },
          });
          if (composed.ok) {
            offerBoq = composed.document;
            lineProvenance = composed.lineProvenance;
            pushMasterLines("legacy_single", composed.document.lines ?? [], composed.lineProvenance);
          }
        }
      }
      composedLineCount = offerBoq?.lines?.length ?? 0;
      if (masterBoqLines.length === 0 && offerBoq?.lines?.length) {
        // Snapshot-only path without compose provenance — still 1:1 for classification input.
        pushMasterLines("legacy_single", offerBoq.lines, null);
      }
    } else if (snap && isScheduleKosztorysSnapshot(snap)) {
      noteScheduleBlocked();
    }
  }

  const sourceLineCount = countSourceLinesInArtifacts(pool);
  const lineIntegrity = computeCompositionLineIntegrity({
    sourceLineCount,
    composedLineCount: mode === "multi" && dwellingMapping.allMapped
      ? composedLineCount
      : sourceLineCount, // without complete map: do not claim unexplained loss vs partial primary
    keepOneCollapsedRawLines:
      mode === "multi" && dwellingMapping.allMapped ? keepOneCollapsed : 0,
  });
  // When multi map complete, integrity compares source↔composed; surface failures.
  if (mode === "multi" && dwellingMapping.allMapped && !lineIntegrity.ok) {
    for (const r of lineIntegrity.reasons) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }

  const linesForValidation =
    mode === "multi" && dwellingMapping.allMapped && allComposedLines.length > 0
      ? allComposedLines
      : (offerBoq?.lines ?? []);
  const lines = linesForValidation;
  const detectedRowCount = przedmiary.reduce((s, p) => s + p.detectedRowCount, 0)
    || (item.tenderDossier?.kosztorys?.rowCount ?? 0);
  const extractedCount = przedmiary.reduce((s, p) => s + p.extractedCount, 0)
    || sourceLineCount
    || lines.length;
  const validCount = przedmiary.reduce((s, p) => s + p.validCount, 0)
    || lines.filter((l) => isValidLine(l)).length;
  const extractionExecuted = Boolean(
    offerBoq != null || przedmiary.some((p) => p.extractedCount > 0 || p.snapshotOk),
  );

  if (detectedRowCount > extractedCount && extractedCount > 0) {
    // Multi + Owner map + integrity OK: raw rowCount may include empty LP/opis rows
    // that merge skips — explained, not EXTRACT_SHORTFALL.
    if (
      mode === "multi"
      && dwellingMapping.allMapped
      && lineIntegrity.ok
      && sourceLineCount > 0
      && detectedRowCount >= sourceLineCount
    ) {
      reasons.push(
        `RAW_ROW_SKIP_EXPLAINED raw=${detectedRowCount} extractable=${sourceLineCount} composed=${composedLineCount} — puste LP/opis pominięte; lineIntegrity OK`,
      );
    } else {
      gaps.push(`EXTRACT_SHORTFALL expected=${detectedRowCount} extracted=${extractedCount}`);
    }
  }
  if (przedmiary.some((p) => p.unreadable)) gaps.push("UNREADABLE_SOURCE");
  if (costDocuments.some((d) => !d.kosztorysParseSupported && d.isPrzedmiar)) {
    gaps.push("UNSUPPORTED_KOSZTORYS_TYPE");
  }

  const validation = validateOfferLines(lines, lineProvenance);
  if (!lineProvenance && lines.length > 0) {
    validation.missingLineage = 0;
    validation.reasons = validation.reasons.filter((r) => !r.startsWith("MISSING_LINEAGE"));
  }

  const branches = new Set(
    przedmiary.map((p) => p.branchHint).filter((b) => b && b !== "unknown"),
  );
  const sourceCount = Math.max(przedmiary.length, costDocuments.length, pool.length);

  const multiMapBlocking =
    dwellingMapArts.length > 1
    && (!dwellingMapping.allMapped || reasons.some((r) => r.includes("MULTI_SOURCE_NO_DWELLING_MAP")));
  const composeBlocking = dwellingUnits.some((d) => !d.composeOk);
  const integrityBlocking =
    mode === "multi" && dwellingMapping.allMapped && !lineIntegrity.ok;
  const rawSkipExplained = reasons.some((r) => r.startsWith("RAW_ROW_SKIP_EXPLAINED"));

  let status: IkDocumentExpertStatus = "pending";
  if (!discoverySettled && documents.length === 0) {
    status = "pending";
    reasons.push("DISCOVERY_PENDING");
  } else if (documents.length === 0) {
    status = "gap";
    reasons.push("GAP_NO_DOCUMENTS — discovery zakończone, brak załączników. To nie jest happy-path HOLD.");
  } else if (costDocuments.length === 0 && przedmiary.length === 0) {
    status = "gap";
    reasons.push("GAP_NO_COST_DOCUMENT — Document Expert kontynuuje diagnostykę (ZIP/platforma/upload).");
  } else if (przedmiary.some((p) => p.unreadable) && validCount === 0) {
    status = "hold";
    reasons.push("HOLD_UNREADABLE_DOCUMENT");
  } else if (reasons.some((r) => r.includes("CONFLICT"))) {
    status = "hold";
  } else if (integrityBlocking) {
    status = "hold";
  } else if (multiMapBlocking || composeBlocking) {
    status = "partial";
  } else if (extractedCount === 0) {
    status = "partial";
    reasons.push("PARTIAL_NO_EXTRACTION — kandydaci kosztowi bez linii w runtime.");
  } else if (
    gaps.length
    || validation.missingQuantity
    || validation.missingUnit
    || validation.missingDescription
    || (detectedRowCount > extractedCount && !rawSkipExplained)
  ) {
    status = "partial";
    reasons.push("PARTIAL_EXTRACTION_GAPS");
  } else if (
    validCount > 0
    && (
      (mode === "legacy_single" && offerBoq)
      || (mode === "multi" && dwellingMapping.allMapped && composedLineCount > 0 && !composeBlocking && lineIntegrity.ok)
    )
  ) {
    status = "ready";
  } else {
    status = "partial";
  }

  const masterLineCount =
    mode === "multi" && dwellingMapping.allMapped
      ? composedLineCount
      : (offerBoq?.lines?.length ?? 0);

  let boqDependencyGraph: BoqDependencyGraph | null = null;
  let boqDependencyGraphsByDwelling: Record<string, BoqDependencyGraph> | null = null;
  if (masterBoqLines.length > 0) {
    // S3-SCOPE: enrich S2→S3 per dwelling so positionNo/lp never collides across dwellings.
    const indicesByDwelling = new Map<string, number[]>();
    for (let i = 0; i < masterBoqLines.length; i += 1) {
      const dw = normalizeDwellingId(masterBoqLines[i]!.dwellingId || "legacy_single");
      const bucket = indicesByDwelling.get(dw) ?? [];
      bucket.push(i);
      indicesByDwelling.set(dw, bucket);
    }

    const graphsByDwelling: Record<string, BoqDependencyGraph> = {};
    for (const [dwellingId, indices] of indicesByDwelling) {
      const lines = indices.map((i) => masterBoqLines[i]!.line);
      const qtyEnriched = enrichOfferBoqLinesWithQuantityIntelligence(lines);
      const semantic = enrichOfferBoqLinesWithDependencyGraph(qtyEnriched);
      graphsByDwelling[dwellingId] = semantic.graph;
      for (let j = 0; j < indices.length; j += 1) {
        masterBoqLines[indices[j]!]!.line = semantic.lines[j]!;
      }
    }

    if (mode === "multi" && indicesByDwelling.size > 0) {
      boqDependencyGraphsByDwelling = graphsByDwelling;
    }

    // Primary graph for legacy_single P7 and first-dwelling offerBoq consumers.
    const primaryDwellingId = offerBoq
      ? normalizeDwellingId(
        masterBoqLines.find((r) =>
          (offerBoq!.lines ?? []).some((l) => l.lineId === r.line.lineId),
        )?.dwellingId
          ?? (mode === "multi" ? (mappedDwellings[0]?.dwellingId ?? "legacy_single") : "legacy_single"),
      )
      : normalizeDwellingId(
        [...indicesByDwelling.keys()][0] ?? "legacy_single",
      );
    boqDependencyGraph = graphsByDwelling[primaryDwellingId]
      ?? Object.values(graphsByDwelling)[0]
      ?? null;

    // P7-SYNC: offerBoq.lines → same enriched objects as masterBoqLines (by lineId).
    if (offerBoq) {
      const synced = synchronizeOfferBoqFromMasterLines(offerBoq, masterBoqLines, {
        dwellingId: mode === "multi" ? primaryDwellingId : null,
      });
      if (synced) offerBoq = synced;
    }
  }

  return {
    tenderId,
    discoverySettled,
    attachmentCount: countTenderAttachments(item),
    documents,
    costDocuments,
    przedmiary,
    extraction: {
      detectedRowCount,
      extractedCount,
      validCount,
      executed: extractionExecuted,
      gaps,
    },
    validation,
    dwellingMapping,
    lineIntegrity,
    dwellings: dwellingUnits,
    masterBoq: {
      mode,
      schemaVersion: offerBoq?.schemaVersion ?? (offerBoq ? OFFER_BOQ_SCHEMA_VERSION : null),
      lineCount: masterLineCount,
      composedLineCount,
      sourceLineCount,
      dwellingCount: dwellingCount || (mode === "legacy_single" && masterLineCount ? 1 : 0),
      branchCount: branches.size,
      sourceCount,
      hasLineProvenance: Boolean(lineProvenance && Object.keys(lineProvenance).length > 0),
      status,
      readyForExperts: status === "ready",
    },
    status,
    reasons,
    offerBoq,
    lineProvenance,
    masterBoqLines,
    boqDependencyGraph,
    boqDependencyGraphsByDwelling,
  };
}
