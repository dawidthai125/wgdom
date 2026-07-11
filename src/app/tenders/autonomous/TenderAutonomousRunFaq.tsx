import { useEffect, useRef } from "react";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION } from "@/lib/tender-ux-tokens";

const AUTONOMOUS_RUN_FAQ_ITEMS = [
  {
    id: "bzp",
    question: "Pobieranie z BZP",
    answer:
      "Źródło może odpowiadać wolniej lub ogłoszenie ma wiele załączników.",
  },
  {
    id: "no_attachments",
    question: "Brak załączników",
    answer:
      "Agent analizuje samo ogłoszenie — wynik będzie wstępny, pełna analiza po uzupełnieniu dokumentów.",
  },
  {
    id: "large_boq",
    question: "Duży przedmiar PDF",
    answer:
      "Rozpoznanie pozycji kosztorysu wymaga przetworzenia setek wierszy.",
  },
  {
    id: "pricing",
    question: "Wycena katalogowa",
    answer:
      "Dopasowanie pozycji do bazy cen trwa dłużej przy niestandardowych opisach.",
  },
  {
    id: "time_limit",
    question: "Limit czasu ~2 min",
    answer:
      "Po ok. 2 minutach przedstawimy rekomendację z dostępnych danych — możesz dokończyć analizę w Workspace.",
  },
] as const;

export function TenderAutonomousRunFaq({
  autoExpand,
}: {
  autoExpand: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!autoExpand) return;
    const el = detailsRef.current;
    if (el && !el.open) {
      el.open = true;
    }
  }, [autoExpand]);

  return (
    <details
      ref={detailsRef}
      className="shrink-0 rounded-xl border border-border bg-card/50 px-4 py-3"
      data-tender-autonomous-faq
      data-tender-autonomous-faq-expanded={autoExpand ? "" : undefined}
    >
      <summary
        className={`cursor-pointer list-none min-h-11 flex items-center ${TEUX_FONT_CAPTION} font-semibold text-muted-foreground touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md`}
      >
        <span className="marker:content-none">Dlaczego analiza może potrwać dłużej?</span>
      </summary>
      <ul className="mt-3 space-y-3" role="list">
        {AUTONOMOUS_RUN_FAQ_ITEMS.map((item) => (
          <li key={item.id} className="space-y-0.5" data-tender-autonomous-faq-item={item.id}>
            <p className={`${TEUX_FONT_CAPTION} font-semibold text-foreground`}>{item.question}</p>
            <p className={`${TEUX_FONT_BODY} text-muted-foreground`}>{item.answer}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
