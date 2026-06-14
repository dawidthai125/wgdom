/** Odbiory WM Druk — typy domeny (szablony, dokumenty robót, ustawienia). */

export type WmPrintTemplateKind = "generated" | "job_upload";
export type WmPrintTemplateType = "docx" | "pdf" | "pdf_form";

export type WmPrintVariableKey =
  | "DATE"
  | "YEAR"
  | "JOB_ADDRESS"
  | "JOB_STREET"
  | "JOB_BUILDING"
  | "JOB_APARTMENT"
  | "JOB_CITY";

export const WM_PRINT_VARIABLE_KEYS: WmPrintVariableKey[] = [
  "DATE",
  "YEAR",
  "JOB_ADDRESS",
  "JOB_STREET",
  "JOB_BUILDING",
  "JOB_APARTMENT",
  "JOB_CITY",
];

export const WM_PRINT_VARIABLE_LABELS: Record<WmPrintVariableKey, string> = {
  DATE: "Data dokumentu",
  YEAR: "Rok",
  JOB_ADDRESS: "Adres pełny",
  JOB_STREET: "Ulica",
  JOB_BUILDING: "Numer budynku",
  JOB_APARTMENT: "Numer lokalu",
  JOB_CITY: "Miasto",
};

/** Pojedynczy plik w grupie szablonów (multi-file group). */
export interface WmPrintTemplateFile {
  id: string;
  storagePath: string;
  storageUrl: string;
  originalFileName: string;
  sortOrder: number;
  uploadedAt: string;
}

export interface WmPrintTemplate {
  id: string;
  name: string;
  kind: WmPrintTemplateKind;
  /** Tylko dla kind=generated */
  type: WmPrintTemplateType;
  enabled: boolean;
  sortOrder: number;
  /** P1.0.1 — wiele plików w grupie */
  files?: WmPrintTemplateFile[];
  /** @deprecated P1 — migrowane do files[] */
  storagePath?: string;
  storageUrl?: string;
  originalFileName?: string;
  /** PDF formularz: nazwa pola → klucz zmiennej (np. Ulica → JOB_STREET) */
  pdfFieldMapping?: Partial<Record<string, WmPrintVariableKey>>;
  createdAt: string;
  updatedAt: string;
}

export interface WmPrintJobDocument {
  id: string;
  jobId: string;
  /** Powiązanie ze slotem job_upload (opcjonalne) */
  templateId?: string;
  name: string;
  storagePath: string;
  storageUrl: string;
  originalFileName: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface WmPrintSettings {
  defaultCity: string;
  zipNameSuffix: string;
}

export const WM_PRINT_TEMPLATES_KEY = "kw-wm-print-templates";
export const WM_PRINT_JOB_DOCS_KEY = "kw-wm-print-job-docs";
export const WM_PRINT_SETTINGS_KEY = "kw-wm-print-settings";
export const WM_PRINT_DELETED_TEMPLATE_IDS_KEY = "kw-wm-print-deleted-template-ids";
export const WM_PRINT_DELETED_JOB_DOC_IDS_KEY = "kw-wm-print-deleted-job-doc-ids";

export const WM_PRINT_BACKUP_KEYS = [
  WM_PRINT_TEMPLATES_KEY,
  WM_PRINT_JOB_DOCS_KEY,
  WM_PRINT_SETTINGS_KEY,
  WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
  WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
] as const;

export type WmPrintDateMode = "today" | "custom";

export interface WmPrintGenerateOptions {
  dateMode: WmPrintDateMode;
  customDate?: Date;
}

export interface WmPrintGeneratedFile {
  fileName: string;
  bytes: Uint8Array;
  mimeType: string;
  templateId?: string;
  templateFileId?: string;
  jobDocId?: string;
  sortOrder: number;
}

export interface WmPrintCompleteness {
  total: number;
  present: number;
  percent: number;
  missing: string[];
}

export type WmPrintJobFilter = "all" | "active" | "handover" | "completed" | "invoiced";
