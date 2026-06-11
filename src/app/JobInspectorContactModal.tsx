import { useCallback, useEffect, useMemo, useState } from "react";
import { X, MessageSquare, Send, Loader2, ChevronDown } from "lucide-react";
import type { Job } from "@/app/app-domain";
import {
  contactsForInspector,
  contactIsDefaultInspector,
  resolveDefaultInspectorContact,
  type EmailContact,
} from "@/lib/email-contacts";
import {
  INSPECTOR_TEMPLATE_IDS,
  INSPECTOR_TEMPLATE_META,
  suggestInspectorTemplate,
  mergeInspectorTemplateBody,
  inspectorTemplateSubject,
  buildInspectorReadyMissingBlock,
  buildInspectorTemplateEmailPayload,
  inspectorTemplateEmailHasContent,
  type InspectorTemplateId,
} from "@/lib/inspector-message-templates";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { jobDisplayTitle } from "@/app/app-domain";

export function JobInspectorContactModal({
  job,
  contacts,
  senderName,
  onClose,
  onManageContacts,
  onSent,
}: {
  job: Job;
  contacts: EmailContact[];
  senderName: string;
  onClose: () => void;
  onManageContacts: () => void;
  onSent?: (templateId: InspectorTemplateId, recipientEmail: string) => void;
}) {
  const inspectorContacts = useMemo(() => contactsForInspector(contacts), [contacts]);
  const defaultContact = useMemo(() => resolveDefaultInspectorContact(contacts), [contacts]);
  const suggested = useMemo(() => suggestInspectorTemplate(job), [job]);
  const readyMissing = useMemo(() => buildInspectorReadyMissingBlock(job), [job]);

  const [templateId, setTemplateId] = useState<InspectorTemplateId>(suggested);
  const [contactId, setContactId] = useState("");
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [subject, setSubject] = useState(() => inspectorTemplateSubject(suggested, job));
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);

  const selectedContact = inspectorContacts.find((c) => c.id === contactId) || null;
  const recipientEmail = selectedContact?.email.trim() || "";
  const isTestRecipient = Boolean(
    defaultContact && selectedContact && selectedContact.id !== defaultContact.id,
  );

  const applyTemplate = useCallback(
    (id: InspectorTemplateId, contactName: string) => {
      setSubject(inspectorTemplateSubject(id, job));
      setBody(
        mergeInspectorTemplateBody(id, job, {
          contactName: contactName,
          senderName,
        }),
      );
    },
    [job, senderName],
  );

  useEffect(() => {
    const def = resolveDefaultInspectorContact(contacts);
    setContactId(def?.id ?? "");
    setShowRecipientPicker(!def);
    setBodyTouched(false);
  }, [job.id, contacts]);

  useEffect(() => {
    if (!bodyTouched) {
      applyTemplate(templateId, selectedContact?.name || "");
    }
  }, [templateId, selectedContact?.name, applyTemplate, bodyTouched]);

  useEffect(() => {
    setTemplateId(suggested);
    setBodyTouched(false);
  }, [job.id, suggested]);

  const handleTemplateChange = (id: InspectorTemplateId) => {
    if (bodyTouched && id !== templateId) {
      const ok = window.confirm("Zmienić szablon? Ręczne zmiany w treści zostaną nadpisane.");
      if (!ok) return;
      setBodyTouched(false);
    }
    setTemplateId(id);
  };

  const handleSend = async () => {
    setError("");
    if (!recipientEmail) {
      setError("Wybierz inspektora z listy kontaktów.");
      return;
    }
    if (!inspectorTemplateEmailHasContent(body)) {
      setError("Treść wiadomości jest za krótka.");
      return;
    }

    setSending(true);
    try {
      const payload = buildInspectorTemplateEmailPayload(
        job,
        templateId,
        recipientEmail,
        selectedContact?.name || "",
        subject,
        body,
      );
      const res = await fetch(`${API_BASE}/send-job-email`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Błąd wysyłki (${res.status})`);
      }
      setSuccess(true);
      onSent?.(templateId, recipientEmail);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać wiadomości.");
    } finally {
      setSending(false);
    }
  };

  if (inspectorContacts.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70" onClick={onClose}>
        <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-md shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare size={15} className="text-primary" />
                Kontakt z inspektorem
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Brak kontaktu oznaczonego jako inspektor. Dodaj w Kontaktach wpis z emailem inspektora i zaznacz „Inspektor WM”.
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X size={16} /></button>
          </div>
          <button
            type="button"
            onClick={() => { onClose(); onManageContacts(); }}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            Otwórz Kontakty
          </button>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-medium">Anuluj</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70" onClick={onClose}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" />
              Kontakt z inspektorem
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{jobDisplayTitle(job)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary shrink-0"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Odbiorca</label>
            {selectedContact && !showRecipientPicker && (
              <div className="text-sm bg-secondary/50 rounded-lg px-3 py-2.5 space-y-1">
                <p className="font-medium">{selectedContact.name || selectedContact.email}</p>
                <p className="text-xs text-muted-foreground">{selectedContact.email}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Inspektor
                  {contactIsDefaultInspector(selectedContact) ? " · domyślny" : ""}
                </p>
              </div>
            )}
            {inspectorContacts.length > 1 && (
              <button
                type="button"
                onClick={() => setShowRecipientPicker((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ChevronDown size={14} className={`transition-transform ${showRecipientPicker ? "rotate-180" : ""}`} />
                {showRecipientPicker ? "Ukryj listę odbiorców" : "Zmień odbiorcę"}
              </button>
            )}
            {(showRecipientPicker || inspectorContacts.length === 1 || !selectedContact) && (
              <select
                value={contactId}
                onChange={(e) => {
                  setContactId(e.target.value);
                  setBodyTouched(false);
                }}
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
              >
                {!contactId && <option value="">— wybierz inspektora —</option>}
                {inspectorContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} ({c.email})
                    {contactIsDefaultInspector(c) ? " · domyślny" : ""}
                  </option>
                ))}
              </select>
            )}
            {isTestRecipient && selectedContact && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Wysyłka testowa — odbiorca: {selectedContact.name || selectedContact.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Szablon</label>
            <div className="flex flex-wrap gap-1.5">
              {INSPECTOR_TEMPLATE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTemplateChange(id)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                    templateId === id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border hover:bg-secondary/80"
                  }`}
                  title={INSPECTOR_TEMPLATE_META[id].description}
                >
                  {id}
                  {id === suggested ? " ★" : ""}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">{INSPECTOR_TEMPLATE_META[templateId].label}</p>
          </div>

          {(readyMissing.readyLines.length > 0 || readyMissing.missingLines.length > 0) && (
            <div className="text-xs bg-secondary/40 rounded-lg px-3 py-2.5 space-y-1.5">
              {readyMissing.readyLines.length > 0 && (
                <p><span className="text-muted-foreground">Gotowe u nas:</span> {readyMissing.readyLines.join(", ")}</p>
              )}
              {readyMissing.missingLines.length > 0 && (
                <p><span className="text-muted-foreground">Brakuje:</span> {readyMissing.missingLines.join(", ")}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Temat</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Treść wiadomości</label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setBodyTouched(true); }}
              rows={14}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-y font-mono text-[12px] leading-relaxed"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-500">Wysłano — sprawdź skrzynkę inspektora.</p>}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium">Anuluj</button>
          <button
            type="button"
            disabled={sending || !recipientEmail}
            onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? "Wysyłam…" : "Wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}
