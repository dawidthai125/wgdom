/**
 * TP200A — lazy heavy dossier build (Dokumenty / Wycena / Kosztorys V4).
 * NG11-A1 — progressive: cost phase → partial (local) → metadata enrichment → final (cloud).
 * TENDERS-SYNC-STORM-P0 — E-RUN deps stable (no builtAt); partial local-only; circuit breaker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildTenderDossierCostPhase,
  enrichTenderDossierMetadataPhase,
  tenderDossierHeavyParseDone,
} from "@/lib/tender-dossier-pipeline";
import {
  applyForceHeavyRescanAt,
  clearForceHeavyRescanAt,
  COST_MULTI_02_FORCE_RESCAN_CTA,
  hasMulti02BranchArtifacts,
  hasMulti02CostSources,
  traceForceHeavyRescan,
} from "@/lib/cost-multi-02-force-rescan";
import {
  buildHeavyParseDocumentFingerprint,
  buildHeavyParseDocumentSet,
  deriveUnifiedAttachmentGate,
} from "@/lib/tender-pipeline/unified-attachment-gate";
import { markPipelineTimingStage } from "@/lib/tender-pipeline/tender-pipeline-timing";
import type { TenderItemUpdateOpts } from "@/lib/tender-pipeline/tender-item-persist";

export type {
  TenderItemPersistMode,
  TenderItemUpdateOpts,
  TenderItemOnUpdate,
} from "@/lib/tender-pipeline/tender-item-persist";

const dossierInflightIds = new Set<string>();
const enrichmentInflightIds = new Set<string>();

/** E-RUN attempts per (itemId + gateFingerprint + retryNonce) — circuit breaker. */
const heavyRunAttempts = new Map<string, number>();
const HEAVY_MAX_RUNS_PER_KEY = 2;

/** E-RUN dependency keys — Sync Storm P0 contract (must not include builtAt). */
export const HEAVY_E_RUN_DEP_KEYS = [
  "enabled",
  "itemId",
  "gateFingerprint",
  "athPreviewEnabled",
  "retryNonce",
] as const;

export function clearDossierInflightForItem(itemId: string): void {
  dossierInflightIds.delete(itemId);
  enrichmentInflightIds.delete(itemId);
}

const DOSSIER_PARSE_TELEMETRY_KEY = "wgdom-dossier-parse-telemetry";
const DOSSIER_PARSE_TELEMETRY_MAX = 50;

export interface DossierParseTelemetryEntry {
  at: string;
  tenderId: string;
  itemId: string;
  message: string;
}

/** Telemetria błędów lazy parse — dev console + ring buffer LS (bez PII). */
export function logDossierParseErrorTelemetry(entry: Omit<DossierParseTelemetryEntry, "at">): void {
  if (typeof window === "undefined") return;
  const row: DossierParseTelemetryEntry = { ...entry, at: new Date().toISOString() };
  console.error("[wgdom:dossier-parse]", row);
  try {
    const raw = localStorage.getItem(DOSSIER_PARSE_TELEMETRY_KEY);
    const prev: DossierParseTelemetryEntry[] = raw ? JSON.parse(raw) : [];
    prev.push(row);
    if (prev.length > DOSSIER_PARSE_TELEMETRY_MAX) {
      prev.splice(0, prev.length - DOSSIER_PARSE_TELEMETRY_MAX);
    }
    localStorage.setItem(DOSSIER_PARSE_TELEMETRY_KEY, JSON.stringify(prev));
  } catch {
    /* telemetry best-effort */
  }
}

export function readDossierParseTelemetry(): DossierParseTelemetryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOSSIER_PARSE_TELEMETRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function heavyRunKey(itemId: string, gateFingerprint: string, retryNonce: number): string {
  return `${itemId}::${gateFingerprint}::${retryNonce}`;
}

