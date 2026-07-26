import { useState, useEffect, useRef, type RefObject, type ElementType, type ReactNode } from "react";
import { HelpCircle, Mic, MicOff } from "lucide-react";
import { fmtH, formatPayrollDayCell, type DayData } from "@/app/app-domain";

export function PayrollDayCellDisplay({ day, accent = "default" }: { day: DayData; accent?: "amber" | "default" }) {
  const text = formatPayrollDayCell(day);
  if (text === "—") return <span className="text-muted-foreground/40">—</span>;
  const parts = text.split("\n");
  const tone = accent === "amber" ? "text-amber-600 dark:text-amber-400" : "text-foreground";
  return (
    <div className={`leading-snug space-y-0.5 ${tone}`}>
      {parts.map((part, i) => (
        <div
          key={i}
          className={`whitespace-nowrap ${i === parts.length - 1 && parts.length > 1 ? "text-[10px] font-semibold opacity-85" : "text-[11px]"}`}
        >
          {part}
        </div>
      ))}
    </div>
  );
}


export function Checkbox({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={checked ? "Odznacz dzień" : "Zaznacz dzień"}
      onClick={()=>onChange(!checked)}
      className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center shrink-0 touch-manipulation rounded-lg sm:rounded-none sm:p-0 ${checked?"":"hover:bg-secondary/50 sm:hover:bg-transparent"}`}
    >
      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked?"bg-primary border-primary":"border-muted-foreground/40"}`}>
        {checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </span>
    </button>
  );
}

export function StatCard({label,value,sub,icon:Icon,accent=false}:{label:string;value:string;sub?:string;icon:ElementType;accent?:boolean}) {
  return <div className={`rounded-xl border p-4 space-y-2 ${accent?"bg-primary/10 border-primary/20":"bg-card border-border"}`}>
    <div className="flex items-center gap-2 text-muted-foreground"><Icon size={13}/><span className="text-xs font-medium uppercase tracking-wider">{label}</span></div>
    <p className={`text-xl font-bold leading-tight ${accent?"text-primary":"text-foreground"}`} style={{fontFamily:"'JetBrains Mono', monospace"}}>{value}</p>
    {sub&&<p className="text-xs text-muted-foreground">{sub}</p>}
  </div>;
}

export function NavItemWithHint({
  hint,
  children,
}: {
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 w-full group/navhint">
      {children}
      {/*
        SIDEBAR-REGRESSION-02: ukryty tooltip MUSI być display:none (nie opacity/visibility),
        inaczej left:100%+w-max powiększa scrollWidth .admin-sidebar-scroll.
        Pozycja: w obrębie szerokości itemu (left-0 right-0), nie poza prawą krawędzią.
        Fade/delay CSS niemożliwy przy display:none — zachowane paint/typography/shadow.
      */}
      <div
        role="tooltip"
        className="absolute left-0 right-0 top-full mt-1 z-[100] hidden group-hover/navhint:block group-focus-within/navhint:block px-3 py-2 rounded-lg text-[11px] leading-snug text-foreground/90 bg-card/95 backdrop-blur-sm border border-border/80 shadow-lg pointer-events-none"
      >
        {hint}
      </div>
    </div>
  );
}

/** Dymek przy polu formularza — używaj przy nowych opcjach w panelu admina. */
export function LabelWithHint({ label, hint, htmlFor }: { label: string; hint: string; htmlFor?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</label>
      ) : (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="relative group/fieldhint shrink-0">
        <HelpCircle size={12} className="text-muted-foreground/55 hover:text-muted-foreground cursor-help" aria-hidden />
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] z-[100] w-max max-w-[260px] px-3 py-2 rounded-lg text-[11px] leading-snug text-foreground/90 bg-card/98 backdrop-blur-sm border border-border/80 shadow-lg opacity-0 invisible group-hover/fieldhint:opacity-100 group-hover/fieldhint:visible transition-all duration-200 pointer-events-none"
        >
          {hint}
        </div>
      </div>
    </div>
  );
}

export type SpeechRecognitionCtor = new() => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: { length: number; [i: number]: { isFinal?: boolean; [i: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function speechRecognitionAvailable(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionCtor | undefined;
}

export function isIosDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function VoiceNoteButton({
  onResult,
  hintClassName,
  focusRef,
}: {
  onResult: (text: string) => void;
  hintClassName?: string;
  focusRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ios = isIosDevice();

  const clearWatchdog = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const cleanupRec = () => {
    clearWatchdog();
    try { recRef.current?.abort(); } catch { /* ignore */ }
    recRef.current = null;
    setListening(false);
  };

  useEffect(() => () => cleanupRec(), []);

  const iosKeyboardHint = "Na iPhone: kliknij 🎤 na klawiaturze przy polu tekstowym — to bezpieczne dyktowanie (przycisk w aplikacji zawiesza Safari).";

  const handleClick = () => {
    if (ios) {
      setHint(iosKeyboardHint);
      focusRef?.current?.focus();
      return;
    }

    const SR = speechRecognitionAvailable();
    if (!SR) {
      setHint("Dyktowanie niedostępne — wpisz tekstem.");
      focusRef?.current?.focus();
      return;
    }

    if (listening) {
      cleanupRec();
      return;
    }

    setHint("");
    const rec = new SR();
    rec.lang = "pl-PL";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
    };

    rec.onend = () => {
      clearWatchdog();
      recRef.current = null;
      setListening(false);
    };

    rec.onerror = (ev) => {
      cleanupRec();
      const code = ev.error;
      if (code === "not-allowed") setHint("Brak dostępu do mikrofonu — zezwól w ustawieniach.");
      else if (code !== "aborted") setHint("Nie udało się nagrać — spróbuj ponownie.");
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
      timeoutRef.current = setTimeout(() => {
        cleanupRec();
        setHint("Koniec czasu nagrywania — spróbuj ponownie.");
      }, 15000);
    } catch {
      cleanupRec();
      setHint("Nie udało się uruchomić nagrywania.");
    }
  };

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        title={ios ? "Dyktuj klawiaturą iPhone (🎤)" : listening ? "Zatrzymaj" : "Dyktuj notatkę głosową"}
        className={`p-1.5 rounded-lg transition-colors shrink-0 touch-manipulation ${listening ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
      >
        {listening ? <MicOff size={14}/> : <Mic size={14}/>}
      </button>
      {hint && (
        <p className={`text-[10px] text-amber-400/90 leading-snug max-w-[220px] text-right ${hintClassName || ""}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

