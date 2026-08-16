/**
 * IK-MIGRATION-01 P0 — IkConversationEvent + Truth / sourceRef contract (AD-IK-M05).
 * REUSE ExpertConversationSourceRef · ZERO invent · ZERO LLM-as-verified-source.
 */

import type {
  ExpertConversationSourceRef,
  ExpertConversationSourceRefKind,
  ExpertConversationStepStatus,
  ExpertConversationStepView,
} from "@/lib/expert-conversation-ui";
import { labelConversationStatusPl } from "@/lib/expert-conversation-ui";

/** P0 DF — allowed sourceRef.kind (subset + EC UI kinds already shipped). */
export const IK_CONVERSATION_SOURCE_REF_KINDS = [
  "document",
  "extraction",
  "boq_ready",
  "hold",
  "classification",
  "identity",
  "labor_lookup",
  "labor_research",
  "material_lookup",
  "material_research",
  "identity_coverage",
  "evidence",
  "candidate",
] as const satisfies ReadonlyArray<ExpertConversationSourceRefKind>;

export type IkConversationSourceRefKind = (typeof IK_CONVERSATION_SOURCE_REF_KINDS)[number];

export type IkConversationEventActor =
  | "Chief"
  | "Document"
  | "Labor"
  | "Material"
  | "Control"
  | "Pricing"
  | "Risk";

export type IkConversationEventStatus = ExpertConversationStepStatus;

/**
 * P0 Design Freeze — Expert Conversation event contract.
 * `sourceRef` required whenever the message presents a system fact as verified (`status === "done"`).
 */
export interface IkConversationEvent {
  id: string;
  at: string;
  actor: IkConversationEventActor;
  status: IkConversationEventStatus;
  messagePl: string;
  detailPl?: string | null;
  sourceRef?: ExpertConversationSourceRef | null;
}

export function isAllowedIkSourceRefKind(
  kind: string | null | undefined,
): kind is IkConversationSourceRefKind {
  return (
    typeof kind === "string"
    && (IK_CONVERSATION_SOURCE_REF_KINDS as readonly string[]).includes(kind)
  );
}

/** Real sourceRef: kind + tenderId + non-invented artifact object. */
export function hasValidIkSourceRef(
  ref: ExpertConversationSourceRef | null | undefined,
): boolean {
  if (!ref) return false;
  if (!isAllowedIkSourceRefKind(ref.kind)) return false;
  if (typeof ref.tenderId !== "string" || !ref.tenderId.trim()) return false;
  if (!ref.artifact || typeof ref.artifact !== "object" || Array.isArray(ref.artifact)) {
    return false;
  }
  return true;
}

/**
 * Verified system fact may be presented only when status is done AND sourceRef is valid.
 * Without sourceRef → never “zweryfikowany fakt” (AD-IK-M05).
 */
export function canPresentAsVerifiedFact(
  event: Pick<IkConversationEvent, "status" | "sourceRef">,
): boolean {
  return event.status === "done" && hasValidIkSourceRef(event.sourceRef);
}

function actorFromStep(step: ExpertConversationStepView): IkConversationEventActor {
  const label = (step.actorLabelPl || "").toLowerCase();
  if (label.includes("labor") || label.includes("robocizn")) return "Labor";
  if (label.includes("mater")) return "Material";
  if (label.includes("chief") || label.includes("szef")) return "Chief";
  if (label.includes("cen") || label.includes("pric") || label.includes("koszt")) return "Pricing";
  if (label.includes("risk") || label.includes("ryzyk")) return "Risk";
  if (label.includes("control") || label.includes("kontrol")) return "Control";
  return "Document";
}

export function toIkConversationEvent(
  step: ExpertConversationStepView,
  at: string = new Date().toISOString(),
): IkConversationEvent {
  return {
    id: step.event || step.id,
    at,
    actor: actorFromStep(step),
    status: step.status,
    messagePl: step.messagePl,
    detailPl: step.detailPl,
    sourceRef: step.sourceRef ?? null,
  };
}

/**
 * Enforce AD-IK-M05 on VM steps: `done` without valid sourceRef → `hold`
 * (cannot be shown as a verified fact).
 */
export function enforceIkConversationTruth(
  steps: ExpertConversationStepView[],
): ExpertConversationStepView[] {
  return steps.map((s) => {
    if (s.status !== "done") return s;
    if (hasValidIkSourceRef(s.sourceRef)) return s;
    return {
      ...s,
      status: "hold",
      statusLabelPl: labelConversationStatusPl("hold"),
      detailPl:
        s.detailPl
        || "Brak sourceRef — komunikat nie jest przedstawiany jako fakt zweryfikowany.",
    };
  });
}
