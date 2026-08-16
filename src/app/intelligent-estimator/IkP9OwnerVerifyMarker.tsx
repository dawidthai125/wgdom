import { useMemo, useState } from "react";
import {
  IK_P9_TARGET_TENDER_ID,
  compareIkP9DSnapshots,
  isIkP9TargetTender,
  snapshotIkP9DState,
} from "@/lib/intelligent-estimator/ik-p9-owner-verify";
import { isIkLaborResearchEnabled, isIkMaterialResearchEnabled } from "@/lib/intelligent-estimator/ik-entry-flag";

export function IkP9OwnerVerifyMarker({
  tenderId,
}: {
  tenderId: string;
}) {
  const isTarget = isIkP9TargetTender(tenderId);
  const [dBefore] = useState(() => snapshotIkP9DState());
  const dAfter = snapshotIkP9DState();
  const dCmp = useMemo(
    () => compareIkP9DSnapshots(dBefore, dAfter),
    [dBefore, dAfter.expertAiDecydentEnabled, dAfter.capturedAt],
  );
  const researchOn =
    isIkLaborResearchEnabled() === true || isIkMaterialResearchEnabled() === true;

  if (!isTarget) return null;

  return (
    <div
      className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      data-ik-p9-owner-verify="1"
      data-ik-p9-target="1"
      data-ik-p9-tender-id={IK_P9_TARGET_TENDER_ID}
      data-ik-p9-gate-order="gate_a,gate_b,owner_verify"
      data-ik-p9-research={researchOn ? "1" : "0"}
      data-ik-p9-http="0"
      data-ik-p9-accept="0"
      data-ik-p9-d-enabled={dAfter.expertAiDecydentEnabled ? "1" : "0"}
      data-ik-p9-d-diff={String(dCmp.diff)}
      data-ik-p9-d-mutated={dCmp.mutated ? "1" : "0"}
    >
      <p className="font-medium text-foreground">
        IK P9 — Owner Verify (target tender)
      </p>
      <p className="mt-0.5">
        Gate A → Gate B → Owner Verify · RESEARCH=0 · ACCEPT=0 · D mutation forbidden.
        Manual Owner action only — not auto-run.
      </p>
      <p className="mt-0.5 font-mono text-[10px] opacity-80">
        {IK_P9_TARGET_TENDER_ID.slice(0, 8)}… · dDiff={dCmp.diff} · research=
        {researchOn ? "ON(block)" : "OFF"}
      </p>
    </div>
  );
}
