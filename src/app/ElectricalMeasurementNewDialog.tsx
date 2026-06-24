import { useMemo, useState } from "react";
import { Gauge, X } from "lucide-react";
import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";

export type ElectricalMeasurementCreateKind = "linked" | "detached" | "test";

export function ElectricalMeasurementNewDialog({
  open,
  jobs,
  defaultJobId,
  onClose,
  onConfirm,
}: {
  open: boolean;
  jobs: Job[];
  defaultJobId?: string | null;
  onClose: () => void;
  onConfirm: (payload: {
    kind: ElectricalMeasurementCreateKind;
    jobId?: string;
    manualAddress?: string;
    manualFlatNumber?: string;
  }) => void;
}) {
  const [kind, setKind] = useState<ElectricalMeasurementCreateKind>("linked");
  const [jobId, setJobId] = useState(defaultJobId ?? "");
  const [manualAddress, setManualAddress] = useState("");
  const [manualFlatNumber, setManualFlatNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => jobDisplayTitle(a).localeCompare(jobDisplayTitle(b), "pl")),
    [jobs],
  );

  if (!open) return null;

  const handleSubmit = () => {
    setError(null);
    if (kind === "linked") {
      if (!jobId.trim()) {
        setError("Wybierz robotę dla raportu powiązanego.");
        return;
      }
      onConfirm({ kind, jobId: jobId.trim() });
      return;
    }
    if (kind === "detached") {
      if (!manualAddress.trim()) {
        setError("Podaj adres obiektu dla samodzielnego pomiaru.");
        return;
      }
      onConfirm({
        kind,
        manualAddress: manualAddress.trim(),
        manualFlatNumber: manualFlatNumber.trim(),
      });
      return;
    }
    onConfirm({ kind, jobId: jobId.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Gauge size={16} className="text-primary" />
            Nowy pomiar
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-secondary" aria-label="Zamknij">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground mb-1">Typ raportu</legend>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="em-create-kind"
                checked={kind === "linked"}
                onChange={() => setKind("linked")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Powiązany z robotą</span>
                <span className="block text-xs text-muted-foreground">Numer RAP z rejestru · adres z roboty</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="em-create-kind"
                checked={kind === "detached"}
                onChange={() => setKind("detached")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Samodzielny pomiar</span>
                <span className="block text-xs text-muted-foreground">
                  Bez roboty · adres ręczny · pełny RAP i eksport DOCX/ZIP
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="em-create-kind"
                checked={kind === "test"}
                onChange={() => setKind("test")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Testowy</span>
                <span className="block text-xs text-muted-foreground">TEST-RAP — bez wpływu na rejestr produkcyjny</span>
              </span>
            </label>
          </fieldset>

          {(kind === "linked" || kind === "test") && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">
                Robota {kind === "test" ? "(opcjonalnie)" : ""}
              </span>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
              >
                <option value="">{kind === "test" ? "— bez roboty —" : "— wybierz robotę —"}</option>
                {sortedJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {jobDisplayTitle(j)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind === "detached" && (
            <div className="space-y-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Adres obiektu</span>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="np. Wrocław, ul. Przykładowa 12"
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Nr lokalu (opcjonalnie)</span>
                <input
                  type="text"
                  value={manualFlatNumber}
                  onChange={(e) => setManualFlatNumber(e.target.value)}
                  placeholder="np. 7"
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
                />
              </label>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          >
            Utwórz raport
          </button>
        </div>
      </div>
    </div>
  );
}
