import { useState } from "react";
import { X, Mail, Send, Loader2 } from "lucide-react";
import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { blobToBase64 } from "@/lib/payroll-export";
import { contactsForJobs, type EmailContact } from "@/lib/email-contacts";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { JOB_FILE_KIND_LABELS } from "@/lib/job-documents";

function itemFilename(item: InspectorFileItem): string {
  if (item.kind === "jobFile") return item.file.filename;
  const ext = item.file.publicUrl.split(".").pop()?.split("?")[0] || "jpg";
  return `inspektor-${item.file.id.slice(0, 8)}.${ext}`;
}

function itemUrl(item: InspectorFileItem): string {
  return item.kind === "jobFile" ? item.file.publicUrl : item.file.publicUrl;
}

function itemLabel(item: InspectorFileItem): string {
  if (item.kind === "jobFile") {
    return JOB_FILE_KIND_LABELS[item.file.kind];
  }
  return "Zdjęcie inspektora";
}

export function JobFilesEmailModal({
  jobId,
  jobAddress,
  jobFlat,
  items,
  contacts,
  onClose,
  onSent,
}: {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  items: InspectorFileItem[];
  contacts: EmailContact[];
  onClose: () => void;
  onSent?: (to: string) => void;
}) {
  const validContacts = contactsForJobs(contacts);
  const [contactId, setContactId] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [subject, setSubject] = useState(
    `W&G DOM — pliki inspektora: ${jobAddress || "Robota"}${jobFlat ? ` m.${jobFlat}` : ""}`,
  );
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const useManual = contactId === "__manual__";
  const selectedContact = validContacts.find((c) => c.id === contactId) || null;
  const recipientEmail = useManual ? manualEmail.trim() : (selectedContact?.email.trim() || "");

  const handleSend = async () => {
    setError("");
    if (!recipientEmail) {
      setError("Wybierz odbiorcę lub wpisz email.");
      return;
    }

    setSending(true);
    try {
      const attachments: { filename: string; content: string }[] = [];
      for (const item of items) {
        const res = await fetch(itemUrl(item));
        if (!res.ok) throw new Error(`Nie udało się pobrać: ${itemFilename(item)}`);
        const blob = await res.blob();
        attachments.push({
          filename: itemFilename(item),
          content: await blobToBase64(blob),
        });
      }

      const fileList = items.map((i) => `${itemLabel(i)}: ${itemFilename(i)}`).join("\n");
      const html = `
        <p>Pliki inspektora z roboty <strong>${jobAddress || "—"}${jobFlat ? ` m.${jobFlat}` : ""}</strong>.</p>
        ${note.trim() ? `<p>${note.replace(/\n/g, "<br/>")}</p>` : ""}
        <p style="font-size:12px;color:#666">Załączniki (${attachments.length}):<br/>${fileList.replace(/\n/g, "<br/>")}</p>
      `;

      const res = await fetch(`${API_BASE}/send-job-files-email`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          to: recipientEmail,
          toName: selectedContact?.name || "",
          subject: subject.trim() || "W&G DOM — pliki inspektora",
          html,
          attachments,
          jobId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Błąd wysyłki (${res.status})`);
      }
      setSuccess(true);
      onSent?.(recipientEmail);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wysłać emaila.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70" onClick={onClose}>
      <div className="bg-card rounded-t-2xl md:rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2"><Mail size={15} className="text-primary"/>Wyślij pliki emailem</p>
            <p className="text-xs text-muted-foreground mt-0.5">{items.length} załącznik(ów)</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ul className="text-xs text-muted-foreground space-y-1 bg-secondary/30 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">
            {items.map((item) => (
              <li key={item.kind === "jobFile" ? item.file.id : item.file.id}>
                {itemLabel(item)} — {itemFilename(item)}
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Odbiorca</label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            >
              <option value="">— wybierz kontakt —</option>
              {validContacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
              ))}
              <option value="__manual__">Inny adres…</option>
            </select>
            {useManual && (
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Temat</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Wiadomość (opcjonalnie)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm border border-transparent focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-500">Wysłano — sprawdź skrzynkę.</p>}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium">Anuluj</button>
          <button
            type="button"
            disabled={sending || !recipientEmail}
            onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            {sending ? "Wysyłam…" : "Wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}
