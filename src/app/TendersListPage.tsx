import { useNavigate } from "react-router";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersView } from "@/app/TendersView";
import { buildTenderDetailPath } from "@/lib/tender-detail-routes-v4";

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
      onItemNavigate={(id) => navigate(buildTenderDetailPath(id))}
    />
  );
}
