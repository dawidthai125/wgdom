/**
 * Inteligentny Kosztorysant UX — PL labels (presentation only).
 */

export const INTELIGENTNY_KOSZTORYSANT_TITLE_PL = "Inteligentny Kosztorysant";

export const INTELIGENTNY_KOSZTORYSANT_AUTHOR_PL =
  "w pełni stworzony przez Dawida Thai Thanh";

export const EXPERT_CONVERSATION_TITLE_PL = "Przebieg pracy ekspertów";

export const EXPERT_CONVERSATION_SUBTITLE_PL =
  "Prezentacja orkiestracji — dane z Trace / Dossier";

export const EXPERT_CONVERSATION_SKIP_PL = "Pomiń animację";

export const EXPERT_CONVERSATION_CONTINUE_PL = "Przejdź dalej";

export const EXPERT_CONVERSATION_ACTOR_CHIEF_PL = "Chief";

export const EXPERT_CONVERSATION_ACTOR_EE_PL = "Execution Expert";

export const EXPERT_CONVERSATION_ACTOR_ME_PL = "Material Expert";

export const EXPERT_CONVERSATION_ACTOR_PE_PL = "Pricing Expert";

export const EXPERT_CONVERSATION_ACTOR_COST_PL = "Cost Expert";

export const EXPERT_CONVERSATION_ACTOR_OFFER_PL = "Offer Expert";

export function labelConversationStatusPl(
  status: "pending" | "active" | "done" | "blocked" | "skipped",
): string {
  switch (status) {
    case "pending":
      return "Oczekuje";
    case "active":
      return "W toku";
    case "done":
      return "Gotowe";
    case "blocked":
      return "Zablokowane";
    case "skipped":
      return "Pominięte";
    default:
      return status;
  }
}
