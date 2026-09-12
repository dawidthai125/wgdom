/**
 * WR-SOURCE-EVIDENCE-DB-01 — Owner-approved source roles (design inventory).
 * Runtime allowlist = KEEP-5 + APF measurement + Owner exact Labor Evidence routes.
 * Roles do not invent hosts · APF / Owner Evidence ≠ KEEP-4 NORMAL research.
 */

import type { LaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/types";
import {
  isApfAuthorizedSourceId,
  resolveApfAuthorizedRoute,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback/apf-source-authorization";
import {
  isOwnerAuthorizedLaborEvidenceSourceId,
  resolveOwnerAuthorizedLaborEvidenceRoute,
} from "@/lib/labor-source-evidence/owner-authorized-routes";

export function resolveLaborSourceEvidenceSourceRole(
  sourceId: string,
): LaborSourceEvidenceSourceRole | null {
  const id = String(sourceId || "").trim();
  if (id === "kb_pl" || id === "cennikremontow_pl" || id === "extradom") return "PRIMARY";
  if (id === "sccot" || id === "remonty_apm") return "SECONDARY";
  if (id === "zleca") return "REFERENCE";
  if (isOwnerAuthorizedLaborEvidenceSourceId(id)) {
    return resolveOwnerAuthorizedLaborEvidenceRoute(id)?.role ?? "REFERENCE";
  }
  if (isApfAuthorizedSourceId(id)) {
    const route = resolveApfAuthorizedRoute(id);
    if (route?.role === "PRIMARY") return "PRIMARY";
    if (route?.role === "SECONDARY") return "SECONDARY";
    return "REFERENCE";
  }
  return null;
}
