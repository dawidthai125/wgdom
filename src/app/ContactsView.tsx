import { useState } from "react";
import {
  Search,
  Plus,
  Mail,
  Send,
  HardHat,
  Receipt,
  Check,
  Edit2,
  Trash2,
} from "lucide-react";
import { StatCard } from "@/app/app-ui";
import { addDeletedContactId } from "@/lib/cloud-sync";
import {
  type EmailContact,
  defaultEmailContact,
  contactsForJobs,
  contactsForPayroll,
  contactAllowsJobs,
  contactAllowsPayroll,
} from "@/lib/email-contacts";

export function ContactsView({ contacts, onChange }: { contacts: EmailContact[]; onChange: (c: EmailContact[]) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q);
  });

  const addContact = () => {
    const c = defaultEmailContact();
    onChange([...contacts, c]);
    setEditId(c.id);
  };

  const update = (updated: EmailContact) => onChange(contacts.map((c) => (c.id === updated.id ? updated : c)));
  const remove = (id: string) => {
    addDeletedContactId(id);
    onChange(contacts.filter((c) => c.id !== id));
  };
  const editContact = contacts.find((c) => c.id === editId) || null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input type="text" placeholder="Szukaj po nazwie, emailu, firmie..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none transition-colors"/>
            </div>
            <button type="button" onClick={addContact} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors ml-auto">
              <Plus size={14}/>Nowy kontakt
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Odbiorcy emaili z aplikacji. Uprawnienia decydują, gdzie kontakt pojawi się na liście wyboru: materiały z robót (zdjęcia, raporty) albo lista płac (PDF/Word).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Kontakty" value={String(contacts.length)} icon={Mail} accent/>
            <StatCard label="Z emailem" value={String(contacts.filter((c) => c.email.trim()).length)} icon={Send}/>
            <StatCard label="Roboty" value={String(contactsForJobs(contacts).length)} icon={HardHat}/>
            <StatCard label="Lista płac" value={String(contactsForPayroll(contacts).length)} icon={Receipt}/>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
                {contacts.length === 0 ? "Brak kontaktów — dodaj pierwszego odbiorcę." : "Brak wyników wyszukiwania."}
              </div>
            )}
            {filtered.map((contact) => (
              <div key={contact.id} className={`bg-card rounded-xl border transition-all ${editId === contact.id ? "border-primary/40" : "border-border"} overflow-hidden`}>
                {editId === contact.id && editContact ? (
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-xs text-muted-foreground block mb-1">Imię i nazwisko / nazwa *</label><input type="text" value={editContact.name} onChange={(e) => update({ ...editContact, name: e.target.value })} placeholder="Jan Kowalski" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Email *</label><input type="email" value={editContact.email} onChange={(e) => update({ ...editContact, email: e.target.value })} placeholder="jan@example.com" className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Firma / rola</label><input type="text" value={editContact.company} onChange={(e) => update({ ...editContact, company: e.target.value })} placeholder="np. Zleceniodawca, Inwestor..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                      <div><label className="text-xs text-muted-foreground block mb-1">Uwagi</label><input type="text" value={editContact.notes} onChange={(e) => update({ ...editContact, notes: e.target.value })} placeholder="Opcjonalnie..." className="w-full bg-secondary rounded-lg px-3 py-2 text-sm border border-transparent focus:border-primary focus:outline-none transition-colors"/></div>
                    </div>
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground font-medium">Uprawnienia wysyłki</p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={contactAllowsJobs(editContact)} onChange={(e) => update({ ...editContact, allowJobs: e.target.checked })} className="rounded"/>
                        Roboty — zdjęcia, raporty, wymiary
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={contactAllowsPayroll(editContact)} onChange={(e) => update({ ...editContact, allowPayroll: e.target.checked })} className="rounded"/>
                        Lista płac — PDF i Word
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button type="button" onClick={() => setEditId(null)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Check size={13}/>Zapisz</button>
                      <button type="button" onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {contact.name ? contact.name[0].toUpperCase() : "@"}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{contact.name || <span className="italic text-muted-foreground">Bez nazwy</span>}</p>
                        <p className="text-xs text-muted-foreground">{contact.company || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        <Mail size={11} className="shrink-0"/>{contact.email || <span className="italic">brak email</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 sm:col-span-2">
                        {contactAllowsJobs(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Roboty</span>
                        )}
                        {contactAllowsPayroll(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Lista płac</span>
                        )}
                        {!contactAllowsJobs(contact) && !contactAllowsPayroll(contact) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Brak uprawnień</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => setEditId(contact.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13}/></button>
                      <button type="button" onClick={() => remove(contact.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
