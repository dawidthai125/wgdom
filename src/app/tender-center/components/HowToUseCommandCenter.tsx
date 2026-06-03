const STEPS = [
  {
    n: 1,
    title: "Przeczytaj Morning Briefing",
    detail: "Codzienny raport właściciela — priorytet dnia, ryzyka i finanse w jednym miejscu.",
  },
  {
    n: 2,
    title: "Sprawdź Najlepszą Okazję",
    detail: "Ranking przetargów z Opportunity Score i rekomendacją systemu.",
  },
  {
    n: 3,
    title: "Przeanalizuj wpływ na firmę",
    detail: "Oceń obłożenie, zasoby i wpływ wygranej oferty na operacje (Impact).",
  },
  {
    n: 4,
    title: "Zweryfikuj finanse",
    detail: "Sprawdź wadium, bufor i Financial Capacity przed decyzją.",
  },
  {
    n: 5,
    title: "Podejmij decyzję: GO · HOLD · NO-GO",
    detail: "System będzie analizował Twoje decyzje i budował profil właściciela.",
  },
] as const;

export function HowToUseCommandCenter() {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Pięć kroków od porannego przeglądu do świadomej decyzji przetargowej.
      </p>
      <ol className="space-y-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-3"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold"
              aria-hidden
            >
              {step.n}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold leading-snug">{step.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
        System będzie analizował Twoje decyzje i budował profil właściciela.
      </p>
    </div>
  );
}
