import { HelpCircle } from "lucide-react";
import {
  TENDER_STATUS_LABELS,
  TENDER_IMPORTANCE_MIN_SCORE,
  type TenderPipelineStatus,
} from "@/lib/tenders-bzp";
import { PROFITABILITY_LABELS, type TenderProfitabilityHint } from "@/lib/tenders-bzp-swz";

const PIPELINE_HINTS: Record<TenderPipelineStatus, string> = {
  new: "Pobrany z BZP — jeszcze nie oceniany przez zespół.",
  seen: "Przejrzany — bez decyzji o udziale.",
  interested: "Warto analizować (SWZ, kosztorys). System uczy się słów z takich tytułów.",
  preparing: "Przygotowujecie ofertę — można utworzyć robotę w WGDOM.",
  submitted: "Oferta złożona — czekacie na wynik.",
  won: "Wygrany — utwórz robotę i powiąż z pipeline.",
  lost: "Przegrany lub rezygnacja — znika z „Do zgłoszenia”.",
  ignored: "Świadomie pominięty — znika z „Do zgłoszenia”.",
};

const PROFIT_HINTS: Record<TenderProfitabilityHint, string> = {
  good: "Wartość i wadium wyglądają sensownie (lub wasz szacunek daje margines).",
  caution: "Dane niepełne albo ryzyko (np. szacunek wyższy niż SWZ, krótki termin).",
  risky: "Np. bardzo wysokie wadium — sprawdź płynność.",
  unknown: "Brak kwoty/wadium w tekście — pobierz załącznik lub uzupełnij ręcznie.",
};

export function TendersLegend({ compact = false }: { compact?: boolean }) {
  const textSize = compact ? "text-[10px]" : "text-[11px]";
  const statuses = Object.keys(TENDER_STATUS_LABELS) as TenderPipelineStatus[];

  return (
    <div
      className={`rounded-xl border border-border bg-secondary/30 ${compact ? "px-3 py-2.5" : "px-4 py-3"} space-y-3`}
      title="Legenda przetargów BZP"
    >
      <p className={`${textSize} font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1`}>
        <HelpCircle size={11} />
        Co oznaczają liczniki, trafność i statusy?
      </p>

      <section className={`space-y-1 ${textSize}`}>
        <p className="font-medium text-foreground/90">Liczniki u góry listy</p>
        <ul className="space-y-1 text-muted-foreground leading-snug list-disc pl-4">
          <li><strong className="text-foreground/90">Do zgłoszenia</strong> — termin ofert otwarty, Wrocław lub kluczowy zamawiający, trafność ≥{TENDER_IMPORTANCE_MIN_SCORE}, status nie: pominięty / przegrany / wygrany.</li>
          <li><strong className="text-foreground/90">Aktywnych</strong> — wszystkie z otwartym terminem składania ofert.</li>
          <li><strong className="text-foreground/90">Termin ≤7 dni</strong> — pilne — termin ofert w ciągu tygodnia.</li>
          <li><strong className="text-foreground/90">Kluczowi</strong> — WM, ZIK, ZIM, TBS, Gmina, MOPS Wrocław.</li>
          <li><strong className="text-foreground/90">W analizie</strong> — status „Interesuje nas” lub „Przygotowujemy ofertę”.</li>
        </ul>
      </section>

      <section className={`space-y-1 ${textSize}`}>
        <p className="font-medium text-foreground/90">Trafność (liczba punktów)</p>
        <p className="text-muted-foreground leading-snug">
          Automatyczna ocena dopasowania tytułu do profilu W&G DOM (remonty wnętrz, instalacje, Wrocław).
          Im wyżej, tym bliżej waszego zakresu. Punkty m.in. za słowa kluczowe (+10 / +5), miasto Wrocław (+25),
          kluczowego zamawiającego (+20), kod CPV budowlany. Na liście badge <strong className="text-emerald-600">Trafność N</strong> od 20 pkt;
          filtr „Wysoka trafność” od {TENDER_IMPORTANCE_MIN_SCORE} pkt. Po „Ucz system” słowa z chmury też wpływają na wynik.
        </p>
      </section>

      <section className={`space-y-1.5 ${textSize}`}>
        <p className="font-medium text-foreground/90">Wasze statusy (ustawiasz w szczegółach przetargu)</p>
        <ul className="space-y-1 text-muted-foreground leading-snug">
          {statuses.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                s === "new" ? "bg-blue-500/15 text-blue-600" :
                s === "interested" || s === "preparing" ? "bg-violet-500/15 text-violet-600" :
                s === "won" ? "bg-emerald-500/15 text-emerald-600" :
                s === "ignored" || s === "lost" ? "bg-muted text-muted-foreground" :
                "bg-secondary text-foreground"
              }`}>
                {TENDER_STATUS_LABELS[s]}
              </span>
              <span>{PIPELINE_HINTS[s]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`space-y-1 ${textSize}`}>
        <p className="font-medium text-foreground/90">Ocena SWZ (po analizie ogłoszenia / PDF)</p>
        <ul className="space-y-1 text-muted-foreground leading-snug">
          {(Object.keys(PROFITABILITY_LABELS) as TenderProfitabilityHint[]).map((k) => (
            <li key={k} className="flex items-start gap-2">
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                k === "good" ? "bg-emerald-500/10 text-emerald-600" :
                k === "risky" ? "bg-red-500/10 text-red-600" :
                k === "caution" ? "bg-amber-500/10 text-amber-600" :
                "bg-secondary text-muted-foreground"
              }`}>
                {PROFITABILITY_LABELS[k]}
              </span>
              <span>{PROFIT_HINTS[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`space-y-1 ${textSize}`}>
        <p className="font-medium text-foreground/90">Inne oznaczenia na liście</p>
        <ul className="space-y-0.5 text-muted-foreground leading-snug list-disc pl-4">
          <li><strong className="text-primary">Wrocław</strong> — zamawiający lub tytuł z Wrocławia.</li>
          <li><strong className="text-orange-600">Etykieta zamawiającego</strong> — np. WM, ZIK (kluczowy odbiorca).</li>
          <li><strong className="text-foreground/90">Postępowanie: …</strong> — status z e-Zamówienia (np. składanie ofert, unieważnione).</li>
          <li><strong className="text-emerald-600">Robota</strong> — powiązana karta roboty w WGDOM.</li>
        </ul>
      </section>

      <section className={`space-y-1 ${textSize}`}>
        <p className="font-medium text-foreground/90">Lejek pipeline</p>
        <p className="text-muted-foreground leading-snug">
          Ile przetargów jest na każdym etapie waszej pracy (nowy → obejrzany → … → wygrany/przegrany).
          <strong className="text-foreground/90"> Skuteczność</strong> = wygrane ÷ (wygrane + przegrane), w procentach.
        </p>
      </section>
    </div>
  );
}
