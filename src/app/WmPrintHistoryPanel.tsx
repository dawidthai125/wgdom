import { useState } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import type { WmPrintHistoryEntry } from "@/lib/wm-print/history";
import {
  formatWmPrintHistoryTimestamp,
  normalizeWmPrintHistory,
  wmPrintHistoryOutputTypeLabel,
} from "@/lib/wm-print/history";

export function WmPrintHistoryPanel({
  history,
  filterJobId,
  maxRows,
  showTitle = true,
}: {
  history: WmPrintHistoryEntry[];
  filterJobId?: string;
  maxRows?: number;
  showTitle?: boolean;
}) {
  const [detail, setDetail] = useState<WmPrintHistoryEntry | null>(null);

  let rows = normalizeWmPrintHistory(history);
  if (filterJobId) rows = rows.filter((e) => e.jobId === filterJobId);
  if (maxRows != null && maxRows > 0) rows = rows.slice(0, maxRows);

  return (
    <div className="space-y-3">
      {showTitle && (
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <History size={14} className="text-primary shrink-0" />
            Historia generowania
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Metadane wygenerowanych dokumentów — bez przechowywania plików.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Brak wpisów historii.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Użytkownik</th>
                  <th className="px-3 py-2 font-medium">Dokument</th>
                  <th className="px-3 py-2 font-medium">Typ</th>
                  <th className="px-3 py-2 font-medium">Robota</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} className="border-t border-border/60">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <button
                        type="button"
                        onClick={() => setDetail(entry)}
                        className="text-left hover:text-primary hover:underline"
                      >
                        {formatWmPrintHistoryTimestamp(entry.timestamp)}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[120px]">{entry.userName}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[160px]">
                      <button
                        type="button"
                        onClick={() => setDetail(entry)}
                        className="text-left hover:text-primary hover:underline truncate block max-w-full"
                      >
                        {entry.templateName}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {wmPrintHistoryOutputTypeLabel(entry.outputType)}
                    </td>
                    <td className="px-3 py-2 text-xs truncate max-w-[180px]">{entry.jobName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={detail != null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Szczegóły generowania</DialogTitle>
          </DialogHeader>
          {detail && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Data</dt>
                <dd>{formatWmPrintHistoryTimestamp(detail.timestamp)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Użytkownik</dt>
                <dd>{detail.userName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Dokument</dt>
                <dd>{detail.templateName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Typ</dt>
                <dd>{wmPrintHistoryOutputTypeLabel(detail.outputType)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Robota</dt>
                <dd>{detail.jobName}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
