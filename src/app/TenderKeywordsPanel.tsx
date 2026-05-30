import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronDown, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  type TendersCustomKeywords,
  defaultCustomKeywords,
  loadCustomKeywords,
  saveCustomKeywords,
} from "@/lib/tenders-bzp-learn";
import {
  TENDER_ACTION_KEYWORDS,
  TENDER_SCOPE_KEYWORDS,
  TENDER_EXCLUDE_KEYWORDS,
} from "@/lib/tenders-bzp-keywords";

const BASE_ACTION = TENDER_ACTION_KEYWORDS.join("\n");
const BASE_SCOPE = TENDER_SCOPE_KEYWORDS.join("\n");
const BASE_EXCLUDE = TENDER_EXCLUDE_KEYWORDS.join("\n");
const BASE_TOTAL = TENDER_ACTION_KEYWORDS.length + TENDER_SCOPE_KEYWORDS.length + TENDER_EXCLUDE_KEYWORDS.length;

function WordsEditor({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground col-span-full">
      {label}
      {hint && <span className="block font-normal opacity-80">{hint}</span>}
      <textarea
        rows={4}
        placeholder={placeholder}
        value={value.join("\n")}
        onChange={(e) => onChange(
          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
        )}
        className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono placeholder:text-muted-foreground/50"
      />
    </label>
  );
}

function BaseDictionaryPreview() {
  const [showBase, setShowBase] = useState(false);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowBase((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-medium hover:bg-secondary/50"
      >
        <span>
          Wbudowany słownik ({BASE_TOTAL} słów) — remonty, elewacje, wykluczenia drogi/mosty…
        </span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${showBase ? "rotate-180" : ""}`} />
      </button>
      {showBase && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/40">
          <p className="text-[10px] text-muted-foreground pt-2">
            Ten słownik jest już w aplikacji — nie trzeba go wpisywać. Służy do oceny trafności ogłoszeń BZP
            (filtr „Do zgłoszenia”, punktacja relevance). Poniżej tylko podgląd.
          </p>
          <label className="block text-[10px] text-muted-foreground">
            Action ({TENDER_ACTION_KEYWORDS.length})
            <textarea
              readOnly
              rows={3}
              value={BASE_ACTION}
              className="mt-0.5 w-full bg-background/60 rounded-lg px-2 py-1.5 text-[10px] border border-border font-mono opacity-90"
            />
          </label>
          <label className="block text-[10px] text-muted-foreground">
            Scope ({TENDER_SCOPE_KEYWORDS.length})
            <textarea
              readOnly
              rows={3}
              value={BASE_SCOPE}
              className="mt-0.5 w-full bg-background/60 rounded-lg px-2 py-1.5 text-[10px] border border-border font-mono opacity-90"
            />
          </label>
          <label className="block text-[10px] text-muted-foreground">
            Exclude ({TENDER_EXCLUDE_KEYWORDS.length})
            <textarea
              readOnly
              rows={2}
              value={BASE_EXCLUDE}
              className="mt-0.5 w-full bg-background/60 rounded-lg px-2 py-1.5 text-[10px] border border-border font-mono opacity-90"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function TenderKeywordsPanel({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState<TendersCustomKeywords>(defaultCustomKeywords());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const customCount = kw.action.length + kw.scope.length + kw.exclude.length;

  useEffect(() => {
    let cancelled = false;
    void loadCustomKeywords().then((k) => {
      if (!cancelled) {
        setKw(k);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const next = { ...kw, updatedAt: new Date().toISOString() };
      await saveCustomKeywords(next);
      setKw(next);
      onSaved?.();
      toast.success("Własne słowa kluczowe zapisane w chmurze");
    } catch {
      toast.error("Nie udało się zapisać słownika");
    } finally {
      setSaving(false);
    }
  }, [kw, onSaved]);

  const clearCustom = useCallback(() => {
    setKw({ ...defaultCustomKeywords(), updatedAt: kw.updatedAt });
    toast.message("Wyczyszczono słowa użytkownika — kliknij Zapisz");
  }, [kw.updatedAt]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium bg-secondary/50 hover:bg-secondary/80"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-primary" />
          Słownik słów kluczowych
          <span className="text-[10px] font-normal text-muted-foreground">
            {BASE_TOTAL} wbudowanych · {customCount} własnych
          </span>
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 border-t border-border bg-card/50">
          {loading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Ładowanie…
            </p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Słownik decyduje, które przetargi z BZP są <strong className="font-medium text-foreground">trafne dla W&amp;G DOM</strong>
                (remonty budynków we Wrocławiu, nie drogi/mosty). Wbudowany słownik działa od razu.
                Pola poniżej to <strong className="font-medium text-foreground">Twoje dopiski</strong> — np. nowe branże
                albo słowa z przycisku „Ucz system” przy przetargach oznaczonych jako interesujące.
              </p>
              <BaseDictionaryPreview />
              <p className="text-[10px] font-medium text-foreground">Własne słowa (opcjonalnie)</p>
              <div className="grid grid-cols-1 gap-2">
                <WordsEditor
                  label="Action — remont, modernizacja…"
                  hint="Dopisz czynności, których nie ma w bazie"
                  placeholder="Jedno słowo na linię, np. izolacja"
                  value={kw.action}
                  onChange={(action) => setKw({ ...kw, action })}
                />
                <WordsEditor
                  label="Scope — mieszkania, elewacja…"
                  hint="Dopisz przedmioty / zakresy"
                  placeholder="np. balkon, klatka schodowa"
                  value={kw.scope}
                  onChange={(scope) => setKw({ ...kw, scope })}
                />
                <WordsEditor
                  label="Exclude — wykluczenia (np. drogi, mosty)"
                  hint="Ogłoszenia z tymi słowami dostaną niższą ocenę"
                  placeholder="np. chodnik, wiadukt"
                  value={kw.exclude}
                  onChange={(exclude) => setKw({ ...kw, exclude })}
                />
              </div>
              {customCount === 0 && (
                <p className="text-[10px] text-muted-foreground italic">
                  Brak własnych słów — to normalne na start. Scoring używa {BASE_TOTAL} wbudowanych haseł.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearCustom}
                  disabled={customCount === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 disabled:opacity-40"
                >
                  <Trash2 size={12} />
                  Wyczyść własne
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Zapisz własne
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
