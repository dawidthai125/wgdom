import { TenderUxSkeleton, TEUX5_SKELETON } from "@/app/tenders/loading/TenderUxSkeleton";

function AttachmentGroupSkeleton() {
  return (
    <div className={`rounded-lg border border-border/60 overflow-hidden ${TEUX5_SKELETON.radiusLg}`}>
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-secondary/30">
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-32`} />
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowSm} w-10`} />
      </div>
      <div className={`px-3 py-2 ${TEUX5_SKELETON.gapSection} flex flex-col`}>
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-full`} />
        <TenderUxSkeleton className={`${TEUX5_SKELETON.rowH} w-5/6`} />
      </div>
    </div>
  );
}

export function TenderDocumentsAttachmentsSkeleton({ rowCount = 3 }: { rowCount?: number }) {
  return (
    <div
      className={`${TEUX5_SKELETON.gapSection} flex flex-col`}
      data-teux5-documents-attachments-skeleton
      aria-busy="true"
      aria-label="Ładowanie załączników"
    >
      {Array.from({ length: rowCount }).map((_, i) => (
        <AttachmentGroupSkeleton key={i} />
      ))}
    </div>
  );
}
