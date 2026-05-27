import { useRef } from "react";
import { List, ListOrdered, CornerDownRight } from "lucide-react";
import {
  appendListLine,
  continueListOnNewLine,
  insertLinePrefix,
  normalizePastedScopeText,
} from "@/lib/work-scope-text";

type VoiceNoteButtonProps = {
  focusRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  onResult: (text: string) => void;
  hintClassName?: string;
};

export function WorkScopeEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Wpisz wykonane prace — każda linia to osobny punkt. Enter = kolejna linia w tym samym stylu listy.",
  VoiceNoteButton,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  VoiceNoteButton?: React.ComponentType<VoiceNoteButtonProps>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyEdit = (next: string, cursor?: number) => {
    onChange(next);
    if (cursor != null) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    }
  };

  const addPrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) {
      const { value: v, cursor } = appendListLine(value, prefix);
      applyEdit(v, cursor);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end && value.slice(0, start).trim() === "" && value.slice(start).trim() === "") {
      const { value: v, cursor } = appendListLine("", prefix);
      applyEdit(v, cursor);
      return;
    }
    const { value: v, cursor } = insertLinePrefix(value, start, prefix);
    applyEdit(v, cursor);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const plain = e.clipboardData.getData("text/plain");
    if (!plain) return;
    e.preventDefault();
    const normalized = normalizePastedScopeText(plain);
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + normalized + value.slice(end);
    applyEdit(next, start + normalized.length);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const el = e.currentTarget;
    const continued = continueListOnNewLine(value, el.selectionStart);
    if (!continued) return;
    e.preventDefault();
    applyEdit(continued.value, continued.cursor);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground mr-1">Lista:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => addPrefix("• ")}
          title="Punkt (kropka)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
        >
          <List size={13}/>
          Kropka
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => addPrefix("1. ")}
          title="Numeracja"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
        >
          <ListOrdered size={13}/>
          Numer
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => addPrefix("→ ")}
          title="Podpunkt (strzałka)"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
        >
          <CornerDownRight size={13}/>
          Podpunkt
        </button>
      </div>
      <div className="flex gap-2 items-start">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          rows={6}
          placeholder={placeholder}
          className="flex-1 bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-y min-h-[8rem] leading-relaxed font-[inherit] whitespace-pre-wrap"
        />
        {VoiceNoteButton && (
          <VoiceNoteButton
            focusRef={textareaRef}
            hintClassName="sm:max-w-[280px]"
            onResult={(text) => onChange(value ? `${value.trimEnd()}\n${text}` : text)}
          />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Możesz też napisać w Notatkach / Wordzie i wkleić (Ctrl+V) — układ i enter zostają. Enter kontynuuje listę; Shift+Enter = zwykła nowa linia.
      </p>
    </div>
  );
}

export function WorkScopeDisplay({ text, className = "" }: { text: string; className?: string }) {
  if (!text.trim()) return null;
  return (
    <pre className={`text-sm whitespace-pre-wrap font-[inherit] leading-relaxed ${className}`}>
      {text.trimEnd()}
    </pre>
  );
}
