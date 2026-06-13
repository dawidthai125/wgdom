/**
 * P2-C.2 — wykrywanie platformy dokumentów + komunikaty UX (bez PII).
 */
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  detectOffPlatformHosts,
  extractLogintradePageUrls,
  type OffPlatformHost,
} from "@/lib/tender-platform-adapters";
import { extractEzamawiajacyPageUrls } from "@/lib/tender-ezamawiajacy";

export type TenderDocumentPlatform =
  | "ezamawiajacy"
  | "logintrade"
  | "ezamowienia"
  | "platformazakupowa"
  | "opennexus"
  | "unknown";

export type DocumentsMissingReason =
  | "found_ezamawiajacy"
  | "found_logintrade"
  | "found_ezamowienia"
  | "found_external"
  | "found_upload"
  | "missing_platformazakupowa_auth"
  | "missing_opennexus_auth"
  | "missing_ezamowienia_empty"
  | "missing_logintrade_empty"
  | "missing_ezamawiajacy_empty"
  | "missing_unknown"
  | "loading"
  | "not_fetched_yet";

export interface TenderPlatformDocumentStatus {
  platform: TenderDocumentPlatform;
  platformLabel: string;
  sourceLabel: string;
  documentsFound: number;
  missingReason: DocumentsMissingReason;
  /** Krótki komunikat zamiast „Brak plików”. */
  emptyMessage?: string;
  /** Dłuższy opis (platformazakupowa / open nexus). */
  detailLines?: string[];
  /** Badge przy nagłówku sekcji dokumentów. */
  badge?: { text: string; tone: "success" | "info" | "warn" };
  /** Sukces — dokumenty pobrane automatycznie. */
  successMessage?: string;
  /** CTA — otwórz postępowanie na platformie. */
  proceedingUrl?: string;
  proceedingButtonLabel?: string;
  showSearchExternalHint?: boolean;
  openNexusNote?: boolean;
}

const TELEMETRY_KEY = "wg-platform-doc-telemetry";
const TELEMETRY_MAX = 500;

function noticeText(item: TenderPipelineItem): string {
  const parts: string[] = [];
  if (item.noticeHtml) parts.push(item.noticeHtml);
  for (const link of item.externalDocDiscovery?.pageLinks ?? []) {
    parts.push(link.url, link.label);
  }
  return parts.join("\n");
}

