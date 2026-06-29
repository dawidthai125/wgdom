/**
 * TP200A — lazy heavy dossier build (Dokumenty / Wycena / Kosztorys V4).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildTenderDossierHeavy,
  tenderDossierHeavyParseDone,
} from "@/lib/tender-dossier-pipeline";
import {
  buildHeavyParseDocumentFingerprint,
  buildHeavyParseDocumentSet,
  deriveUnifiedAttachmentGate,
} from "@/lib/tender-pipeline/unified-attachment-gate";

const dossierInflightIds = new Set<string>();

export function clearDossierInflightForItem(itemId: string): void {
  dossierInflightIds.delete(itemId);
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

export function useTenderDossierHeavyLazy(opts: {
  item: TenderPipelineItem;
  enabled: boolean;
  onUpdate: (patch: Partial<TenderPipelineItem>) => void;
  athPreviewEnabled?: boolean;
}): {
  dossierBuilding: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  parseErrorMessage: string | null;
  retryDossierParse: () => void;
  retryNonce: number;
} {
  const { item, enabled, onUpdate, athPreviewEnabled = true } = opts;
  const itemId = item.id;
  const [dossierBuilding, setDossierBuilding] = useState(false);
  const [dossierSaving, setDossierSaving] = useState(false);
  const [dossierParseFailed, setDossierParseFailed] = useState(false);
  const [parseErrorMessage, setParseErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const onUpdateRef = useRef(onUpdate);
  const pendingSaveRef = useRef(false);
  onUpdateRef.current = onUpdate;

  const retryDossierParse = useCallback(() => {
    clearDossierInflightForItem(itemId);
    pendingSaveRef.current = false;
    setDossierSaving(false);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    setRetryNonce((n) => n + 1);
  }, [itemId]);

  useEffect(() => {
    if (!pendingSaveRef.current) return;
    if (tenderDossierHeavyParseDone(item.tenderDossier)) {
      pendingSaveRef.current = false;
      setDossierSaving(false);
    }
  }, [
    item.tenderDossier?.builtAt,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.kosztorys?.ok,
    item.tenderDossier?.scanSummary?.parsedAt,
  ]);

  const gateFingerprint = useMemo(
    () => buildHeavyParseDocumentFingerprint(item),
    [
      item.id,
      item.tenderId,
      item.bzpDocuments,
      item.externalDocDiscovery?.files,
      item.uploadedFile?.id,
      item.uploadedFile?.filename,
      item.tenderDossier?.parserVersion,
    ],
  );

  const heavyParseDocuments = useMemo(
    () => buildHeavyParseDocumentSet(item),
    [gateFingerprint, item],
  );

  useEffect(() => {
    if (!enabled) return;
    if (tenderDossierHeavyParseDone(item.tenderDossier)) {
      pendingSaveRef.current = false;
      setDossierSaving(false);
      setDossierParseFailed(false);
      setParseErrorMessage(null);
      return;
    }
    const gate = deriveUnifiedAttachmentGate(item);
    if (!gate.canStartHeavyParse) return;
    if (dossierInflightIds.has(itemId)) return;

    const snapshot = item;
    const snapshotDocs = heavyParseDocuments;
    const snapshotNoticeHtml = item.noticeHtml;
    const snapshotSwz = item.swzAnalysis ?? null;
    const snapshotDossier = item.tenderDossier ?? null;
    const snapshotEstimate = item.ourEstimatePln;

    let cancelled = false;
    dossierInflightIds.add(itemId);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    (async () => {
      setDossierBuilding(true);
      try {
        const built = await buildTenderDossierHeavy({
          item: snapshot,
          docs: snapshotDocs,
          noticeHtml: snapshotNoticeHtml,
          existingSwz: snapshotSwz,
          existingDossier: snapshotDossier,
          athPreviewEnabled,
        });
        if (cancelled) return;
        const patch: Partial<TenderPipelineItem> = {
          tenderDossier: built.tenderDossier,
        };
        if (built.swzAnalysis) patch.swzAnalysis = built.swzAnalysis;
        if (built.ourEstimatePln != null && snapshotEstimate == null) {
          patch.ourEstimatePln = built.ourEstimatePln;
        }
        pendingSaveRef.current = true;
        setDossierSaving(true);
        onUpdateRef.current(patch);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setDossierParseFailed(true);
        setParseErrorMessage(message);
        logDossierParseErrorTelemetry({
          tenderId: snapshot.tenderId,
          itemId: snapshot.id,
          message,
        });
      } finally {
        dossierInflightIds.delete(itemId);
        if (!cancelled) setDossierBuilding(false);
        if (cancelled) {
          pendingSaveRef.current = false;
          setDossierSaving(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      dossierInflightIds.delete(itemId);
    };
  }, [
    enabled,
    itemId,
    gateFingerprint,
    heavyParseDocuments,
    item.tenderDossier?.builtAt,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.kosztorys?.ok,
    item.tenderDossier?.scanSummary?.parsedAt,
    athPreviewEnabled,
    retryNonce,
  ]);

  return {
    dossierBuilding,
    dossierSaving,
    dossierParseFailed,
    parseErrorMessage,
    retryDossierParse,
    retryNonce,
  };
}

/** Test-only reset — nie używać w prod UI. */
export function resetDossierHeavyLazyForTests(): void {
  dossierInflightIds.clear();
}

/** Test-only — stan inflight workera. */
export function isDossierInflightForItem(itemId: string): boolean {
  return dossierInflightIds.has(itemId);
}

/** Test-only — symulacja zajętego inflight (abort lifecycle). */
export function markDossierInflightForTest(itemId: string): void {
  dossierInflightIds.add(itemId);
}
