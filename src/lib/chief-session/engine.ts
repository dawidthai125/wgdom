/**
 * WIRE-CHIEF-SESSION-01 — pure Session engine.
 * REUSE runChiefOrchestrator + assembleChiefWireRuntimeRo (caller).
 * Cancel / stale / double-run · dossier in-memory only.
 */

import {
  runChiefOrchestrator,
  type ChiefOrchestratorInput,
  type ChiefOrchestratorResult,
} from "@/lib/chief-orchestrator";
import type { ChiefWireRuntimeRo } from "@/lib/chief-wire-adapters";
import {
  idleChiefSessionOutput,
  type ChiefSessionOutput,
  type ChiefSessionStatus,
} from "./types";

export type ChiefSessionRunFn = (
  input: ChiefOrchestratorInput,
) => ChiefOrchestratorResult;

export type ChiefSessionScheduleFn = (fn: () => void) => void;

export interface ChiefSessionStartParams {
  runtimeRo: ChiefWireRuntimeRo;
  caseId: string;
  /** Gdy false — nie startuj (pipeline nie gotowy). */
  pricingReady?: boolean;
  nowIso?: string;
  maxReturnLoops?: number;
}

export interface ChiefSessionEngine {
  getSnapshot: () => ChiefSessionOutput;
  subscribe: (listener: () => void) => () => void;
  /** Start Case. false = odrzucony (flag/not ready/double-run). */
  start: (params: ChiefSessionStartParams) => boolean;
  cancel: () => void;
  /** Stale / reload — unieważnia aktywny request. */
  invalidate: (reason?: "stale" | "reload") => void;
  /** Rerun = invalidate + start. */
  rerun: (params: ChiefSessionStartParams) => boolean;
}

function mapResultStatus(result: ChiefOrchestratorResult): ChiefSessionStatus {
  if (result.status === "ready_for_decydent") return "ready_for_decydent";
  if (result.status === "blocked") return "blocked";
  if (result.status === "waiting_return") return "waiting";
  if (result.status === "running") return "running";
  return "finished";
}

export function createChiefSessionEngine(deps?: {
  run?: ChiefSessionRunFn;
  schedule?: ChiefSessionScheduleFn;
  /** Gdy false — start zawsze no-op (feature flag OFF). */
  isEnabled?: () => boolean;
}): ChiefSessionEngine {
  const run = deps?.run ?? runChiefOrchestrator;
  const schedule = deps?.schedule ?? ((fn) => queueMicrotask(fn));
  const isEnabled = deps?.isEnabled ?? (() => true);

  let snapshot = idleChiefSessionOutput();
  let requestSeq = 0;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const l of listeners) {
      try {
        l();
      } catch {
        /* ignore listener errors */
      }
    }
  }

  function setSnapshot(next: ChiefSessionOutput): void {
    snapshot = next;
    notify();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function cancelActive(status: ChiefSessionStatus): void {
    requestSeq += 1;
    setSnapshot(
      idleChiefSessionOutput({
        status,
        requestId: requestSeq,
        caseId: snapshot.caseId,
        error: status === "cancelled" ? "cancelled" : snapshot.error,
      }),
    );
  }

  function start(params: ChiefSessionStartParams): boolean {
    if (!isEnabled()) {
      setSnapshot(
        idleChiefSessionOutput({
          status: "idle",
          requestId: requestSeq,
          error: null,
        }),
      );
      return false;
    }

    if (snapshot.running || snapshot.status === "running" || snapshot.status === "checking") {
      return false;
    }

    const req = ++requestSeq;
    setSnapshot(
      idleChiefSessionOutput({
        status: "checking",
        requestId: req,
        caseId: params.caseId,
        running: false,
      }),
    );

    const pricingOk = params.pricingReady !== false;
    if (!params.runtimeRo.readyForChiefInput || !pricingOk) {
      setSnapshot(
        idleChiefSessionOutput({
          status: "idle",
          requestId: req,
          caseId: params.caseId,
          error: !params.runtimeRo.readyForChiefInput
            ? "not_ready_for_chief_input"
            : "pricing_not_ready",
        }),
      );
      return false;
    }

    const { offerBoq, pricing, company, offerStrategy } = params.runtimeRo;
    if (offerBoq == null || pricing == null) {
      setSnapshot(
        idleChiefSessionOutput({
          status: "idle",
          requestId: req,
          caseId: params.caseId,
          error: "not_ready_for_chief_input",
        }),
      );
      return false;
    }

    setSnapshot({
      status: "running",
      caseState: "running",
      taskStates: null,
      loopCount: 0,
      dossier: null,
      error: null,
      running: true,
      readyForDecision: false,
      caseId: params.caseId,
      requestId: req,
    });

    const input: ChiefOrchestratorInput = {
      caseId: params.caseId,
      offerBoq,
      pricing,
      company,
      offerStrategy,
      nowIso: params.nowIso,
      maxReturnLoops: params.maxReturnLoops,
    };

    schedule(() => {
      if (req !== requestSeq) return;
      try {
        const result = run(input);
        if (req !== requestSeq) return;
        const status = mapResultStatus(result);
        setSnapshot({
          status,
          caseState: result.status,
          taskStates: result.tasks,
          loopCount: result.loopCount,
          dossier: result.dossier,
          error: null,
          running: false,
          readyForDecision: result.status === "ready_for_decydent",
          caseId: result.caseId,
          requestId: req,
        });
      } catch (e) {
        if (req !== requestSeq) return;
        const message = e instanceof Error ? e.message : "chief_session_error";
        setSnapshot(
          idleChiefSessionOutput({
            status: "finished",
            requestId: req,
            caseId: params.caseId,
            error: message,
            running: false,
          }),
        );
      }
    });

    return true;
  }

  function cancel(): void {
    cancelActive("cancelled");
  }

  function invalidate(reason: "stale" | "reload" = "stale"): void {
    cancelActive(reason === "reload" ? "idle" : "cancelled");
    if (reason === "stale") {
      setSnapshot(
        idleChiefSessionOutput({
          status: "cancelled",
          requestId: requestSeq,
          error: "stale",
        }),
      );
    }
  }

  function rerun(params: ChiefSessionStartParams): boolean {
    requestSeq += 1;
    setSnapshot(
      idleChiefSessionOutput({
        status: "idle",
        requestId: requestSeq,
      }),
    );
    return start(params);
  }

  return {
    getSnapshot: () => snapshot,
    subscribe,
    start,
    cancel,
    invalidate,
    rerun,
  };
}
