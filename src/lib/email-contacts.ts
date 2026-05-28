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
