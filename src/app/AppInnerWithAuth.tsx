import { lazy, Suspense, useMemo, useState } from "react";
import { ClientShareView } from "@/app/ClientShareView";
import { AdminAccessContext } from "@/app/admin-access";
import {
  type AdminSession,
  adminCanViewRates,
  loadAdminSessionFromStorage,
  saveAdminSessionToStorage,
} from "@/lib/admin-auth";
import type { DirectoryEmployee } from "@/app/app-domain";
import { recordInspectorEvent } from "@/lib/inspector-stats";
import { recordSecurityAudit } from "@/lib/security-audit-log";
import { AppInner, LoginScreen, WorkerPhotoView } from "@/app/App";

const InspectorPanel = lazy(() =>
  import("@/app/InspectorPanel").then((m) => ({ default: m.InspectorPanel })),
);

export function AppInnerWithAuth() {
  const shareToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("podglad")?.trim() || "";
  }, []);

  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "admin") return null;
    const s = loadAdminSessionFromStorage();
    return s && s.role !== "inspector" ? s : null;
  });

  const [inspectorSession, setInspectorSession] = useState<AdminSession | null>(() => {
    const mode = sessionStorage.getItem("wg-session-mode");
    if (mode !== "inspector") return null;
    const s = loadAdminSessionFromStorage();
    return s?.role === "inspector" ? s : null;
  });

  const [appMode, setAppMode] = useState<"login"|"admin"|"worker"|"inspector">(() => {
    const s = sessionStorage.getItem("wg-session-mode");
    const stored = loadAdminSessionFromStorage();
    if (s === "admin" && stored && stored.role !== "inspector") return "admin";
    if (s === "inspector" && stored?.role === "inspector") return "inspector";
    if (s === "worker") return "worker";
    return "login";
  });
  const [workerName, setWorkerName] = useState(() => sessionStorage.getItem("wg-worker-name") || "");
  const [workerId, setWorkerId] = useState(() => sessionStorage.getItem("wg-worker-id") || "");

  const adminAccess = useMemo(
    () => ({
      session: adminSession,
      canViewRates: adminSession ? adminCanViewRates(adminSession.role) : true,
    }),
    [adminSession],
  );

  const enterAdmin = (session: AdminSession) => {
    if (session.role === "inspector") return;
    saveAdminSessionToStorage(session);
    setAdminSession(session);
    setInspectorSession(null);
    sessionStorage.setItem("wg-session-mode", "admin");
    setAppMode("admin");
    void recordSecurityAudit({
      actor: session.displayName,
      actorUserId: session.id,
      category: "AUTH",
      action: "admin_login_success",
      severity: "info",
      summary: `Logowanie: ${session.displayName}`,
    }).catch(() => {});
  };
  const enterInspector = (session: AdminSession) => {
    if (session.role !== "inspector") return;
    saveAdminSessionToStorage(session);
    setInspectorSession(session);
    setAdminSession(null);
    sessionStorage.setItem("wg-session-mode", "inspector");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    setAppMode("inspector");
    recordInspectorEvent(session.id, session.displayName, "login").catch(() => {});
  };
  const enterWorker = (emp: DirectoryEmployee) => {
    sessionStorage.setItem("wg-session-mode","worker");
    sessionStorage.setItem("wg-worker-name", emp.name);
    sessionStorage.setItem("wg-worker-id", emp.id);
    setWorkerName(emp.name);
    setWorkerId(emp.id);
    setAppMode("worker");
  };
  const logout = () => {
    const admin = adminSession;
    if (admin) {
      void recordSecurityAudit({
        actor: admin.displayName,
        actorUserId: admin.id,
        category: "AUTH",
        action: "admin_logout",
        severity: "info",
        summary: `Wylogowanie: ${admin.displayName}`,
      }).catch(() => {});
    }
    sessionStorage.removeItem("wg-session-mode");
    sessionStorage.removeItem("wg-worker-name");
    sessionStorage.removeItem("wg-worker-id");
    sessionStorage.removeItem("wg-inspector-visit-recorded");
    saveAdminSessionToStorage(null);
    setAdminSession(null);
    setInspectorSession(null);
    setAppMode("login"); setWorkerName(""); setWorkerId("");
  };

  if (shareToken) return <ClientShareView token={shareToken}/>;
  if (appMode === "login") return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  if (appMode === "worker") return <WorkerPhotoView workerName={workerName} workerId={workerId} onLogout={logout}/>;
  if (appMode === "inspector" && inspectorSession) {
    return (
      <Suspense
        fallback={
          <div
            className="inspector-shell flex items-center justify-center bg-background"
            style={{
              height: "var(--app-height, 100dvh)",
              maxHeight: "var(--app-height, 100dvh)",
            }}
          >
            <p className="text-sm text-muted-foreground">Ładowanie panelu inspektora…</p>
          </div>
        }
      >
        <InspectorPanel session={inspectorSession} onLogout={logout}/>
      </Suspense>
    );
  }
  if (!adminSession) return <LoginScreen onAdmin={enterAdmin} onInspector={enterInspector} onWorker={enterWorker}/>;
  return (
    <AdminAccessContext.Provider value={adminAccess}>
      <AppInner onLogout={logout}/>
    </AdminAccessContext.Provider>
  );
}
