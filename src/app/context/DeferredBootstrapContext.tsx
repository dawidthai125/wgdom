import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DeferredAdminHydrationPatch } from "@/lib/deferred-bootstrap-hydrate";
import { collectDeferredAdminHydrationPatch } from "@/lib/deferred-bootstrap-hydrate";
import {
  createInitialDeferredBootstrapState,
  markDeferredBootstrapDone,
  markDeferredBootstrapRunning,
} from "@/lib/deferred-bootstrap-state";
import type { DeferredBootstrapState } from "@/lib/deferred-bootstrap-types";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "@/lib/deferred-bootstrap-types";

type DeferredBootstrapContextValue = DeferredBootstrapState & {
  registerHydrateHandler: (handler: (patch: DeferredAdminHydrationPatch) => void) => () => void;
};

const DeferredBootstrapContext = createContext<DeferredBootstrapContextValue | null>(null);

export function DeferredBootstrapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createInitialDeferredBootstrapState);
  const hydrateHandlerRef = useRef<((patch: DeferredAdminHydrationPatch) => void) | null>(null);
  const hydrateInFlightRef = useRef(false);
  const phaseRef = useRef(state.phase);
  phaseRef.current = state.phase;

  const runHydration = useCallback(async () => {
    if (hydrateInFlightRef.current) return;
    hydrateInFlightRef.current = true;
    try {
      const patch = await collectDeferredAdminHydrationPatch();
      hydrateHandlerRef.current?.(patch);
      setState((prev) => markDeferredBootstrapDone(prev));
    } catch {
      /* offline — zostaw bieżący React state */
    } finally {
      hydrateInFlightRef.current = false;
    }
  }, []);

  const registerHydrateHandler = useCallback(
    (handler: (patch: DeferredAdminHydrationPatch) => void) => {
      hydrateHandlerRef.current = handler;
      if (phaseRef.current === "done") {
        void (async () => {
          try {
            const patch = await collectDeferredAdminHydrationPatch();
            handler(patch);
          } catch {
            /* offline */
          }
        })();
      }
      return () => {
        if (hydrateHandlerRef.current === handler) {
          hydrateHandlerRef.current = null;
        }
      };
    },
    [],
  );

  useEffect(() => {
    setState((prev) => markDeferredBootstrapRunning(prev));
  }, []);

  useEffect(() => {
    const onDeferredBootstrap = () => {
      void runHydration();
    };

    window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
    return () => window.removeEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
  }, [runHydration]);

  const value = useMemo(
    (): DeferredBootstrapContextValue => ({
      ...state,
      registerHydrateHandler,
    }),
    [state, registerHydrateHandler],
  );

  return (
    <DeferredBootstrapContext.Provider value={value}>
      {children}
    </DeferredBootstrapContext.Provider>
  );
}

export function useDeferredBootstrap(): DeferredBootstrapContextValue {
  const ctx = useContext(DeferredBootstrapContext);
  if (!ctx) {
    throw new Error("useDeferredBootstrap must be used within DeferredBootstrapProvider");
  }
  return ctx;
}

/** Rejestruje callback hydracji z App — wywoływany przez provider po phase=done. */
export function useRegisterDeferredHydration(
  onHydrate: (patch: DeferredAdminHydrationPatch) => void,
): void {
  const { registerHydrateHandler } = useDeferredBootstrap();

  useEffect(() => registerHydrateHandler(onHydrate), [registerHydrateHandler, onHydrate]);
}
