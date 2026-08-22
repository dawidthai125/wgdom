/**
 * IK-KNR-WC-IDENTITY-BRIDGE P1 — feature gate.
 * Default OFF — zero Host effects until separately enabled in tests / future GO.
 */

import { isIkEntryEnabled } from "./ik-entry-flag";

/** Production default — P1 builder returns empty batch when false. */
export const KNR_WC_IDENTITY_BRIDGE_P1_ENABLED = false as const;

/** P2.1 — local proposal persistence/reuse cache. Default OFF. */
export const KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED = false as const;

/** P2.2 — batch reuse hardening + Supabase load guard. Default OFF. */
export const KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED = false as const;

/** P2 UI — Owner Review / Proposal Queue (Host). Default OFF. */
export const KNR_WC_IDENTITY_BRIDGE_P2_UI_ENABLED = false as const;

let knrWcBridgeRuntimeForTests: boolean | null = null;

/**
 * Test-only override for P1 + P2.1 + P2.2 + P2 UI bridge flags (null = const defaults).
 * Does NOT bypass `isIkEntryEnabled()` / role gate — mirror `forceIkEntryEnabledForTests`.
 */
export function forceKnrWcIdentityBridgeRuntimeForTests(on: boolean | null): void {
  knrWcBridgeRuntimeForTests = on;
}

function isKnrWcBridgeRuntimeForcedOn(): boolean {
  return knrWcBridgeRuntimeForTests === true;
}

function isKnrWcBridgeRuntimeForcedOff(): boolean {
  return knrWcBridgeRuntimeForTests === false;
}

export function isKnrWcIdentityBridgeP1Enabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  if (isKnrWcBridgeRuntimeForcedOn()) return true;
  if (isKnrWcBridgeRuntimeForcedOff()) return false;
  return KNR_WC_IDENTITY_BRIDGE_P1_ENABLED;
}

export function isKnrWcIdentityBridgeP21PersistEnabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  if (isKnrWcBridgeRuntimeForcedOn()) return true;
  if (isKnrWcBridgeRuntimeForcedOff()) return false;
  return KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED;
}

export function isKnrWcIdentityBridgeP22HardeningEnabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  if (isKnrWcBridgeRuntimeForcedOn()) return true;
  if (isKnrWcBridgeRuntimeForcedOff()) return false;
  return KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED;
}

export function isKnrWcIdentityBridgeP2UiEnabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  if (isKnrWcBridgeRuntimeForcedOn()) return true;
  if (isKnrWcBridgeRuntimeForcedOff()) return false;
  return KNR_WC_IDENTITY_BRIDGE_P2_UI_ENABLED;
}

export type KnrWcIdentityBridgeP2UiRuntimeGateInput = {
  ikEntryEnabled?: boolean;
  p1Enabled?: boolean | null;
  p21Enabled?: boolean | null;
  p22Enabled?: boolean | null;
  p2UiEnabled?: boolean | null;
};

/**
 * P2 UI runtime gate — IK access + P1 + P2.1 + P2.2 + P2 UI.
 * When false: panel hidden · no cache call · no discovery · no remote load.
 */
export function isKnrWcIdentityBridgeP2UiRuntimeEnabled(
  input: KnrWcIdentityBridgeP2UiRuntimeGateInput = {},
): boolean {
  const ikOk =
    typeof input.ikEntryEnabled === "boolean"
      ? input.ikEntryEnabled
      : isIkEntryEnabled();
  if (!ikOk) return false;

  if (!isKnrWcIdentityBridgeP1Enabled(input.p1Enabled)) return false;
  if (!isKnrWcIdentityBridgeP21PersistEnabled(input.p21Enabled)) return false;
  if (!isKnrWcIdentityBridgeP22HardeningEnabled(input.p22Enabled)) return false;
  if (!isKnrWcIdentityBridgeP2UiEnabled(input.p2UiEnabled)) return false;

  return true;
}
