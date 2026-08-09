/**
 * DEMAND-RESEARCH-01 S0/S1-A — Manual Price Research panel (staging → preview → ACCEPT).
 * UX pattern: Market Sync preview (EDIT / REJECT / ACCEPT) · 0 external fetch.
 */

import { useMemo, useState } from "react";
import type { PriceDemandRecord } from "@/lib/price-intelligence";
import {
  MANUAL_RESEARCH_PROVIDER_LABELS_PL,
  acceptManualMarketPriceResearch,
  buildManualResearchBrief,
  buildPriceCandidateFromManualInput,
  isDemandResearchableS0,
  manualProviderSourceLabel,
  mapManualProviderToQuoteOrigin,
  type ManualResearchProviderId,
  type PriceCandidate,
} from "@/lib/price-intelligence";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";

type Phase = "form" | "preview";

const PROVIDERS: ManualResearchProviderId[] = ["leroy", "castorama", "obi", "other"];

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DemandPriceResearchPanelProps {
  demand: PriceDemandRecord;
  onClose: () => void;
  /** Po udanym ACCEPT — odśwież Chief Cost (host). */
  onAccepted?: () => void;
}

export function DemandPriceResearchPanel({
  demand,
  onClose,
  onAccepted,
}: DemandPriceResearchPanelProps) {
  const researchable = isDemandResearchableS0(demand);
  const [phase, setPhase] = useState<Phase>("form");
  const [provider, setProvider] = useState<ManualResearchProviderId>("castorama");
  const [name, setName] = useState(demand.normalizedName || demand.materialKey);
  const [unit, setUnit] = useState(demand.unit || "szt.");
  const [priceNet, setPriceNet] = useState("");
  const [priceDate, setPriceDate] = useState(todayDateInput());
  const [sourceUrl, setSourceUrl] = useState("");
  const [ean, setEan] = useState("");
  const [providerSku, setProviderSku] = useState("");
  const [notes, setNotes] = useState("");
  const [errorPl, setErrorPl] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<PriceCandidate | null>(null);
  const [busy, setBusy] = useState(false);

  const researchBrief = useMemo(() => {
    const catalog = loadWorkCatalogStoreLocal();
    const workId = demand.catalogWorkId;
    const work = workId
      ? [...catalog.catalogs.wroclaw.works, ...catalog.catalogs.dolnyslask.works].find(
          (w) => w.id === workId,
        )
      : null;
    return buildManualResearchBrief(demand, work);
  }, [demand]);

  const originLabel = useMemo(() => {
    const origin = mapManualProviderToQuoteOrigin(provider);
    const src = manualProviderSourceLabel(provider);
    if (origin === "wgdom") return `wgdom · źródło: ${src}`;
    return origin;
  }, [provider]);

  function validationMessage(code: string): string {
    switch (code) {
      case "missing_name":
        return "Podaj nazwę produktu.";
      case "missing_unit":
        return "Podaj jednostkę.";
      case "invalid_price":
        return "Cena netto musi być > 0.";
      case "missing_price_date":
        return "Podaj datę ceny.";
      case "missing_demand_id":
        return "Brak demandId.";
      case "missing_material_key":
        return "Brak materialKey — research niedostępny.";
      case "missing_catalog_work_id":
        return "Brak catalogWorkId — wymagane powiązanie z robotą katalogu.";
      default:
        return "Formularz niekompletny.";
    }
  }

  function handlePreview(): void {
    setErrorPl(null);
    if (!researchable) {
      setErrorPl("Brak możliwości research — wymagane materialKey + catalogWorkId.");
      return;
    }
    const built = buildPriceCandidateFromManualInput({
      demandId: demand.demandId,
      materialKey: demand.materialKey,
      catalogWorkId: demand.catalogWorkId,
      region: demand.region || "wroclaw",
      provider,
      name,
      unit,
      priceNet,
      priceDate,
      sourceUrl: sourceUrl || undefined,
      ean: ean || undefined,
      providerSku: providerSku || undefined,
      notes: notes || undefined,
    });
    if (!built.ok) {
      setErrorPl(validationMessage(built.error));
      return;
    }
    setCandidate(built.candidate);
    setPhase("preview");
  }

  function handleReject(): void {
    setCandidate(null);
    setPhase("form");
    setErrorPl(null);
  }

  async function handleAccept(): Promise<void> {
    if (!candidate || busy) return;
    setBusy(true);
    setErrorPl(null);
    try {
      const result = await acceptManualMarketPriceResearch({ candidate });
      if (!result.ok) {
        setErrorPl(result.error || "ACCEPT nie powiódł się.");
        return;
      }
      onAccepted?.();
      onClose();
    } catch (e) {
      setErrorPl(e instanceof Error ? e.message : "ACCEPT error");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full min-h-[44px] rounded-md border border-border bg-background px-3 py-2 text-sm touch-manipulation";
  const btnPrimary =
    "min-h-[44px] px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium touch-manipulation disabled:opacity-50";
  const btnGhost =
    "min-h-[44px] px-3 rounded-md border border-border bg-secondary/40 text-sm touch-manipulation";

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-3"
      data-demand-price-research-panel
      data-phase={phase}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`${TEUX_SECTION_TITLE} text-foreground`}>Znajdź cenę (rynek)</p>
          <p className={`${TEUX_FONT_CAPTION} text-muted-foreground mt-0.5`}>
            {demand.materialKey} · MARKET REFERENCE · ręcznie
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={onClose}>
          Zamknij
        </button>
      </div>

      <div
        className="rounded-md border border-border/50 bg-muted/30 p-2 space-y-0.5"
        data-research-brief
      >
        <p className={`${TEUX_FONT_CAPTION} font-medium`}>Brief research</p>
        <p className={TEUX_FONT_BODY}>Nazwa: {researchBrief.normalizedName}</p>
        <p className={TEUX_FONT_BODY}>materialKey: {researchBrief.materialKey}</p>
        <p className={TEUX_FONT_BODY}>
          catalogWorkId: {researchBrief.catalogWorkId ?? "—"}
        </p>
        <p className={TEUX_FONT_BODY}>
          Jednostka: {researchBrief.unit || "—"} · Region: {researchBrief.region}
        </p>
        {researchBrief.tradeLabelPl && (
          <p className={TEUX_FONT_BODY}>Trade: {researchBrief.tradeLabelPl}</p>
        )}
        <p className={TEUX_FONT_BODY}>Warstwa: {researchBrief.missingLayer}</p>
        <p className={`${TEUX_FONT_CAPTION} text-muted-foreground`}>{researchBrief.hintPl}</p>
      </div>

      {!researchable && (
        <p className={`${TEUX_FONT_BODY} text-amber-700 dark:text-amber-400`} data-research-blocked>
          Brak możliwości research — pozycja bez materialKey/catalogWorkId (wymagane powiązanie).
          Identity catalogWorkId-first poza tym slice.
        </p>
      )}

      {phase === "form" && (
        <div className="space-y-2" data-research-form>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Źródło</span>
            <select
              className={fieldClass}
              value={provider}
              onChange={(e) => setProvider(e.target.value as ManualResearchProviderId)}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {MANUAL_RESEARCH_PROVIDER_LABELS_PL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Produkt</span>
            <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Cena netto (PLN)</span>
            <input
              className={fieldClass}
              inputMode="decimal"
              value={priceNet}
              onChange={(e) => setPriceNet(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Jednostka</span>
            <input className={fieldClass} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Data ceny</span>
            <input
              className={fieldClass}
              type="date"
              value={priceDate}
              onChange={(e) => setPriceDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>URL (opcjonalnie · tylko provenance)</span>
            <input
              className={fieldClass}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>EAN (opcjonalnie)</span>
            <input className={fieldClass} value={ean} onChange={(e) => setEan(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>SKU (opcjonalnie)</span>
            <input
              className={fieldClass}
              value={providerSku}
              onChange={(e) => setProviderSku(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className={TEUX_FONT_CAPTION}>Uwagi (opcjonalnie)</span>
            <textarea
              className={`${fieldClass} min-h-[72px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          {errorPl && (
            <p className={`${TEUX_FONT_BODY} text-destructive`} data-research-error>
              {errorPl}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={btnPrimary} onClick={handlePreview} disabled={!researchable}>
              Podgląd
            </button>
            <button type="button" className={btnGhost} onClick={onClose}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {phase === "preview" && candidate && (
        <div className="space-y-2" data-research-preview>
          <p className={TEUX_FONT_BODY}>
            <strong>Źródło:</strong> {manualProviderSourceLabel(candidate.provider)} → origin{" "}
            {originLabel}
          </p>
          <p className={TEUX_FONT_BODY}>
            <strong>Produkt:</strong> {candidate.name}
          </p>
          <p className={TEUX_FONT_BODY}>
            <strong>Cena:</strong> {candidate.priceNet} {candidate.currency} / {candidate.unit}
          </p>
          <p className={TEUX_FONT_BODY}>
            <strong>Data:</strong> {candidate.priceDate}
          </p>
          {candidate.sourceUrl && (
            <p className={`${TEUX_FONT_BODY} break-all`}>
              <strong>URL:</strong> {candidate.sourceUrl}
            </p>
          )}
          {(candidate.ean || candidate.providerSku) && (
            <p className={TEUX_FONT_BODY}>
              <strong>EAN/SKU:</strong> {[candidate.ean, candidate.providerSku].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className={TEUX_FONT_CAPTION}>
            Provenance = manual owner · Semantyka = MARKET REFERENCE
          </p>
          {errorPl && (
            <p className={`${TEUX_FONT_BODY} text-destructive`} data-research-error>
              {errorPl}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={() => setPhase("form")} disabled={busy}>
              Edytuj
            </button>
            <button type="button" className={btnGhost} onClick={handleReject} disabled={busy}>
              Odrzuć
            </button>
            <button type="button" className={btnPrimary} onClick={() => void handleAccept()} disabled={busy}>
              {busy ? "Zapis…" : "Akceptuj"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
