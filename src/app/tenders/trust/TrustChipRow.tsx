import type { TenderTrustAssessment, TenderTrustDimension } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { TenderTrustSurfaceId } from "@/lib/tender-trust-ui";
import {
  formatTrustOverflowLabel,
  pickDimensionsForSurfaceDisplay,
  resolveTrustViewport,
  trustDimensionChipLabel,
  trustDimensionToV4Tab,
  trustToneClass,
} from "@/lib/tender-trust-ui";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { TrustChip } from "@/app/tenders/trust/TrustChip";

export function TrustChipRow({
  assessment,
  surfaceId,
  onNavigateTab,
  dataAttr,
}: {
  assessment: TenderTrustAssessment;
  surfaceId: TenderTrustSurfaceId;
  onNavigateTab?: (tab: TenderDetailV4TabId) => void;
  dataAttr?: string;
}) {
  const isMobile = useIsMobile();
  const viewport = resolveTrustViewport(isMobile);
  const slice = pickDimensionsForSurfaceDisplay(assessment, surfaceId, viewport);

  if (slice.visible.length === 0 && slice.hiddenCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-tender-trust-chip-row={dataAttr ?? surfaceId}>
      {slice.visible.map((dim) => (
        <TrustChip
          key={dim.id}
          dimension={dim}
          onClick={onNavigateTab ? () => onNavigateTab(trustDimensionToV4Tab(dim.id)) : undefined}
        />
      ))}
      {slice.hiddenCount > 0 && (
        <TrustOverflowChip dimensions={slice.hidden} label={formatTrustOverflowLabel(slice.hiddenCount)} />
      )}
    </div>
  );
}

function TrustOverflowChip({
  dimensions,
  label,
}: {
  dimensions: TenderTrustDimension[];
  label: string;
}) {
  const title = dimensions
    .map((d) => trustDimensionChipLabel(d))
    .join(" · ");

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${trustToneClass("neutral")}`}
      title={title}
      data-tender-trust-chip="overflow"
      data-tender-trust-overflow-count={dimensions.length}
    >
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
