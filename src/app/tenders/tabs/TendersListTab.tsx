import { jobDraftFromTender, type TenderPipelineItem } from "@/lib/tenders-bzp";
import { TendersView } from "@/app/TendersView";
import { useTendersContext } from "@/app/tenders/context/TendersContext";

export function TendersListTab({
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
  const { listExpandedId, setListExpandedId } = useTendersContext();

  return (
    <TendersView
      showTestBadge={showTestBadge}
      listOnly
      hideModuleHeader
      onCreateJobFromTender={onCreateJobFromTender}
      onOpenJob={onOpenJob}
      athPreviewEnabled={athPreviewEnabled}
      initialExpandedId={listExpandedId}
      onExpandedIdChange={setListExpandedId}
    />
  );
}
