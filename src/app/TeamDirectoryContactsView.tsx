import { Users, Mail } from "lucide-react";
import { DirectoryView } from "@/app/DirectoryView";
import { ContactsView } from "@/app/ContactsView";
import type { DirectoryEmployee, WeekSnapshot } from "@/app/app-domain";
import type { EmailContact } from "@/lib/email-contacts";
import type { EmployeeLeave } from "@/lib/employee-leaves";

export type TeamDirectoryTab = "directory" | "contacts";

export function TeamDirectoryContactsView({
  tab,
  onTabChange,
  directory,
  savedWeeks,
  employeeLeaves,
  onDirectoryChange,
  onDirectoryCommit,
  onLeavesChange,
  onLeavesCommit,
  onOpenSms,
  contacts,
  onContactsChange,
}: {
  tab: TeamDirectoryTab;
  onTabChange: (tab: TeamDirectoryTab) => void;
  directory: DirectoryEmployee[];
  savedWeeks: WeekSnapshot[];
  employeeLeaves: EmployeeLeave[];
  onDirectoryChange: (d: DirectoryEmployee[]) => void;
  onDirectoryCommit?: () => void;
  onLeavesChange: (l: EmployeeLeave[]) => void;
  onLeavesCommit?: (next: EmployeeLeave[], deletedId?: string) => void;
  onOpenSms?: () => void;
  contacts: EmailContact[];
  onContactsChange: (c: EmailContact[]) => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 border-b border-border bg-card px-3 sm:px-5 py-2.5">
        <div className="flex gap-1 max-w-4xl mx-auto">
          {(
            [
              { id: "directory" as const, label: "Pracownicy", icon: Users },
              { id: "contacts" as const, label: "Kontakty", icon: Mail },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-colors min-h-[44px] ${
                tab === id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {tab === "directory" ? (
          <DirectoryView
            directory={directory}
            savedWeeks={savedWeeks}
            employeeLeaves={employeeLeaves}
            onChange={onDirectoryChange}
            onCommit={onDirectoryCommit}
            onLeavesChange={onLeavesChange}
            onLeavesCommit={onLeavesCommit}
            onOpenSms={onOpenSms}
          />
        ) : (
          <ContactsView contacts={contacts} onChange={onContactsChange} />
        )}
      </div>
    </div>
  );
}
