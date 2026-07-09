import { useMemo, useState } from "react";
import { Download, Eye, Loader2, Scale } from "lucide-react";
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
import { TenderBoqTableSkeleton } from "@/app/tenders/loading/TenderBoqTableSkeleton";
import {
  TenderDesktopTable,
  TenderMobileRowCard,
  TenderMobileTableCards,
} from "@/app/tenders/mobile/tender-mobile-row-cards";
import { TenderUxSectionTitle } from "@/app/tenders/design-system/TenderUxSectionTitle";
import { TenderCostWorkspaceBridge } from "@/app/TenderCostWorkspaceBridge";
import { TEUX_FONT_META } from "@/lib/tender-ux-tokens";

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
}: {
  itemId: string;
  text: string;
}) {
  const navigate = useNavigate();

  return (
    <TenderUxEmptyState
      icon={Scale}
      title="Brak kosztorysu"
      description={text}
      primaryAction={{
        label: "Przejdź do Dokumentów",
        onClick: () => openTenderDetailV4(navigate, itemId, "dokumenty"),
      }}
      data-teux6-empty="kosztorys"
    />
  );
}

export function TenderKosztorysWorkspace({
  item,
  athPreviewEnabled = true,
  processSession,
  retryNonce = 0,
  onRetryParse,
  trustAssessment,
}: {
  item: TenderPipelineItem;
  athPreviewEnabled?: boolean;
  processSession?: KosztorysProcessSession;
  retryNonce?: number;
  onRetryParse?: () => void;
  trustAssessment: TenderTrustAssessment;
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
        onRetry={onRetryParse}
        retryBusy={processSession?.dossierBuilding || processSession?.dossierSaving}
      />

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

      {pro.hasCatalog && (
        <section
          className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 space-y-2"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15"
            onClick={() => setDocPreview(athPreviewItem)}
            data-kosztorys-full-preview-cta
          >
            <Eye size={14} />
            Pełny podgląd ATH
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
            <TenderUxSectionTitle>KOSZTORYS PRO</TenderUxSectionTitle>
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
          <h3 className="text-sm font-semibold text-foreground">Ocena kosztorysu</h3>
          <p className="text-sm font-medium text-foreground">{pro.assessment.headline}</p>
          {pro.assessment.paragraphs.map((p) => (
            <p key={p} className="text-sm text-muted-foreground">{p}</p>
          ))}
        </section>
      )}

      {pro.topRows.length > 0 && (
        <section className="space-y-2" data-kosztorys-top-cost>
          <h3 className="text-sm font-semibold text-foreground">Największe pozycje kosztowe</h3>
          <p className={`${TEUX_FONT_META} text-muted-foreground`}>
            TOP 20 · sortowanie malejąco po wartości wyceny katalogowej
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

      {!pro.hasCatalog && (
        <>
          {display.emptyMessage ? (
            <KosztorysEmptyBlock itemId={item.id} text={display.emptyMessage} />
          ) : inProgress || phase.id === "waiting_data" ? (
            <TenderBoqTableSkeleton rowCount={8} />
          ) : (
            <KosztorysEmptyBlock
              itemId={item.id}
              text="Otwórz zakładkę Dokumenty, aby załadować i przeanalizować kosztorys ATH."
            />
          )}
        </>
      )}

      {(k?.categories?.length ?? 0) > 0 && boqView.rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {k!.categories.map((c, i) => (
            <span key={i} className="text-[10px] bg-secondary px-2 py-1 rounded border border-border">
              {c.name}: <strong>{c.total}</strong>
            </span>
          ))}
        </div>
      )}

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
