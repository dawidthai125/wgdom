/**
 * W5-1 — Owner Action deep-link resolver (reuse-first · navigation only).
 * Maps IkOwnerActionItem → existing Hub/DW panel anchors. ZERO auto-Accept · ZERO writes.
 */

import type {
  IkOwnerActionDomain,
  IkOwnerActionItem,
} from "./ik-owner-action-queue";

export type IkOwnerActionNavigationKind =
  | "owner_input_equipment"
  | "owner_input_transport"
  | "labor_accept"
  | "material_accept"
  | "identity_manual"
  | "f5_gap"
  | "classification_hold";

export type IkOwnerActionDeepLinkResolution =
  | {
      ok: true;
      domain: IkOwnerActionDomain;
      actionType: IkOwnerActionNavigationKind;
      anchorId: string;
      selector: string;
      lineRef: string;
      dwellingId: string;
      labelPl: string;
    }
  | {
      ok: false;
      domain: IkOwnerActionDomain;
      reason: "UNSUPPORTED" | "PARSE_FAIL" | "GAP";
      gapNotePl: string;
    };

/** Known anchor roots — audit-derived from existing panels (do not invent new panels). */
export const IK_OWNER_ACTION_ANCHOR = {
  ownerRateInputCards: "[data-owner-rate-input-cards]",
  ownerRateDomain: (domain: "equipment" | "transport") =>
    `[data-owner-rate-input-card][data-owner-rate-domain="${domain}"]`,
  laborGapPanel: "[data-ik-labor-gap-research-panel]",
  expertWorkspace: "[data-expert-workspace-surface]",
  demandPriceResearch: "[data-demand-price-research-panel]",
  offerBoqLine: (lineId: string) =>
    `[data-offer-boq-line-id="${cssEscape(lineId)}"]`,
  kosztorysBoqExplorer: "[data-kosztorys-boq-explorer]",
} as const;

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function lineSelector(lineRef: string): string {
  const ref = String(lineRef ?? "").trim();
  if (!ref || ref === "*") return "";
  return IK_OWNER_ACTION_ANCHOR.offerBoqLine(ref);
}

function okResolution(
  item: Pick<IkOwnerActionItem, "domain" | "lineRef" | "dwellingId" | "labelPl">,
  actionType: IkOwnerActionNavigationKind,
  anchorId: string,
  selector: string,
): IkOwnerActionDeepLinkResolution {
  return {
    ok: true,
    domain: item.domain,
    actionType,
    anchorId,
    selector,
    lineRef: item.lineRef,
    dwellingId: item.dwellingId,
    labelPl: item.labelPl,
  };
}

function gapResolution(
  item: Pick<IkOwnerActionItem, "domain" | "labelPl">,
  reason: "UNSUPPORTED" | "PARSE_FAIL" | "GAP",
  gapNotePl: string,
): IkOwnerActionDeepLinkResolution {
  return {
    ok: false,
    domain: item.domain,
    reason,
    gapNotePl,
  };
}

/**
 * Resolve queue item → existing panel anchor (pure · deterministic).
 */
