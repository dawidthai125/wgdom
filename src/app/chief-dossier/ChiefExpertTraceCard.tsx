import { TEUX_FONT_BODY, TEUX_FONT_CAPTION, TEUX_SECTION_TITLE } from "@/lib/tender-ux-tokens";
import type { ChiefTraceSlotView } from "@/lib/chief-dossier-ui";
import { chiefDossierIcon } from "./chiefDossierUiTokens";

export function ChiefExpertTraceCard({ slot }: { slot: ChiefTraceSlotView }) {
  const Icon = chiefDossierIcon(slot.iconKey);
  const c = slot.contract;

  if (!c) {
    return (
      <details
        className="rounded-lg border border-border/70 bg-background/50"
        data-chief-trace-role={slot.role}
        data-chief-trace-empty
      >
        <summary className="px-3 py-2 min-h-[40px] cursor-pointer list-none flex items-center gap-2 touch-manipulation">
          <Icon size={14} className="shrink-0 text-muted-foreground" />
          <span className={`${TEUX_FONT_CAPTION} font-semibold`}>{slot.roleLabelPl}</span>
          <span className={`${TEUX_FONT_CAPTION} text-muted-foreground ml-auto`}>
            {slot.emptyLabelPl}
          </span>
        </summary>
      </details>
    );
  }

  return (
    <details
      className="rounded-lg border border-border/70 bg-background/50"
      data-chief-trace-role={slot.role}
      open={slot.defaultOpen}
    >
      <summary className="px-3 py-2 min-h-[40px] cursor-pointer list-none flex items-center gap-2 touch-manipulation">
        <Icon size={14} className="shrink-0 text-primary" />
        <span className={`${TEUX_FONT_CAPTION} font-semibold`}>{slot.roleLabelPl}</span>
        <span className={`${TEUX_FONT_CAPTION} text-muted-foreground ml-auto`}>
          Pewność: {c.pewnoscLabelPl}
        </span>
      </summary>
      <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
        <TraceField label="Co" value={c.co} />
        <TraceField label="Dlaczego" value={c.dlaczego} />
        <TraceField label="Na podstawie czego" value={c.naPodstawieCzego} />
        <TraceField label="Pewność" value={c.pewnoscLabelPl} />
        {c.blokery.length > 0 && (
          <div>
            <p className={`${TEUX_SECTION_TITLE} text-muted-foreground mb-1`}>Blokery</p>
            <ul className="space-y-1">
              {c.blokery.map((b) => (
                <li key={`${b.code}-${b.messagePl}`} className={`${TEUX_FONT_BODY} text-foreground/90`}>
                  {b.messagePl || b.code}
                </li>
              ))}
            </ul>
          </div>
        )}
        <TraceField
          label="Zgodność"
          value={`${c.zgodnoscLabelPl}${c.zgodnoscOpisPl ? ` — ${c.zgodnoscOpisPl}` : ""}`}
        />
      </div>
    </details>
  );
}

function TraceField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div>
      <p className={`${TEUX_SECTION_TITLE} text-muted-foreground mb-0.5`}>{label}</p>
      <p className={`${TEUX_FONT_BODY} text-foreground/90 whitespace-pre-wrap`}>{value}</p>
    </div>
  );
}

export function ChiefExpertTraceList({ slots }: { slots: ChiefTraceSlotView[] }) {
  return (
    <section className="space-y-2" data-chief-trace-list>
      <p className={TEUX_SECTION_TITLE}>Trace ekspertów</p>
      <div className="space-y-2">
        {slots.map((slot) => (
          <ChiefExpertTraceCard key={slot.role} slot={slot} />
        ))}
      </div>
    </section>
  );
}
