import { useMemo, useState } from "react";
import type { CostDetailsView } from "@/lib/expert-workspace-ui";
import { EXPERT_PANEL_ORDER_LABELS_PL } from "@/lib/expert-workspace-ui";
import {
  isDemandResearchableS0,
  listActiveMarketLayerDemands,
  loadPriceDemandStoreLocal,
  type PriceDemandRecord,
} from "@/lib/price-intelligence";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";
import { DemandPriceResearchPanel } from "./DemandPriceResearchPanel";
import { ExpertEmpty, ExpertField, ExpertPanelShell, ExpertSubTitle } from "./ExpertPanelShell";
import { EXPERT_SCROLL_CLASS, formatNumDisplay, formatPlnDisplay } from "./formatDisplay";

function formatMaybePln(raw: string): string {
  if (raw === "—") return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return formatPlnDisplay(n);
}

function blockerLooksLikePriceMissing(text: string): boolean {
  return /PRICE DATA MISSING/i.test(text);
}

export function CostDetailsPanel({
  view,
  tenderId = null,
  onPriceResearchAccepted,
}: {
  view: CostDetailsView;
  /** Bieżący tender — filtr Demand (opcjonalny). */
  tenderId?: string | null;
  /** Po ACCEPT Quotes — host bumpuje Chief refreshNonce. */
  onPriceResearchAccepted?: () => void;
}) {
  const [researchDemand, setResearchDemand] = useState<PriceDemandRecord | null>(null);

  const marketDemands = useMemo(() => {
    if (!view.hasResult) return [] as PriceDemandRecord[];
    const keys = view.materialLines.map((l) => l.materialKey).filter(Boolean);
    const store = loadPriceDemandStoreLocal();
    return listActiveMarketLayerDemands(store, {
      materialKeys: keys.length > 0 ? keys : undefined,
      tenderId,
    });
  }, [view.hasResult, view.materialLines, tenderId, researchDemand]);

  const showFindPriceCta =
    view.hasResult &&
    (view.handoffBlockersPl.some(blockerLooksLikePriceMissing) ||
      marketDemands.length > 0 ||
      view.materialLines.some((l) => l.marketTotalPln == null));

  function openResearchFor(demand: PriceDemandRecord): void {
    setResearchDemand(demand);
  }

  function openFirstResearchable(): void {
    const hit = marketDemands.find(isDemandResearchableS0) ?? marketDemands[0] ?? null;
    if (hit) setResearchDemand(hit);
  }

  return (
    <ExpertPanelShell role="cost" titlePl={EXPERT_PANEL_ORDER_LABELS_PL.cost}>
      {!view.hasResult ? (
        <ExpertEmpty label={view.emptyLabelPl} />
      ) : (
        <>
          <ExpertField label="Completeness OK" value={view.completenessOk ? "tak" : "nie"} />
          <ExpertField
            label="Handoff to Offer"
            value={view.handoffToOfferExpert ? "tak" : "nie"}
          />
          {view.handoffBlockersPl.length > 0 && (
            <ul className={`${TEUX_FONT_BODY} list-disc pl-4 space-y-0.5`}>
              {view.handoffBlockersPl.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          {showFindPriceCta && !researchDemand && (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 space-y-2"
              data-price-data-missing-cta
            >
              <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>
                PRICE DATA MISSING — ręczny research rynkowy (MARKET REFERENCE)
              </p>
              {marketDemands.length === 0 ? (
                <p className={TEUX_FONT_BODY}>
                  Brak aktywnego Demand z materialKey dla tej wyceny — research niedostępny w S0.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {marketDemands.map((d) => (
                    <li
                      key={d.demandId}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className={TEUX_FONT_BODY}>
                        {d.normalizedName || d.materialKey} · {d.missingLayer}
                        {!isDemandResearchableS0(d) ? " · brak catalogWorkId" : ""}
                      </span>
                      <button
                        type="button"
                        className="min-h-[44px] px-3 rounded-md bg-primary text-primary-foreground text-sm touch-manipulation disabled:opacity-50"
                        disabled={!isDemandResearchableS0(d)}
                        onClick={() => openResearchFor(d)}
                        data-find-price-cta
                      >
                        Znajdź cenę
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {marketDemands.some(isDemandResearchableS0) && marketDemands.length > 1 && (
                <button
                  type="button"
                  className="min-h-[44px] px-3 rounded-md border border-border text-sm touch-manipulation"
                  onClick={openFirstResearchable}
                >
                  Znajdź cenę (pierwsza)
                </button>
              )}
            </div>
          )}

          {researchDemand && (
            <DemandPriceResearchPanel
              demand={researchDemand}
              onClose={() => setResearchDemand(null)}
              onAccepted={() => {
                setResearchDemand(null);
                onPriceResearchAccepted?.();
              }}
            />
          )}

          <ExpertSubTitle>Breakdown (Real Cost)</ExpertSubTitle>
          {view.breakdown.map((r) => (
            <ExpertField
              key={r.labelPl}
              label={r.labelPl}
              value={
                r.labelPl.includes("%")
                  ? r.valuePl === "—"
                    ? "—"
                    : `${r.valuePl}%`
                  : formatMaybePln(r.valuePl)
              }
            />
          ))}

          <ExpertSubTitle>Comparative</ExpertSubTitle>
          {view.comparative.map((r) => (
            <ExpertField
              key={r.labelPl}
              label={r.labelPl}
              value={
                r.labelPl.includes("%")
                  ? r.valuePl === "—"
                    ? "—"
                    : `${r.valuePl}%`
                  : formatMaybePln(r.valuePl)
              }
            />
          ))}
          {view.comparativeNotesPl.map((n) => (
            <p key={n} className={TEUX_FONT_BODY}>
              {n}
            </p>
          ))}

          <ExpertSubTitle>Linie materiałów</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-materials>
            {view.materialLines.map((l) => (
              <p key={`${l.materialKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.materialKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit} ·
                purchase {formatPlnDisplay(l.purchaseTotalPln)} · market{" "}
                {formatPlnDisplay(l.marketTotalPln)}
              </p>
            ))}
          </div>

          <ExpertSubTitle>Linie robocizny</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-labour>
            {view.labourLines.map((l) => (
              <p key={`${l.labourKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.labourKey} · {l.namePl} · {formatNumDisplay(l.hours)} h ·{" "}
                {formatPlnDisplay(l.totalPln)}
              </p>
            ))}
          </div>

          <ExpertSubTitle>Linie sprzętu</ExpertSubTitle>
          <div className={EXPERT_SCROLL_CLASS} data-expert-cost-equipment>
            {view.equipmentLines.map((l) => (
              <p key={`${l.equipmentKey}-${l.namePl}`} className={TEUX_FONT_BODY}>
                {l.equipmentKey} · {l.namePl} · {formatNumDisplay(l.quantity)} {l.unit} ·{" "}
                {formatPlnDisplay(l.totalPln)}
              </p>
            ))}
          </div>

          {view.handoffPayloadRows.length > 0 && (
            <>
              <ExpertSubTitle>Handoff payload</ExpertSubTitle>
              {view.handoffPayloadRows.map((r) => (
                <ExpertField
                  key={r.labelPl}
                  label={r.labelPl}
                  value={
                    r.labelPl.includes("Cost") || r.labelPl.includes("PLN")
                      ? formatMaybePln(r.valuePl)
                      : r.valuePl
                  }
                />
              ))}
            </>
          )}
        </>
      )}
    </ExpertPanelShell>
  );
}
