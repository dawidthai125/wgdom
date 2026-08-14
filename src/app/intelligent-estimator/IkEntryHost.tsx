/**
 * IK-MIGRATION-01 P1 — first-screen host.
 * REUSE ExpertConversationSurface. ZERO NG-10. ZERO new chat store.
 */

import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { ExpertConversationSurface } from "@/app/expert-conversation";
import { buildIkEntryConversationViewModel } from "@/lib/intelligent-estimator/ik-entry-conversation";

export function IkEntryHost({ item }: { item: TenderPipelineItem }) {
  const vm = useMemo(
    () => buildIkEntryConversationViewModel(item),
    [item],
  );

  return (
    <div
      className="mb-4"
      data-ik-entry-host="1"
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={
        vm.steps.find((s) => s.id === "boq_status")?.status ?? "partial"
      }
    >
      <ExpertConversationSurface vm={vm} />
    </div>
  );
}
