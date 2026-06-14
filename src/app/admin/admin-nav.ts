import type { ElementType } from "react";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Users,
  Mail,
  Archive,
  MapPin,
  ClipboardCheck,
  FolderOpen,
  BookOpen,
  Scale,
  Wallet,
  ScrollText,
} from "lucide-react";
import type { DirectoryEmployee, Job, WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { filterProductionActiveDirectory } from "@/app/app-domain";
import { countAllJobsImages } from "@/lib/media-separation";
import { countAllFilesHubItems } from "@/lib/files-hub-index";
import {
  countUnseenInspectorAlerts,
  getAdminJobNotesSeenAt,
} from "@/lib/inspector-stats";
import { jobsWithInspectorNotesNeedingAdmin } from "@/lib/job-wm";
import type { EmailContact } from "@/lib/email-contacts";
import { countUnsettledRecoverableCharges } from "@/lib/recoverable-charges";
import type { RecoverableCharge } from "@/lib/recoverable-charges";
import { countActiveJobsForNavBadge } from "@/lib/job-list-ops";

export type View =
  | "dashboard"
  | "payroll"
  | "schedule"
  | "directory"
  | "contacts"
  | "archive"
  | "jobs"
  | "operationalnotes"
  | "inspector"
  | "media"
  | "recoverablecharges"
  | "guide"
  | "tenders";

export type AdminNavItem = {
  key: View;
  label: string;
  hint: string;
  icon: ElementType;
  badge?: number;
};

export const MOBILE_NAV_PRIMARY: View[] = ["dashboard", "payroll", "schedule", "jobs"];

export type BuildAdminNavItemsInput = {
  canViewTendersNav: boolean;
  productionWeekEmployees: WeekEmployee[];
  directory: DirectoryEmployee[];
  contacts: EmailContact[];
  savedWeeks: WeekSnapshot[];
  jobs: Job[];
  recoverableCharges: RecoverableCharge[];
  adminUserId: string | undefined;
};

export function buildAdminNavItems(input: BuildAdminNavItemsInput): AdminNavItem[] {
  const {
    canViewTendersNav,
    productionWeekEmployees,
    directory,
    contacts,
    savedWeeks,
    jobs,
    recoverableCharges,
    adminUserId,
  } = input;

  return [
    {
      key: "dashboard",
      label: "Pulpit",
      hint: "Podsumowanie tygodnia, alerty (spójność, dokumenty, zdjęcia) i szybkie skróty.",
      icon: LayoutDashboard,
    },
    {
      key: "payroll",
      label: "Lista Płac",
      hint: "Godziny, stawki, zaliczki i wypłaty za bieżący tydzień. Eksport PDF i Word.",
      icon: FileText,
    },
    {
      key: "schedule",
      label: "Grafik",
      hint: "Kto pracuje którego dnia — widok Pn–So na podstawie listy płac.",
      icon: CalendarDays,
      badge: productionWeekEmployees.length || undefined,
    },
    {
      key: "directory",
      label: "Pracownicy",
      hint: "Kartoteka: dane, stawki, telefony, kod 4-cyfrowy, konto testowe, archiwum.",
      icon: Users,
      badge: filterProductionActiveDirectory(directory).length,
    },
    {
      key: "contacts",
      label: "Kontakty",
      hint: "Adresy e-mail klientów i współpracowników — do wysyłki z robot.",
      icon: Mail,
      badge: contacts.filter((c) => c.email.trim()).length || undefined,
    },
    {
      key: "archive",
      label: "Archiwum",
      hint: "Zapisane tygodnie — edycja godzin, raporty miesięczne i roczne.",
      icon: Archive,
      badge: savedWeeks.length || undefined,
    },
    {
      key: "jobs",
      label: "Roboty",
      hint: "Adresy remontów: dokumenty, czas pracy, materiały, zdjęcia i raporty. Badge = roboty W toku + Do odbioru (Jobs 2.0).",
      icon: MapPin,
      badge: (() => {
        const n = countActiveJobsForNavBadge(jobs);
        return n > 0 ? n : undefined;
      })(),
    },
    {
      key: "operationalnotes",
      label: "Notatki operacyjne",
      hint: "Baza wiedzy operacyjnej — globalne i powiązane z robotami. Osobna domena od notatek WM.",
      icon: ScrollText,
    },
    {
      key: "inspector",
      label: "Inspektor",
      hint: "Zmiany inspektora: dokumenty, zlecenia PDF i kosztorysy — osobno od kart robót.",
      icon: ClipboardCheck,
      badge: (() => {
        const notes = jobsWithInspectorNotesNeedingAdmin(jobs, getAdminJobNotesSeenAt(adminUserId));
        const n = countUnseenInspectorAlerts(jobs, adminUserId, notes.length);
        return n > 0 ? n : undefined;
      })(),
    },
    {
      key: "recoverablecharges",
      label: "Do rozliczenia",
      hint: "Rejestr pozycji do odzyskania od klientów — powiązane z robotą lub poza systemem.",
      icon: Wallet,
      badge: (() => {
        const n = countUnsettledRecoverableCharges(recoverableCharges);
        return n > 0 ? n : undefined;
      })(),
    },
    {
      key: "media",
      label: "Zdjęcia i pliki",
      hint: "Zdjęcia i pliki z robot — galeria, Files Hub (kontrakt, dokumentacja, załączniki), ZIP.",
      icon: FolderOpen,
      badge: (() => {
        const n = countAllJobsImages(jobs) + countAllFilesHubItems(jobs);
        return n > 0 ? n : undefined;
      })(),
    },
    {
      key: "guide",
      label: "Zmiany/Instrukcja",
      hint: "Historia wersji aplikacji i pomoc krok po kroku.",
      icon: BookOpen,
    },
    ...(canViewTendersNav
      ? [
          {
            key: "tenders" as const,
            label: "Przetargi",
            hint: "Wrocław — aktywne remonty budynków (mieszkania, biura, uczelnie).",
            icon: Scale,
          },
        ]
      : []),
  ];
}

export function splitMobileNav(navItems: AdminNavItem[]) {
  return {
    mobileNavPrimary: navItems.filter((n) => MOBILE_NAV_PRIMARY.includes(n.key)),
    mobileNavMore: navItems.filter((n) => !MOBILE_NAV_PRIMARY.includes(n.key)),
  };
}
