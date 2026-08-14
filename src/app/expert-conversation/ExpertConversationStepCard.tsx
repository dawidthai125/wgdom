/**
 * Single conversation step card — presentation only.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { ExpertConversationStepView } from "@/lib/expert-conversation-ui";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { chiefDossierIcon } from "@/app/chief-dossier/chiefDossierUiTokens";

function statusClass(status: ExpertConversationStepView["status"]): string {
  switch (status) {
    case "active":
      return "border-primary/50 bg-primary/5";
    case "done":
      return "border-border/50 bg-background/40";
    case "blocked":
      return "border-destructive/40 bg-destructive/5";
    case "hold":
    case "partial":
    case "gap":
      return "border-amber-500/40 bg-amber-500/5";
    case "skipped":
      return "border-border/40 bg-muted/20 opacity-80";
    default:
      return "border-border/40 bg-muted/10 opacity-70";
  }
}

export function ExpertConversationStepCard({
  step,
  revealed,
  isCurrent,
  collapsedDone,
}: {
  step: ExpertConversationStepView;
  revealed: boolean;
  isCurrent: boolean;
  collapsedDone: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isCurrent || !revealed || !ref.current) return;
    try {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    } catch {
      /* ignore */
    }
  }, [isCurrent, revealed, step.id]);

  if (!revealed) return null;

  const Icon = chiefDossierIcon(step.iconKey);
  const compact = collapsedDone && step.status === "done" && !isCurrent;

  return (
    <article
      ref={ref as RefObject<HTMLElement>}
      className={`rounded-lg border px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none ${statusClass(step.status)} ${
        isCurrent ? "ring-1 ring-primary/30" : ""
      }`}
      data-expert-conversation-step={step.id}
      data-expert-conversation-status={step.status}
      data-expert-conversation-current={isCurrent ? "1" : "0"}
      data-expert-conversation-event={step.event ?? undefined}
      data-expert-conversation-source-kind={step.sourceRef?.kind}
      data-expert-conversation-source-tender={step.sourceRef?.tenderId}
      aria-current={isCurrent ? "step" : undefined}
    >
      <div className="flex items-start gap-2 min-h-[40px]">
        <Icon
          size={16}
          className={`shrink-0 mt-0.5 ${
            step.status === "active" ? "text-primary" : "text-muted-foreground"
          } ${step.status === "active" ? "motion-safe:animate-pulse" : ""}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>
              {step.actorLabelPl}
            </p>
            <p
              className={`${TEUX_FONT_CAPTION} text-muted-foreground`}
              data-expert-conversation-status-label
            >
              {step.statusLabelPl}
            </p>
          </div>
          {!compact && (
            <>
              <p className={`${TEUX_FONT_BODY} text-foreground/90 whitespace-pre-wrap`}>
                {step.messagePl}
              </p>
              {step.detailPl && (
                <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                  {step.detailPl}
                </p>
              )}
              {step.offerPriceDisplayPl && (
                <p
                  className={`${TEUX_FONT_CAPTION} font-semibold tabular-nums text-foreground`}
                  data-expert-conversation-offer-pln
                >
                  Oferta PRIMARY: {step.offerPriceDisplayPl}
                </p>
              )}
            </>
          )}
          {compact && (
            <p className={`${TEUX_FONT_CAPTION} text-muted-foreground truncate`}>
              {step.messagePl}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
