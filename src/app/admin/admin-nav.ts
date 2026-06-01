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
  Images,
  FolderOpen,
  BookOpen,
  Scale,
} from "lucide-react";
import type { DirectoryEmployee, Job, WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { filterProductionActiveDirectory, jobApprovedPhotos, jobGalleryBucket } from "@/app/app-domain";
import { countBrowserFiles, jobHasBrowserFiles } from "@/lib/job-files-browser";
import {
  countUnseenInspectorAlerts,
  getAdminJobNotesSeenAt,
} from "@/lib/inspector-stats";
import { jobsWithInspectorNotesNeedingAdmin } from "@/lib/job-wm";
import type { EmailContact } from "@/lib/email-contacts";

export type View =
  | "dashboard"
  | "payroll"
  | "schedule"
  | "directory"
  | "contacts"
  | "archive"
  | "jobs"
  | "inspector"
  | "photos"
  | "jobfiles"
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
      hint: "Adresy remontów: dokumenty, czas pracy, materiały, zdjęcia i raporty.",
      icon: MapPin,
      badge: (() => {
        const pend = jobs.reduce(
          (s, j) => s + (j.photos || []).filter((p) => p.status === "pending").length,
          0,
        );
        return pend > 0 ? pend : jobs.filter((j) => j.status === "in_progress").length || undefined;
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
      key: "photos",
      label: "Zdjęcia",
      hint: "Zaakceptowane zdjęcia z robot — galeria i archiwum po 30 dniach od zdania.",
      icon: Images,
      badge: (() => {
        const n = jobs.reduce((s, j) => {
          const b = jobGalleryBucket(j);
          return b === "active" || b === "grace" ? s + jobApprovedPhotos(j).length : s;
        }, 0);
        return n || undefined;
      })(),
    },
    {
      key: "jobfiles",
      label: "Pliki robot",
      hint: "Wszystkie pliki z robot: zlecenia, kosztorysy, zdjęcia, rysunki — pobierz pojedynczo lub ZIP.",
      icon: FolderOpen,
      badge: (() => {
        const n = jobs.reduce(
          (s, j) => (jobHasBrowserFiles(j) ? s + countBrowserFiles(j) : s),
          0,
        );
        return n || undefined;
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
