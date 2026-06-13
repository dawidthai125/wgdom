import type { LaborBenchmarkComparison, LaborBenchmarkStatus } from "@/lib/labor-benchmark";
import {
  laborBenchmarkStatusClass,
  laborBenchmarkStatusIcon,
} from "@/lib/labor-benchmark";

function unitSuffix(unit: string): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}

export function LaborBenchmarkStatusBadge({
  comparison,
  compact = false,
}: {
  comparison: LaborBenchmarkComparison;
  compact?: boolean;
}) {
  const { status, statusLabelPl } = comparison;
  if (status === "unavailable") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${laborBenchmarkStatusClass(status)}`}>
      <span aria-hidden>{laborBenchmarkStatusIcon(status)}</span>
      {!compact && <span>{statusLabelPl}</span>}
      {compact && status === "ok" && <span>OK</span>}
      {compact && status !== "ok" && <span>{statusLabelPl}</span>}
    </span>
  );
}

export function LaborBenchmarkCell({
  comparison,
  showOurRate = true,
}: {
  comparison: LaborBenchmarkComparison;
  showOurRate?: boolean;
}) {
  if (comparison.status === "unavailable") {
    return <span className="text-muted-foreground text-[9px]">Brak benchmarku</span>;
  }
  return (
    <div className="text-[9px] leading-snug space-y-0.5">
      {showOurRate && (
        <p>
          <span className="text-muted-foreground">Nasza:</span>{" "}
          <strong className="font-mono tabular-nums">
            {comparison.ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
          </strong>
        </p>
      )}
      <p>
        <span className="text-muted-foreground">Rynek:</span>{" "}
        <strong className="font-mono tabular-nums">{comparison.rangeLabelPl}</strong>
      </p>
      <p>
        <span className="text-muted-foreground">Status:</span>{" "}
        <LaborBenchmarkStatusBadge comparison={comparison} />
      </p>
    </div>
  );
}

export function LaborBenchmarkCompactRow({
  ourLaborPlnPerUnit,
  comparison,
}: {
  ourLaborPlnPerUnit: number;
  comparison: LaborBenchmarkComparison;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
      <span className="font-mono tabular-nums font-medium">
        {ourLaborPlnPerUnit.toLocaleString("pl-PL")} zł/{unitSuffix(comparison.unit)}
      </span>
      <span className="text-muted-foreground">{comparison.rangeLabelPl}</span>
      <LaborBenchmarkStatusBadge comparison={comparison} compact />
    </div>
  );
}

export type { LaborBenchmarkStatus };