export function useTenderDossierHeavyLazy(opts: {
  item: TenderPipelineItem;
  enabled: boolean;
  onUpdate: (patch: Partial<TenderPipelineItem>, opts?: TenderItemUpdateOpts) => void;
  athPreviewEnabled?: boolean;
}): {
  dossierBuilding: boolean;
  dossierEnriching: boolean;
  partialPersistPending: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  parseErrorMessage: string | null;
  retryDossierParse: () => void;
  /** COST-MULTI-02 Force Rescan — soft invalidate + retryNonce (DF). */
  forceHeavyRescan: () => void;
  retryNonce: number;
} {
  const { item, enabled, onUpdate, athPreviewEnabled = true } = opts;
  const itemId = item.id;
  const [dossierBuilding, setDossierBuilding] = useState(false);
  const [dossierEnriching, setDossierEnriching] = useState(false);
  const [dossierSaving, setDossierSaving] = useState(false);
  const [dossierParseFailed, setDossierParseFailed] = useState(false);
  const [parseErrorMessage, setParseErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [partialPersistPending, setPartialPersistPending] = useState(false);
  const [finalPersistPending, setFinalPersistPending] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const itemRef = useRef(item);
  itemRef.current = item;
  /** Generation guard — persist re-render must not invalidate in-flight work. */
  const runGenerationRef = useRef(0);
  /**
   * Race guard: onUpdate(force) + retryNonce++ w tym samym ticku — E-RUN może
   * wystartować zanim React przepchnie forceHeavyRescanAt do item.prop.
   */
  const forceRescanAtRef = useRef<string | null>(null);

  useEffect(() => {
    const at = item.tenderDossier?.forceHeavyRescanAt;
    if (at) forceRescanAtRef.current = at;
    // Nie czyść ref tylko dlatego, że partial stamp usunął force z dossier —
    // clear w success/fail E-RUN.
  }, [item.tenderDossier?.forceHeavyRescanAt]);

  const retryDossierParse = useCallback(() => {
    clearDossierInflightForItem(itemId);
    setPartialPersistPending(false);
    setFinalPersistPending(false);
    setDossierSaving(false);
    setDossierEnriching(false);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    setRetryNonce((n) => n + 1);
  }, [itemId]);

  const forceHeavyRescan = useCallback(() => {
    if (!COST_MULTI_02_FORCE_RESCAN_CTA) return;
    const live = itemRef.current;
    const dossier = live.tenderDossier;
    if (!dossier) return;
    const at = new Date().toISOString();
    forceRescanAtRef.current = at;
    traceForceHeavyRescan("force_heavy_rescan_start", {
      tenderId: live.tenderId,
      itemId: live.id,
      forceHeavyRescanAt: at,
      hadSources: hasMulti02CostSources(dossier),
      hadArtifacts: hasMulti02BranchArtifacts(dossier),
    });
    onUpdateRef.current(
      { tenderDossier: applyForceHeavyRescanAt(dossier, at) },
      { persist: "local" },
    );
    clearDossierInflightForItem(itemId);
    setPartialPersistPending(false);
    setFinalPersistPending(false);
    setDossierSaving(false);
    setDossierEnriching(false);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    setRetryNonce((n) => n + 1);
  }, [itemId]);

  // E-UI — partial save flags (may watch builtAt / kosztorys; must NOT start E-RUN)
  useEffect(() => {
    if (!partialPersistPending) return;
    if (item.tenderDossier?.kosztorys?.ok) {
      setPartialPersistPending(false);
      if (!finalPersistPending) setDossierSaving(false);
    }
  }, [
    partialPersistPending,
    finalPersistPending,
    item.tenderDossier?.builtAt,
    item.tenderDossier?.kosztorys?.ok,
  ]);

  // E-UI — final completion flags
  useEffect(() => {
    if (!finalPersistPending) return;
    if (tenderDossierHeavyParseDone(item.tenderDossier)) {
      setFinalPersistPending(false);
      setDossierSaving(false);
      forceRescanAtRef.current = null;
      const d = item.tenderDossier;
      if (d) {
        traceForceHeavyRescan("force_heavy_rescan_done", {
          tenderId: item.tenderId,
          itemId: item.id,
          ok: true,
          sourcesN: d.scanSummary?.costCandidateSources?.length ?? 0,
          artifactsN: d.scanSummary?.branchWinnerArtifacts?.length ?? 0,
        });
      }
    }
  }, [
    finalPersistPending,
    item.tenderDossier?.builtAt,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.kosztorys?.ok,
    item.tenderDossier?.scanSummary?.parsedAt,
    item.tenderDossier?.forceHeavyRescanAt,
    item.tenderId,
    item.id,
    item.tenderDossier,
  ]);

  // Docs-only fingerprint — parserVersion / builtAt MUST NOT be here (Sync Storm).
  const gateFingerprint = useMemo(
    () => buildHeavyParseDocumentFingerprint(item),
    [
      item.id,
      item.tenderId,
      item.bzpDocuments,
      item.externalDocDiscovery?.files,
      item.uploadedFile?.id,
      item.uploadedFile?.filename,
    ],
  );

  // E-RUN — start heavy only when enabled / item / docs / retry change
  useEffect(() => {
    if (!enabled) return;

    const live = itemRef.current;
    const forceActive = Boolean(
      forceRescanAtRef.current
      || (COST_MULTI_02_FORCE_RESCAN_CTA && live.tenderDossier?.forceHeavyRescanAt),
    );
    if (!forceActive && tenderDossierHeavyParseDone(live.tenderDossier)) {
      setPartialPersistPending(false);
      setFinalPersistPending(false);
      setDossierSaving(false);
      setDossierEnriching(false);
      setDossierParseFailed(false);
      setParseErrorMessage(null);
      return;
    }

    const gate = deriveUnifiedAttachmentGate(live);
    if (!gate.canStartHeavyParse) return;
    if (dossierInflightIds.has(itemId)) return;

    const runKey = heavyRunKey(itemId, gateFingerprint, retryNonce);
    const attempts = heavyRunAttempts.get(runKey) ?? 0;
    if (attempts >= HEAVY_MAX_RUNS_PER_KEY) {
      setDossierParseFailed(true);
      setParseErrorMessage("Przekroczono limit ponowień parsowania dossier (circuit breaker).");
      return;
    }
    heavyRunAttempts.set(runKey, attempts + 1);

    const snapshot = live;
    const snapshotDocs = buildHeavyParseDocumentSet(snapshot);
    const snapshotNoticeHtml = snapshot.noticeHtml;
    const snapshotSwz = snapshot.swzAnalysis ?? null;
    const snapshotDossier = snapshot.tenderDossier ?? null;
    const snapshotEstimate = snapshot.ourEstimatePln;
    // Force: świeży Heavy bez reuse starego scanSummary (DF — wypełnić sources/artifacts).
    const existingDossierForBuild = forceActive ? null : snapshotDossier;

    let cancelled = false;
    const generation = ++runGenerationRef.current;
    const isStale = () => cancelled || generation !== runGenerationRef.current;
    dossierInflightIds.add(itemId);
    setDossierParseFailed(false);
    setParseErrorMessage(null);

    (async () => {
      setDossierBuilding(true);
      try {
        const costBuilt = await buildTenderDossierCostPhase({
          item: snapshot,
          docs: snapshotDocs,
          noticeHtml: snapshotNoticeHtml,
          existingSwz: snapshotSwz,
          existingDossier: existingDossierForBuild,
          athPreviewEnabled,
          pipelineTimingItemId: itemId,
        });
        if (isStale()) return;

        const partialPatch: Partial<TenderPipelineItem> = {
          tenderDossier: costBuilt.tenderDossier,
        };
        if (costBuilt.swzAnalysis) partialPatch.swzAnalysis = costBuilt.swzAnalysis;
        if (costBuilt.ourEstimatePln != null && snapshotEstimate == null) {
          partialPatch.ourEstimatePln = costBuilt.ourEstimatePln;
        }
        setPartialPersistPending(true);
        setDossierSaving(true);
        markPipelineTimingStage(itemId, "heavy.persist_dossier", "start", { detail: "partial-local" });
        // Sync Storm P0: partial = local only — must not trigger cloud get+set.
        onUpdateRef.current(partialPatch, { persist: "local" });
        markPipelineTimingStage(itemId, "heavy.persist_dossier", "end", { detail: "partial-local" });

        setDossierBuilding(false);

        if (!costBuilt.parseSession) {
          // Terminal: no enrichment — mark parsedAt so heavy won't re-arm on remount (G4).
          const dossier = costBuilt.tenderDossier;
          const parsedAt = dossier.scanSummary?.parsedAt ?? new Date().toISOString();
          const terminalDossier = {
            ...dossier,
            scanSummary: dossier.scanSummary
              ? { ...dossier.scanSummary, parsedAt }
              : {
                  totalDocuments: 0,
                  scanned: 0,
                  parsed: 0,
                  byType: {
                    pdf: 0,
                    docx: 0,
                    xlsx: 0,
                    zip: 0,
                    ath: 0,
                    sevenZip: 0,
                    other: 0,
                  },
                  sevenZipCount: 0,
                  kosztorysFound: false,
                  valueFound: false,
                  criteriaFound: false,
                  estimateFound: false,
                  costDiscovery: null,
                  parsedAt,
                },
          };
          // Clear soft-invalidate on terminal (stamp path also strips force).
          const cleared = clearForceHeavyRescanAt(terminalDossier);
          forceRescanAtRef.current = null;
          onUpdateRef.current(
            { tenderDossier: cleared },
            { persist: "cloud" },
          );
          setFinalPersistPending(true);
          return;
        }

        setDossierEnriching(true);
        enrichmentInflightIds.add(itemId);
        const finalBuilt = await enrichTenderDossierMetadataPhase({
          item: snapshot,
          docs: snapshotDocs,
          noticeHtml: snapshotNoticeHtml,
          existingSwz: snapshotSwz,
          existingDossier: existingDossierForBuild,
          athPreviewEnabled,
          pipelineTimingItemId: itemId,
          parseSession: costBuilt.parseSession,
          partialDossier: costBuilt.tenderDossier,
          partialSwz: costBuilt.swzAnalysis,
          partialEstimatePln: costBuilt.ourEstimatePln,
        });
        if (isStale()) return;

        const finalPatch: Partial<TenderPipelineItem> = {
          tenderDossier: finalBuilt.tenderDossier,
        };
        if (finalBuilt.swzAnalysis) finalPatch.swzAnalysis = finalBuilt.swzAnalysis;
        if (finalBuilt.ourEstimatePln != null && snapshotEstimate == null) {
          finalPatch.ourEstimatePln = finalBuilt.ourEstimatePln;
        }
        forceRescanAtRef.current = null;
        setFinalPersistPending(true);
        setDossierSaving(true);
        markPipelineTimingStage(itemId, "heavy.persist_dossier", "start", { detail: "final-cloud" });
        onUpdateRef.current(finalPatch, { persist: "cloud" });
        markPipelineTimingStage(itemId, "heavy.persist_dossier", "end", { detail: "final-cloud" });
      } catch (e) {
        if (isStale()) return;
        const message = e instanceof Error ? e.message : String(e);
        setDossierParseFailed(true);
        setParseErrorMessage(message);
        logDossierParseErrorTelemetry({
          tenderId: snapshot.tenderId,
          itemId: snapshot.id,
          message,
        });
        // DF §4.4 — wyczyść force; CTA może wrócić gdy fields missing.
        forceRescanAtRef.current = null;
        const failDossier = snapshot.tenderDossier;
        if (failDossier?.forceHeavyRescanAt) {
          onUpdateRef.current(
            { tenderDossier: clearForceHeavyRescanAt(failDossier) },
            { persist: "local" },
          );
        }
        traceForceHeavyRescan("force_heavy_rescan_fail", {
          tenderId: snapshot.tenderId,
          itemId: snapshot.id,
          errorClass: message.slice(0, 120),
        });
      } finally {
        // Only the live generation clears inflight / building flags (avoid clobbering remount).
        if (generation === runGenerationRef.current) {
          dossierInflightIds.delete(itemId);
          enrichmentInflightIds.delete(itemId);
          setDossierBuilding(false);
          setDossierEnriching(false);
        }
      }
    })();

    return () => {
      // Cancel only when E-RUN deps truly change (item/docs/retry) — not on persist re-render.
      cancelled = true;
      if (runGenerationRef.current === generation) {
        runGenerationRef.current += 1;
      }
      dossierInflightIds.delete(itemId);
      enrichmentInflightIds.delete(itemId);
      setPartialPersistPending(false);
      setFinalPersistPending(false);
      setDossierSaving(false);
      setDossierEnriching(false);
      setDossierBuilding(false);
    };
  }, [enabled, itemId, gateFingerprint, athPreviewEnabled, retryNonce]);

  return {
    dossierBuilding,
    dossierEnriching,
    partialPersistPending,
    dossierSaving,
    dossierParseFailed,
    parseErrorMessage,
    retryDossierParse,
    forceHeavyRescan,
    retryNonce,
  };
}

/** Test-only reset — nie używać w prod UI. */
export function resetDossierHeavyLazyForTests(): void {
  dossierInflightIds.clear();
  enrichmentInflightIds.clear();
  heavyRunAttempts.clear();
}

/** Test-only — stan inflight workera. */
export function isDossierInflightForItem(itemId: string): boolean {
  return dossierInflightIds.has(itemId);
}

/** Test-only — enrichment w toku. */
export function isDossierEnrichmentInflightForItem(itemId: string): boolean {
  return enrichmentInflightIds.has(itemId);
}

/** Test-only — symulacja zajętego inflight (abort lifecycle). */
export function markDossierInflightForTest(itemId: string): void {
  dossierInflightIds.add(itemId);
}

/** Test-only — circuit breaker attempt count. */
export function getHeavyRunAttemptsForTest(
  itemId: string,
  gateFingerprint: string,
  retryNonce: number,
): number {
  return heavyRunAttempts.get(heavyRunKey(itemId, gateFingerprint, retryNonce)) ?? 0;
}

/** Test-only — bump attempt counter (circuit breaker). */
export function bumpHeavyRunAttemptsForTest(
  itemId: string,
  gateFingerprint: string,
  retryNonce: number,
): number {
  const k = heavyRunKey(itemId, gateFingerprint, retryNonce);
  const n = (heavyRunAttempts.get(k) ?? 0) + 1;
  heavyRunAttempts.set(k, n);
  return n;
}

export function getHeavyMaxRunsPerKeyForTest(): number {
  return HEAVY_MAX_RUNS_PER_KEY;
}
