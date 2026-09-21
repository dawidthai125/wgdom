/**
 * WR-SOURCE-EVIDENCE-DB-01 — host lock (reuse WORK_RATE_ALLOWED_HOSTS).
 *
 * Evidence plane also accepts:
 *  · Owner-authorized APF measurement sources (energospin / electrico)
 *  · Owner-authorized exact Labor Evidence routes (public BIP / cost estimate)
 *  · Owner-authorized Derived Labor Input routes (OFN-01 multi-source)
 *  · Derived composite sourceId when ALL derivation inputs pass host lock
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
  ownerLaborEvidenceUrlsMatch,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  resolveOwnerAuthorizedLaborEvidenceRouteByUrl,
} from "@/lib/labor-source-evidence/owner-authorized-routes";
import {
  assertOwnerDerivedLaborInputLeafBind,
  isDerivedLaborCompositeSourceId,
  isOwnerDerivedLaborInputSourceId,
  resolveOwnerDerivedLaborInputRoute,
  resolveOwnerDerivedLaborInputRouteByUrl,
} from "@/lib/labor-source-evidence/derived-labor-input-routes";
import {
  isPromotedTrustedEvidenceSourceId,
  resolvePromotedTrustedEvidenceRoute,
  resolvePromotedTrustedEvidenceRouteByUrl,
} from "@/lib/labor-source-discovery";
import type {
  DerivedLaborEvidenceInput,
  LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence/types";

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
    isOwnerAuthorizedLaborEvidenceSourceId(id) ||
    isOwnerDerivedLaborInputSourceId(id) ||
    isDerivedLaborCompositeSourceId(id) ||
    isPromotedTrustedEvidenceSourceId(id)
  );
}

export function isLaborSourceEvidenceUrlAllowed(sourceUrl: string): boolean {
  if (isWorkRateSelectiveUrlAllowed(sourceUrl)) return true;
  if (resolveApfAuthorizedRouteByUrl(sourceUrl) != null) return true;
  if (resolveOwnerAuthorizedLaborEvidenceRouteByUrl(sourceUrl) != null) return true;
  if (resolveOwnerDerivedLaborInputRouteByUrl(sourceUrl) != null) return true;
  return resolvePromotedTrustedEvidenceRouteByUrl(sourceUrl) != null;
}

export function assertLaborSourceEvidenceHostLock(input: {
  sourceId: string;
  sourceUrl: string;
}): { ok: true } | { ok: false; messagePl: string } {
  const sourceId = String(input.sourceId || "").trim();
  const sourceUrl = String(input.sourceUrl || "").trim();

  // Composite derived observation — top-level URL may be primary input URL;
  // callers must use assertDerivedLaborEvidenceHostLock for full check.
  if (isDerivedLaborCompositeSourceId(sourceId)) {
    if (!isLaborSourceEvidenceUrlAllowed(sourceUrl)) {
      return {
        ok: false,
        messagePl:
          "Derived composite host lock: top-level URL poza allowlistą (wymagane input routes).",
      };
    }
    return { ok: true };
  }

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

  // Owner Labor Evidence: exact sourceId ↔ that route's exact URL.
  if (isOwnerAuthorizedLaborEvidenceSourceId(sourceId)) {
    const byId = resolveOwnerAuthorizedLaborEvidenceRoute(sourceId);
    if (
      !byId ||
      !ownerLaborEvidenceUrlsMatch(byId.url, sourceUrl)
    ) {
      return {
        ok: false,
        messagePl: `Owner Labor Evidence host lock: sourceId „${sourceId}” nie pasuje do authorized URL.`,
      };
    }
  }

  // OFN-01 Derived Labor Input routes — exact sourceId ↔ URL.
  if (isOwnerDerivedLaborInputSourceId(sourceId)) {
    const byId = resolveOwnerDerivedLaborInputRoute(sourceId);
    if (!byId || !ownerLaborEvidenceUrlsMatch(byId.url, sourceUrl)) {
      return {
        ok: false,
        messagePl: `Derived Labor Input host lock: sourceId „${sourceId}” nie pasuje do authorized URL.`,
      };
    }
  }

  // Discovery-promoted Trusted routes (DISCOVERED → promote) — exact sourceId ↔ URL.
  if (isPromotedTrustedEvidenceSourceId(sourceId)) {
    const byUrl = resolvePromotedTrustedEvidenceRouteByUrl(sourceUrl);
    const byId = resolvePromotedTrustedEvidenceRoute(sourceId);
    if (!byUrl || !byId || byUrl.sourceId !== sourceId) {
      return {
        ok: false,
        messagePl: `Promoted discovery Evidence host lock: sourceId „${sourceId}” nie pasuje do promoted URL.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Multi-input host lock for derived observations.
 * EVERY derivation input must PASS; composite top-level also checked.
 * Bound routes (PRICE PERSISTENCE) must match observation workId + unit.
 */
export function assertDerivedLaborEvidenceHostLock(
  observation: Pick<
    LaborSourceEvidenceObservation,
    "priceKind" | "sourceId" | "sourceUrl" | "derivation" | "workId" | "unit"
  >,
): { ok: true } | { ok: false; messagePl: string } {
  if (observation.priceKind !== "derived") {
    return assertLaborSourceEvidenceHostLock({
      sourceId: observation.sourceId,
      sourceUrl: observation.sourceUrl,
    });
  }
  const der = observation.derivation;
  if (!der || !Array.isArray(der.inputs) || der.inputs.length === 0) {
    return {
      ok: false,
      messagePl: "Derived host lock: brak derivation.inputs[] — HOLD.",
    };
  }
  for (const inp of der.inputs as DerivedLaborEvidenceInput[]) {
    const one = assertLaborSourceEvidenceHostLock({
      sourceId: inp.sourceId,
      sourceUrl: inp.sourceUrl,
    });
    if (!one.ok) {
      return {
        ok: false,
        messagePl: `Derived input „${inp.inputId}”: ${one.messagePl}`,
      };
    }
    const bind = assertOwnerDerivedLaborInputLeafBind({
      sourceId: inp.sourceId,
      workId: observation.workId,
      unit: observation.unit,
    });
    if (!bind.ok) {
      return {
        ok: false,
        messagePl: `Derived input „${inp.inputId}”: ${bind.messagePl}`,
      };
    }
  }
  // Top-level composite / primary URL
  const top = assertLaborSourceEvidenceHostLock({
    sourceId: observation.sourceId,
    sourceUrl: observation.sourceUrl,
  });
  if (!top.ok) return top;
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
    "bip_powiat_obornicki_0815_04",
    "winbud_szczegolowy_2006_04",
    "zsckr_bozkow_1204_02",
    "hbstudio_cypisek_1505_01",
    "lok_lukow_1134_01",
    "lok_lukow_1134_02",
  ] as const;
}
