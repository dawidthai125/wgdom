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

function loadActiveTab(): TendersTabId {
  try {
    const raw = localStorage.getItem(TENDERS_TAB_STORAGE_KEY);
    if (
      raw === "list"
      || raw === "strategy"
      || raw === "map"
      || raw === "profile"
      || raw === "settings"
    ) {
      return raw;
    }
  } catch { /* ignore */ }
  return "list";
}

function saveActiveTab(tab: TendersTabId): void {
  try {
    localStorage.setItem(TENDERS_TAB_STORAGE_KEY, tab);
  } catch { /* ignore */ }
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
}: TendersProviderInput & {
  enabled: boolean;
  children: ReactNode;
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
  const [activeTab, setActiveTabState] = useState<TendersTabId>(loadActiveTab);
  const [listExpandedId, setListExpandedId] = useState<string | null>(null);

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
    setActiveTabState(tab);
    saveActiveTab(tab);
  }, []);

  const openTenderInList = useCallback((tenderId: string) => {
    setListExpandedId(tenderId);
    setActiveTabState("list");
    saveActiveTab("list");
  }, []);

  const openTendersStrategy = useCallback(() => {
    setActiveTabState("strategy");
    saveActiveTab("strategy");
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
    ],
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return <TendersContextProvider value={value}>{children}</TendersContextProvider>;
}
