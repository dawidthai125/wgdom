import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers, daysUntilTenderDeadline } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { resolveTenderValue } from "@/lib/tender-data-ssot";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { loadCompanyQualificationProfileLocal } from "@/lib/company-qualification-profile";
import { checkTenderParticipation } from "@/lib/tender-participation-check";

function fmtDeadline(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const offerOpen = isTenderOpenForOffers(iso);
  const days = daysUntilTenderDeadline(iso);
  const base = d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!offerOpen) return base;
  if (days != null && days >= 0) return `${base} (${days} d.)`;
  return base;
}

/** Display-only — bez nowych parserów; dane z istniejącego SWZ / profilu. */
function displayZnw(swz: TenderSwzAnalysis | null | undefined): string {
  const reqs = swz?.participationRequirements ?? [];
  const finance = reqs.filter((r) => r.type === "finance");
  const hit = finance.find((r) =>
    /należytego|znw|zabezpieczenie.*wykonania/i.test(r.label),
  );
  if (hit?.label?.trim()) return hit.label.trim();
  return "—";
}

function displayParticipation(
  swz: TenderSwzAnalysis | null | undefined,
): string {
  const reqs = swz?.participationRequirements ?? [];
  const experience = swz?.experienceRequirements ?? [];
  if (reqs.length === 0 && experience.length === 0) return "—";

  const profile = loadCompanyQualificationProfileLocal();
  const result = checkTenderParticipation(reqs, profile, experience);
  if (!result) return reqs.length > 0 ? `${reqs.length} wymagań` : "—";
  return `${result.summaryEmoji} ${result.summaryLabel}`;
}

export function TenderDetailKpiBar({
  item,
  swz,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
}) {
  const wadium = computeWadiumInfo(
    item,
    swz,
    loadCompanyProfileLocal().maxWadiumPln,
  );
  const value = resolveTenderValue(item, swz ?? null);

  const cells = [
    { label: "Termin składania", value: fmtDeadline(item.submittingOffersDate) },
    { label: "Wadium", value: wadium.summary?.trim() || "—" },
    { label: "ZNW", value: displayZnw(swz) },
    { label: "Wartość", value: value.display?.trim() || "—" },
    { label: "Warunki udziału", value: displayParticipation(swz) },
  ];

  return (
    <div className="rounded-xl border border-border bg-card/80 overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {cells.map((cell) => (
          <div key={cell.label} className="px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {cell.label}
            </p>
            <p className="text-xs sm:text-sm font-medium text-foreground mt-0.5 tabular-nums break-words">
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
