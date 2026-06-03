const GLOSSARY = [
  {
    term: "Health Index",
    text: "Skala 0–100 opisująca ogólną kondycję firmy. Łączy obciążenie robót, zasoby ludzkie, pipeline przetargów, referencje i sygnały finansowe. Im wyższy wynik, tym bezpieczniej planować nowe zobowiązania.",
  },
  {
    term: "Opportunity Score",
    text: "Ocena atrakcyjności pojedynczego przetargu (wartość, termin, lokalizacja, SWZ, referencje). Pomaga ustalić, które postępowania warto analizować w pierwszej kolejności.",
  },
  {
    term: "Strategic Score",
    text: "Ocena gotowości operacyjnej firmy do realizacji danego kontraktu. Uwzględnia ludzi, czas, doświadczenie i aktualne obłożenie — niezależnie od samej atrakcyjności przetargu.",
  },
  {
    term: "Impact Score",
    text: "Szacuje wpływ wygrania kontraktu na zasoby, finanse, obłożenie i rozwój firmy. Przydatny przy porównywaniu kilku opcji GO w portfolio.",
  },
  {
    term: "Financial Capacity",
    text: "Odpowiedź na pytanie, czy firmę stać na start w przetargu. Analizuje wadium, bufor finansowy, wielkość kontraktu i bieżące obciążenie kapitałowe.",
  },
  {
    term: "Forecast 90 dni",
    text: "Prognoza obłożenia firmy na 30, 60 i 90 dni (scenariusz wygranych ofert GO). Pomaga wychwycić przestoje, przeciążenie i potrzebę nowych kontraktów lub zatrudnienia.",
  },
  {
    term: "Growth Mode",
    text: "Tryb strategiczny właściciela: Stabilizacja, Wyważony, Wzrost lub Ekspansja. Wpływa na wagi Health Index i rekomendacje systemu bez zmiany danych przetargowych.",
  },
  {
    term: "GO / HOLD / NO-GO",
    text: "Decyzja właściciela wobec przetargu. GO — startuj, HOLD — analizuj dalej, NO-GO — rezygnuj. System porównuje Twoją decyzję z rekomendacją scoringu.",
  },
  {
    term: "Action Center",
    text: "Lista pilnych działań na dziś — terminy, alerty strategiczne i rekomendowane kroki uporządkowane według priorytetu.",
  },
  {
    term: "Morning Briefing",
    text: "Codzienny raport właściciela: powitanie, priorytet dnia, ryzyko, finanse, najlepsza okazja i insight z profilu decyzyjnego.",
  },
  {
    term: "AI Insights",
    text: "Podsumowanie wzorców z historii decyzji — mocne strony, ostrzeżenia i wnioski z pamięci systemu (bez zmiany scoringu).",
  },
  {
    term: "Owner Profile",
    text: "Profil decyzyjny właściciela wyliczany z zapisanych decyzji GO/HOLD/NO-GO i powodów. Pokazuje tolerancję ryzyka i preferencje wielkości kontraktów.",
  },
  {
    term: "Learning Engine",
    text: "Mechanizm zapisu powodów decyzji po każdym wyborze. Dane trafiają do pamięci lokalnej i karmią profil oraz AI Insights — bez automatycznej zmiany scoringu.",
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
