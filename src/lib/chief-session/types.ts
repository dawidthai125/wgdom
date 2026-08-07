/**
 * WIRE-CHIEF-SESSION-01 — typy Session (cienka warstwa).
 * Zero logiki domenowej · zero persist · zero UI.
 */

import type {
  ChiefCaseStatus,
  ChiefDecydentDossier,
  ChiefTaskRecord,
} from "@/lib/chief-orchestrator";

/** Stany lifecycle Session (P0.1). */
export type ChiefSessionStatus =
  | "idle"
  | "checking"
  | "running"
  | "waiting"
  | "blocked"
  | "ready_for_decydent"
  | "cancelled"
  | "finished";

/** Publiczny output Session (P0.5). */
export interface ChiefSessionOutput {
  status: ChiefSessionStatus;
  caseState: ChiefCaseStatus | null;
  taskStates: ChiefTaskRecord[] | null;
  loopCount: number;
  dossier: ChiefDecydentDossier | null;
  error: string | null;
  running: boolean;
  readyForDecision: boolean;
  caseId: string | null;
  /** Monotoniczny id requestu — stale / cancel. */
  requestId: number;
}

export function idleChiefSessionOutput(
  partial?: Partial<ChiefSessionOutput>,
): ChiefSessionOutput {
  return {
    status: "idle",
    caseState: null,
    taskStates: null,
    loopCount: 0,
    dossier: null,
    error: null,
    running: false,
    readyForDecision: false,
    caseId: null,
    requestId: 0,
    ...partial,
  };
}
