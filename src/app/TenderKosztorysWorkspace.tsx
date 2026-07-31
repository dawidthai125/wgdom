import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Eye, Loader2, Scale } from "lucide-react";
import { defaultEvidenceExpanded } from "@/app/kosztorys/offer-boq-ux-wave1";
import { useNavigate } from "react-router";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import { TenderUxEmptyState } from "@/app/tenders/design-system/TenderUxEmptyState";
import { openTenderDetailV4 } from "@/lib/tender-detail-nav";
import { buildKosztorysV4Display } from "@/lib/tender-detail-v4-display";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import { findTrustDimension } from "@/lib/tender-trust-layer";
import { TrustInlineHint } from "@/app/tenders/trust/TrustInlineHint";
import { pickKosztorysInlineHintView, trustLevelToIcon } from "@/lib/tender-trust-ui";
import {
  deriveKosztorysProcessPhase,
  isKosztorysProcessInProgress,
  type KosztorysProcessSession,
} from "@/lib/tender-kosztorys-process-phase";
import { useKosztorysProcessHealth } from "@/app/hooks/useKosztorysProcessHealth";
import { KosztorysProcessStatusBar } from "@/app/KosztorysProcessStatusBar";
import {
  downloadAthSourceFile,
  resolveAthPreviewItem,
} from "@/lib/tender-ath-quick-access";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JobFilePreviewModal } from "@/app/JobFilePreviewModal";
import {
  buildKosztorysProDashboard,
  type KosztorysProFilterId,
  type KosztorysProTopRow,
} from "@/lib/tender-kosztorys-pro-dashboard";
import { buildKosztorysBoqExplorerView } from "@/lib/tender-kosztorys-boq-explorer";
import { KosztorysBoqExplorerSection } from "@/app/kosztorys/KosztorysBoqExplorerSection";
import { OfferBoqCostIntelligencePanel } from "@/app/kosztorys/OfferBoqCostIntelligencePanel";
import { TenderBoqTableSkeleton } from "@/app/tenders/loading/TenderBoqTableSkeleton";
import {
  resolveCostRegressionF2Presentation,
  triggerCostRegressionF2Reparse,
} from "@/lib/cost-regression-f2";
import { resolveCostPackageFromItem } from "@/lib/cost-multi-01";
import { CostMultiPackageBanner } from "@/app/kosztorys/CostMultiPackageBanner";
import {
  FORCE_HEAVY_RESCAN_CONFIRM,
  FORCE_HEAVY_RESCAN_CTA_LABEL,
  shouldShowForceHeavyRescanCta,
  traceForceHeavyRescan,
  hasMulti02BranchArtifacts,
  hasMulti02CostSources,
} from "@/lib/cost-multi-02-force-rescan";
import {
  TenderDesktopTable,
  TenderMobileRowCard,
  TenderMobileTableCards,
} from "@/app/tenders/mobile/tender-mobile-row-cards";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { TenderCostWorkspaceBridge } from "@/app/TenderCostWorkspaceBridge";
import { TEUX_FONT_META } from "@/lib/tender-ux-tokens";

/** COST-PIPELINE-01 — kotwica CTA „Pokaż pełny kosztorys” → OfferBoq (L1). */
export const OFFER_BOQ_PRIMARY_ANCHOR_ID = "offer-boq-primary";

