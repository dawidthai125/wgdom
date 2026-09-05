/**
 * W4-1 — Owner Action Queue (read model only).
 * Aggregates existing SSOT sources — ZERO auto-Accept · ZERO persist · ZERO resolve.
 */

import type { IkClassificationReport } from "@/lib/intelligent-estimator/ik-classification";
import type { IkIdentityCoverageReport } from "@/lib/intelligent-estimator/ik-identity-coverage";
import type { IkLaborExpertReport } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertReport } from "@/lib/intelligent-estimator/ik-material-expert";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { listOwnerInputsForTender } from "@/lib/owner-rate-input";
import type { IkIdentityContext } from "./ik-identity-phase";
import type { IkPackageBlockerReport } from "./ik-package-blocker-report";
import { buildIkPackageBlockerReport } from "./ik-package-blocker-report";

export type IkOwnerActionDomain =
  | "identity"
  | "labor_accept"
  | "material_accept"
  | "equipment_input"
  | "transport_input"
  | "f5_blocker"
  | "classification_hold";

export type IkOwnerActionItem = {
  domain: IkOwnerActionDomain;
  lineRef: string;
  dwellingId: string;
  blockerCode: string;
  priority: number;
  deepLink: string;
  labelPl: string;
  suggestedActionPl: string;
  blocksPackageGate: boolean;
};

export type IkOwnerActionQueueReport = {
  tenderId: string;
  itemCount: number;
  packageGateBlockingCount: number;
  items: IkOwnerActionItem[];
};

export type BuildIkOwnerActionQueueInput = {
  tenderId: string;
  pkg: TenderPackage | null;
  store: WorkCatalogStore;
  identityContext?: IkIdentityContext | null;
  identityCoverage?: IkIdentityCoverageReport | null;
  classification?: IkClassificationReport | null;
  labor?: IkLaborExpertReport | null;
  material?: IkMaterialExpertReport | null;
  packageBlockers?: IkPackageBlockerReport | null;
  nowMs?: number;
};

const PRIORITY_PACKAGE_GATE = 0;
const PRIORITY_P0 = 1;
const PRIORITY_ACCEPT = 2;
const PRIORITY_HOLD = 3;

function pushUnique(items: IkOwnerActionItem[], item: IkOwnerActionItem): void {
  const key = `${item.domain}|${item.dwellingId}|${item.lineRef}|${item.blockerCode}`;
  if (items.some((x) => `${x.domain}|${x.dwellingId}|${x.lineRef}|${x.blockerCode}` === key)) {
    return;
  }
  items.push(item);
}

function sortQueue(items: IkOwnerActionItem[]): IkOwnerActionItem[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.blocksPackageGate !== b.blocksPackageGate) {
      return a.blocksPackageGate ? -1 : 1;
    }
    const dw = a.dwellingId.localeCompare(b.dwellingId, "pl");
    if (dw !== 0) return dw;
    const dom = a.domain.localeCompare(b.domain, "pl");
    if (dom !== 0) return dom;
    return a.lineRef.localeCompare(b.lineRef, "pl");
  });
}

/**
 * READ MODEL — surfaces required Owner actions; never executes them.
 */
