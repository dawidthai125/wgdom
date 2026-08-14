/**
 * IK-MIGRATION-01 P1 — first-screen host.
 * REUSE ExpertConversationSurface. ZERO NG-10. ZERO new chat store.
 */

import { useMemo } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { ExpertConversationSurface } from "@/app/expert-conversation";
import { buildIkEntryConversationViewModel } from "@/lib/intelligent-estimator/ik-entry-conversation";
import { runIkDocumentExpert } from "@/lib/intelligent-estimator/ik-document-expert";
import { getTenderPackage } from "@/lib/multi-dwelling/store";

export function IkEntryHost({ item }: { item: TenderPipelineItem }) {
  const pkg = useMemo(() => getTenderPackage(item.id), [item.id]);
  const report = useMemo(
    () => runIkDocumentExpert({ item, package: pkg }),
    [item, pkg],
  );
  const vm = useMemo(
    () => buildIkEntryConversationViewModel(item, pkg),
    [item, pkg],
  );

  return (
    <div
      className="mb-4"
      data-ik-entry-host="1"
      data-ik-entry-tender-id={item.id}
      data-ik-entry-boq-status={report.masterBoq.status}
      data-ik-cost-doc-count={String(report.costDocuments.length)}
      data-ik-przedmiar-count={String(report.przedmiary.length)}
      data-ik-master-ready={report.masterBoq.readyForExperts ? "1" : "0"}
    >
      <ExpertConversationSurface vm={vm} />
    </div>
  );
}
