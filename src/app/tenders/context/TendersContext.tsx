import { createContext, useContext, type ReactNode } from "react";
import type { TendersTabId } from "@/lib/tenders-module-labels";
import type { TendersStrategySnapshot } from "@/app/tenders/context/tenders-strategy-snapshot";
import type { useOwnerTenderDecisions } from "@/app/tenders/strategy/hooks/useOwnerTenderDecisions";

export type TendersContextValue = {
  snapshot: TendersStrategySnapshot;
  ownerDecisions: ReturnType<typeof useOwnerTenderDecisions>;
  strategicAlerts: TendersStrategySnapshot["ownerAlerts"];
  profileVersion: number;
  bumpProfileVersion: () => void;
  activeTab: TendersTabId;
  setActiveTab: (tab: TendersTabId) => void;
  listExpandedId: string | null;
  setListExpandedId: (id: string | null) => void;
  openTenderInList: (tenderId: string) => void;
  /** NG-03.6 — przejście do modułu Strategia z opcjonalnym kontekstem tenderId. */
  openTendersStrategy: (tenderId?: string) => void;
  strategyFocusTenderId: string | null;
  clearStrategyFocus: () => void;
};

const TendersContext = createContext<TendersContextValue | null>(null);

export function TendersContextProvider({
  value,
  children,
}: {
  value: TendersContextValue;
  children: ReactNode;
}) {
  return <TendersContext.Provider value={value}>{children}</TendersContext.Provider>;
}

export function useTendersContext(): TendersContextValue {
  const ctx = useContext(TendersContext);
  if (!ctx) {
    throw new Error("useTendersContext wymaga TendersProvider.");
  }
  return ctx;
}

export function useTendersContextOptional(): TendersContextValue | null {
  return useContext(TendersContext);
}

export function useTendersSnapshot(): TendersStrategySnapshot {
  return useTendersContext().snapshot;
}
