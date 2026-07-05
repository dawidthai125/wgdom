import type { DeferredBootstrapState } from "@/lib/deferred-bootstrap-types";

export function createInitialDeferredBootstrapState(): DeferredBootstrapState {
  return { phase: "idle", generation: 0 };
}

export function markDeferredBootstrapRunning(
  state: DeferredBootstrapState,
): DeferredBootstrapState {
  if (state.phase === "running") return state;
  return { ...state, phase: "running" };
}

export function markDeferredBootstrapDone(
  state: DeferredBootstrapState,
): DeferredBootstrapState {
  return { phase: "done", generation: state.generation + 1 };
}
