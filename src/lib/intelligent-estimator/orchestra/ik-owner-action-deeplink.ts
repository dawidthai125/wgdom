/**
 * W5-1 / W6-2 / W6-3 — Owner Action deep-link resolver (reuse-first · navigation only).
 * Maps IkOwnerActionItem → existing Hub/DW panel anchors. ZERO auto-Accept · ZERO writes.
 */

import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
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

export type IkOwnerActionDeepLinkContext = {
  /** W6-3 — material / OI panels live under Chief dossier surface. */
  chiefDossierAvailable?: boolean;
};

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
      /** W6-2 — cross-tab navigation before deferred focus. */
      navigationTab: TenderDetailV4TabId;
      requiresDeferredFocus: boolean;
    }
  | {
      ok: false;
      domain: IkOwnerActionDomain;
      reason: "UNSUPPORTED" | "PARSE_FAIL" | "GAP" | "CHIEF_OFF";
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

const CHIEF_OFF_OI_NOTE_PL =
  "Chief OFF — panel Owner Input / Materiałów niedostępny. Aktywuj Chief Session (Przetarg).";

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

function chiefPanelBlocked(
  item: Pick<IkOwnerActionItem, "domain" | "labelPl">,
): IkOwnerActionDeepLinkResolution {
  return {
    ok: false,
    domain: item.domain,
    reason: "CHIEF_OFF",
    gapNotePl: CHIEF_OFF_OI_NOTE_PL,
  };
}

function requiresChiefDossier(actionType: IkOwnerActionNavigationKind): boolean {
  return (
    actionType === "owner_input_equipment"
    || actionType === "owner_input_transport"
    || actionType === "material_accept"
  );
}

function okResolution(
  item: Pick<IkOwnerActionItem, "domain" | "lineRef" | "dwellingId" | "labelPl">,
  actionType: IkOwnerActionNavigationKind,
  anchorId: string,
  selector: string,
  navigationTab: TenderDetailV4TabId,
  requiresDeferredFocus = false,
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
    navigationTab,
    requiresDeferredFocus,
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

function guardChiefPanel(
  item: Pick<IkOwnerActionItem, "domain" | "labelPl">,
  actionType: IkOwnerActionNavigationKind,
  ctx?: IkOwnerActionDeepLinkContext,
): IkOwnerActionDeepLinkResolution | null {
  if (!requiresChiefDossier(actionType)) return null;
  if (ctx?.chiefDossierAvailable === false) {
    return chiefPanelBlocked(item);
  }
  return null;
}

/**
 * Resolve queue item → existing panel anchor (pure · deterministic).
 */
export function resolveIkOwnerActionDeepLink(
  item: Pick<
    IkOwnerActionItem,
    "domain" | "deepLink" | "lineRef" | "dwellingId" | "blockerCode" | "labelPl"
  >,
  ctx?: IkOwnerActionDeepLinkContext,
): IkOwnerActionDeepLinkResolution {
  const deepLink = String(item.deepLink ?? "").trim();
  if (!deepLink.startsWith("ik:")) {
    return gapResolution(item, "PARSE_FAIL", "Nieprawidłowy deepLink (oczekiwano ik:…).");
  }

  switch (item.domain) {
    case "equipment_input": {
      const blocked = guardChiefPanel(item, "owner_input_equipment", ctx);
      if (blocked) return blocked;
      return okResolution(
        item,
        "owner_input_equipment",
        "owner-rate-input-cards",
        item.lineRef && item.lineRef !== "*"
          ? `${IK_OWNER_ACTION_ANCHOR.ownerRateDomain("equipment")}`
          : IK_OWNER_ACTION_ANCHOR.ownerRateInputCards,
        "przetarg",
      );
    }
    case "transport_input": {
      const blocked = guardChiefPanel(item, "owner_input_transport", ctx);
      if (blocked) return blocked;
      return okResolution(
        item,
        "owner_input_transport",
        "owner-rate-input-cards",
        item.lineRef && item.lineRef !== "*"
          ? `${IK_OWNER_ACTION_ANCHOR.ownerRateDomain("transport")}`
          : IK_OWNER_ACTION_ANCHOR.ownerRateInputCards,
        "przetarg",
      );
    }
    case "labor_accept":
      return okResolution(
        item,
        "labor_accept",
        "ik-labor-gap-research-panel",
        IK_OWNER_ACTION_ANCHOR.laborGapPanel,
        "przetarg",
      );
    case "material_accept": {
      const blocked = guardChiefPanel(item, "material_accept", ctx);
      if (blocked) return blocked;
      return okResolution(
        item,
        "material_accept",
        "expert-workspace-surface",
        `${IK_OWNER_ACTION_ANCHOR.expertWorkspace}, ${IK_OWNER_ACTION_ANCHOR.demandPriceResearch}`,
        "przetarg",
      );
    }
    case "identity": {
      const lineSel = lineSelector(item.lineRef);
      if (lineSel) {
        return okResolution(
          item,
          "identity_manual",
          `offer-boq-line-${item.lineRef}`,
          `${lineSel}, ${IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer}`,
          "kosztorys",
          true,
        );
      }
      return okResolution(
        item,
        "identity_manual",
        "kosztorys-boq-explorer",
        IK_OWNER_ACTION_ANCHOR.kosztorysBoqExplorer,
        "kosztorys",
        true,
      );
    }
    case "f5_blocker": {
      const code = String(item.blockerCode ?? "");
      if (
        code === "EQUIPMENT_OUT_OF_SCOPE"
        || code === "EQUIPMENT_OWNER_INPUT_INVALID"
      ) {
        const blocked = guardChiefPanel(item, "owner_input_equipment", ctx);
        if (blocked) return blocked;
        return okResolution(
          item,
          "owner_input_equipment",
          "owner-rate-input-cards",
          IK_OWNER_ACTION_ANCHOR.ownerRateDomain("equipment"),
          "przetarg",
        );
      }
      if (
        code === "TRANSPORT_OUT_OF_SCOPE"
        || code === "TRANSPORT_OWNER_INPUT_INVALID"
      ) {
        const blocked = guardChiefPanel(item, "owner_input_transport", ctx);
        if (blocked) return blocked;
        return okResolution(
          item,
          "owner_input_transport",
          "owner-rate-input-cards",
          IK_OWNER_ACTION_ANCHOR.ownerRateDomain("transport"),
          "przetarg",
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
          "kosztorys",
          true,
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
          "przetarg",
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
        const blocked = guardChiefPanel(item, "material_accept", ctx);
        if (blocked) return blocked;
        return okResolution(
          item,
          "material_accept",
          "expert-workspace-surface",
          `${IK_OWNER_ACTION_ANCHOR.expertWorkspace}, ${IK_OWNER_ACTION_ANCHOR.demandPriceResearch}`,
          "przetarg",
        );
      }
      const lineSel = lineSelector(item.lineRef);
      if (lineSel) {
        return okResolution(
          item,
          "f5_gap",
          `offer-boq-line-${item.lineRef}`,
          lineSel,
          "kosztorys",
          true,
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
  ctx?: IkOwnerActionDeepLinkContext,
): IkOwnerActionDeepLinkResolution {
  const resolution = resolveIkOwnerActionDeepLink(item, ctx);
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

export type IkOwnerActionNavigateHandlers = {
  activeTab: TenderDetailV4TabId;
  onTabChange: (tab: TenderDetailV4TabId) => void;
  onDeferredFocus: (item: Pick<
    IkOwnerActionItem,
    "domain" | "deepLink" | "lineRef" | "dwellingId" | "blockerCode" | "labelPl"
  >) => void;
};

/**
 * W6-2 — cross-tab navigation + deferred focus (reuse handleTabChange pattern).
 */
export function navigateIkOwnerActionTarget(
  item: Pick<
    IkOwnerActionItem,
    "domain" | "deepLink" | "lineRef" | "dwellingId" | "blockerCode" | "labelPl"
  >,
  ctx: IkOwnerActionDeepLinkContext | undefined,
  handlers: IkOwnerActionNavigateHandlers,
): IkOwnerActionDeepLinkResolution {
  const resolution = resolveIkOwnerActionDeepLink(item, ctx);
  if (!resolution.ok) return resolution;

  if (resolution.navigationTab !== handlers.activeTab) {
    handlers.onDeferredFocus(item);
    handlers.onTabChange(resolution.navigationTab);
    return resolution;
  }

  if (resolution.requiresDeferredFocus) {
    handlers.onDeferredFocus(item);
    return resolution;
  }

  return focusIkOwnerActionTarget(item, ctx);
}
