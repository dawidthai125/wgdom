/** Bundle #6E — deferred bootstrap phase SSOT (app layer only). */

export type DeferredBootstrapPhase = "idle" | "running" | "done";

export interface DeferredBootstrapState {
  phase: DeferredBootstrapPhase;
  /** Inkrementowany przy każdym phase=done — trigger odświeżenia hooków. */
  generation: number;
}

export const WGDOM_DEFERRED_BOOTSTRAP_EVENT = "wgdom-deferred-bootstrap";
