import { useNavigate } from "react-router";
import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersView } from "@/app/TendersView";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import { openTenderDetailFromModule } from "@/lib/tender-module-nav-sheet";

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
  const { activeTab } = useTendersContext();

  return (
    <TendersView
      showTestBadge={showTestBadge}
      listOnly
      hideModuleHeader
      onCreateJobFromTender={onCreateJobFromTender}
      onOpenJob={onOpenJob}
      athPreviewEnabled={athPreviewEnabled}
      onItemNavigate={(id) => openTenderDetailFromModule(navigate, id, activeTab)}
    />
  );
}
