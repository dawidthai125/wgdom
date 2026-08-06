import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useDeferredBootstrap } from "@/app/context/DeferredBootstrapContext";
import { useOwnerTenderDecisions } from "@/app/tenders/strategy/hooks/useOwnerTenderDecisions";
import {
  TendersContextProvider,
  type TendersContextValue,
} from "@/app/tenders/context/TendersContext";
import type { TendersProviderInput } from "@/app/tenders/context/tenders-strategy-snapshot";
import { useTendersStrategySnapshot } from "@/app/tenders/context/useTendersStrategySnapshot";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import {
  resolveStoredTendersActiveTab,
  sanitizeTendersActiveTab,
  saveTendersActiveTab,
  TENDERS_CANONICAL_START_EVENT,
} from "@/lib/tenders-module-nav";

function loadActiveTab(canViewWorkCatalog: boolean): TendersTabId {
  return resolveStoredTendersActiveTab(canViewWorkCatalog);
}

export function TendersProvider({
  enabled,
  children,
  jobs,
  directory,
  productionWeekEmployees,
  weekFrom,
  weekTo,
  savedWeeks,
  canViewWorkCatalog = false,
}: TendersProviderInput & {
  enabled: boolean;
  children: ReactNode;
  canViewWorkCatalog?: boolean;
}) {
  const input = useMemo(
    (): TendersProviderInput => ({
      jobs,
      directory,
      productionWeekEmployees,
      weekFrom,
      weekTo,
      savedWeeks,
    }),
    [jobs, directory, productionWeekEmployees, weekFrom, weekTo, savedWeeks],
  );

  const [profileVersion, setProfileVersion] = useState(0);
  const [pricingCatalogRevision, setPricingCatalogRevision] = useState(0);
  const [activeTab, setActiveTabState] = useState<TendersTabId>(() => loadActiveTab(canViewWorkCatalog));
  const [listExpandedId, setListExpandedId] = useState<string | null>(null);
  const [strategyFocusTenderId, setStrategyFocusTenderId] = useState<string | null>(null);

  const bumpProfileVersion = useCallback(() => {
    setProfileVersion((v) => v + 1);
  }, []);

  const bumpPricingCatalogRevision = useCallback(() => {
    setPricingCatalogRevision((v) => v + 1);
  }, []);

  const { generation } = useDeferredBootstrap();

  useEffect(() => {
    if (generation === 0) return;
    bumpProfileVersion();
  }, [generation, bumpProfileVersion]);

  const ownerDecisions = useOwnerTenderDecisions();
  const snapshot = useTendersStrategySnapshot(input, profileVersion, ownerDecisions);

  const setActiveTab = useCallback((tab: TendersTabId) => {
    const next = sanitizeTendersActiveTab(tab, canViewWorkCatalog);
    setActiveTabState(next);
    saveTendersActiveTab(next);
    if (next !== "review") {
      setStrategyFocusTenderId(null);
    }
  }, [canViewWorkCatalog]);

  /** P0.1 — Menu/Pulpit: kanoniczny start Przegląd także gdy Provider już zamontowany. */
  useEffect(() => {
    const onCanonicalStart = () => {
      setActiveTabState("review");
      saveTendersActiveTab("review");
    };
    window.addEventListener(TENDERS_CANONICAL_START_EVENT, onCanonicalStart);
    return () => window.removeEventListener(TENDERS_CANONICAL_START_EVENT, onCanonicalStart);
  }, []);

  const clearStrategyFocus = useCallback(() => {
    setStrategyFocusTenderId(null);
  }, []);

  const openTenderInList = useCallback((tenderId: string) => {
    setListExpandedId(tenderId);
    setActiveTabState("queue");
    saveTendersActiveTab("queue");
  }, []);

  /** Entry Remap: Strategia → Przegląd (+ opcjonalny focus). */
  const openTendersStrategy = useCallback((tenderId?: string) => {
    setStrategyFocusTenderId(tenderId ?? null);
    setActiveTabState("review");
    saveTendersActiveTab("review");
  }, []);

  const value = useMemo(
    (): TendersContextValue => ({
      snapshot,
      ownerDecisions,
      strategicAlerts: snapshot.ownerAlerts,
      profileVersion,
      bumpProfileVersion,
      pricingCatalogRevision,
      bumpPricingCatalogRevision,
      activeTab,
      setActiveTab,
      listExpandedId,
      setListExpandedId,
      openTenderInList,
      openTendersStrategy,
      strategyFocusTenderId,
      clearStrategyFocus,
    }),
    [
      snapshot,
      ownerDecisions,
      profileVersion,
      bumpProfileVersion,
      pricingCatalogRevision,
      bumpPricingCatalogRevision,
      activeTab,
      setActiveTab,
      listExpandedId,
      openTenderInList,
      openTendersStrategy,
      strategyFocusTenderId,
      clearStrategyFocus,
    ],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <TendersContextProvider value={value}>
      <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">{children}</div>
    </TendersContextProvider>
  );
}
