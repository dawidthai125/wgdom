/** Kontakt email — odbiorcy materiałów z robót i/lub listy płac */
export interface EmailContact {
  id: string;
  name: string;
  email: string;
  company: string;
  notes: string;
  /** Email z roboty (zdjęcia, raporty) — domyślnie tak dla starych kontaktów */
  allowJobs?: boolean;
  /** Email z listą płac (PDF/Word) */
  allowPayroll?: boolean;
  /** Domyślny odbiorca „Kontakt z inspektorem” (Roboty 2.1) */
  isInspector?: boolean;
  /** Domyślny odbiorca inspektora w modalu (2.1.1) — wymaga isInspector */
  isDefaultInspector?: boolean;
  updatedAt?: string;
}

export function defaultEmailContact(): EmailContact {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
    company: "",
    notes: "",
    allowJobs: true,
    allowPayroll: false,
  };
}

/** Stare kontakty bez pól uprawnień — traktuj jako tylko roboty. */
export function contactAllowsJobs(c: EmailContact): boolean {
  return c.allowJobs !== false;
}

export function contactAllowsPayroll(c: EmailContact): boolean {
  return c.allowPayroll === true;
}

export function contactsForJobs(contacts: EmailContact[]): EmailContact[] {
  return contacts.filter((c) => c.email.trim() && contactAllowsJobs(c));
}

export function contactsForPayroll(contacts: EmailContact[]): EmailContact[] {
  return contacts.filter((c) => c.email.trim() && contactAllowsPayroll(c));
}

export function contactIsInspector(c: EmailContact): boolean {
  return c.isInspector === true;
}

/** Kontakty oznaczone jako inspektor WM (email wymagany). */
export function contactsForInspector(contacts: EmailContact[]): EmailContact[] {
  return contacts.filter((c) => c.email.trim() && contactIsInspector(c));
}

export function contactIsDefaultInspector(c: EmailContact): boolean {
  return c.isDefaultInspector === true && contactIsInspector(c);
}

/**
 * Domyślny odbiorca „Kontakt z inspektorem”:
 * 1. jedyny z isDefaultInspector + isInspector
 * 2. fallback: dokładnie jeden isInspector
 * 3. null — brak jednoznacznego domyślnego
 */
export function resolveDefaultInspectorContact(contacts: EmailContact[]): EmailContact | null {
  const pool = contactsForInspector(contacts);
  if (pool.length === 0) return null;
  const marked = pool.filter(contactIsDefaultInspector);
  if (marked.length >= 1) return marked[0];
  if (pool.length === 1) return pool[0];
  return null;
}

/** Ustaw domyślnego inspektora (radio — max jeden w liście). */
export function applyDefaultInspectorContact(contacts: EmailContact[], contactId: string): EmailContact[] {
  return contacts.map((c) => ({
    ...c,
    isDefaultInspector: c.id === contactId && contactIsInspector(c),
  }));
}
