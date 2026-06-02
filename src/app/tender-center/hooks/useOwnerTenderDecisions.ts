import { useCallback, useMemo, useState } from "react";
import type { TenderDecision } from "@/lib/tender-center-decision";
import type { TenderScoringBundle } from "@/lib/tender-center-decision";
import {
  computeLiveSystemAlignment,
  computeOwnerDecisionStats,
  computeOwnerSystemAlignment,
  listOwnerDecisions,
  loadOwnerDecisions,
  saveOwnerDecisions,
  upsertOwnerDecision,
  type OwnerDecisionsStore,
  type OwnerTenderDecisionRecord,
} from "@/lib/tender-center-owner-decisions";

export function useOwnerTenderDecisions() {
  const [store, setStore] = useState<OwnerDecisionsStore>(() => loadOwnerDecisions());

  const setOwnerDecision = useCallback(
    (bundle: TenderScoringBundle, decision: TenderDecision) => {
      setStore((prev) => {
        const next = upsertOwnerDecision(prev, {
          id: bundle.item.id,
          decision,
          systemDecision: bundle.decision,
          opportunityScore: bundle.opportunity.score,
          strategicScore: bundle.strategic.score,
        });
        saveOwnerDecisions(next);
        return next;
      });
    },
    [],
  );

  const getOwnerDecision = useCallback(
    (id: string): OwnerTenderDecisionRecord | null => store.byId[id] ?? null,
    [store],
  );

  const stats = useMemo(() => computeOwnerDecisionStats(store), [store]);
  const snapshotAlignment = useMemo(() => computeOwnerSystemAlignment(store), [store]);
  const recent = useMemo(() => listOwnerDecisions(store).slice(0, 8), [store]);

  const liveAlignment = useCallback(
    (ranked: TenderScoringBundle[]) => {
      const currentSystemById: Record<string, TenderDecision> = {};
      for (const b of ranked) currentSystemById[b.item.id] = b.decision;
      return computeLiveSystemAlignment(store, currentSystemById);
    },
    [store],
  );

  return {
    store,
    setOwnerDecision,
    getOwnerDecision,
    stats,
    snapshotAlignment,
    recent,
    liveAlignment,
  };
}
