/**
 * Promote DISCOVERED/FETCH_VALIDATED → durable Trusted Evidence route extension.
 * Evidence upsert may proceed only after promote (host-lock sees promoted route).
 * NEVER writes OUR RATE / Catalog / Accept.
 */

import {
  assertDiscoveryUrlSafe,
} from "@/lib/labor-source-discovery/ssrf";
import {
  loadLaborSourceDiscoveryStoreLocal,
  saveLaborSourceDiscoveryStoreLocal,
} from "@/lib/labor-source-discovery/store";
import type {
  DiscoveredSourceRecord,
  PromotedTrustedEvidenceRoute,
} from "@/lib/labor-source-discovery/types";

export type PromoteDiscoveredSourceInput = {
  discoveryId: string;
  workId: string;
  unit: string;
  identityLabelPl: string;
  /** Must be true — labor-only contract */
  laborOnly: true;
  role?: "REFERENCE";
  notePl?: string;
  nowIso?: string;
  actor?: string;
};

function sourceIdFromUrl(url: string, workId: string): string {
  let h = 2166136261;
  const s = `${url}|${workId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `discovered_promoted_${(h >>> 0).toString(16)}`;
}

/**
 * Validation contract: identity label · unit · laborOnly · FETCH_VALIDATED|DISCOVERED with safe URL.
 * Writes promotedRoutes; marks discovery PROMOTED.
 */
export function promoteDiscoveredSourceToTrustedEvidenceRoute(
  input: PromoteDiscoveredSourceInput,
):
  | { ok: true; route: PromotedTrustedEvidenceRoute; discovery: DiscoveredSourceRecord }
  | { ok: false; reasonPl: string } {
  if (input.laborOnly !== true) {
    return { ok: false, reasonPl: "Promote wymaga laborOnly=true." };
  }
  const workId = String(input.workId || "").trim();
  const unit = String(input.unit || "").trim();
  const identityLabelPl = String(input.identityLabelPl || "").trim();
  if (!workId) return { ok: false, reasonPl: "Brak workId (identity)." };
  if (!unit) return { ok: false, reasonPl: "Brak unit." };
  if (!identityLabelPl) return { ok: false, reasonPl: "Brak identityLabelPl." };

  const store = loadLaborSourceDiscoveryStoreLocal();
  const idx = store.discoveries.findIndex((d) => d.discoveryId === input.discoveryId);
  if (idx < 0) return { ok: false, reasonPl: "Nie znaleziono discoveryId." };
  const disc = store.discoveries[idx]!;
  if (disc.status === "REJECTED") {
    return { ok: false, reasonPl: "Discovery REJECTED — nie promote." };
  }
  if (disc.status !== "DISCOVERED" && disc.status !== "FETCH_VALIDATED" && disc.status !== "PROMOTED") {
    return { ok: false, reasonPl: `Status ${disc.status} nie pozwala na promote.` };
  }

  const safe = assertDiscoveryUrlSafe(disc.url);
  if (!safe.ok) return { ok: false, reasonPl: safe.reasonPl };

  const existing = store.promotedRoutes.find((r) => r.discoveryId === disc.discoveryId);
  if (existing) {
    return { ok: true, route: existing, discovery: disc };
  }

  const now = input.nowIso || new Date().toISOString();
  const sourceId = sourceIdFromUrl(safe.normalized, workId);
  const route: PromotedTrustedEvidenceRoute = {
    sourceId,
    url: safe.normalized,
    host: safe.host,
    workId,
    unit,
    role: input.role ?? "REFERENCE",
    laborOnly: true,
    identityLabelPl,
    promotedAt: now,
    discoveryId: disc.discoveryId,
    ownerStatus: "DISCOVERY_PROMOTED_TRUSTED_EVIDENCE_ROUTE",
    notePl:
      input.notePl
      || `Promoted from discovery ${disc.discoveryId} by ${input.actor || "ops"} (≠ static Owner KEEP routes).`,
  };

  const nextDisc: DiscoveredSourceRecord = {
    ...disc,
    status: "PROMOTED",
    promotedSourceId: sourceId,
  };
  const discoveries = store.discoveries.slice();
  discoveries[idx] = nextDisc;
  saveLaborSourceDiscoveryStoreLocal({
    ...store,
    updatedAt: now,
    discoveries,
    promotedRoutes: [...store.promotedRoutes, route],
  });
  return {
    ok: true,
    route,
    discovery: nextDisc,
  };
}
