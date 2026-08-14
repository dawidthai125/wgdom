/**
 * WR-SOURCE-EVIDENCE-DB-01 — Owner-approved source roles (design inventory).
 * Runtime allowlist remains KEEP-4 — roles do not add hosts.
 */

import type { LaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/types";

export function resolveLaborSourceEvidenceSourceRole(
  sourceId: string,
): LaborSourceEvidenceSourceRole | null {
  const id = String(sourceId || "").trim();
  if (id === "kb_pl" || id === "cennikremontow_pl" || id === "extradom") return "PRIMARY";
  if (id === "sccot") return "SECONDARY";
  if (id === "zleca") return "REFERENCE";
  return null;
}