export function extractPlatformazakupowaProceedingUrl(text: string): string | null {
  if (!text?.trim()) return null;
  const tx = text.match(/https?:\/\/[^\s"'<>]*platformazakupowa\.pl\/transakcja\/(\d+)/i);
  if (tx) return tx[0].replace(/[.,;)]+$/g, "");
  const relTx = text.match(/platformazakupowa\.pl\/transakcja\/(\d+)/i);
  if (relTx) return `https://platformazakupowa.pl/transakcja/${relTx[1]}`;
  const pn = text.match(/https?:\/\/[^\s"'<>]*platformazakupowa\.pl\/pn\/([^/?#"'\s]+)/i);
  if (pn) {
    const slug = pn[1].replace(/[.,;)]+$/g, "");
    return `https://platformazakupowa.pl/pn/${slug}/proceedings`;
  }
  return null;
}

function hasOpenNexusOAuthHint(text: string): boolean {
  return /accounts\.opennexus\.com|opennexus\.com\/sso|opennexusplatform/i.test(text);
}

function countDocuments(item: TenderPipelineItem): number {
  return (item.bzpDocuments?.length ?? 0)
    + (item.uploadedFile ? 1 : 0)
    + (item.externalDocDiscovery?.files?.length ?? 0);
}

function docPlatformFromFiles(item: TenderPipelineItem): OffPlatformHost | null {
  const platforms = new Set(
    (item.bzpDocuments ?? [])
      .map((d) => d.platform)
      .filter(Boolean) as string[],
  );
  if (platforms.has("ezamawiajacy")) return "ezamawiajacy";
  if (platforms.has("logintrade")) return "logintrade";
  if (platforms.has("platformazakupowa")) return "platformazakupowa";
  return null;
}

/** Główne wykrywanie platformy źródła dokumentów. */
export function detectTenderDocumentPlatform(item: TenderPipelineItem): TenderDocumentPlatform {
  const text = noticeText(item);
  const fromDocs = docPlatformFromFiles(item);
  if (fromDocs === "ezamawiajacy") return "ezamawiajacy";
  if (fromDocs === "logintrade") return "logintrade";

  const hosts = detectOffPlatformHosts(text);
  if (hosts.includes("ezamawiajacy") || extractEzamawiajacyPageUrls(text).length > 0) {
    return "ezamawiajacy";
  }
  if (hosts.includes("platformazakupowa") || /platformazakupowa\.pl/i.test(text)) {
    return "platformazakupowa";
  }
  if (hasOpenNexusOAuthHint(text) || hosts.includes("opennexus")) {
    return "opennexus";
  }
  if (hosts.includes("logintrade") || extractLogintradePageUrls(text).length > 0) {
    return "logintrade";
  }

  const docs = item.bzpDocuments ?? [];
  if (docs.length > 0) return "ezamowienia";
  if (item.tenderId && (item.documentsFetchedAt || !text.trim())) return "ezamowienia";
  if (item.tenderId) return "ezamowienia";
  return "unknown";
}

const PLATFORM_LABELS: Record<TenderDocumentPlatform, string> = {
  ezamawiajacy: "Marketplanet (ezamawiajacy.pl)",
  logintrade: "Logintrade",
  ezamowienia: "e-Zamówienia",
  platformazakupowa: "platformazakupowa.pl",
  opennexus: "Open Nexus",
  unknown: "Nieznane",
};

export function resolveTenderPlatformDocumentStatus(
  item: TenderPipelineItem,
  opts?: { loadingDocs?: boolean },
): TenderPlatformDocumentStatus {
  const text = noticeText(item);
  const platform = detectTenderDocumentPlatform(item);
  const documentsFound = countDocuments(item);
  const bzpCount = item.bzpDocuments?.length ?? 0;
  const externalCount = item.externalDocDiscovery?.files?.length ?? 0;
  const hasUpload = Boolean(item.uploadedFile);
  const logintradeDocs = (item.bzpDocuments ?? []).some((d) => d.platform === "logintrade")
    || (platform === "logintrade" && bzpCount > 0);
  const ezamawiajacyDocs = (item.bzpDocuments ?? []).some((d) => d.platform === "ezamawiajacy")
    || (platform === "ezamawiajacy" && bzpCount > 0);

  if (opts?.loadingDocs) {
    return {
      platform,
      platformLabel: PLATFORM_LABELS[platform],
      sourceLabel: PLATFORM_LABELS[platform],
      documentsFound,
      missingReason: "loading",
    };
  }

  if (hasUpload && documentsFound > 0) {
    return {
      platform,
      platformLabel: PLATFORM_LABELS[platform],
      sourceLabel: hasUpload ? "Wgrany ręcznie" : PLATFORM_LABELS[platform],
      documentsFound,
      missingReason: "found_upload",
    };
  }

  if (externalCount > 0 && bzpCount === 0) {
    return {
      platform,
      platformLabel: PLATFORM_LABELS[platform],
      sourceLabel: "BIP / zamawiający",
      documentsFound,
      missingReason: "found_external",
      successMessage: `Pobrano ${externalCount} plik(ów) u zamawiającego.`,
    };
  }

  if (ezamawiajacyDocs && bzpCount > 0) {
    return {
      platform: "ezamawiajacy",
      platformLabel: "Marketplanet",
      sourceLabel: "ezamawiajacy.pl",
      documentsFound,
      missingReason: "found_ezamawiajacy",
      badge: { text: "✓ Marketplanet", tone: "success" },
      successMessage: "Dokumenty pobrane automatycznie z platformy ezamawiajacy.pl.",
      proceedingUrl: extractEzamawiajacyPageUrls(text)[0],
      proceedingButtonLabel: extractEzamawiajacyPageUrls(text)[0] ? "Otwórz postępowanie" : undefined,
    };
  }

  if (logintradeDocs && bzpCount > 0) {
    return {
      platform: "logintrade",
      platformLabel: "Logintrade",
      sourceLabel: "Logintrade",
      documentsFound,
      missingReason: "found_logintrade",
      badge: { text: "✓ Logintrade", tone: "success" },
      successMessage: "Dokumenty pobrane automatycznie z Logintrade.",
    };
  }

  if (bzpCount > 0 && platform === "ezamowienia") {
    return {
      platform: "ezamowienia",
      platformLabel: "e-Zamówienia",
      sourceLabel: "e-Zamówienia",
      documentsFound,
      missingReason: "found_ezamowienia",
      badge: { text: "✓ e-Zamówienia", tone: "success" },
      successMessage: "Dokumenty sprawdzane automatycznie w e-Zamówienia.",
    };
  }

  if (bzpCount > 0) {
    return {
      platform,
      platformLabel: PLATFORM_LABELS[platform],
      sourceLabel: PLATFORM_LABELS[platform],
      documentsFound,
      missingReason: platform === "logintrade" ? "found_logintrade" : "found_ezamowienia",
      badge: { text: `✓ ${PLATFORM_LABELS[platform]}`, tone: "success" },
    };
  }

  const proceedingUrl = extractPlatformazakupowaProceedingUrl(text);
  const openNexus = hasOpenNexusOAuthHint(text)
    || /\/transakcja\/\d+/i.test(text)
    || platform === "opennexus";

  if (platform === "platformazakupowa" || (openNexus && /platformazakupowa/i.test(text))) {
    return {
      platform: "platformazakupowa",
      platformLabel: "platformazakupowa.pl",
      sourceLabel: "platformazakupowa.pl",
      documentsFound: 0,
      missingReason: "missing_platformazakupowa_auth",
      emptyMessage: "Dokumentacja na platformazakupowa.pl",
      detailLines: [
        "Dokumentacja znajduje się na platformazakupowa.pl.",
        "Dostęp do dokumentów wymaga konta wykonawcy Open Nexus.",
        "WGDOM nie ma dostępu do dokumentów bez logowania.",
      ],
      openNexusNote: true,
      proceedingUrl: proceedingUrl ?? undefined,
      proceedingButtonLabel: "Otwórz postępowanie",
    };
  }

  if (platform === "opennexus" || openNexus) {
    return {
      platform: "opennexus",
      platformLabel: "Open Nexus",
      sourceLabel: "Open Nexus",
      documentsFound: 0,
      missingReason: "missing_opennexus_auth",
      emptyMessage: "Dokumenty za logowaniem Open Nexus",
      detailLines: [
        "Dokumenty dostępne po zalogowaniu do Open Nexus.",
        "WGDOM nie pobiera dokumentów z Open Nexus bez autoryzacji.",
      ],
      proceedingUrl: proceedingUrl ?? undefined,
      proceedingButtonLabel: proceedingUrl ? "Otwórz postępowanie" : undefined,
    };
  }

  if (platform === "ezamawiajacy") {
    const scanned = Boolean(item.documentsFetchedAt);
    return {
      platform: "ezamawiajacy",
      platformLabel: "Marketplanet",
      sourceLabel: "ezamawiajacy.pl",
      documentsFound: 0,
      missingReason: scanned ? "missing_ezamawiajacy_empty" : "not_fetched_yet",
      emptyMessage: scanned
        ? "Brak załączników na ezamawiajacy.pl — sprawdź link w ogłoszeniu lub wgraj SWZ ręcznie."
        : undefined,
      showSearchExternalHint: scanned,
      proceedingUrl: extractEzamawiajacyPageUrls(text)[0],
      proceedingButtonLabel: extractEzamawiajacyPageUrls(text)[0] ? "Otwórz postępowanie" : undefined,
    };
  }

  if (platform === "logintrade") {
    const scanned = Boolean(item.documentsFetchedAt);
    return {
      platform: "logintrade",
      platformLabel: "Logintrade",
      sourceLabel: "Logintrade",
      documentsFound: 0,
      missingReason: scanned ? "missing_logintrade_empty" : "not_fetched_yet",
      emptyMessage: scanned
        ? "Brak załączników Logintrade — sprawdź link w ogłoszeniu lub wgraj SWZ ręcznie."
        : undefined,
      showSearchExternalHint: scanned,
      proceedingUrl: extractLogintradePageUrls(text)[0],
      proceedingButtonLabel: extractLogintradePageUrls(text)[0] ? "Otwórz Logintrade" : undefined,
    };
  }

  if (platform === "ezamowienia") {
    const scanned = Boolean(item.documentsFetchedAt);
    return {
      platform: "ezamowienia",
      platformLabel: "e-Zamówienia",
      sourceLabel: "e-Zamówienia",
      documentsFound: 0,
      missingReason: scanned ? "missing_ezamowienia_empty" : "not_fetched_yet",
      badge: scanned
        ? { text: "e-Zamówienia", tone: "info" }
        : undefined,
      emptyMessage: scanned ? "Brak załączników w e-Zamówienia." : undefined,
      detailLines: scanned
        ? [
          "Dokumenty sprawdzane automatycznie w e-Zamówienia — nie znaleziono plików.",
          "Wgraj SWZ ręcznie lub użyj „Szukaj u zamawiającego”.",
        ]
        : undefined,
      showSearchExternalHint: scanned,
    };
  }

  return {
    platform: "unknown",
    platformLabel: "Nieznane",
    sourceLabel: "Nieznane",
    documentsFound: 0,
    missingReason: item.documentsFetchedAt ? "missing_unknown" : "not_fetched_yet",
    emptyMessage: item.documentsFetchedAt
      ? "Nie udało się automatycznie odnaleźć dokumentacji."
      : undefined,
    detailLines: item.documentsFetchedAt
      ? ["Użyj „Szukaj u zamawiającego” lub wgraj SWZ ręcznie."]
      : undefined,
    showSearchExternalHint: Boolean(item.documentsFetchedAt),
  };
}

export interface PlatformDocTelemetryEntry {
  at: string;
  platformDetected: TenderDocumentPlatform;
  documentsFound: number;
  documentsMissingReason: DocumentsMissingReason;
}

/** Telemetria bez PII — agregat w localStorage + dev console. */
export function logPlatformDocumentTelemetry(entry: Omit<PlatformDocTelemetryEntry, "at">): void {
  if (typeof window === "undefined") return;
  const row: PlatformDocTelemetryEntry = { ...entry, at: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    const prev: PlatformDocTelemetryEntry[] = raw ? JSON.parse(raw) : [];
    prev.push(row);
    if (prev.length > TELEMETRY_MAX) prev.splice(0, prev.length - TELEMETRY_MAX);
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(prev));
  } catch {
    /* ignore quota */
  }
  if (import.meta.env.DEV) {
    console.info("[wgdom:platform-docs]", row);
  }
}

export function readPlatformDocumentTelemetry(): PlatformDocTelemetryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
