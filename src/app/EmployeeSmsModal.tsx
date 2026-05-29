import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Send, MessageSquare, Users, AlertTriangle, CheckCircle2, Shield, HardHat, History, Clock } from "lucide-react";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { normalizePhoneE164, normalizePhone9 } from "@/lib/phone-normalize";
import { adminRoleLabel, listAdminUsersForManagement, type AdminSession } from "@/lib/admin-auth";

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

export type SmsHistoryEntry = {
  id: string;
  at: string;
  senderLogin: string;
  senderName: string;
  senderRole?: string;
  message: string;
  fromField?: string;
  recipients: { name: string; phone: string; ok: boolean; error?: string }[];
  sent: number;
  failed: number;
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

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export function EmployeeSmsModal({
  open,
  onClose,
  directory,
  sender,
}: {
  open: boolean;
  onClose: () => void;
  directory: SmsDirectoryEmployee[];
  sender: AdminSession | null;
}) {
  const eligible = useMemo(() => buildRecipients(directory), [directory]);
  const employees = useMemo(() => eligible.filter((r) => r.group === "employee"), [eligible]);
  const team = useMemo(() => eligible.filter((r) => r.group === "team"), [eligible]);

  const [tab, setTab] = useState<"send" | "history">("send");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[]; fromField?: string } | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SmsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [smsStatus, setSmsStatus] = useState<{
    loading: boolean;
    configured: boolean;
    provider: "smsapi" | "twilio" | "none";
    restricted: boolean;
    points?: number;
    registrationPhone?: string;
    statusError?: string;
    sendernames?: { sender: string; status: string; is_default?: boolean }[];
  }>({ loading: true, configured: false, provider: "none", restricted: false });
  const [ensureBusy, setEnsureBusy] = useState(false);
  const [ensureNote, setEnsureNote] = useState("");

  const loadHistory = useCallback(async () => {
    if (!API_BASE) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch(`${API_BASE}/sms-history?limit=80`, { headers: API_HEADERS });
      const data = (await res.json()) as { ok?: boolean; entries?: SmsHistoryEntry[]; error?: string };
      if (!res.ok || !data.ok) {
        setHistoryError(data.error || "Nie udało się pobrać historii SMS");
        return;
      }
      setHistory(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setHistoryError("Błąd połączenia — historia niedostępna");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab("send");
    setSelected(new Set(eligible.map((r) => r.id)));
    setMessage("");
    setError("");
    setResult(null);
    setSmsStatus((s) => ({ ...s, loading: true }));
    void loadHistory();
    if (!API_BASE) {
      setSmsStatus({ loading: false, configured: false, provider: "none", restricted: false, statusError: "Brak backendu" });
      return;
    }
    fetch(`${API_BASE}/sms-status`, { headers: API_HEADERS })
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          configured?: boolean;
          provider?: "smsapi" | "twilio" | "none";
          restricted?: boolean;
          points?: number;
          registrationPhone?: string;
          error?: string;
          sendernames?: { sender: string; status: string; is_default?: boolean }[];
        };
        if (!res.ok || data.ok === false) {
          setSmsStatus({
            loading: false,
            configured: Boolean(data.configured),
            provider: data.provider || "none",
            restricted: false,
            statusError: data.error || "Nie udało się sprawdzić statusu SMS",
          });
          return;
        }
        setSmsStatus({
          loading: false,
          configured: Boolean(data.configured),
          provider: data.provider || "none",
          restricted: Boolean(data.restricted),
          points: data.points,
          registrationPhone: data.registrationPhone,
          sendernames: data.sendernames,
        });
      })
      .catch(() => {
        setSmsStatus({
          loading: false,
          configured: false,
          provider: "none",
          restricted: false,
          statusError: "Błąd połączenia — status SMS nieznany",
        });
      });
  }, [open, eligible, loadHistory]);

  const recipients = useMemo(
    () => uniqueByPhone(eligible.filter((r) => selected.has(r.id))),
    [eligible, selected],
  );

  const senderLabel = sender?.displayName?.trim() || "Administrator";

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

  const handleEnsureSenders = async () => {
    if (!API_BASE) return;
    setEnsureBusy(true);
    setEnsureNote("");
    try {
      const res = await fetch(`${API_BASE}/sms-sendernames/ensure`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ senderName: senderLabel }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        results?: { sender: string; status: string; action: string; error?: string }[];
        sendernames?: { sender: string; status: string; is_default?: boolean }[];
        active?: string[];
      };
      if (!res.ok || !data.ok) {
        setEnsureNote(data.error || "Nie udało się zarejestrować nazw nadawców");
        return;
      }
      if (data.sendernames) {
        setSmsStatus((s) => ({ ...s, sendernames: data.sendernames }));
      }
      const added = data.results?.filter((r) => r.action === "added") ?? [];
      const pending = data.results?.filter((r) => r.status === "INACTIVE") ?? [];
      const active = data.active ?? [];
      if (added.length > 0) {
        setEnsureNote(
          `Zgłoszono do SMSAPI: ${added.map((r) => r.sender).join(", ")}. `
          + "Status INACTIVE = czeka na akceptację SMSAPI (zwykle do 1 dnia roboczego).",
        );
      } else if (active.length > 0) {
        setEnsureNote(`Aktywne nazwy nadawców: ${active.join(", ")}`);
      } else if (pending.length > 0) {
        setEnsureNote(`Oczekuje na akceptację SMSAPI: ${pending.map((r) => r.sender).join(", ")}`);
      } else {
        setEnsureNote("Sprawdzono nazwy nadawców w SMSAPI.");
      }
    } catch {
      setEnsureNote("Błąd połączenia przy rejestracji nadawców");
    } finally {
      setEnsureBusy(false);
    }
  };

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
      const payloadRecipients = recipients
        .map((e) => {
          const phone = normalizePhoneE164(e.phone);
          return phone ? { name: e.name, phone } : null;
        })
        .filter((r): r is { name: string; phone: string } => !!r);

      const res = await fetch(`${API_BASE}/send-sms-bulk`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          message: text,
          recipients: payloadRecipients,
          senderLogin: sender?.login || "",
          senderName: senderLabel,
          senderRole: sender?.role,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        sent?: number;
        failed?: number;
        errors?: string[];
        fromField?: string;
      };
      if (!res.ok || !data.ok) {
        const detail = data.errors?.length
          ? data.errors.join("\n")
          : data.error || "Wysyłka nie powiodła się";
        setError(detail);
        return;
      }
      setResult({
        sent: data.sent ?? payloadRecipients.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
        fromField: data.fromField,
      });
      if ((data.failed ?? 0) > 0 && data.errors?.length) {
        setError(`Wysłano ${data.sent ?? 0}, nie udało się ${data.failed}: ${data.errors.slice(0, 3).join(" · ")}`);
      }
      setMessage("");
      setSelected(new Set(eligible.map((r) => r.id)));
      void loadHistory();
    } catch {
      setError("Błąd połączenia z serwerem");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const segments = smsSegments(message.trim());
  const previewPrefix = `W&G - ${senderLabel}:`;

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
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={18} className="text-primary shrink-0"/>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">SMS pilne</h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Nadawca: <span className="text-foreground/90 font-medium">{senderLabel}</span>
                {sender?.role ? ` · ${adminRoleLabel(sender.role)}` : ""}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-secondary shrink-0" aria-label="Zamknij">
            <X size={16}/>
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setTab("send")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 ${tab === "send" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <Send size={13}/> Wyślij
          </button>
          <button
            type="button"
            onClick={() => { setTab("history"); void loadHistory(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 ${tab === "history" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <History size={13}/> Historia {history.length > 0 ? `(${history.length})` : ""}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === "history" ? (
            <>
              {historyLoading && (
                <p className="text-sm text-muted-foreground text-center py-8">Ładuję historię…</p>
              )}
              {!historyLoading && historyError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{historyError}</p>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Brak wysłanych SMS w historii.</p>
              )}
              {!historyLoading && history.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {entry.senderName}
                        {entry.senderRole ? (
                          <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                            ({adminRoleLabel(entry.senderRole as import("@/lib/admin-auth").AdminRole)})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock size={10}/>
                        {fmtDateTime(entry.at)}
                        {entry.fromField ? ` · nadawca SMS: ${entry.fromField}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-600 shrink-0">
                      {entry.sent} wysł.
                      {entry.failed > 0 ? ` · ${entry.failed} bł.` : ""}
                    </span>
                  </div>
                  <p className="text-xs bg-secondary/50 rounded-lg px-2.5 py-2 whitespace-pre-wrap">{entry.message}</p>
                  <div className="text-[10px] text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                    {entry.recipients.map((r, i) => (
                      <p key={i} className={r.ok ? "" : "text-destructive"}>
                        {r.ok ? "✓" : "✗"} {r.name} · {r.phone}
                        {!r.ok && r.error ? ` — ${r.error.slice(0, 60)}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : result ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5"/>
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">Wysłano {result.sent} SMS jako {senderLabel}</p>
                  {result.fromField && (
                    <p className="text-xs text-muted-foreground mt-1">Pole nadawcy SMS: {result.fromField}</p>
                  )}
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
              <div className="bg-secondary/40 rounded-xl px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed space-y-2">
                <p>
                  Treść SMS zacznie się od <strong className="text-foreground/90">{previewPrefix}</strong> — odbiorca zobaczy kto wysłał.
                  Pole nadawcy na telefonie (np. <em>W&G-Dawid</em>, max 11 znaków) rejestrujemy automatycznie przez API SMSAPI.
                </p>
                {smsStatus.sendernames && smsStatus.sendernames.length > 0 && (
                  <div className="text-[10px] space-y-0.5 pt-1 border-t border-border/50">
                    <p className="font-medium text-foreground/80">Nazwy nadawców w SMSAPI:</p>
                    {smsStatus.sendernames.map((s) => (
                      <p key={s.sender}>
                        <span className={s.status === "ACTIVE" ? "text-emerald-600 font-medium" : "text-amber-600"}>
                          {s.status === "ACTIVE" ? "✓" : "⏳"} {s.sender}
                        </span>
                        <span className="text-muted-foreground"> — {s.status}{s.is_default ? " · domyślna" : ""}</span>
                      </p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  disabled={ensureBusy || !smsStatus.configured || smsStatus.provider !== "smsapi"}
                  onClick={() => void handleEnsureSenders()}
                  className="text-[10px] font-medium text-primary hover:underline disabled:opacity-40"
                >
                  {ensureBusy ? "Rejestruję w SMSAPI…" : "Zarejestruj / odśwież nazwy nadawców (API SMSAPI)"}
                </button>
                {ensureNote && <p className="text-[10px] text-foreground/80">{ensureNote}</p>}
              </div>

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
                  {message.trim().length}/640 znaków (+ prefiks nadawcy)
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
                <div className="max-h-56 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {eligible.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center leading-relaxed">
                      Brak numerów telefonu. Uzupełnij kartotekę pracowników oraz numery w ⚙ Super Admin przy kontach użytkowników.
                    </p>
                  ) : (
                    <>
                      {renderGroup("Pracownicy", Hardhat, employees)}
                      {renderGroup("Zespół — admin, moderator, inspektor", Shield, team)}
                    </>
                  )}
                </div>
              </div>

              {!smsStatus.loading && smsStatus.configured && smsStatus.provider === "smsapi" && !smsStatus.restricted && (
                <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5"/>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground/90">SMSAPI aktywne</strong>
                    {typeof smsStatus.points === "number" && (
                      <> · saldo <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{smsStatus.points.toFixed(2)}</span> pkt</>
                    )}
                  </p>
                </div>
              )}

              {!smsStatus.loading && smsStatus.configured && smsStatus.provider === "smsapi" && smsStatus.restricted && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5"/>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground/90">Konto SMSAPI ograniczone</strong> — SMS można wysłać tylko na numer z rejestracji
                    {smsStatus.registrationPhone ? ` (${smsStatus.registrationPhone})` : ""}.
                  </p>
                </div>
              )}

              {!smsStatus.loading && !smsStatus.configured && (
                <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={14} className="text-blue-500 shrink-0 mt-0.5"/>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    SMS nie skonfigurowany — ustaw <strong className="text-foreground/90">SMSAPI_TOKEN</strong> w Supabase Secrets.
                  </p>
                </div>
              )}

              {smsStatus.statusError && !smsStatus.loading && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  {smsStatus.statusError}
                </p>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 whitespace-pre-wrap">{error}</p>
              )}
            </>
          )}
        </div>

        {tab === "send" && !result && (
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
