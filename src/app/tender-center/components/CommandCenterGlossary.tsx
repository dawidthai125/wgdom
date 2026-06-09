import { GLOSSARY_TERM_PL } from "@/lib/tender-center-ui-labels-pl";

const GLOSSARY = [
  {
    term: GLOSSARY_TERM_PL.healthIndex,
    text: "Skala 0–100 opisująca ogólną kondycję firmy. Łączy obciążenie robót, zasoby ludzkie, lejek przetargów, referencje i sygnały finansowe. Im wyższy wynik, tym bezpieczniej planować nowe zobowiązania.",
  },
  {
    term: GLOSSARY_TERM_PL.opportunityScore,
    text: "Ocena atrakcyjności pojedynczego przetargu (wartość, termin, lokalizacja, SWZ, referencje). Pomaga ustalić, które postępowania warto analizować w pierwszej kolejności.",
  },
  {
    term: GLOSSARY_TERM_PL.strategicScore,
    text: "Ocena gotowości operacyjnej firmy do realizacji danego kontraktu. Uwzględnia ludzi, czas, doświadczenie i aktualne obłożenie — niezależnie od samej atrakcyjności przetargu.",
  },
  {
    term: GLOSSARY_TERM_PL.impactScore,
    text: "Szacuje wpływ wygrania kontraktu na zasoby, finanse, obłożenie i rozwój firmy. Przydatny przy porównywaniu kilku opcji startu w portfelu.",
  },
  {
    term: GLOSSARY_TERM_PL.financialCapacity,
    text: "Odpowiedź na pytanie, czy firmę stać na start w przetargu. Analizuje wadium, bufor finansowy, wielkość kontraktu i bieżące obciążenie kapitałowe.",
  },
  {
    term: GLOSSARY_TERM_PL.forecast90,
    text: "Prognoza obłożenia firmy na 30, 60 i 90 dni (scenariusz wygranych ofert). Pomaga wychwycić przestoje, przeciążenie i potrzebę nowych kontraktów lub zatrudnienia.",
  },
  {
    term: GLOSSARY_TERM_PL.growthMode,
    text: "Tryb strategiczny właściciela: Stabilizacja, Wyważony, Wzrost lub Ekspansja. Wpływa na wagi indeksu kondycji i rekomendacje systemu bez zmiany danych przetargowych.",
  },
  {
    term: GLOSSARY_TERM_PL.decisions,
    text: "Decyzja właściciela wobec przetargu. Startuj — rozpocznij ofertowanie, Analizuj — kontynuuj analizę, Odpuszczaj — rezygnuj. System porównuje Twoją decyzję z rekomendacją scoringu.",
  },
  {
    term: GLOSSARY_TERM_PL.actionCenter,
    text: "Lista pilnych działań na dziś — terminy, alerty strategiczne i rekomendowane kroki uporządkowane według priorytetu.",
  },
  {
    term: GLOSSARY_TERM_PL.morningBriefing,
    text: "Codzienny raport właściciela: powitanie, priorytet dnia, ryzyko, finanse, najlepsza okazja i wniosek z profilu decyzyjnego.",
  },
  {
    term: GLOSSARY_TERM_PL.aiInsights,
    text: "Podsumowanie wzorców z historii decyzji — mocne strony, ostrzeżenia i wnioski z pamięci systemu (bez zmiany scoringu).",
  },
  {
    term: GLOSSARY_TERM_PL.ownerProfile,
    text: "Profil decyzyjny właściciela wyliczany z zapisanych decyzji i powodów. Pokazuje tolerancję ryzyka i preferencje wielkości kontraktów.",
  },
  {
    term: GLOSSARY_TERM_PL.learningEngine,
    text: "Mechanizm zapisu powodów decyzji po każdym wyborze. Dane trafiają do pamięci lokalnej i karmią profil oraz Wnioski AI — bez automatycznej zmiany scoringu.",
  },
] as const;

export function CommandCenterGlossary() {
  return (
    <div className="space-y-2">
      {GLOSSARY.map((item) => (
        <details
          key={item.term}
          className="group rounded-xl border border-border bg-secondary/15 px-3 py-2 open:bg-secondary/25"
        >
          <summary className="cursor-pointer text-sm font-semibold py-1 list-none flex items-center justify-between gap-2">
            <span>{item.term}</span>
            <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">
              ▾
            </span>
          </summary>
          <p className="text-xs text-muted-foreground leading-relaxed pb-2 pt-1">{item.text}</p>
        </details>
      ))}
    </div>
  );
}