function KosztorysKpiCard({
  label,
  value,
  subValue,
  highlight,
  compact,
}: {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 ${
        compact ? "py-2" : "py-3"
      } ${
        highlight
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background/70"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`${compact ? "text-base" : "text-lg"} font-bold text-foreground mt-0.5 tabular-nums`}>{value}</p>
      {subValue && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

function KosztorysTopCostTable({ rows }: { rows: KosztorysProTopRow[] }) {
  if (!rows.length) return null;
  return (
    <>
      <TenderMobileTableCards>
        {rows.map((r, i) => (
          <TenderMobileRowCard
            key={`mtop-${r.lp}-${i}`}
            title={`${r.lp}. ${r.description}`}
            fields={[
              { label: "j.m.", value: r.unit },
              { label: "Ilość", value: r.quantity },
              { label: "Cena", value: r.unitPriceDisplay },
              { label: "Wartość", value: r.valueDisplay },
            ]}
          />
        ))}
      </TenderMobileTableCards>
      <TenderDesktopTable>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/60">
              <tr>
                <th className="text-left px-2 py-2 font-medium">Lp</th>
                <th className="text-left px-2 py-2 font-medium min-w-[200px]">Opis</th>
                <th className="text-left px-2 py-2 font-medium">j.m.</th>
                <th className="text-right px-2 py-2 font-medium">Ilość</th>
                <th className="text-right px-2 py-2 font-medium">Cena</th>
                <th className="text-right px-2 py-2 font-medium">Wartość</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`top-${r.lp}-${i}`} className="border-t border-border/50 hover:bg-secondary/20">
                  <td className="px-2 py-1.5 font-mono">{r.lp}</td>
                  <td className="px-2 py-1.5">{r.description}</td>
                  <td className="px-2 py-1.5">{r.unit}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.quantity}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{r.unitPriceDisplay}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{r.valueDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TenderDesktopTable>
    </>
  );
}

function KosztorysEmptyBlock({
  itemId,
  text,
  title = "Brak przedmiaru",
  primaryLabel = "Przejdź do Dokumentów",
  onPrimary,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
  f2Discovery,
  f2Archive,
  f2ZipState,
}: {
  itemId: string;
  text: string;
  title?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  f2Discovery?: string;
  f2Archive?: boolean;
  f2ZipState?: string | null;
}) {
  const navigate = useNavigate();

  return (
    <div
      data-cost-regression-f2={f2Discovery ? "1" : undefined}
      data-cost-regression-discovery={f2Discovery}
      data-cost-regression-archive={f2Archive ? "1" : undefined}
      data-cost-parser-zip-state={f2ZipState ?? undefined}
    >
      <TenderUxEmptyState
        icon={Scale}
        title={title}
        description={text}
        primaryAction={{
          label: primaryLabel,
          onClick: onPrimary ?? (() => openTenderDetailV4(navigate, itemId, "dokumenty")),
        }}
        secondaryAction={
          secondaryLabel && onSecondary
            ? {
                label: secondaryLabel,
                onClick: onSecondary,
                disabled: secondaryDisabled,
              }
            : undefined
        }
        data-teux6-empty="kosztorys"
      />
    </div>
  );
}

export function TenderKosztorysWorkspace({
  item,
  athPreviewEnabled = true,
  processSession,
  retryNonce = 0,
  onRetryParse,
  onForceHeavyRescan,
  trustAssessment,
  focusOfferBoq = false,
  onFocusOfferBoqConsumed,
}: {
  item: TenderPipelineItem;
  athPreviewEnabled?: boolean;
  processSession?: KosztorysProcessSession;
  retryNonce?: number;
  onRetryParse?: () => void;
  /** COST-MULTI-02 Force Rescan — CTA healthy + missing MULTI-02 fields. */
  onForceHeavyRescan?: () => void;
  trustAssessment: TenderTrustAssessment;
  /** COST-PIPELINE-01 — po CTA Outcome scroll do OfferBoq. */
  focusOfferBoq?: boolean;
  onFocusOfferBoqConsumed?: () => void;
}) {
  const navigate = useNavigate();
  const tendersCtx = useTendersContextOptional();
  const pricingCatalogRevision = tendersCtx?.pricingCatalogRevision ?? 0;

  const session = useMemo(
    () => ({ ...processSession, lazyEnabled: true }),
    [processSession],
  );
  const health = useKosztorysProcessHealth({
    item,
    session,
    retryNonce,
    enabled: Boolean(processSession),
  });
  const boqView = useMemo(() => buildKosztorysBoqExplorerView({ item }), [item, pricingCatalogRevision]);
  const pro = useMemo(() => buildKosztorysProDashboard(item, boqView), [item, boqView, pricingCatalogRevision]);
  const display = useMemo(() => buildKosztorysV4Display(item), [item, pricingCatalogRevision]);
  const k = item.tenderDossier?.kosztorys;
  const phase = useMemo(
    () => health?.currentPhase ?? deriveKosztorysProcessPhase(item, session),
    [item, session, health],
  );
  const inProgress = isKosztorysProcessInProgress(phase);
  const [docPreview, setDocPreview] = useState<InspectorFileItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<KosztorysProFilterId>("all");
  const [athDownloadBusy, setAthDownloadBusy] = useState(false);
  const [athDownloadError, setAthDownloadError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  const athPreviewItem = useMemo(() => resolveAthPreviewItem(item), [item]);
  const canOpenFullPreview = athPreviewEnabled && athPreviewItem != null;
  const canDownloadAth = canOpenFullPreview;
  const kosztorysTrust = findTrustDimension(trustAssessment, "kosztorys");
  const kosztorysInlineHintView = pickKosztorysInlineHintView(trustAssessment);
  const kosztorysTrustReasons = kosztorysTrust?.reasons.filter(
    (r) => r.code === "kosztorys_ath_cap_ui" || r.code === "kosztorys_row_cap",
  ) ?? [];

  const statusReady = pro.statusLabel === "GOTOWE DO OFERTY";
  const statusDisplay = statusReady ? "Gotowe" : "Wymaga wyceny";
  const totalValueLabel = k?.totalValue
    ? ` · wartość wg pliku: ${k.totalValue} ${k.currency || "PLN"}`
    : null;

  const hasOfferBoqSource =
    pro.hasCatalog || (k?.catalogQuantities?.length ?? 0) > 0 || (k?.rows?.length ?? 0) > 0;

  const f2Copy = useMemo(
    () =>
      resolveCostRegressionF2Presentation({
        item,
        dossierBuilding: processSession?.dossierBuilding,
        dossierSaving: processSession?.dossierSaving,
        autoRunning: processSession?.autoRunning,
        dossierParseFailed: processSession?.dossierParseFailed,
      }),
    [
      item,
      processSession?.dossierBuilding,
      processSession?.dossierSaving,
      processSession?.autoRunning,
      processSession?.dossierParseFailed,
    ],
  );
  const f2Discovery = f2Copy?.discovery ?? null;
  const costMultiPackage = useMemo(() => resolveCostPackageFromItem(item), [item]);

  const handleAttachPrzedmiar = () => {
    openTenderDetailV4(navigate, item.id, "dokumenty");
  };

  const handleGuardedRetryParse = () => {
    if (!onRetryParse) return;
    triggerCostRegressionF2Reparse({
      item,
      parseRunning:
        Boolean(processSession?.dossierBuilding) ||
        Boolean(processSession?.dossierSaving) ||
        Boolean(processSession?.autoRunning),
      retry: onRetryParse,
    });
  };

  const [forceRescanPending, setForceRescanPending] = useState(false);

  const forceActive = Boolean(item.tenderDossier?.forceHeavyRescanAt);
  const pipelineBusy =
    Boolean(processSession?.dossierBuilding) || Boolean(processSession?.dossierSaving);
  const forceRescanBusy = forceActive || (forceRescanPending && pipelineBusy);

  const showForceHeavyRescanCta = shouldShowForceHeavyRescanCta({
    item,
    dossierBuilding: processSession?.dossierBuilding,
    dossierSaving: processSession?.dossierSaving,
    forceHandlerAvailable: Boolean(onForceHeavyRescan),
  });

  const showForceHeavyRescanRow =
    showForceHeavyRescanCta || forceActive || forceRescanPending;

  useEffect(() => {
    if (!forceRescanPending) return;
    if (forceActive || pipelineBusy) return;
    // Heavy zakończony / przerwany — zdejmij lokalny busy.
    setForceRescanPending(false);
  }, [
    forceRescanPending,
    forceActive,
    pipelineBusy,
    item.tenderDossier?.builtAt,
  ]);

  const handleForceHeavyRescanClick = () => {
    if (!onForceHeavyRescan || forceRescanBusy || forceRescanPending) return;
    const d = item.tenderDossier;
    traceForceHeavyRescan("force_heavy_rescan_click", {
      tenderId: item.tenderId,
      itemId: item.id,
      hadSources: hasMulti02CostSources(d),
      hadArtifacts: hasMulti02BranchArtifacts(d),
    });
    const ok = window.confirm(
      `${FORCE_HEAVY_RESCAN_CONFIRM.title}\n\n${FORCE_HEAVY_RESCAN_CONFIRM.body}`,
    );
    if (!ok) return;
    traceForceHeavyRescan("force_heavy_rescan_confirm", {
      tenderId: item.tenderId,
      itemId: item.id,
    });
    setForceRescanPending(true);
    onForceHeavyRescan();
  };

  useEffect(() => {
    setEvidenceOpen(defaultEvidenceExpanded(hasOfferBoqSource));
  }, [item.id, hasOfferBoqSource]);

  useEffect(() => {
    if (!focusOfferBoq) return;
    const t = window.setTimeout(() => {
      document.getElementById(OFFER_BOQ_PRIMARY_ANCHOR_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      onFocusOfferBoqConsumed?.();
    }, 80);
    return () => window.clearTimeout(t);
  }, [focusOfferBoq, onFocusOfferBoqConsumed, item.id]);

  async function handleDownloadAth() {
    setAthDownloadError(null);
    setAthDownloadBusy(true);
    try {
      await downloadAthSourceFile(item, athPreviewEnabled);
    } catch (e) {
      setAthDownloadError(e instanceof Error ? e.message : "Nie udało się pobrać ATH");
    } finally {
      setAthDownloadBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <KosztorysProcessStatusBar
        phase={phase}
        health={health}
        onRetry={onRetryParse ? handleGuardedRetryParse : undefined}
        retryBusy={processSession?.dossierBuilding || processSession?.dossierSaving}
      />
      {showForceHeavyRescanRow && onForceHeavyRescan && (
        <div
          className="flex flex-wrap items-center gap-2"
          data-force-heavy-rescan-row="1"
          data-force-heavy-busy={forceActive || forceRescanPending ? "1" : "0"}
        >
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-900 dark:text-sky-200 hover:bg-sky-500/20 disabled:opacity-60 touch-manipulation"
            onClick={handleForceHeavyRescanClick}
            disabled={!showForceHeavyRescanCta || forceActive || forceRescanPending}
            data-force-heavy-rescan="1"
          >
            {forceActive || forceRescanPending ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Trwa uzupełnianie odczytów branż…
              </>
            ) : (
              FORCE_HEAVY_RESCAN_CTA_LABEL
            )}
          </button>
        </div>
      )}
      {costMultiPackage && <CostMultiPackageBanner pkg={costMultiPackage} item={item} />}

      <TenderCostWorkspaceBridge
        tenderId={item.id}
        targetTab="ceny"
        onNavigate={() => openTenderDetailV4(navigate, item.id, "ceny")}
      />

      <p className="text-[11px] text-muted-foreground" data-kosztorys-process-strip-bridge>
        Proces oferty: etap{" "}
        <button
          type="button"
          className="text-primary font-semibold hover:underline touch-manipulation"
          onClick={() => {
            document
              .querySelector("[data-tender-workflow-process-strip]")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
        >
          Kosztorys
        </button>
        {" "}— pasek u góry workspace.
      </p>

      {kosztorysInlineHintView && (
        <TrustInlineHint
          message={kosztorysInlineHintView.message}
          level={kosztorysInlineHintView.level}
        />
      )}

      {/* L1 OfferBoq — główny kosztorys ofertowy (COST-PIPELINE-01) */}
      <div id={OFFER_BOQ_PRIMARY_ANCHOR_ID} data-cost-pipeline-offer-boq-primary>
        {hasOfferBoqSource ? (
          <OfferBoqCostIntelligencePanel
            item={item}
            pricingCatalogRevision={pricingCatalogRevision}
            f2Signals={{
              dossierBuilding: processSession?.dossierBuilding,
              dossierSaving: processSession?.dossierSaving,
              autoRunning: processSession?.autoRunning,
              dossierParseFailed: processSession?.dossierParseFailed,
            }}
            onAttachPrzedmiar={handleAttachPrzedmiar}
            onRetryParse={onRetryParse ? handleGuardedRetryParse : undefined}
          />
        ) : inProgress || phase.id === "waiting_data" ? (
          <TenderBoqTableSkeleton rowCount={8} />
        ) : (
          <KosztorysEmptyBlock
            itemId={item.id}
            title={f2Copy?.phaseLabelPl ?? "Brak przedmiaru"}
            text={
              f2Copy
                ? f2Copy.hintPl
                : "Brak pozycji przedmiaru do kosztorysu ofertowego. Otwórz Dokumenty i uruchom analizę."
            }
            primaryLabel={
              f2Copy?.primaryCta === "reparse"
                ? "Ponów analizę kosztorysu"
                : "Dołącz przedmiar"
            }
            onPrimary={
              f2Copy?.primaryCta === "reparse"
                ? handleGuardedRetryParse
                : handleAttachPrzedmiar
            }
            secondaryLabel={
              f2Copy?.primaryCta === "reparse" && f2Copy.secondaryCta === "attach"
                ? "Dołącz inny plik"
                : undefined
            }
            onSecondary={
              f2Copy?.primaryCta === "reparse" ? handleAttachPrzedmiar : undefined
            }
            secondaryDisabled={f2Copy?.discovery === "parse_running"}
            f2Discovery={f2Discovery ?? undefined}
            f2Archive={f2Copy?.archiveCandidate}
            f2ZipState={f2Copy?.zipState}
          />
        )}
      </div>

      {/* L0 Evidence — ATH / przedmiar inwestorski (secondary) */}
      <section
        className="rounded-xl border border-dashed border-border/80 bg-secondary/10 p-3 space-y-3"
        data-cost-pipeline-evidence-l0
        data-evidence-collapsed={evidenceOpen ? "false" : "true"}
      >
        <button
          type="button"
          className="w-full text-left space-y-1 touch-manipulation"
          onClick={() => setEvidenceOpen((v) => !v)}
          aria-expanded={evidenceOpen}
          data-kosztorys-evidence-toggle
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground shrink-0">
              {evidenceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <TenderUxSectionTitle>Dowód / przedmiar (ATH)</TenderUxSectionTitle>
              <p className={`${TEUX_FONT_META} text-muted-foreground`}>
                Warstwa Evidence — dokument inwestorski i klasyfikacja. Nie jest ceną oferty WGDOM.
                {hasOfferBoqSource && !evidenceOpen
                  ? " · zwinięte (kosztorys ofertowy powyżej)."
                  : " Brak cen w pliku ATH nie oznacza braku kosztorysu ofertowego powyżej."}
              </p>
            </div>
          </div>
        </button>

        {evidenceOpen ? (
          <>
        {pro.hasCatalog && (
          <section
            className="rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 space-y-2"
            data-kosztorys-pro-hero
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KosztorysKpiCard compact label="Pozycje ATH" value={pro.athPositionsDisplay} />
              <KosztorysKpiCard compact label="Pokrycie" value={pro.coverageDisplay} />
              <KosztorysKpiCard
                compact
                label="FIT WGDOM"
                value={pro.fitDisplay ?? "—"}
                subValue={pro.fitLabel ?? undefined}
                highlight={Boolean(pro.fitDisplay)}
              />
              <KosztorysKpiCard
                compact
                label="Status"
                value={statusDisplay}
                highlight={statusReady}
              />
            </div>
          </section>
        )}

        {(canOpenFullPreview || canDownloadAth) && (
          <div className="flex flex-wrap items-center gap-2">
            {canOpenFullPreview && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs font-semibold hover:bg-secondary/60"
                onClick={() => setDocPreview(athPreviewItem)}
                data-kosztorys-full-preview-cta
              >
                <Eye size={14} />
                Podgląd ATH (Evidence)
              </button>
            )}

            {canDownloadAth && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs font-semibold hover:bg-secondary/60 disabled:opacity-60"
                onClick={() => void handleDownloadAth()}
                disabled={athDownloadBusy}
                data-kosztorys-download-ath-cta
              >
                {athDownloadBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Pobierz ATH
              </button>
            )}
          </div>
        )}

        {athDownloadError && (
          <p className="text-xs text-red-600 dark:text-red-400">{athDownloadError}</p>
        )}

        {pro.hasCatalog && (
          <section className="space-y-3" data-kosztorys-pro-dashboard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TenderUxSectionTitle>KOSZTORYS PRO (Evidence)</TenderUxSectionTitle>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  statusReady
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {pro.statusLabel}
              </span>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <KosztorysKpiCard label="Wycenione" value={String(pro.priced)} />
              <KosztorysKpiCard label="Niewycenione" value={String(pro.unpriced)} />
              <KosztorysKpiCard label="Wartość wyceny" value={pro.valuationDisplay} />
              <KosztorysKpiCard label="Średnia marża" value={pro.avgMarginDisplay} />
            </div>

            {pro.marketHint && (
              <p className="text-xs text-muted-foreground">{pro.marketHint}</p>
            )}
          </section>
        )}

        {pro.assessment && (
          <section
            className="rounded-xl border border-border bg-secondary/20 p-4 space-y-2"
            data-kosztorys-assessment
          >
            <h3 className="text-sm font-semibold text-foreground">Ocena kosztorysu (Evidence)</h3>
            <p className="text-sm font-medium text-foreground">{pro.assessment.headline}</p>
            {pro.assessment.paragraphs.map((p) => (
              <p key={p} className="text-sm text-muted-foreground">{p}</p>
            ))}
          </section>
        )}

        {pro.topRows.length > 0 && (
          <section className="space-y-2" data-kosztorys-top-cost>
            <h3 className="text-sm font-semibold text-foreground">Największe pozycje (katalog Evidence)</h3>
            <p className={`${TEUX_FONT_META} text-muted-foreground`}>
              TOP 20 · sortowanie malejąco po wartości wyceny katalogowej — nie jest ceną oferty
            </p>
            <KosztorysTopCostTable rows={pro.topRows} />
          </section>
        )}

        {pro.hasCatalog && (
          <KosztorysBoqExplorerSection
            item={item}
            view={boqView}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            sourceFilename={k?.sourceFilename}
            totalValueLabel={totalValueLabel}
            rowsFallbackSource={display.source === "rows_fallback"}
            trustReasons={kosztorysTrustReasons}
            trustLevelIcon={trustLevelToIcon(kosztorysTrust?.level ?? "partial")}
            onOpenAthPreview={
              canOpenFullPreview && athPreviewItem
                ? () => setDocPreview(athPreviewItem)
                : undefined
            }
          />
        )}

        {!pro.hasCatalog && !hasOfferBoqSource && display.emptyMessage ? (
          <KosztorysEmptyBlock itemId={item.id} text={display.emptyMessage} />
        ) : null}

        {(k?.categories?.length ?? 0) > 0 && boqView.rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {k!.categories.map((c, i) => (
              <span key={i} className="text-[10px] bg-secondary px-2 py-1 rounded border border-border">
                {c.name}: <strong>{c.total}</strong>
              </span>
            ))}
          </div>
        )}
          </>
        ) : null}
      </section>

      {docPreview && (
        <JobFilePreviewModal
          item={docPreview}
          athPreviewEnabled={athPreviewEnabled}
          bzpDocuments={item.bzpDocuments}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}
