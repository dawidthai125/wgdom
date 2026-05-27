import { useMemo, useState } from "react";
import { X, Send, MessageSquare, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { normalizePhoneE164, normalizePhone9 } from "@/lib/phone-normalize";

export type SmsDirectoryEmployee = {
  id: string;
  name: string;
  phone: string;
  position: string;
  active: boolean;
  testAccount?: boolean;
};

function isSmsEligible(emp: SmsDirectoryEmployee): boolean {
  if (emp.testAccount) return false;
  if (!emp.active) return false;
  return normalizePhone9(emp.phone) !== null;
}

function smsSegments(text: string): number {
  const len = text.length;
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

export function EmployeeSmsModal({
  open,
  onClose,
  directory,
}: {
  open: boolean;
  onClose: () => void;
  directory: SmsDirectoryEmployee[];
}) {
  const eligible = useMemo(() => directory.filter(isSmsEligible), [directory]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  const recipients = useMemo(() => {
    if (selected.size === 0) return eligible;
    return eligible.filter((e) => selected.has(e.id));
  }, [eligible, selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.size === 0) {
        return new Set(eligible.filter((e) => e.id !== id).map((e) => e.id));
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isChecked = (id: string) => selected.size === 0 || selected.has(id);

  const selectAll = () => setSelected(new Set(eligible.map((e) => e.id)));
  const selectNone = () => setSelected(new Set());

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      setError("Wpisz treść wiadomości");
      return;
    }
    if (recipients.length === 0) {
      setError("Brak odbiorców z poprawnym numerem telefonu");
      return;
    }
    if (!API_BASE) {
      setError("Backend nie skonfigurowany (Supabase)");
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    try {
      const phones = recipients
        .map((e) => normalizePhoneE164(e.phone))
        .filter((p): p is string => !!p);
      const res = await fetch(`${API_BASE}/send-sms-bulk`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          message: text,
          phones,
          labels: recipients.map((e) => e.name),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        sent?: number;
        failed?: number;
        errors?: string[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Wysyłka nie powiodła się");
        return;
      }
      setResult({
        sent: data.sent ?? phones.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      });
      setMessage("");
      setSelected(new Set());
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const segments = smsSegments(message.trim());

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={18} className="text-primary shrink-0"/>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">SMS do pracowników</h2>
              <p className="text-[11px] text-muted-foreground">Pilne ogłoszenia — wszyscy lub wybrani</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary shrink-0" aria-label="Zamknij">
            <X size={16}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5"/>
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Wysłano {result.sent} SMS</p>
                  {result.failed > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Nie udało się: {result.failed}</p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => { setResult(null); onClose(); }} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                Zamknij
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Treść</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={640}
                  placeholder="Np. Jutro praca od 6:00 — ul. Przykładowa 5. Proszę o potwierdzenie."
                  className="mt-1.5 w-full bg-secondary rounded-xl px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {message.trim().length}/640 znaków
                  {segments > 0 && ` · ~${segments} SMS na odbiorcę`}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Users size={12}/> Odbiorcy ({recipients.length})
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">Wszyscy aktywni</button>
                    <button type="button" onClick={selectNone} className="text-[10px] text-muted-foreground hover:underline">Wyczyść wybór</button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {selected.size === 0
                    ? "Nie zaznaczono nikogo — wyśle do wszystkich aktywnych z numerem telefonu."
                    : `Wybrano ${selected.size} z ${eligible.length} osób.`}
                </p>
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {eligible.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">Brak aktywnych pracowników z numerem telefonu w kartotece.</p>
                  ) : (
                    eligible.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/50">
                        <input
                          type="checkbox"
                          checked={isChecked(emp.id)}
                          onChange={() => toggle(emp.id)}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{emp.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.position || "—"} · {emp.phone}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Wymaga konfiguracji SMSAPI lub Twilio w Supabase (sekrety). Używaj tylko do pilnych komunikatów — koszt zależy od operatora.
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </>
          )}
        </div>

        {!result && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={busy || !message.trim() || recipients.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Send size={14}/>
              {busy ? "Wysyłanie…" : `Wyślij (${recipients.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
