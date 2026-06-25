/**
 * EPIC A — zakładka Decyzja: wyłącznie werdykt systemu, kontekst, ekonomia i decyzja właściciela.
 * Bez workflow hub (postęp, blokery, operator) — te elementy są na Przetargu.
 */

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ExecutiveSummaryCard } from "@/app/ExecutiveSummaryCard";
import { TenderOwnerDecisionButtons } from "@/app/TenderOwnerDecisionButtons";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { OwnerFinanceView } from "@/lib/tender-owner-view-ux";
import { ownerDecisionTone } from "@/lib/tender-owner-view-ux";
import {
  TENDER_INTELLIGENCE_SECTION_COPY,
  TENDER_OWNER_VIEW_COPY,
} from "@/lib/tender-owner-language-pl";
import { DECISION_LABEL_PL } from "@/lib/tenders-strategy-decision";

function DecisionVerdictSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  const { overlay } = ctx;

  return (
    <section className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border/60 bg-primary/5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.verdict}
        </p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">
          <span className={`inline-block rounded-lg border px-3 py-1.5 ${ownerDecisionTone(overlay.displayDecision)}`}>
            {overlay.displayLabel}
          </span>
        </p>
        {overlay.confidenceLabel && (
          <p className="text-xs text-muted-foreground">
            {TENDER_INTELLIGENCE_SECTION_COPY.confidenceLabel}:{" "}
            <span className="font-medium text-foreground">{overlay.confidenceLabel}</span>
            {overlay.confidenceHint && (
              <span className="block mt-0.5 text-[11px]">{overlay.confidenceHint}</span>
            )}
          </p>
        )}
        {overlay.reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-foreground/90">
            {overlay.reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
        {overlay.heroBlocks.map((block) => (
          <div
            key={`${block.kind}-${block.message}`}
            className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-300"
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{block.message}</span>
          </div>
        ))}
        {overlay.helperMessage && (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {overlay.helperMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function DecisionAboutSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.about}
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm text-foreground leading-relaxed">{ctx.narrative}</p>
        {ctx.executive && (
          <ExecutiveSummaryCard summary={ctx.executive} />
        )}
      </div>
    </section>
  );
}

function DecisionFinanceDisplay({ finance }: { finance: OwnerFinanceView }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 bg-secondary/30">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_INTELLIGENCE_SECTION_COPY.economy}
        </p>
      </div>
      {finance.mode === "ready" ? (
        <div className="grid grid-cols-3 divide-x divide-border">
          {([
            { label: TENDER_OWNER_VIEW_COPY.revenueLabel, value: finance.revenueDisplay },
            { label: TENDER_OWNER_VIEW_COPY.costLabel, value: finance.costDisplay },
            { label: TENDER_OWNER_VIEW_COPY.marginLabel, value: finance.marginDisplay },
          ] as const).map(({ label, value }) => (
            <div key={label} className="px-3 py-3 text-center min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="text-sm font-medium text-foreground">{finance.message}</p>
          {finance.hint && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{finance.hint}</p>
          )}
        </div>
      )}
    </section>
  );
}

function OwnerDecisionRecordSection({ ctx }: { ctx: TenderIntelligenceContext }) {
  const { ownerDecisions } = useTendersContext();
  const record = ownerDecisions.store.byId[ctx.item.id] ?? null;

  return (
    <section
      className="rounded-xl border border-primary/35 bg-card overflow-hidden shadow-sm"
      data-tender-decision-view="owner-record"
    >
      <div className="px-3 py-2 border-b border-border/60 bg-primary/5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {TENDER_OWNER_VIEW_COPY.decisionSection}
        </p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Zapisz decyzję biznesową właściciela — niezależnie od rekomendacji systemu na Przetargu.
        </p>
        <TenderOwnerDecisionButtons
          current={record?.decision ?? null}
          onSelect={(decision) => {
            ownerDecisions.setOwnerDecision(ctx.scoringBundle, decision);
            toast.success(`Zapisano: ${DECISION_LABEL_PL[decision]}`);
          }}
        />
        {record && (
          <p className="text-[10px] text-muted-foreground">
            Ostatnia decyzja: {DECISION_LABEL_PL[record.decision]}
            {" · "}
            {new Date(record.updatedAt).toLocaleString("pl-PL")}
          </p>
        )}
      </div>
    </section>
  );
}

export function TenderDecisionView({
  intelligenceCtx,
}: {
  intelligenceCtx: TenderIntelligenceContext;
}) {
  return (
    <div className="space-y-3" data-tender-decision-view>
      <DecisionVerdictSection ctx={intelligenceCtx} />
      <DecisionAboutSection ctx={intelligenceCtx} />
      <DecisionFinanceDisplay finance={intelligenceCtx.finance} />
      <OwnerDecisionRecordSection ctx={intelligenceCtx} />
    </div>
  );
}