export function resolveIkOwnerActionDeepLink(
  item: Pick<
    IkOwnerActionItem,
    "domain" | "deepLink" | "lineRef" | "dwellingId" | "blockerCode" | "labelPl"
  >,
): IkOwnerActionDeepLinkResolution {
  const deepLink = String(item.deepLink ?? "").trim();
  if (!deepLink.startsWith("ik:")) {
    return gapResolution(item, "PARSE_FAIL", "Nieprawidłowy deepLink (oczekiwano ik:…).");
  }

  switch (item.domain) {
    case "equipment_input":
      return okResolution(
        item,
        "owner_input_equipment",
        "owner-rate-input-cards",
        item.lineRef && item.lineRef !== "*"
          ? `${IK_OWNER_ACTION_ANCHOR.ownerRateDomain("equipment")}`
          : IK_OWNER_ACTION_ANCHOR.ownerRateInputCards,
      );
    case "transport_input":
      return okResolution(
        item,
        "owner_input_transport",
        "owner-rate-input-cards",
        item.lineRef && item.lineRef !== "*"
          ? `${IK_OWNER_ACTION_ANCHOR.ownerRateDomain("transport")}`
          : IK_OWNER_ACTION_ANCHOR.ownerRateInputCards,
      );
    case "labor_accept":
      return okResolution(
        item,
        "labor_accept",
        "ik-labor-gap-research-panel",
        IK_OWNER_ACTION_ANCHOR.laborGapPanel,
      );
    case "material_accept":
      return okResolution(
        item,
        "material_accept",
        "expert-workspace-surface",
        `${IK_OWNER_ACTION_ANCHOR.expertWorkspace}, ${IK_OWNER_ACTION_ANCHOR.demandPriceResearch}`,
      );
    case "identity": {
      const lineSel = lineSelector(item.lineRef);
      if (lineSel) {
        return okResolution(
          item,
          "identity_manual",
          `offer-boq-line-${item.lineRef}`,
          `${lineSel}, ${IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer}`,
        );
      }
      return okResolution(
        item,
        "identity_manual",
        "kosztorys-boq-explorer",
        IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer,
      );
    }
    case "f5_blocker": {
      const code = String(item.blockerCode ?? "");
      if (
        code === "EQUIPMENT_OUT_OF_SCOPE"
        || code === "EQUIPMENT_OWNER_INPUT_INVALID"
      ) {
        return okResolution(
          item,
          "owner_input_equipment",
          "owner-rate-input-cards",
          IK_OWNER_ACTION_ANCHOR.ownerRateDomain("equipment"),
        );
      }
      if (
        code === "TRANSPORT_OUT_OF_SCOPE"
        || code === "TRANSPORT_OWNER_INPUT_INVALID"
      ) {
        return okResolution(
          item,
          "owner_input_transport",
          "owner-rate-input-cards",
          IK_OWNER_ACTION_ANCHOR.ownerRateDomain("transport"),
        );
      }
      if (
        code === "BRAK_IDENTYFIKACJI_ROBOTY"
        || code === "NIEJEDNOZNACZNA_ROBOTA"
      ) {
        const lineSel = lineSelector(item.lineRef);
        return okResolution(
          item,
          "identity_manual",
          lineSel ? `offer-boq-line-${item.lineRef}` : "kosztorys-boq-explorer",
          lineSel
            ? `${lineSel}, ${IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer}`
            : IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer,
        );
      }
      if (
        code === "BRAK_STAWKI_ROBOT"
        || code === "PRZETERMINOWANA_STAWKA_ROBOT"
      ) {
        return okResolution(
          item,
          "labor_accept",
          "ik-labor-gap-research-panel",
          IK_OWNER_ACTION_ANCHOR.laborGapPanel,
        );
      }
      if (
        code === "BRAK_CENY_MATERIALU"
        || code === "PRZETERMINOWANA_CENA_MATERIALU"
        || code === "BRAK_MATERIAL_KEY"
        || code === "BRAK_NORMY_MATERIALOWEJ"
        || code === "BRAK_TECHNOLOGII_BOM"
        || code === "BRAK_KONWERSJI_JEDNOSTEK"
      ) {
        return okResolution(
          item,
          "material_accept",
          "expert-workspace-surface",
          `${IK_OWNER_ACTION_ANCHOR.expertWorkspace}, ${IK_OWNER_ACTION_ANCHOR.demandPriceResearch}`,
        );
      }
      const lineSel = lineSelector(item.lineRef);
      if (lineSel) {
        return okResolution(
          item,
          "f5_gap",
          `offer-boq-line-${item.lineRef}`,
          lineSel,
        );
      }
      return gapResolution(
        item,
        "GAP",
        `F5 GAP ${code} — brak dedykowanego panelu; użyj Kosztorys / BOQ.`,
      );
    }
    case "classification_hold":
      return gapResolution(
        item,
        "GAP",
        "COMPOUND/UNKNOWN HOLD — wymaga Owner map expansion (policy); brak auto-panelu.",
      );
    default:
      return gapResolution(item, "UNSUPPORTED", `Nieobsługiwana domena: ${item.domain}.`);
  }
}

/**
 * Browser-only: scroll/focus first matching anchor. No data mutation.
 */
export function focusIkOwnerActionTarget(
  item: Pick<
    IkOwnerActionItem,
    "domain" | "deepLink" | "lineRef" | "dwellingId" | "blockerCode" | "labelPl"
  >,
): IkOwnerActionDeepLinkResolution {
  const resolution = resolveIkOwnerActionDeepLink(item);
  if (!resolution.ok) return resolution;
  if (typeof document === "undefined") return resolution;

  const selectors = resolution.selector.split(",").map((s) => s.trim()).filter(Boolean);
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in el && typeof (el as HTMLElement).focus === "function") {
        try {
          (el as HTMLElement).focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
      return resolution;
    }
  }

  return gapResolution(
    item,
    "GAP",
    `Panel nie znaleziony w DOM: ${resolution.anchorId}`,
  );
}
