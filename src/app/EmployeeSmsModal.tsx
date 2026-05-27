import { useEffect, useMemo, useState } from "react";
import { X, Send, MessageSquare, Users, AlertTriangle, CheckCircle2, Shield, HardHat } from "lucide-react";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { normalizePhoneE164, normalizePhone9 } from "@/lib/phone-normalize";
import { adminRoleLabel, listAdminUsersForManagement } from "@/lib/admin-auth";

export type SmsDirectoryEmployee = {
  id: string;
  name: string;
  phone: string;
  position: string;
  active: boolean;
  testAccount?: boolean;
};

type SmsRecipient = {
  id: string;
  name: string;
  phone: string;
  subtitle: string;
  group: "employee" | "team";
};

function isEmployeeSmsEligible(emp: SmsDirectoryEmployee): boolean {
  if (emp.testAccount) return false;
  if (!emp.active) return false;
  return normalizePhone9(emp.phone) !== null;
}

function buildRecipients(directory: SmsDirectoryEmployee[]): SmsRecipient[] {
  const list: SmsRecipient[] = [];

  for (const emp of directory.filter(isEmployeeSmsEligible)) {
    list.push({
      id: `emp:${emp.id}`,
      name: emp.name || "—",
      phone: emp.phone,
      subtitle: emp.position || "Pracownik",
      group: "employee",
    });
  }

  for (const user of listAdminUsersForManagement()) {
    if (!normalizePhone9(user.phone)) continue;
    list.push({
      id: `admin:${user.id}`,
      name: user.displayName,
      phone: user.phone,
      subtitle: adminRoleLabel(user.role),
      group: "team",
    });
  }

  return list.sort((a, b) => {
    if (a.group !== b.group) return a.group === "employee" ? -1 : 1;
    return a.name.localeCompare(b.name, "pl");
  });
}

function smsSegments(text: string): number {
  const len = text.length;
  if (len === 0) return 0;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

function uniqueByPhone(recipients: SmsRecipient[]): SmsRecipient[] {
  const seen = new Set<string>();
  const out: SmsRecipient[] = [];
  for (const r of recipients) {
    const key = normalizePhone9(r.phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
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
  const eligible = useMemo(() => buildRecipients(directory), [directory]);
  const employees = useMemo(() => eligible.filter((r) => r.group === "employee"), [eligible]);
  const team = useMemo(() => eligible.filter((r) => r.group === "team"), [eligible]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(eligible.map((r) => r.id)));
    setMessage("");
    setError("");
    setResult(null);
  }, [open, eligible]);

  const recipients = useMemo(
    () => uniqueByPhone(eligible.filter((r) => selected.has(r.id))),
    [eligible, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(eligible.map((r) => r.id)));
  const selectNone = () => setSelected(new Set());

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      setError("Wpisz treść wiadomości");
      return;
    }
    if (recipients.length === 0) {
      setError("Zaznacz co najmniej jednego odbiorcę z numerem telefonu");
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
        const detail = data.errors?.length
          ? data.errors.join("\n")
          : data.error || "Wysyłka nie powiodła się";
        setError(detail);
        return;
      }
      setResult({
        sent: data.sent ?? phones.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      });
      if ((data.failed ?? 0) > 0 && data.errors?.length) {
        setError(`Wysłano ${data.sent ?? 0}, nie udało się ${data.failed}: ${data.errors.slice(0, 3).join(" · ")}`);
      }
      setMessage("");
      setSelected(new Set(eligible.map((r) => r.id)));
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const segments = smsSegments(message.trim());

  const renderGroup = (title: string, icon: typeof Users, items: SmsRecipient[]) => {
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 bg-secondary/40 flex items-center gap-1.5">
          <Icon size={11} className="text-primary"/>
          {title} ({items.length})
        </p>
        {items.map((person) => (
          <label key={person.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/50">
            <input
              type="checkbox"
              checked={selected.has(person.id)}
              onChange={() => toggle(person.id)}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{person.name}</p>
              <p className="text-[10px] text-muted-foreground">{person.subtitle} · {person.phone}</p>
            </div>
          </label>
        ))}
      </div>
    );
  };

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
              <h2 className="text-sm font-semibold truncate">SMS pilne</h2>
              <p className="text-[11px] text-muted-foreground">Pracownicy + admin, moderator, inspektor</p>
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
                    <Users size={12}/> Odbiorcy ({recipients.length}{selected.size !== recipients.length ? ` · ${selected.size} zazn.` : ""})
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">Zaznacz wszystkich</button>
                    <button type="button" onClick={selectNone} className="text-[10px] text-muted-foreground hover:underline">Wyczyść wybór</button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">
                  {selected.size === 0
                    ? "Nikt nie zaznaczony — zaznacz odbiorców albo kliknij „Zaznacz wszystkich”."
                    : selected.size === eligible.length
                      ? `Wszyscy z listy (${eligible.length} osób).`
                      : `Wybrano ${selected.size} z ${eligible.length} osób.`}
                </p>
                <div className="max-h-56 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {eligible.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center leading-relaxed">
                      Brak numerów telefonu. Uzupełnij kartotekę pracowników oraz numery w ⚙ Super Admin przy kontach użytkowników.
                    </p>
                  ) : (
                    <>
                      {renderGroup("Pracownicy", HardHat, employees)}
                      {renderGroup("Zespół — admin, moderator, inspektor", Shield, team)}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground/90">Nowe konto SMSAPI</strong> wysyła SMS tylko na numer z rejestracji (ten z formularza smsapi.pl).
                  Do wysyłki do całej ekipy: doładuj konto, uzupełnij dane firmy i poczekaj na aktywację w panelu SMSAPI.
                </p>
              </div>

              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Numery inspektorów i adminów ustawiasz w ⚙ Super Admin. Ten sam numer wysyłany jest tylko raz.
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
