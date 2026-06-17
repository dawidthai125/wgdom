import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Package, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  downloadPublishedDeliveryPackageZip,
  inspectorDeliveryPackageForJob,
} from "@/lib/delivery-package-publications/inspector-access";
import {
  groupDeliveryPackageManifestByFolder,
} from "@/lib/delivery-package-publications/manifest";
import {
  deliveryPackageStatusLabel,
} from "@/lib/delivery-package-publications/publication";
import { formatDeliveryPackageFileSize } from "@/lib/delivery-package-publications/storage";
import { INSPECTOR_DELIVERY_PACKAGE_PANEL_ID } from "@/lib/inspector-handover-ux";
import type { DeliveryPackagePublication } from "@/lib/delivery-package-publications/types";

export function InspectorDeliveryPackagePanel({
  jobId,
  publications,
  panelId = INSPECTOR_DELIVERY_PACKAGE_PANEL_ID,
  downloadBusy: downloadBusyProp,
  onDownload,
}: {
  jobId: string;
  publications: DeliveryPackagePublication[];
  panelId?: string;
  downloadBusy?: boolean;
  onDownload?: () => void | Promise<void>;
}) {
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  const downloading = downloadBusyProp ?? downloadingLocal;
  const [manifestOpen, setManifestOpen] = useState(false);

  const publication = useMemo(
    () => inspectorDeliveryPackageForJob(publications, jobId),
    [publications, jobId],
  );

  const manifestGroups = useMemo(
    () => groupDeliveryPackageManifestByFolder(publication?.manifest ?? []),
    [publication],
  );

  const handleDownload = async () => {
    if (!publication) return;
    if (onDownload) {
      await onDownload();
      return;
    }
    setDownloadingLocal(true);
    const res = await downloadPublishedDeliveryPackageZip(publication);
    setDownloadingLocal(false);
    if (res.ok) {
      toast.success(`Pobrano: ${publication.fileName}`);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div id={panelId} className="bg-card border border-border rounded-2xl p-4 space-y-3 scroll-mt-3">
      <div className="flex items-start gap-2">
        <Package size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Pakiet odbiorowy</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gotowy ZIP opublikowany przez administratora — bez generatorów WM Druk.
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
            publication
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {publication ? "PAKIET GOTOWY" : "BRAK PAKIETU"}
        </span>
      </div>

      {publication ? (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Data publikacji</dt>
              <dd className="font-medium">
                {new Date(publication.publishedAt).toLocaleString("pl-PL")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Autor publikacji</dt>
              <dd className="font-medium">{publication.publishedByUserName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Liczba plików</dt>
              <dd className="font-medium">{publication.fileCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rozmiar ZIP</dt>
              <dd className="font-medium">{formatDeliveryPackageFileSize(publication.fileSizeBytes)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Nazwa pliku</dt>
              <dd className="font-medium break-all">{publication.fileName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{deliveryPackageStatusLabel(publication.status)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Wersja pakietu</dt>
              <dd className="font-medium">v{publication.zipVersion}</dd>
            </div>
          </dl>

          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 min-h-[44px]"
          >
            <Download size={16} />
            {downloading ? "Pobieranie…" : "Pobierz pakiet odbiorowy"}
          </button>

          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setManifestOpen((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium bg-secondary/40 hover:bg-secondary/60 min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <FileText size={15} />
                Pokaż zawartość
              </span>
              {manifestOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {manifestOpen && (
              <div className="px-3 py-2 space-y-3 max-h-64 overflow-y-auto text-xs border-t border-border">
                {manifestGroups.length === 0 ? (
                  <p className="text-muted-foreground py-2">
                    Brak szczegółowego manifestu (publikacja sprzed P1B). Pobierz ZIP, aby zobaczyć zawartość.
                  </p>
                ) : (
                  manifestGroups.map(({ folder, files }) => (
                    <div key={folder}>
                      <p className="font-semibold text-foreground mb-1">
                        {folder} · {files.length} plików
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        {files.map((f) => (
                          <li key={f.relativePath} className="flex justify-between gap-2">
                            <span className="truncate" title={f.relativePath}>
                              {f.displayLabel || f.fileName}
                            </span>
                            {typeof f.sizeBytes === "number" && f.sizeBytes > 0 && (
                              <span className="shrink-0 tabular-nums">
                                {formatDeliveryPackageFileSize(f.sizeBytes)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Administrator jeszcze nie opublikował pakietu odbiorowego dla tej roboty. Po publikacji w WM Druk
          pojawi się tutaj gotowy ZIP do pobrania.
        </p>
      )}
    </div>
  );
}
