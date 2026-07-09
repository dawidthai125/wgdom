import type { ReactNode } from "react";

export type InspectorShellProps = {
  commandLayer: ReactNode;
  sidebar: ReactNode;
  beforeWorkspace?: ReactNode;
  children: ReactNode;
  bottomNav?: ReactNode;
  /** Job detail open — hides mobile bottom nav; desktop sidebar stays visible. */
  jobDetailOpen: boolean;
};

export function InspectorShell({
  commandLayer,
  sidebar,
  beforeWorkspace,
  children,
  bottomNav,
  jobDetailOpen,
}: InspectorShellProps) {
  return (
    <div
      className="inspector-shell relative flex flex-col bg-background text-foreground h-[100dvh]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {commandLayer}
      {beforeWorkspace}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {sidebar}
        <div className="inspector-workspace flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">{children}</div>
      </div>
      {bottomNav && !jobDetailOpen && <div className="md:hidden shrink-0">{bottomNav}</div>}
    </div>
  );
}
