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

function WordsEditor({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block text-[10px] text-muted-foreground col-span-full">
      {label}
      {hint && <span className="block font-normal opacity-80">{hint}</span>}
      <textarea
        rows={4}
        value={value.join("\n")}
        onChange={(e) => onChange(
          e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
        )}
        className="mt-0.5 w-full bg-secondary rounded-lg px-2 py-1.5 text-xs border border-border font-mono"
      />
    </label>
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
      toast.success("Słownik przetargów zapisany w chmurze");
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
            +{kw.action.length + kw.scope.length + kw.exclude.length} własnych
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
                Bazowy słownik: {TENDER_ACTION_KEYWORDS.length} action, {TENDER_SCOPE_KEYWORDS.length} scope,{" "}
                {TENDER_EXCLUDE_KEYWORDS.length} exclude. Poniżej — słowa dopisane ręcznie lub przez „Ucz system”.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <WordsEditor
                  label="Action — remont, modernizacja…"
                  value={kw.action}
                  onChange={(action) => setKw({ ...kw, action })}
                />
                <WordsEditor
                  label="Scope — mieszkania, elewacja…"
                  value={kw.scope}
                  onChange={(scope) => setKw({ ...kw, scope })}
                />
                <WordsEditor
                  label="Exclude — wykluczenia (np. drogi, mosty)"
                  value={kw.exclude}
                  onChange={(exclude) => setKw({ ...kw, exclude })}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearCustom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80"
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
                  Zapisz słownik
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
