import { useState } from "react";
import { ChevronDown, FileSpreadsheet, MapPin, Calendar, User, ClipboardList, Eye } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln, PROFITABILITY_LABELS, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import type { TenderDossier } from "@/lib/tenders-bzp-brief";
import { labelTenderState } from "@/lib/tenders-bzp";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 gap-y-0.5 text-xs py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground whitespace-pre-wrap break-words">{value}</span>
    </div>
  );
}

function CostTable({ rows, caption }: { rows: { lp: string; description: string; unit: string; quantity: string; unitPrice: string; total: string }[]; caption: string }) {
  if (!rows.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{caption}</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[10px]">
          <thead className="bg-secondary/60">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium">Lp</th>
              <th className="text-left px-2 py-1.5 font-medium">Opis</th>
              <th className="text-left px-2 py-1.5 font-medium">j.m.</th>
              <th className="text-right px-2 py-1.5 font-medium">Ilość</th>
              <th className="text-right px-2 py-1.5 font-medium">Cena</th>
              <th className="text-right px-2 py-1.5 font-medium">Wartość</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.lp}-${i}`} className="border-t border-border/50">
                <td className="px-2 py-1 font-mono">{r.lp}</td>
                <td className="px-2 py-1 max-w-[200px]">{r.description}</td>
                <td className="px-2 py-1">{r.unit || "—"}</td>
                <td className="px-2 py-1 text-right font-mono">{r.quantity || "—"}</td>
                <td className="px-2 py-1 text-right font-mono">{r.unitPrice || "—"}</td>
                <td className="px-2 py-1 text-right font-mono">{r.total || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TenderDossierPanel({
  item,
  dossier,
  swz,
  onOpenKosztorysPreview,
}: {
  item: TenderPipelineItem;
  dossier: TenderDossier | null | undefined;
  swz: TenderSwzAnalysis | null | undefined;
  onOpenKosztorysPreview?: (preview: InspectorFileItem) => void;
}) {
  const [showAllFields, setShowAllFields] = useState(false);
  const [showKosztorysRows, setShowKosztorysRows] = useState(false);
  const brief = dossier?.brief;
  const k = dossier?.kosztorys;

  const offerDeadline = brief?.offerDeadline || (item.submittingOffersDate ? new Date(item.submittingOffersDate).toLocaleString("pl-PL") : null);

  const hasContent = brief || swz || k?.ok;
  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-card overflow-hidden space-y-0">
      <div className="px-3 py-2.5 bg-primary/5 border-b border-primary/15 flex items-center gap-2">
        <ClipboardList size={14} className="text-primary shrink-0" />
        <p className="text-xs font-semibold">Karta przetargu</p>
      </div>

      <div className="px-3 py-3 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <MapPin size={10} /> Lokalizacja i przedmiot
            </p>
            <InfoRow label="Zamawiający" value={item.organizationName} />
            <InfoRow label="Miasto" value={item.organizationCity} />
            <InfoRow label="Miejsce wykonania" value={brief?.location} />
            <InfoRow label="Przedmiot" value={brief?.scopeDescription || item.title} />
            <InfoRow label="CPV" value={item.cpvCode} />
            <InfoRow label="Tryb" value={brief?.procedureType || item.orderType} />
            <InfoRow label="Postępowanie (BZP)" value={item.tenderState ? labelTenderState(item.tenderState) : null} />
          </div>

          <div className="rounded-lg bg-secondary/40 px-3 py-2 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <Calendar size={10} /> Terminy i finanse
            </p>
            <InfoRow label="Termin ofert" value={offerDeadline} />
            <InfoRow label="Otwarcie ofert" value={brief?.offerOpening} />
            <InfoRow label="Realizacja" value={brief?.contractPeriod || swz?.implementationDeadlineRaw} />
            <InfoRow label="Wartość zamówienia" value={
              swz?.estimatedValuePln != null ? fmtPln(swz.estimatedValuePln) : swz?.estimatedValueRaw ?? undefined
            } />
            <InfoRow label="Wadium" value={swz ? formatSwzWadiumDisplay(swz) : undefined} />
            <InfoRow label="Płatności" value={brief?.paymentTerms} />
            {swz && (
              <InfoRow label="Ocena SWZ" value={PROFITABILITY_LABELS[swz.profitabilityHint]} />
            )}
          </div>
        </div>

        {brief?.contactInfo && (
          <div className="rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <User size={10} /> Kontakt
            </p>
            <p className="text-xs whitespace-pre-wrap">{brief.contactInfo}</p>
          </div>
        )}

        {(swz?.referenceRequirement || (swz?.qualificationHints?.length ?? 0) > 0) && (
          <div className="rounded-lg bg-secondary/40 px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Referencje i kwalifikacje</p>
            {swz?.referenceRequirement && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{swz.referenceRequirement}</p>
            )}
            {swz?.qualificationHints?.map((h, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-border">{h}</p>
            ))}
          </div>
        )}

        {(swz?.technicalRequirements?.length ?? 0) > 0 && (
          <div className="rounded-lg bg-secondary/40 px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Wymagania techniczne</p>
            {swz!.technicalRequirements.map((t, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-border">{t}</p>
            ))}
          </div>
        )}

        {k?.ok && (
          <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <FileSpreadsheet size={13} />
                Kosztorys: {k.sourceFilename}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {k.totalValue && (
                  <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {k.totalValue} {k.currency || "PLN"}
                    {k.rowCount > k.rows.length && ` · ${k.rowCount} poz.`}
                  </p>
                )}
                {onOpenKosztorysPreview && k.sourceDocumentIndex != null && item.tenderId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenKosztorysPreview({
                        kind: "tenderBzp",
                        tenderId: item.tenderId,
                        documentIndex: k.sourceDocumentIndex!,
                        filename: k.sourceFilename,
                        zipInnerPath: k.zipInnerPath,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20"
                  >
                    <Eye size={11} />
                    Pełny podgląd
                  </button>
                )}
                {onOpenKosztorysPreview && k.sourceDocumentIndex == null && item.uploadedFile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenKosztorysPreview({
                        kind: "tenderUpload",
                        filename: item.uploadedFile!.filename,
                        publicUrl: item.uploadedFile!.publicUrl,
                        path: item.uploadedFile!.path,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20"
                  >
                    <Eye size={11} />
                    Pełny podgląd
                  </button>
                )}
              </div>
            </div>
            {k.title && <p className="text-[11px] text-muted-foreground">{k.title}</p>}
            {k.rows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowKosztorysRows((v) => !v); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  {showKosztorysRows ? "Ukryj skrót pozycji" : `Pokaż skrót pozycji (${Math.min(k.rows.length, 40)} z ${k.rowCount})`}
                </button>
                {showKosztorysRows && (
                  <CostTable rows={k.rows.slice(0, 12)} caption="Skrót pozycji kosztorysu" />
                )}
              </>
            )}
            {k.przedmiar.length > 0 && showKosztorysRows && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Przedmiar / obmiar</p>
                <ul className="text-[10px] space-y-1">
                  {k.przedmiar.slice(0, 8).map((p, i) => (
                    <li key={i} className="bg-background/60 rounded px-2 py-1">
                      <span className="font-medium">{p.description}</span>
                      {" — "}
                      <span className="font-mono">{p.quantity}</span>
                      {p.formula && <span className="text-muted-foreground"> ({p.formula})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {k.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                {k.categories.map((c, i) => (
                  <span key={i} className="bg-background/80 px-2 py-0.5 rounded border border-border">
                    {c.name}: <strong>{c.total}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {(swz?.costLines?.length ?? 0) > 0 && !k?.rows.length && (
          <CostTable rows={swz!.costLines} caption="Pozycje wyciągnięte z PDF/SWZ" />
        )}

        {(brief?.additionalNotes?.length ?? 0) > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Warunki i uwagi z ogłoszenia</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {brief!.additionalNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {brief && brief.fields.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAllFields((v) => !v); }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
            >
              Wszystkie pola z ogłoszenia BZP ({brief.fields.length})
              <ChevronDown size={14} className={`transition-transform ${showAllFields ? "rotate-180" : ""}`} />
            </button>
            {showAllFields && (
              <div className="px-3 py-2 max-h-64 overflow-y-auto">
                {brief.fields.map((f, i) => (
                  <InfoRow key={i} label={f.label} value={f.value} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
