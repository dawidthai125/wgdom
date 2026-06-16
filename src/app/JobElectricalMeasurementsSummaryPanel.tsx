import { ExternalLink, Gauge } from "lucide-react";
import type { Job } from "@/app/app-domain";
import { filterElectricalMeasurementsForJob } from "@/lib/electrical-measurements/merge";
import { buildJobElectricalMeasurementsSummary } from "@/lib/electrical-measurements/preview";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";

/** EM-UX-001 — skrót w Robotach; pełny UI w WM Druk → Pomiary. */
export function JobElectricalMeasurementsSummaryPanel({
  job,
  measurements,
  onOpenInWmPrint,
}: {
  job: Job;
  measurements: ElectricalMeasurement[];
  onOpenInWmPrint: (jobId: string) => void;
}) {
  const jobReports = filterElectricalMeasurementsForJob(measurements, job.id);
  const summary = buildJobElectricalMeasurementsSummary(jobReports);

  return (
    <div className="bg-card rounded-xl border border-border p-4 md:p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Gauge size={14} className="text-primary shrink-0" />
          Pomiary Elektryczne
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Protokoły pomiarowe i generowanie DOCX — w module WM Druk.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
        <span>Raporty: {summary.reportCount}</span>
        <span>Obwody: {summary.circuitCount}</span>
        <span>RCD: {summary.rcdCount}</span>
      </div>

      {summary.reportCount === 0 && (
        <p className="text-xs text-muted-foreground">Brak raportów pomiarowych dla tej roboty.</p>
      )}

      <button
        type="button"
        onClick={() => onOpenInWmPrint(job.id)}
        className="text-xs text-primary flex items-center gap-1 hover:underline font-medium"
      >
        <ExternalLink size={11} />
        Otwórz w WM Druk
      </button>
    </div>
  );
}
