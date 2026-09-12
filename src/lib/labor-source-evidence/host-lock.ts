/**
 * WR-SOURCE-EVIDENCE-DB-01 — host lock (reuse WORK_RATE_ALLOWED_HOSTS).
 *
 * Evidence plane also accepts:
 *  · Owner-authorized APF measurement sources (energospin / electrico)
 *  · Owner-authorized exact Labor Evidence routes (public BIP / cost estimate)
 *
 * APF + Owner Evidence hosts remain OUT of KEEP-4/5 NORMAL research allowlist.
 */

import { isWorkRateSelectiveUrlAllowed } from "@/lib/work-catalog/work-rate-source-html-parse";
import type { WorkRateAuthorizedSourceId } from "@/lib/work-catalog/work-rate-legal";
import {
  isApfAuthorizedSourceId,
  resolveApfAuthorizedRoute,
  resolveApfAuthorizedRouteByUrl,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback/apf-source-authorization";
import {
  isOwnerAuthorizedLaborEvidenceSourceId,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  resolveOwnerAuthorizedLaborEvidenceRouteByUrl,
} from "@/lib/labor-source-evidence/owner-authorized-routes";

const KEEP5_RUNTIME_SOURCE_IDS = new Set<string>([
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
  "remonty_apm",
]);

export function isLaborSourceEvidenceKeep5SourceId(sourceId: string): boolean {
  return KEEP5_RUNTIME_SOURCE_IDS.has(String(sourceId || "").trim());
}

export function isLaborSourceEvidenceRuntimeSourceId(sourceId: string): boolean {
  const id = String(sourceId || "").trim();
  return (
    isLaborSourceEvidenceKeep5SourceId(id) ||
    isApfAuthorizedSourceId(id) ||
    isOwnerAuthorizedLaborEvidenceSourceId(id)
  );
}

export function isLaborSourceEvidenceUrlAllowed(sourceUrl: string): boolean {
  if (isWorkRateSelectiveUrlAllowed(sourceUrl)) return true;
  if (resolveApfAuthorizedRouteByUrl(sourceUrl) != null) return true;
  return resolveOwnerAuthorizedLaborEvidenceRouteByUrl(sourceUrl) != null;
}

export function assertLaborSourceEvidenceHostLock(input: {
  sourceId: string;
  sourceUrl: string;
}): { ok: true } | { ok: false; messagePl: string } {
  const sourceId = String(input.sourceId || "").trim();
  const sourceUrl = String(input.sourceUrl || "").trim();

  if (!isLaborSourceEvidenceRuntimeSourceId(sourceId)) {
    return {
      ok: false,
      messagePl: `Host/source lock: sourceId „${sourceId}” poza KEEP-5 / APF / Owner Evidence runtime.`,
    };
  }
  if (!isLaborSourceEvidenceUrlAllowed(sourceUrl)) {
    return {
      ok: false,
      messagePl: "Host lock: URL poza allowlistą (ZERO arbitrary / client URL).",
    };
  }

  // APF: sourceId + URL must resolve to the same Owner-authorized route (no cross-host mix).
  if (isApfAuthorizedSourceId(sourceId)) {
    const byUrl = resolveApfAuthorizedRouteByUrl(sourceUrl);
    const byId = resolveApfAuthorizedRoute(sourceId);
    if (!byUrl || !byId || byUrl.sourceId !== sourceId) {
      return {
        ok: false,
        messagePl: `APF Evidence host lock: sourceId „${sourceId}” nie pasuje do authorized URL.`,
      };
    }
  }

  // Owner Labor Evidence: exact sourceId ↔ exact URL (no cross-route mix).
  if (isOwnerAuthorizedLaborEvidenceSourceId(sourceId)) {
    const byUrl = resolveOwnerAuthorizedLaborEvidenceRouteByUrl(sourceUrl);
    const byId = resolveOwnerAuthorizedLaborEvidenceRoute(sourceId);
    if (!byUrl || !byId || byUrl.sourceId !== sourceId) {
      return {
        ok: false,
        messagePl: `Owner Labor Evidence host lock: sourceId „${sourceId}” nie pasuje do authorized URL.`,
      };
    }
  }

  return { ok: true };
}

export function listLaborSourceEvidenceRuntimeSourceIds(): readonly WorkRateAuthorizedSourceId[] {
  return ["kb_pl", "cennikremontow_pl", "sccot", "extradom", "remonty_apm"] as const;
}

export function listLaborSourceEvidenceApfSourceIds(): readonly string[] {
  return ["energospin_pl", "electrico_pomiary_pl"] as const;
}

export function listLaborSourceEvidenceOwnerRouteSourceIds(): readonly string[] {
  return [
    "bip_staro_olecko_1118_09",
    "public_cost_estimate_0829_03",
  ] as const;
}
