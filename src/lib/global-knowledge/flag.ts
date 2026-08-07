/**
 * GLOBAL-KNOWLEDGE-E1B — feature flag (AR-C3).
 * DF: default OFF · LS `kw-global-knowledge-e1b`.
 * OFF ⇒ brak persist / side-effect z mutacji publicznych.
 */

import { GLOBAL_KNOWLEDGE_E1B_FLAG_KEY } from "./types";

export const GLOBAL_KNOWLEDGE_E1B_DEFAULT = false;

export const GLOBAL_KNOWLEDGE_E1B_LS_KEY = GLOBAL_KNOWLEDGE_E1B_FLAG_KEY;

let e1bForTests: boolean | null = null;

/** Test-only override (null = LS / default). */
export function forceGlobalKnowledgeE1bForTests(on: boolean | null): void {
  e1bForTests = on;
}

/**
 * Czy E1B Identity persist jest włączony.
 * Default OFF — tip parity NO-OP.
 */
export function isGlobalKnowledgeE1bEnabled(): boolean {
  if (e1bForTests != null) return e1bForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(GLOBAL_KNOWLEDGE_E1B_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return GLOBAL_KNOWLEDGE_E1B_DEFAULT;
}

/** Czy wolno wykonać persist (flag ON lub harness force). */
export function mayPersistGlobalKnowledgeE1b(forcePersistForTests?: boolean): boolean {
  if (forcePersistForTests === true) return true;
  return isGlobalKnowledgeE1bEnabled();
}
