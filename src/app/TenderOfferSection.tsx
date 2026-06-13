import { Loader2, Trophy } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderAwardResult } from "@/lib/tenders-bzp-award";
import { computeAwardPriceComparison } from "@/lib/tenders-actions";
import {
  computeCalibrationDelta,
  formatCalibrationDeltaPct,
} from "@/lib/tender-cost-calibration";
import { TENDER_OFFER_SECTION_ID } from "@/lib/tender-workspace-ux";
import { fmtPln } from "@/lib/tenders-bzp-swz";

export function TenderOfferSection({
  item,
  bidProposal,
  awardResult,
  submittedBidDraft,
  onSubmittedBidDraftChange,
  onSaveSubmittedBid,
  savingSubmittedBid,
  onFetchAward,
  fetchingAward,
}: {
  item: TenderPipelineItem;
  bidProposal: TenderBidProposal | null | undefined;
  awardResult?: TenderAwardResult | null;
  submittedBidDraft: string;
  onSubmittedBidDraftChange: (value: string) => void;
  onSaveSubmittedBid: () => void;
  savingSubmittedBid: boolean;
  onFetchAward?: () => void;
  fetchingAward?: boolean;
}) {
  const canEditSubmittedBid = item.status === "submitted" || item.status === "won" || item.status === "lost";
  const priceCompare = computeAwardPriceComparison(item);
  const rec = bidProposal?.recommendedBidPln;
  const submitted = item.submittedBidPln;
  const award = awardResult?.awardValuePln ?? item.awardResult?.awardValuePln;
  const recVsSubmitted = submitted != null && rec != null ? computeCalibrationDelta(rec, submitted) : null;
  const submittedVsAward = submitted != null && award != null ? computeCalibrationDelta(submitted, award) : null;

  const hasContent = canEditSubmittedBid || awardResult || item.awardResult || onFetchAward
    || (submitted != null && rec != null);

  if (!hasContent && !canEditSubmittedBid) {
    return (
      <section id={TENDER_OFFER_SECTION_ID} className="rounded-xl border border-dashed border-border/60 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Oferta</p>
        <p className="text-[10px] text-muted-foreground">
          Po złożeniu oferty ustaw status „Złożona oferta” i zapisz kwotę — kalibracja pojawi się tutaj.
        </p>
      </section>
    );
  }

  return (
    <section id={TENDER_OFFER_SECTION_ID} className="rounded-xl border border-teal-500/25 bg-teal-500/5 overflow-hidden space-y-0">
      <div className="px-3 py-2 border-b border-teal-500/15">
        <p className="text-xs font-semibold text-teal-900 dark:text-teal-200">Oferta i wynik</p>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {(awardResult || item.awardResult || onFetchAward) && (
          <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Trophy size={11} /> Wynik postępowania
              </p>
              {onFetchAward && !awardResult && !item.awardResult && (
                <button
                  type="button"
                  disabled={fetchingAward}
                  onClick={(e) => { e.stopPropagation(); onFetchAward(); }}
                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                >
                  {fetchingAward ? "Szukam…" : "Pobierz z BZP"}
                </button>
              )}
            </div>
            {(awardResult ?? item.awardResult) ? (
              <div className="space-y-1">
                <p className={`text-xs ${(awardResult ?? item.awardResult)!.isUs ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-foreground"}`}>
                  {(awardResult ?? item.awardResult)!.winnerName}
                  {(awardResult ?? item.awardResult)!.awardValueRaw && <> · {(awardResult ?? item.awardResult)!.awardValueRaw}</>}
                  {(awardResult ?? item.awardResult)!.isUs && " · WYGRALIŚMY"}
                </p>
                {priceCompare && priceCompare.summaryLines.length > 0 && (
                  <ul className="text-[10px] text-muted-foreground space-y-0.5 list-none">
                    {priceCompare.summaryLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Brak wyniku — pobierz po rozstrzygnięciu.</p>
            )}
          </div>
        )}

        {canEditSubmittedBid && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-teal-800 dark:text-teal-200">
              Oferta złożona (PLN)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                step="1000"
                value={submittedBidDraft}
                onChange={(e) => onSubmittedBidDraftChange(e.target.value)}
                placeholder="Kwota złożonej oferty"
                className="w-36 bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                disabled={savingSubmittedBid}
                onClick={(e) => { e.stopPropagation(); onSaveSubmittedBid(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {savingSubmittedBid ? <Loader2 size={12} className="animate-spin" /> : null}
                Zapisz ofertę złożoną
              </button>
            </div>
            {item.submittedAt && (
              <p className="text-[10px] text-muted-foreground">
                Ostatni zapis: {new Date(item.submittedAt).toLocaleString("pl-PL")}
              </p>
            )}
          </div>
        )}

        {submitted != null && rec != null && (
          <div className="rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 text-[10px] space-y-1">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground">Kalibracja historyczna</p>
            <p>
              <span className="text-muted-foreground">WGDOM rekomendował:</span>{" "}
              <strong className="font-mono">{fmtPln(rec)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Złożono:</span>{" "}
              <strong className="font-mono">{fmtPln(submitted)}</strong>
              {recVsSubmitted && (
                <span className="text-muted-foreground">
                  {" "}· Różnica: <strong>{formatCalibrationDeltaPct(recVsSubmitted)}</strong>
                </span>
              )}
            </p>
            {award != null && submittedVsAward && (
              <p>
                <span className="text-muted-foreground">Przyznano:</span>{" "}
                <strong className="font-mono">{fmtPln(award)}</strong>
                {" "}· Różnica: <strong>{formatCalibrationDeltaPct(submittedVsAward)}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
