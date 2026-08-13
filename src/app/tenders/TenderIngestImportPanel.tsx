/**
 * INGEST-01 — thin Import / Pin + multi PDF / ZIP upload UI.
 * Does NOT auto-create tender from filename / AI.
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { ImportTenderRequest, TenderIngestMode, TenderIngestRetention } from "@/lib/tender-ingest";
import {
  applyIngestArtifactsToPipelineItem,
  getIngestState,
  ingestOwnerBrowserFiles,
} from "@/lib/tender-ingest";

export function TenderIngestImportPanel({
  onImport,
  activeItem,
  onUpdateItem,
}: {
  onImport: (req: ImportTenderRequest) => Promise<TenderPipelineItem | void>;
  activeItem?: TenderPipelineItem | null;
  onUpdateItem?: (id: string, patch: Partial<TenderPipelineItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ocdsId, setOcdsId] = useState("");
  const [bzpNumber, setBzpNumber] = useState("");
  const [title, setTitle] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationCity, setOrganizationCity] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [ingestMode, setIngestMode] = useState<TenderIngestMode>("owner_requested");
  const [retention, setRetention] = useState<TenderIngestRetention>("normal");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const ingestState = activeItem ? getIngestState(activeItem.id) : null;

  const handlePin = useCallback(async () => {
    setBusy(true);
    try {
      await onImport({
        ocdsId: ocdsId.trim() || undefined,
        bzpNumber: bzpNumber.trim() || undefined,
        title: title.trim(),
        organizationName: organizationName.trim(),
        organizationCity: organizationCity.trim() || undefined,
        sourceUrls: sourceUrl.trim() ? [sourceUrl.trim()] : undefined,
        ingestMode,
        retention: ingestMode === "fixture_pin" ? "pinned" : retention,
      });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import nieudany");
    } finally {
      setBusy(false);
    }
  }, [
    onImport,
    ocdsId,
    bzpNumber,
    title,
    organizationName,
    organizationCity,
    sourceUrl,
    ingestMode,
    retention,
  ]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || !activeItem) {
        toast.message("Najpierw zaimportuj / wybierz przetarg (OCDS/BZP)");
        return;
      }
      setUploadBusy(true);
      try {
        const { state, documentIds } = await ingestOwnerBrowserFiles(activeItem.id, fileList);
        const patch = applyIngestArtifactsToPipelineItem({ ...activeItem });
        onUpdateItem?.(activeItem.id, {
          ...patch,
          ingestMode: activeItem.ingestMode ?? "owner_requested",
          retention: activeItem.retention ?? "normal",
        });
        toast.success(
          `Zachowano ${documentIds.length} dok. · faza ${state.ingestPhase} / ${state.parsePhase}`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload ingest nieudany");
      } finally {
        setUploadBusy(false);
      }
    },
    [activeItem, onUpdateItem],
  );

  return (
    <div className="space-y-2" data-ingest-01-panel>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 min-h-[36px]"
          data-ingest-01-import-toggle
        >
          Import / Pin przetarg
        </button>
        {activeItem ? (
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs cursor-pointer min-h-[36px] hover:bg-secondary/50">
            {uploadBusy ? "Wgrywanie…" : "Wgraj PDF / ZIP (wiele)"}
            <input
              type="file"
              multiple
              accept=".pdf,.zip,.ath,.nor,.xml,application/pdf,application/zip"
              className="hidden"
              disabled={uploadBusy}
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
        {ingestState ? (
          <span className="text-[11px] text-muted-foreground" data-ingest-01-status>
            Ingest {ingestState.ingestPhase} · Parse {ingestState.parsePhase} · docs{" "}
            {ingestState.documents.filter((d) => d.ingestStatus === "retained").length}
          </span>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2 max-w-xl">
          <p className="text-xs text-muted-foreground">
            Pin wymaga OCDS lub BZP + tytułu + zamawiającego. Nie twórz z nazwy pliku.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              placeholder="OCDS id"
              value={ocdsId}
              onChange={(e) => setOcdsId(e.target.value)}
            />
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              placeholder="Numer BZP"
              value={bzpNumber}
              onChange={(e) => setBzpNumber(e.target.value)}
            />
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs sm:col-span-2"
              placeholder="Tytuł *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              placeholder="Zamawiający *"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              placeholder="Miasto"
              value={organizationCity}
              onChange={(e) => setOrganizationCity(e.target.value)}
            />
            <input
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs sm:col-span-2"
              placeholder="Source URL (BIP)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
            <select
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              value={ingestMode}
              onChange={(e) => setIngestMode(e.target.value as TenderIngestMode)}
              aria-label="Tryb ingest"
            >
              <option value="owner_requested">owner_requested</option>
              <option value="fixture_pin">fixture_pin</option>
            </select>
            <select
              className="bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
              value={retention}
              onChange={(e) => setRetention(e.target.value as TenderIngestRetention)}
              aria-label="Retention"
              disabled={ingestMode === "fixture_pin"}
            >
              <option value="normal">normal</option>
              <option value="pinned">pinned</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePin()}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-60"
          >
            {busy ? "Import…" : "Zapisz pin"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
