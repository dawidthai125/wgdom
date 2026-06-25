/**
 * TP200A — lazy heavy dossier build (Dokumenty / Wycena / Kosztorys V4).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildTenderDossierHeavy,
  tenderDossierHeavyParseDone,
} from "@/lib/tender-dossier-pipeline";

const dossierInflightIds = new Set<string>();

const DOSSIER_PARSE_TELEMETRY_KEY = "wgdom-dossier-parse-telemetry";
const DOSSIER_PARSE_TELEMETRY_MAX = 50;

export interface DossierParseTelemetryEntry {
  at: string;
  tenderId: string;
  itemId: string;
  message: string;
}

/** Telemetria błędów lazy parse — dev console + ring buffer LS (bez PII poza id). */
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
  dossierParseFailed: boolean;
  parseErrorMessage: string | null;
  retryDossierParse: () => void;
} {
  const { item, enabled, onUpdate, athPreviewEnabled = true } = opts;
  const [dossierBuilding, setDossierBuilding] = useState(false);
  const [dossierParseFailed, setDossierParseFailed] = useState(false);
  const [parseErrorMessage, setParseErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const retryDossierParse = useCallback(() => {
    dossierInflightIds.delete(item.id);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    setRetryNonce((n) => n + 1);
  }, [item.id]);

  useEffect(() => {
    if (!enabled) return;
    if (tenderDossierHeavyParseDone(item.tenderDossier)) {
      setDossierParseFailed(false);
      setParseErrorMessage(null);
      return;
    }
    if (!item.tenderId || !(item.bzpDocuments?.length)) return;
    if (dossierInflightIds.has(item.id)) return;

    let cancelled = false;
    dossierInflightIds.add(item.id);
    setDossierParseFailed(false);
    setParseErrorMessage(null);
    (async () => {
      setDossierBuilding(true);
      try {
        const built = await buildTenderDossierHeavy({
          item,
          docs: item.bzpDocuments ?? [],
          noticeHtml: item.noticeHtml,
          existingSwz: item.swzAnalysis ?? null,
          existingDossier: item.tenderDossier ?? null,
          athPreviewEnabled,
        });
        if (cancelled) return;
        const patch: Partial<TenderPipelineItem> = {
          tenderDossier: built.tenderDossier,
        };
        if (built.swzAnalysis) patch.swzAnalysis = built.swzAnalysis;
        if (built.ourEstimatePln != null && item.ourEstimatePln == null) {
          patch.ourEstimatePln = built.ourEstimatePln;
        }
        onUpdateRef.current(patch);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setDossierParseFailed(true);
        setParseErrorMessage(message);
        logDossierParseErrorTelemetry({
          tenderId: item.tenderId,
          itemId: item.id,
          message,
        });
      } finally {
        dossierInflightIds.delete(item.id);
        if (!cancelled) setDossierBuilding(false);
      }
    })();
    return () => { cancelled = true; };
  }, [
    enabled,
    item.id,
    item.tenderId,
    item.documentsFetchedAt,
    item.bzpDocuments,
    item.tenderDossier?.builtAt,
    item.tenderDossier?.parserVersion,
    item.tenderDossier?.kosztorys?.ok,
    item.tenderDossier?.scanSummary?.parsedAt,
    item.swzAnalysis,
    item.ourEstimatePln,
    item.noticeHtml,
    athPreviewEnabled,
    retryNonce,
  ]);

  return { dossierBuilding, dossierParseFailed, parseErrorMessage, retryDossierParse };
}

/** Test-only reset — nie używać w prod UI. */
export function resetDossierHeavyLazyForTests(): void {
  dossierInflightIds.clear();
}
