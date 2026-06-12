import { createContext, useContext, type ReactNode } from "react";
import type { CommandCenterContextValue } from "@/app/tender-center/context/CommandCenterContext";
import type { TendersTabId } from "@/lib/tenders-module-labels";

export type TendersContextValue = CommandCenterContextValue & {
  activeTab: TendersTabId;
  setActiveTab: (tab: TendersTabId) => void;
  listExpandedId: string | null;
  setListExpandedId: (id: string | null) => void;
  openTenderInList: (tenderId: string) => void;
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
    throw new Error("useTendersContext wymaga TendersProvider (view=tenders).");
  }
  return ctx;
}

/** Opcjonalny odczyt — null poza Providerem. */
export function useTendersContextOptional(): TendersContextValue | null {
  return useContext(TendersContext);
}
