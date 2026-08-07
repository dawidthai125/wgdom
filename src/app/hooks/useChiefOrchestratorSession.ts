/**
 * WIRE-CHIEF-SESSION-01 — cienki hook Session.
 * Obserwuje item + readiness · REUSE assembleChiefWireRuntimeRo + engine.
 * Dossier tylko in-memory · bez UI · bez persist.
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
}): ChiefSessionOutput {
  const {
    enabled,
    item,
    pricingReadyPartial = false,
    pricingReadyFinal = false,
    autoStart = true,
    maxReturnLoops,
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
    return `${item.id}|${dossierTs}|${pv}|${pricingReady ? "1" : "0"}`;
  }, [item, pricingReady]);

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

    const runtimeRo = assembleChiefWireRuntimeRo({ item });
    const fingerprint = buildChiefSessionFingerprint({
      offerBoqLineCount: runtimeRo.offerBoq?.lines.length ?? 0,
      recomputeToken: runtimeRo.offerBoq?.recomputeToken ?? null,
      builtAt: runtimeRo.offerBoq?.builtAt ?? null,
      parserVersion:
        item.tenderDossier?.parserVersion ??
        item.tenderDossier?.kosztorys?.parsedAt ??
        item.tenderDossier?.builtAt ??
        item.updatedAt ??
        null,
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
      maxReturnLoops,
    });
    setSnap(engine.getSnapshot());

    return () => {
      engine.cancel();
    };
  }, [enabled, item, runtimeKey, autoStart, pricingReady, maxReturnLoops]);

  return snap;
}
