import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CommandCenterProvider,
  type CommandCenterProviderInput,
  useCommandCenterContext,
} from "@/app/tender-center/context/CommandCenterContext";
import {
  TendersContextProvider,
  type TendersContextValue,
} from "@/app/tenders/context/TendersContext";
import type { TendersTabId } from "@/lib/tenders-module-labels";

const TAB_STORAGE_KEY = "kw-tenders-active-tab-v1";

function loadActiveTab(): TendersTabId {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
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
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch { /* ignore */ }
}

function TendersContextBridge({ children }: { children: ReactNode }) {
  const cc = useCommandCenterContext();
  const [activeTab, setActiveTabState] = useState<TendersTabId>(loadActiveTab);
  const [listExpandedId, setListExpandedId] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: TendersTabId) => {
    setActiveTabState(tab);
    saveActiveTab(tab);
  }, []);

  const openTenderInList = useCallback((tenderId: string) => {
    setListExpandedId(tenderId);
    setActiveTabState("list");
    saveActiveTab("list");
  }, []);

  const value = useMemo(
    (): TendersContextValue => ({
      ...cc,
      activeTab,
      setActiveTab,
      listExpandedId,
      setListExpandedId,
      openTenderInList,
    }),
    [cc, activeTab, setActiveTab, listExpandedId, openTenderInList],
  );

  return <TendersContextProvider value={value}>{children}</TendersContextProvider>;
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
}: CommandCenterProviderInput & {
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <CommandCenterProvider
      enabled
      jobs={jobs}
      directory={directory}
      productionWeekEmployees={productionWeekEmployees}
      weekFrom={weekFrom}
      weekTo={weekTo}
      savedWeeks={savedWeeks}
    >
      <TendersContextBridge>{children}</TendersContextBridge>
    </CommandCenterProvider>
  );
}
