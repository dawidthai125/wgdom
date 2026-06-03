import { COMMAND_CENTER_BRAND } from "@/app/tender-center/branding";

const CAPABILITIES = [
  "analizę przetargów",
  "planowanie zasobów",
  "analizę finansową",
  "analizę ryzyka",
  "historię decyzji właściciela",
] as const;

export function AboutCommandCenter() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">O COMMAND CENTER AI</h3>
        <p className="text-muted-foreground">{COMMAND_CENTER_BRAND.authorLine}</p>
        <p className="font-medium italic">{COMMAND_CENTER_BRAND.authorName}</p>
      </div>
      <p>
        Autorski system wspomagania decyzji stworzony dla W&G DOM.
      </p>
      <div>
        <p className="font-medium text-foreground mb-2">Łączy:</p>
        <ul className="space-y-1.5">
          {CAPABILITIES.map((item) => (
            <li key={item} className="flex gap-2 text-muted-foreground">
              <span className="text-primary shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="font-medium text-foreground border-l-2 border-primary/35 pl-3">
        System wspiera decyzje, ale nie zastępuje właściciela firmy.
      </p>
    </div>
  );
}