export function buildIkOwnerActionQueue(
  input: BuildIkOwnerActionQueueInput,
): IkOwnerActionQueueReport {
  const tenderId = String(input.tenderId ?? "").trim();
  const items: IkOwnerActionItem[] = [];
  const nowMs = input.nowMs ?? Date.now();

  const blockers =
    input.packageBlockers
    ?? (input.pkg
      ? buildIkPackageBlockerReport(input.pkg, input.store, { nowMs, ensureOwnerQuestions: false })
      : null);

  if (blockers) {
    for (const b of blockers.blockers) {
      pushUnique(items, {
        domain: "f5_blocker",
        lineRef: b.lineId,
        dwellingId: b.dwellingId,
        blockerCode: b.gapCode,
        priority: b.blocksPackageGate ? PRIORITY_PACKAGE_GATE : PRIORITY_P0,
        deepLink: `ik:f5-gap:${b.dwellingId}:${b.lineId}:${b.gapCode}`,
        labelPl: `F5 GAP · ${b.lp} · ${b.gapCode}`,
        suggestedActionPl: b.suggestedActionPl,
        blocksPackageGate: b.blocksPackageGate,
      });
    }
  }

  if (input.identityCoverage) {
    for (const line of input.identityCoverage.lines) {
      // P0 Identity — qty=0 (LP43 class) stays unresolved; never surface G1 map action.
      if (Number(line.quantity) === 0) continue;
      if (line.status === "AMBIGUOUS") {
        pushUnique(items, {
          domain: "identity",
          lineRef: line.lineId,
          dwellingId: line.dwellingId,
          blockerCode: "NIEJEDNOZNACZNA_ROBOTA",
          priority: PRIORITY_P0,
          deepLink: `ik:identity:ambiguous:${line.dwellingId}:${line.lineId}`,
          labelPl: `Identity AMBIGUOUS · ${line.lp}`,
          suggestedActionPl:
            "Wybierz catalogWorkId z kandydatów — SUGGESTION ≠ trusted (G1 Accept).",
          blocksPackageGate: true,
        });
      } else if (
        line.status === "IDENTITY_GAP"
        || line.status === "OWNER_MAPPING_POSSIBLE"
      ) {
        pushUnique(items, {
          domain: "identity",
          lineRef: line.lineId,
          dwellingId: line.dwellingId,
          blockerCode: "BRAK_IDENTYFIKACJI_ROBOTY",
          priority: PRIORITY_P0,
          deepLink: `ik:identity:gap:${line.dwellingId}:${line.lineId}`,
          labelPl: `Identity GAP · ${line.lp}`,
          suggestedActionPl:
            line.status === "OWNER_MAPPING_POSSIBLE"
              ? "Owner KNR / catalog map — bez auto-trust."
              : "Przypisz tożsamość pracy (manual / map) — G1 Confirm.",
          blocksPackageGate: true,
        });
      }
    }
  } else if (input.identityContext) {
    if (input.identityContext.ambiguousCount > 0) {
      pushUnique(items, {
        domain: "identity",
        lineRef: "*",
        dwellingId: "*",
        blockerCode: "NIEJEDNOZNACZNA_ROBOTA",
        priority: PRIORITY_P0,
        deepLink: "ik:identity:ambiguous",
        labelPl: `Identity ambiguous (${input.identityContext.ambiguousCount})`,
        suggestedActionPl: "Rozstrzygnij ambiguity per linia.",
        blocksPackageGate: true,
      });
    }
    if (input.identityContext.noIdentityCount > 0) {
      pushUnique(items, {
        domain: "identity",
        lineRef: "*",
        dwellingId: "*",
        blockerCode: "BRAK_IDENTYFIKACJI_ROBOTY",
        priority: PRIORITY_P0,
        deepLink: "ik:identity:gap",
        labelPl: `Identity GAP (${input.identityContext.noIdentityCount})`,
        suggestedActionPl: "Przypisz catalogWorkId — coverage report.",
        blocksPackageGate: true,
      });
    }
  }

  if (input.labor) {
    for (const row of input.labor.lines) {
      if (row.rateStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED" || !row.candidate) continue;
      const workId = row.catalogWorkId ?? row.identity.workId ?? "unknown";
      pushUnique(items, {
        domain: "labor_accept",
        lineRef: row.lineId,
        dwellingId: row.dwellingId,
        blockerCode: "OWNER_ACCEPT_LABOR",
        priority: PRIORITY_ACCEPT,
        deepLink: `ik:accept:labor:${row.dwellingId}:${row.lineId}:${workId}`,
        labelPl: `P5 Accept · ${row.lp} · OUR RATE`,
        suggestedActionPl: "Owner Accept kandydata → Work Catalog OUR RATE.",
        blocksPackageGate: true,
      });
    }
  }

  if (input.material) {
    for (const row of input.material.lines) {
      if (row.priceStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED" || !row.candidate) continue;
      pushUnique(items, {
        domain: "material_accept",
        lineRef: row.lineId,
        dwellingId: row.dwellingId,
        blockerCode: "OWNER_ACCEPT_MATERIAL",
        priority: PRIORITY_ACCEPT,
        deepLink: `ik:accept:material:${row.dwellingId}:${row.lineId}`,
        labelPl: `P6 Accept · ${row.lp} · Price Memory`,
        suggestedActionPl: "Owner Accept kandydata → Price Memory SELL.",
        blocksPackageGate: true,
      });
    }
  }

  for (const oi of listOwnerInputsForTender({ tenderId })) {
    const q = oi.question;
    if (q.status === "answered" || q.status === "cancelled") continue;
    const lineRef = q.lineRef ?? q.questionId;
    const dwellingId = q.dwellingId ?? "default";
    const domain = q.domain === "transport" ? "transport_input" : "equipment_input";
    pushUnique(items, {
      domain,
      lineRef,
      dwellingId,
      blockerCode: q.domain === "transport" ? "TRANSPORT_OUT_OF_SCOPE" : "EQUIPMENT_OUT_OF_SCOPE",
      priority: PRIORITY_P0,
      deepLink: `ik:owner-input:${q.domain}:${dwellingId}:${lineRef}`,
      labelPl: `Owner Input ${q.domain} · ${lineRef}`,
      suggestedActionPl: "Uzupełnij Owner Input (tender-scoped) — bez invent stawki.",
      blocksPackageGate: true,
    });
  }

  if (input.classification) {
    const c = input.classification.counts;
    if (c.COMPOUND > 0) {
      pushUnique(items, {
        domain: "classification_hold",
        lineRef: "*",
        dwellingId: "*",
        blockerCode: "COMPOUND_HOLD",
        priority: PRIORITY_HOLD,
        deepLink: "ik:classification:compound",
        labelPl: `COMPOUND HOLD (${c.COMPOUND})`,
        suggestedActionPl: "Owner map / technology pack — bez auto-research.",
        blocksPackageGate: true,
      });
    }
    if (c.UNKNOWN > 0) {
      pushUnique(items, {
        domain: "classification_hold",
        lineRef: "*",
        dwellingId: "*",
        blockerCode: "UNKNOWN_HOLD",
        priority: PRIORITY_HOLD,
        deepLink: "ik:classification:unknown",
        labelPl: `UNKNOWN HOLD (${c.UNKNOWN})`,
        suggestedActionPl: "Rozszerz owner-classification-map (Owner GO).",
        blocksPackageGate: true,
      });
    }
  }

  const sorted = sortQueue(items);
  return {
    tenderId,
    itemCount: sorted.length,
    packageGateBlockingCount: sorted.filter((i) => i.blocksPackageGate).length,
    items: sorted,
  };
}

/**
 * Unresolved Owner Input questions for batch operator view (W4-4).
 */
export function listUnresolvedOwnerInputBatch(tenderId: string) {
  return listOwnerInputsForTender({ tenderId }).filter(
    (item) => item.question.status === "open",
  );
}
