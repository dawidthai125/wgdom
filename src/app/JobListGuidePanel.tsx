import {
  HardHat,
  ClipboardCheck,
  Users,
  Scale,
  AlertTriangle,
  Building2,
  HelpCircle,
} from "lucide-react";

/** Roboty 2.1B MIN — statyczny panel pomocy (tylko UI, bez logiki filtrów). */
export function JobListGuidePanel() {
  return (
    <aside className="flex flex-col h-full min-h-0" aria-label="Pomoc — legenda listy robót">
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card/80">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <HelpCircle size={14} className="text-muted-foreground shrink-0" />
          Pomoc
        </p>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 text-[11px] leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Legenda statusów
          </h3>
          <p className="text-muted-foreground">
            Liczby w kafelkach KPI — kliknij kafelek, aby zawęzić listę (ponowny klik cofa filtr).
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <HardHat size={14} className="shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
              <span>
                <strong className="text-foreground/90">W toku</strong>
                {" — "}
                roboty w fazie realizacji.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck size={14} className="shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
              <span>
                <strong className="text-foreground/90">Do odbioru</strong>
                {" — "}
                faza odbioru / zdawania dokumentów.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Users size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="text-foreground/90">Bez ekipy</strong>
                {" — "}
                brak przypisanej ekipy realizacyjnej (aktywne roboty).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Scale size={14} className="shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
              <span>
                <strong className="text-foreground/90">BZP</strong>
                {" — "}
                kontrakt powiązany z przetargiem (niezakończone).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>
                <strong className="text-foreground/90">WM po terminie</strong>
                {" — "}
                planowany odbiór WM minął termin.
              </span>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Legenda oznaczeń
          </h3>
          <p className="text-muted-foreground">Chipy na kartach listy (pod adresem):</p>
          <ul className="space-y-1.5">
            <li>
              <span className="inline-block text-[10px] bg-violet-500/12 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-semibold mr-1.5">
                BZP
              </span>
              realizacja kontraktu z modułu Przetargi.
            </li>
            <li>
              <span className="inline-block text-[10px] font-medium text-sky-700 dark:text-sky-400 mr-1.5">
                <Building2 size={10} className="inline mr-0.5" />
                WM
              </span>
              termin / etap odbioru Wrocławskich Mieszkań.
            </li>
            <li>
              <span className="inline-block text-[10px] bg-sky-500/12 text-sky-700 dark:text-sky-400 px-1.5 py-0.5 rounded-full font-medium mr-1.5">
                Ekipa: N
              </span>
              liczba osób w planie realizacyjnym.
            </li>
            <li>
              <span className="inline-block text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium mr-1.5">
                Ekipa: 0
              </span>
              brak przypisanej ekipy.
            </li>
          </ul>
        </section>

        <section className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Wskazówka
          </h3>
          <p className="text-muted-foreground">
            Użyj wyszukiwarki po adresie lub kliencie. Zakładki faz (Wszystkie / W trakcie…) działają razem z KPI.
            Dodatkowe filtry (pracownik, usuwanie wielu) otwierasz przyciskiem <strong className="text-foreground/80">Filtry</strong> pod
            paskiem faz.
          </p>
        </section>
      </div>
    </aside>
  );
}
