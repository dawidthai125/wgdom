import {
  HOUSING_TYPES,
  HOUSING_TYPE_LABELS,
  STOVE_TYPES,
  STOVE_TYPE_LABELS,
  STOVE_TYPE_LABELS_FULL,
  GAS_FURNACE_STATUSES,
  GAS_FURNACE_STATUS_LABELS,
  type HousingType,
  type JobMetaFields,
  type StoveType,
  type GasFurnaceStatus,
  isJobHousingSet,
} from "@/lib/job-meta";

function MetaRow<T extends string>({
  label,
  required,
  value,
  options,
  labels,
  titleLabels,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: T | "" | undefined;
  options: readonly T[];
  labels: Record<T, string>;
  titleLabels?: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-xs text-muted-foreground shrink-0 sm:w-[72px]">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            title={titleLabels?.[opt] ?? labels[opt]}
            onClick={() => onChange(opt)}
            className={`text-xs px-3 py-2 min-h-[44px] rounded-md font-medium border transition-colors touch-manipulation ${
              value === opt
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary/80 text-muted-foreground border-transparent hover:border-border hover:text-foreground"
            }`}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JobMetaPickers({
  housingType,
  stoveType,
  gasFurnaceStatus,
  onHousingChange,
  onStoveChange,
  onGasFurnaceChange,
}: {
  housingType?: HousingType | "";
  stoveType?: StoveType | "";
  gasFurnaceStatus?: GasFurnaceStatus | "";
  onHousingChange: (v: HousingType) => void;
  onStoveChange: (v: StoveType) => void;
  onGasFurnaceChange: (v: GasFurnaceStatus) => void;
}) {
  const housingMissing = !isJobHousingSet({ housingType });

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <MetaRow
        label="Lokal"
        required
        value={housingType}
        options={HOUSING_TYPES}
        labels={HOUSING_TYPE_LABELS}
        onChange={onHousingChange}
      />
      {housingMissing && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 sm:pl-[84px]">Wybierz typ lokalu — wymagane przed zdaniem roboty</p>
      )}
      <MetaRow
        label="Kuchenka"
        value={stoveType}
        options={STOVE_TYPES}
        labels={STOVE_TYPE_LABELS}
        titleLabels={STOVE_TYPE_LABELS_FULL}
        onChange={onStoveChange}
      />
      <MetaRow
        label="Piec gazowy"
        value={gasFurnaceStatus}
        options={GAS_FURNACE_STATUSES}
        labels={GAS_FURNACE_STATUS_LABELS}
        onChange={onGasFurnaceChange}
      />
    </div>
  );
}

export function JobMetaBadges({ job }: { job: JobMetaFields }) {
  const badges: { key: string; text: string; className: string }[] = [];
  if (isJobHousingSet(job)) {
    badges.push({
      key: "housing",
      text: HOUSING_TYPE_LABELS[job.housingType],
      className: "bg-sky-500/12 text-sky-400",
    });
  }
  if (job.stoveType && STOVE_TYPES.includes(job.stoveType as StoveType)) {
    badges.push({
      key: "stove",
      text: STOVE_TYPE_LABELS_FULL[job.stoveType as StoveType],
      className: "bg-violet-500/12 text-violet-400",
    });
  }
  if (job.gasFurnaceStatus && GAS_FURNACE_STATUSES.includes(job.gasFurnaceStatus as GasFurnaceStatus)) {
    badges.push({
      key: "gasFurnace",
      text: `Piec: ${GAS_FURNACE_STATUS_LABELS[job.gasFurnaceStatus as GasFurnaceStatus]}`,
      className: "bg-orange-500/12 text-orange-400",
    });
  }
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b.key} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${b.className}`}>
          {b.text}
        </span>
      ))}
    </div>
  );
}
