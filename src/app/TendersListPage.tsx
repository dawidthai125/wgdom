import { useNavigate } from "react-router";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersView } from "@/app/TendersView";
import { openTenderDetailV4 } from "@/lib/tender-detail-nav";

export function TendersListPage({
  showTestBadge = false,
  onCreateJobFromTender,
  onOpenJob,
  athPreviewEnabled = true,
}: {
  showTestBadge?: boolean;
  onCreateJobFromTender?: (draft: ReturnType<typeof jobDraftFromTender>, item: TenderPipelineItem) => string | void;
  onOpenJob?: (jobId: string) => void;
  athPreviewEnabled?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <TendersView
      showTestBadge={showTestBadge}
      listOnly
      hideModuleHeader
      onCreateJobFromTender={onCreateJobFromTender}
      onOpenJob={onOpenJob}
      athPreviewEnabled={athPreviewEnabled}
      onItemNavigate={(id) => openTenderDetailV4(navigate, id)}
    />
  );
}
