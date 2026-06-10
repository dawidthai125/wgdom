import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { METRIC_LABEL_PL } from "@/lib/tender-center-ui-labels-pl";

export type MetricHelpId =
  | "health-index"
  | "opportunity-score"
  | "strategic-score"
  | "impact-score"
  | "financial-capacity"
  | "forecast-90"
  | "offer-overload";

export const METRIC_HELP: Record<
  MetricHelpId,
  { title: string; body: ReactNode }
> = {
  "health-index": {
    title: METRIC_LABEL_PL.healthIndex,
    body: (
      <>
        <p>Ocena ogólnej kondycji firmy.</p>
        <p className="font-medium text-foreground/90">Uwzględnia:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>aktywne roboty</li>
          <li>dostępne zasoby</li>
          <li>lejek przetargów</li>
          <li>referencje</li>
          <li>sytuację finansową</li>
        </ul>
        <ul className="space-y-0.5 pt-1">
          <li>
            <strong>90–100</strong> — Bardzo dobra sytuacja
          </li>
          <li>
            <strong>70–89</strong> — Dobra sytuacja
          </li>
          <li>
            <strong>50–69</strong> — Ostrożnie
          </li>
          <li>
            <strong>0–49</strong> — Ryzyko
          </li>
        </ul>
      </>
    ),
  },
  "opportunity-score": {
    title: METRIC_LABEL_PL.opportunityScore,
    body: (
      <>
        <p>Ocena atrakcyjności przetargu.</p>
        <p className="font-medium text-foreground/90">Uwzględnia:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>wartość kontraktu</li>
          <li>termin składania</li>
          <li>lokalizację</li>
          <li>SWZ</li>
          <li>referencje</li>
        </ul>
        <ul className="space-y-0.5 pt-1">
          <li>
            <strong>80+</strong> — Priorytet
          </li>
          <li>
            <strong>65–79</strong> — Wysoka szansa
          </li>
          <li>
            <strong>50–64</strong> — Analizuj
          </li>
          <li>
            <strong>&lt;50</strong> — Niska atrakcyjność
          </li>
        </ul>
      </>
    ),
  },
  "strategic-score": {
    title: METRIC_LABEL_PL.strategicScore,
    body: (
      <>
        <p>Ocena gotowości firmy do realizacji kontraktu.</p>
        <p className="font-medium text-foreground/90">Uwzględnia:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>ludzi</li>
          <li>czas</li>
          <li>zasoby</li>
          <li>doświadczenie</li>
          <li>aktualne obłożenie</li>
        </ul>
      </>
    ),
  },
  "impact-score": {
    title: METRIC_LABEL_PL.impactScore,
    body: (
      <>
        <p>Pokazuje jaki wpływ na firmę będzie miało wygranie kontraktu.</p>
        <p className="font-medium text-foreground/90">Uwzględnia:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>zasoby</li>
          <li>finanse</li>
          <li>obłożenie</li>
          <li>rozwój firmy</li>
        </ul>
      </>
    ),
  },
  "financial-capacity": {
    title: METRIC_LABEL_PL.financialCapacity,
    body: (
      <>
        <p>Czy firmę stać na realizację kontraktu.</p>
        <p className="font-medium text-foreground/90">Uwzględnia:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>wadium</li>
          <li>bufor finansowy</li>
          <li>wielkość kontraktu</li>
          <li>aktualne obciążenie</li>
        </ul>
        <ul className="space-y-0.5 pt-1">
          <li>
            <strong>90+</strong> — Bezpiecznie
          </li>
          <li>
            <strong>70–89</strong> — Uwaga
          </li>
          <li>
            <strong>&lt;70</strong> — Wysokie ryzyko
          </li>
        </ul>
      </>
    ),
  },
  "forecast-90": {
    title: METRIC_LABEL_PL.forecast90,
    body: (
      <>
        <p>
          Prognoza zajętych slotów równoległych realizacji na 30, 60 i 90 dni (scenariusz 50% wygranych GO).
        </p>
        <p className="font-medium text-foreground/90">Format:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            <strong>4 / 4 slotów</strong> — wszystkie sloty zajęte
          </li>
          <li>
            <strong>6 / 4 slotów (+2 ponad limit)</strong> — więcej kontraktów niż limit równoległych robót
          </li>
        </ul>
        <p className="pt-1">To nie jest procent sukcesu — pokazuje obłożenie względem limitu z profilu firmy.</p>
      </>
    ),
  },
  "offer-overload": {
    title: "Obciążenie ofert",
    body: (
      <>
        <p>
          Liczba ofert w przygotowaniu (zainteresowany + w przygotowaniu) w stosunku do limitu równoległych robót z
          profilu firmy.
        </p>
        <p className="font-medium text-foreground/90">Format slotów:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>3 / 4 slotów — trzy oferty przy limicie czterech równoległych realizacji</li>
          <li>(+N ponad limit) — więcej ofert niż bezpieczny limit równoległych startów</li>
        </ul>
      </>
    ),
  },
};

export function MetricHelpTooltip({ metricId }: { metricId: MetricHelpId }) {
  const [open, setOpen] = useState(false);
  const help = METRIC_HELP[metricId];

  const handleEnter = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setOpen(true);
    }
  }, []);

  const handleLeave = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setOpen(false);
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center size-5 rounded-full text-[11px] leading-none text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
          aria-label={`Pomoc: ${help.title}`}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,20rem)] sm:w-80 p-3"
        side="top"
        align="start"
      >
        <p className="text-sm font-semibold text-foreground mb-2">{help.title}</p>
        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">{help.body}</div>
      </PopoverContent>
    </Popover>
  );
}
