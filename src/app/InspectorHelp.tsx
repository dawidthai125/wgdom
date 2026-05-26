import { useState } from "react";
import {
  HelpCircle, X, BookOpen, List, FileText, ClipboardList, Users, Ruler,
  ImagePlus, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";

/** Dymek pomocy — najedź / dotknij (mobile) */
export function InspectorHint({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  return (
    <span className="relative inline-flex group/hint align-middle ml-1">
      <button
        type="button"
        aria-label={label || "Pomoc"}
        className="p-0.5 rounded-full text-muted-foreground hover:text-primary transition-colors"
      >
        <HelpCircle size={13}/>
      </button>
      <span
        role="tooltip"
        className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+6px)] z-[80] w-max max-w-[min(280px,calc(100vw-2rem))] px-3 py-2 rounded-lg text-[11px] leading-snug text-foreground/95 bg-card border border-border shadow-lg opacity-0 invisible group-hover/hint:opacity-100 group-hover/hint:visible group-focus-within/hint:opacity-100 group-focus-within/hint:visible transition-opacity pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
}

const SECTIONS = [
  {
    id: "start",
    icon: BookOpen,
    title: "Od czego zacząć?",
    body: "Po zalogowaniu widzisz listę robót Wrocławskich Mieszkań. Kliknij robotę — otworzy się szczegóły. U góry możesz wrócić strzałką. Szukaj adresu w polu wyszukiwania.",
  },
  {
    id: "list",
    icon: List,
    title: "Lista robót",
    body: "Filtry: Aktywne (w trakcie), Zdane, Wszystkie. Na karcie widać: czy jest zlecenie, kosztorys, ile dokumentów, ile zdjęć. Zielony ✓ = jest, czerwony — = brakuje.",
  },
  {
    id: "zlecenie",
    icon: FileText,
    title: "Zlecenie PDF",
    body: "Przycisk „Jest / Brak” — oznacz czy wystawiłeś zlecenie (np. wysłałeś mailem). „Wgraj plik” — wrzuć PDF zlecenia, żeby firma też miała kopię. Nie musisz pamiętać — status widać na liście.",
  },
  {
    id: "kosztorys",
    icon: ClipboardList,
    title: "Kosztorys NORMA",
    body: "To samo co zlecenie, ale dla kosztorysu z programu NORMA. Akceptowane: PDF, NOR, XML, DOC. Ikona na liście robót pokaże czy już jest.",
  },
  {
    id: "docs",
    icon: CheckCircle2,
    title: "Pozostałe dokumenty",
    body: "Checklista: zakres, kominiarz, pomiary, oświadczenia itd. Kliknij pole — zaznaczysz że dokument mamy. Wymagane pola podświetlone na żółto. Admin widzi to samo w Robotach.",
  },
  {
    id: "workers",
    icon: Users,
    title: "Pracownicy na robocie",
    body: "Kto pracował na tym adresie — imię, stanowisko, numer telefonu (możesz zadzwonić). Bez stawek i wypłat — tylko kontakt i organizacja.",
  },
  {
    id: "reports",
    icon: Ruler,
    title: "Zakresy i wymiary",
    body: "Raporty od ekipy z budowy: co zrobiono, wymiary pomieszczeń, zdjęcia rysunków. Rozwiń wpis strzałką. To ważne przy odbiorze i kosztorysie.",
  },
  {
    id: "photos",
    icon: ImagePlus,
    title: "Galeria zdjęć",
    body: "Tylko zdjęcia zaakceptowane przez admina. Kliknij miniaturę — powiększenie. Strzałka pobierania — zapisz na telefon. „Pobierz wszystkie” — paczka z całej roboty.",
  },
];

export function InspectorHelpBanner({ onOpenHelp }: { onOpenHelp: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("wg-inspector-help-banner") === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  return (
    <div className="mx-4 mt-3 mb-1 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Pierwszy raz tutaj?</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Instrukcja krok po kroku — co gdzie kliknąć i po co. Przy polach są też dymki <HelpCircle size={10} className="inline -mt-0.5"/>.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenHelp}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-600/90"
        >
          Pokaż instrukcję
        </button>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem("wg-inspector-help-banner", "1"); } catch { /* ignore */ }
            setDismissed(true);
          }}
          className="px-3 py-2 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}

export function InspectorHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openSection, setOpenSection] = useState<string>("start");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl border border-border w-full max-w-lg max-h-[92dvh] flex flex-col shadow-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-600 dark:text-emerald-400"/>
            <span className="text-sm font-semibold">Instrukcja inspektora</span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed pb-2">
            Wrocławskie Mieszkania — remonty pustostanów. Ten panel służy do kontroli dokumentów, zleceń, kosztorysów i zdjęć. Firma W&G DOM widzi Twoje zmiany od razu w zakładce Roboty.
          </p>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isOpen = openSection === s.id;
            return (
              <div key={s.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? "" : s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                >
                  <Icon size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0"/>
                  <span className="text-sm font-medium flex-1">{s.title}</span>
                  {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14} className="text-muted-foreground"/>}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7">{s.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-600/90"
          >
            Rozumiem — zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
