/**
 * W3 CONNECT — Chief.start → existing Orchestra snapshot seam.
 *
 * CONNECT-only glue. Does NOT create a second orchestrator, engine,
 * snapshot bus, or refresh system.
 *
 * Architectural lock:
 * - Orchestra remains the ONLY IK sequencer when delegated/connected.
 * - Chief T1–T4 remain LEGACY-PARALLEL (runChiefOrchestrator unchanged).
 */

import type { ChiefSessionOutput } from "@/lib/chief-session";
import type { IkOrchestraSnapshot } from "./orchestra-types";

/** IK sequencing authority after W3 CONNECT (Orchestra only). */
export type IkSequencerAuthority = "orchestra";

/**
 * W3 connect lifecycle:
 * - idle — no IK→Orchestra delegation on this Chief.start
 * - delegated — Chief.start recorded Orchestra as IK sequencer; snapshot not yet attached
 * - connected — delegated + existing Orchestra snapshot present for consumption
 */
export type W3ChiefOrchestraConnectStatus = "idle" | "delegated" | "connected";

export type W3ChiefOrchestraConnect = {
  status: W3ChiefOrchestraConnectStatus;
  /** Non-null only when Chief.start delegated IK sequencing to Orchestra. */
  ikSequencer: IkSequencerAuthority | null;
  /** Hard lock: T1–T4 stay LEGACY-PARALLEL after W3. */
  chiefTasksLegacyParallel: true;
  chiefCaseId: string | null;
  chiefRequestId: number | null;
  orchestraAttached: boolean;
  chiefStartDelegatedToOrchestra: boolean;
};

export type ResolveW3ChiefOrchestraConnectInput = {
  /** IK entry path active on the page (Host/Bridge mount path). */
  ikEntryOn: boolean;
  /**
   * True when this Chief.start carried ikSequencerDelegation: "orchestra"
   * (or equivalent page intent already stamped on the session output).
   */
  chiefStartDelegatedToOrchestra: boolean;
  chiefSession: ChiefSessionOutput | null;
  /** Existing Orchestra snapshot published by IkOrchestraPageBridge / useIkOrchestra. */
  orchestraSnapshot: IkOrchestraSnapshot | null;
};

/**
 * Pure resolver — binds Chief.start (IK path) to the existing Orchestra snapshot.
 * Does not start Orchestra, does not recompute, does not Accept.
 */
export function resolveW3ChiefOrchestraConnect(
  input: ResolveW3ChiefOrchestraConnectInput,
): W3ChiefOrchestraConnect {
  const chief = input.chiefSession;
  const delegated =
    input.ikEntryOn === true && input.chiefStartDelegatedToOrchestra === true;

  const orchestraAttached = delegated && input.orchestraSnapshot != null;

  let status: W3ChiefOrchestraConnectStatus = "idle";
  if (delegated && orchestraAttached) status = "connected";
  else if (delegated) status = "delegated";

  return {
    status,
    ikSequencer: delegated ? "orchestra" : null,
    chiefTasksLegacyParallel: true,
    chiefCaseId: chief?.caseId ?? null,
    chiefRequestId: chief != null ? chief.requestId : null,
    orchestraAttached,
    chiefStartDelegatedToOrchestra: delegated,
  };
}

/** Convenience: read delegation stamp from Chief session output. */
export function chiefSessionDelegatesIkToOrchestra(
  session: ChiefSessionOutput | null | undefined,
): boolean {
  return session?.ikSequencerDelegation === "orchestra";
}
