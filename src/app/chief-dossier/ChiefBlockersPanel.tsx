import { AlertTriangle, RefreshCw } from "lucide-react";
import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";

export function ChiefBlockersPanel({ blockersPl }: { blockersPl: string[] }) {
  if (blockersPl.length === 0) return null;
  return (
    <section
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 space-y-1.5"
      data-chief-blockers
    >
      <p className={`${TEUX_SECTION_TITLE} text-red-800 dark:text-red-300 flex items-center gap-1.5`}>
        <AlertTriangle size={12} />
        Blokery
      </p>
      <ul className="space-y-1">
        {blockersPl.map((msg) => (
          <li key={msg} className={`${TEUX_FONT_BODY} text-red-800 dark:text-red-300`}>
            {msg}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ChiefLoopReturnBadge({
  loopCount,
  returnToMaterialExpert,
  requiresReanalysis,
  orchestrationNotesPl,
}: Pick<
  ChiefDossierViewModel,
  "loopCount" | "returnToMaterialExpert" | "requiresReanalysis" | "orchestrationNotesPl"
>) {
  const loopNotes = orchestrationNotesPl.filter((n) => /LOOP|RETURN/i.test(n));
  return (
    <section
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 space-y-1"
      data-chief-loop-return
    >
      <p className={`${TEUX_SECTION_TITLE} text-amber-900 dark:text-amber-200 flex items-center gap-1.5`}>
        <RefreshCw size={12} />
        LOOP / RETURN
      </p>
      <p className={TEUX_FONT_CAPTION}>
        loopCount: <span className="font-mono font-semibold">{loopCount}</span>
        {returnToMaterialExpert ? " · returnToMaterialExpert" : ""}
        {requiresReanalysis ? " · requiresReanalysis" : ""}
      </p>
      {loopNotes.length > 0 && (
        <ul className="space-y-0.5">
          {loopNotes.map((n) => (
            <li key={n} className={`${TEUX_FONT_BODY} text-foreground/90`}>
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
