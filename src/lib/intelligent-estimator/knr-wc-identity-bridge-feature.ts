/**
 * IK-KNR-WC-IDENTITY-BRIDGE P1 — feature gate.
 * Default OFF — zero Host effects until separately enabled in tests / future GO.
 */

/** Production default — P1 builder returns empty batch when false. */
export const KNR_WC_IDENTITY_BRIDGE_P1_ENABLED = false as const;

/** P2.1 — local proposal persistence/reuse cache. Default OFF. */
export const KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED = false as const;

/** P2.2 — batch reuse hardening + Supabase load guard. Default OFF. */
export const KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED = false as const;

export function isKnrWcIdentityBridgeP1Enabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  return KNR_WC_IDENTITY_BRIDGE_P1_ENABLED;
}

export function isKnrWcIdentityBridgeP21PersistEnabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  return KNR_WC_IDENTITY_BRIDGE_P21_PERSIST_ENABLED;
}

export function isKnrWcIdentityBridgeP22HardeningEnabled(
  override?: boolean | null,
): boolean {
  if (typeof override === "boolean") return override;
  return KNR_WC_IDENTITY_BRIDGE_P22_HARDENING_ENABLED;
}
