import type { ElementType } from "react";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Users,
  Archive,
  MapPin,
  ClipboardCheck,
  FolderOpen,
  BookOpen,
  Scale,
  Wallet,
  ScrollText,
  Printer,
  Shield,
} from "lucide-react";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import type { DirectoryEmployee, Job, WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import type { AdminSession } from "@/lib/admin-auth";
import type { OperationalNote } from "@/lib/operational-notes";
import type { OperationalNoteReadReceipt } from "@/lib/operational-notes-read-state";
import { countUnreadOperationalNotes } from "@/lib/operational-notes-read-state";
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
  | "wmprint"
  | "operationalnotes"
  | "inspector"
  | "media"
  | "recoverablecharges"
  | "guide"
  | "tenders"
  | "audit";

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
  operationalNotes?: OperationalNote[];
  operationalNotesReadState?: OperationalNoteReadReceipt[];
  adminSession?: AdminSession | null;
};

export function isNavItemActive(navKey: View, currentView: View): boolean {
  if (navKey === "directory") return currentView === "directory" || currentView === "contacts";
  return navKey === currentView;
}

export function buildAdminNavItems(input: BuildAdminNavItemsInput): AdminNavItem[] {
  const {
    canViewTendersNav,
    productionWeekEmployees,
    directory,
    savedWeeks,
    jobs,
    recoverableCharges,
    adminUserId,
    operationalNotes = [],
    operationalNotesReadState = [],
    adminSession,
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
      label: "Kadry",
      hint: "Kartoteka pracowników (stawki, telefon, PIN) oraz kontakty e-mail — zakładki Pracownicy i Kontakty.",
      icon: Users,
      badge: filterProductionActiveDirectory(directory).length,
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
      key: "wmprint",
      label: "Odbiory WM Druk",
      hint: "Szablony dokumentów WM, dokumenty per robota i generowanie paczek ZIP do przekazania.",
      icon: Printer,
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
    {
      key: "operationalnotes",
      label: "Notatki operacyjne",
      hint: "Baza wiedzy operacyjnej — globalne i powiązane z robotami. Osobna domena od notatek WM.",
      icon: ScrollText,
      badge: (() => {
        const n = countUnreadOperationalNotes(operationalNotes, operationalNotesReadState, adminSession);
        return n > 0 ? n : undefined;
      })(),
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
    ...(adminSession && adminIsSuperAdmin(adminSession.role)
      ? [
          {
            key: "audit" as const,
            label: "Audit Hub",
            hint: "Historia działań z istniejących logów — tylko Super Admin.",
            icon: Shield,
          },
        ]
      : []),
    {
      key: "guide",
      label: "Zmiany/Instrukcja",
      hint: "Historia wersji aplikacji i pomoc krok po kroku.",
      icon: BookOpen,
    },
  ];
}

export function splitMobileNav(navItems: AdminNavItem[]) {
  return {
    mobileNavPrimary: navItems.filter((n) => MOBILE_NAV_PRIMARY.includes(n.key)),
    mobileNavMore: navItems.filter((n) => !MOBILE_NAV_PRIMARY.includes(n.key)),
  };
}
