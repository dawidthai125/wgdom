/**
 * WIRE-CHIEF-SESSION-01 — cienki hook Session.
 * Obserwuje item + readiness · REUSE assembleChiefWireRuntimeRo + engine.
 * Dossier tylko in-memory · bez UI · bez persist.
 *
 * Q12 FIX DF — Case identity content-stable across reloads
 * (stableCaseStamp → builtAtIso + fingerprint + nowIso).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { assembleChiefWireRuntimeRo } from "@/lib/chief-wire-adapters";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildChiefSessionCaseId,
  buildChiefSessionFingerprint,
  createChiefSessionEngine,
  idleChiefSessionOutput,
  isChiefOrchestratorSessionEnabled,
  resolveStableCaseStamp,
  type ChiefSessionOutput,
} from "@/lib/chief-session";

export function useChiefOrchestratorSession(opts: {
  /** Zwykle: isChiefOrchestratorSessionEnabled() && Boolean(item) */
  enabled: boolean;
  item: TenderPipelineItem | null;
  pricingReadyPartial?: boolean;
  pricingReadyFinal?: boolean;
  /** Auto-start gdy ready (default true). */
  autoStart?: boolean;
  maxReturnLoops?: number;
  /**
   * DEMAND-RESEARCH-01 S0 — bump po Quotes ACCEPT → re-assemble Chief (Cost refresh).
   * Nie remount / nie full reload.
   */
  refreshNonce?: number;
}): ChiefSessionOutput {
  const {
    enabled,
    item,
    pricingReadyPartial = false,
    pricingReadyFinal = false,
    autoStart = true,
    maxReturnLoops,
    refreshNonce = 0,
  } = opts;

  const engineRef = useRef(
    createChiefSessionEngine({
      isEnabled: () => isChiefOrchestratorSessionEnabled(),
    }),
  );
  const [snap, setSnap] = useState<ChiefSessionOutput>(() =>
    idleChiefSessionOutput(),
  );

  useEffect(() => {
    return engineRef.current.subscribe(() => {
      setSnap(engineRef.current.getSnapshot());
    });
  }, []);

  const pricingReady = pricingReadyPartial === true || pricingReadyFinal === true;

  const runtimeKey = useMemo(() => {
    if (!item) return "none";
    const dossierTs =
      item.tenderDossier?.kosztorys?.parsedAt ??
      item.tenderDossier?.builtAt ??
      item.updatedAt ??
      "";
    const pv = item.tenderDossier?.parserVersion ?? "";
    return `${item.id}|${dossierTs}|${pv}|${pricingReady ? "1" : "0"}|rn:${refreshNonce}`;
  }, [item, pricingReady, refreshNonce]);

  useEffect(() => {
    const engine = engineRef.current;

    if (!enabled || !item) {
      engine.invalidate("reload");
      setSnap(engine.getSnapshot());
      return;
    }

    if (!isChiefOrchestratorSessionEnabled()) {
      engine.invalidate("reload");
      setSnap(engine.getSnapshot());
      return;
    }

    const parserVersionNum =
      typeof item.tenderDossier?.parserVersion === "number" &&
      Number.isFinite(item.tenderDossier.parserVersion)
        ? item.tenderDossier.parserVersion
        : null;

    // Provisional stamp for first assemble (item SSOT or content:0|pv:N).
    // Token-aware fallback stamp computed after assemble when item stamps absent.
    const provisionalStamp = resolveStableCaseStamp({
      kosztorysParsedAt: item.tenderDossier?.kosztorys?.parsedAt ?? null,
      tenderDossierBuiltAt: item.tenderDossier?.builtAt ?? null,
      recomputeToken: "0",
      parserVersionNum,
    });

    let runtimeRo = assembleChiefWireRuntimeRo({
      item,
      builtAtIso: provisionalStamp,
    });

    const recomputeToken = runtimeRo.offerBoq?.recomputeToken ?? null;

    const stableCaseStamp = resolveStableCaseStamp({
      kosztorysParsedAt: item.tenderDossier?.kosztorys?.parsedAt ?? null,
      tenderDossierBuiltAt: item.tenderDossier?.builtAt ?? null,
      recomputeToken,
      parserVersionNum,
    });

    if (stableCaseStamp !== provisionalStamp) {
      runtimeRo = assembleChiefWireRuntimeRo({
        item,
        builtAtIso: stableCaseStamp,
      });
    }

    const fingerprint = buildChiefSessionFingerprint({
      recomputeToken: runtimeRo.offerBoq?.recomputeToken ?? recomputeToken,
      parserVersionNum,
      stableCaseStamp,
    });
    const caseId = buildChiefSessionCaseId({
      tenderPipelineItemId: item.id,
      fingerprint,
    });

    const prevCaseId = engine.getSnapshot().caseId;
    if (prevCaseId && prevCaseId !== caseId && engine.getSnapshot().running) {
      engine.invalidate("stale");
    }

    if (!autoStart) {
      setSnap(engine.getSnapshot());
      return;
    }

    engine.start({
      runtimeRo,
      caseId,
      pricingReady,
      nowIso: stableCaseStamp,
      maxReturnLoops,
    });
    setSnap(engine.getSnapshot());

    return () => {
      engine.cancel();
    };
  }, [enabled, item, runtimeKey, autoStart, pricingReady, maxReturnLoops]);

  return snap;
}
