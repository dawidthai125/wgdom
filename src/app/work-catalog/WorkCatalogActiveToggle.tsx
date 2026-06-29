import { useId, useState } from "react";
import type { CatalogWork } from "@/lib/work-catalog";
import type { UpdateWorkActiveResult } from "@/app/hooks/useWorkCatalog";

type Props = {
  work: CatalogWork;
  onToggle: (workId: string, active: boolean) => Promise<UpdateWorkActiveResult>;
};

export function WorkCatalogActiveToggle({ work, onToggle }: Props) {
  const inputId = useId();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (nextActive: boolean) => {
    if (nextActive === work.active || saving) return;

    setSaving(true);
    setError(null);
    const result = await onToggle(work.id, nextActive);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <label
        htmlFor={inputId}
        className={`inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors ${
          work.active
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        } ${saving ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={work.active}
          disabled={saving}
          onChange={(e) => {
            void handleChange(e.target.checked);
          }}
          className="h-5 w-5 shrink-0 rounded border-border accent-primary"
          aria-label={work.active ? "Aktywna — kliknij aby dezaktywować" : "Nieaktywna — kliknij aby aktywować"}
        />
        <span>{work.active ? "Aktywna" : "Nieaktywna"}</span>
      </label>
      {error && (
        <p className="max-w-[12rem] text-right text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
