import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "@/lib/cloud-sync";
import { useOwnerTenderDecisions } from "@/app/tenders/strategy/hooks/useOwnerTenderDecisions";
import {
  TendersContextProvider,
  type TendersContextValue,
} from "@/app/tenders/context/TendersContext";
import type { TendersProviderInput } from "@/app/tenders/context/tenders-strategy-snapshot";
import { useTendersStrategySnapshot } from "@/app/tenders/context/useTendersStrategySnapshot";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import { TENDERS_TAB_STORAGE_KEY } from "@/lib/tenders-module-nav";
import {
  isTendersTabId,
  sanitizeTendersActiveTab,
  saveTendersActiveTab,
} from "@/lib/tenders-module-nav";

function loadActiveTab(canViewWorkCatalog: boolean): TendersTabId {
  try {
    const raw = localStorage.getItem(TENDERS_TAB_STORAGE_KEY);
    if (isTendersTabId(raw)) {
      return sanitizeTendersActiveTab(raw, canViewWorkCatalog);
    }
  } catch { /* ignore */ }
  return "list";
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
  const [activeTab, setActiveTabState] = useState<TendersTabId>(() => loadActiveTab(canViewWorkCatalog));
  const [listExpandedId, setListExpandedId] = useState<string | null>(null);
  const [strategyFocusTenderId, setStrategyFocusTenderId] = useState<string | null>(null);

  const bumpProfileVersion = useCallback(() => {
    setProfileVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onDeferredBootstrap = () => {
      bumpProfileVersion();
    };
    window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
    return () => window.removeEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
  }, [enabled, bumpProfileVersion]);

  const ownerDecisions = useOwnerTenderDecisions();
  const snapshot = useTendersStrategySnapshot(input, profileVersion, ownerDecisions);

  const setActiveTab = useCallback((tab: TendersTabId) => {
    const next = sanitizeTendersActiveTab(tab, canViewWorkCatalog);
    setActiveTabState(next);
    saveTendersActiveTab(next);
    if (next !== "strategy") {
      setStrategyFocusTenderId(null);
    }
  }, [canViewWorkCatalog]);

  const clearStrategyFocus = useCallback(() => {
    setStrategyFocusTenderId(null);
  }, []);

  useEffect(() => {
    if (activeTab === "workcatalog" && !canViewWorkCatalog) {
      setActiveTabState("list");
      saveTendersActiveTab("list");
    }
  }, [activeTab, canViewWorkCatalog]);

  const openTenderInList = useCallback((tenderId: string) => {
    setListExpandedId(tenderId);
    setActiveTabState("list");
    saveTendersActiveTab("list");
  }, []);

  const openTendersStrategy = useCallback((tenderId?: string) => {
    setStrategyFocusTenderId(tenderId ?? null);
    setActiveTabState("strategy");
    saveTendersActiveTab("strategy");
  }, []);

  const value = useMemo(
    (): TendersContextValue => ({
      snapshot,
      ownerDecisions,
      strategicAlerts: snapshot.ownerAlerts,
      profileVersion,
      bumpProfileVersion,
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
