import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck } from "lucide-react";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { TENDER_OWNER_WORKSPACE_SECTION_COPY } from "@/lib/tender-owner-language-pl";
import {
  TENDER_OFFER_COMPLETENESS_SECTION_ID,
  buildOfferCompletenessSnapshot,
  offerCompletenessItemEmoji,
  type OfferCompletenessCheckItem,
} from "@/lib/offer-completeness";

function ChecklistGroup({
  title,
  items,
}: {
  title: string;
  items: OfferCompletenessCheckItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start gap-x-1.5 gap-y-0.5 text-xs">
            <span className="shrink-0" aria-hidden>{offerCompletenessItemEmoji(item.status)}</span>
            <span className="font-medium text-foreground">{item.label}</span>
            {item.hint && (
              <span className="text-[10px] text-muted-foreground w-full pl-5">{item.hint}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TenderOfferCompletenessPanel({
  swz,
  combinedText,
}: {
  swz: TenderSwzAnalysis | null | undefined;
  combinedText?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const snapshot = useMemo(
    () => buildOfferCompletenessSnapshot({ swz, combinedText }),
    [swz, combinedText],
  );

  const critical = snapshot.items.filter((i) => i.tier === "critical");
  const additional = snapshot.items.filter((i) => i.tier === "additional");

  return (
    <section
      id={TENDER_OFFER_COMPLETENESS_SECTION_ID}
      className="rounded-xl border border-border bg-card overflow-hidden scroll-mt-2"
    >
      <div className="px-3 py-2.5 bg-secondary/40 border-b border-border">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-muted-foreground shrink-0" />
          {TENDER_OWNER_WORKSPACE_SECTION_COPY.offerCompleteness}
        </p>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold text-foreground">{snapshot.readyLabel}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">
            {snapshot.readinessEmoji} {snapshot.readinessLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
        >
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Ukryj szczegóły" : "Pokaż szczegóły"}
        </button>
        {expanded && (
          <div className="space-y-3 pt-1 border-t border-border/60">
            <ChecklistGroup title="Krytyczne" items={critical} />
            <ChecklistGroup title="Dodatkowe" items={additional} />
          </div>
        )}
      </div>
    </section>
  );
}
