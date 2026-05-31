import { createContext, useContext } from "react";
import type { AdminSession } from "@/lib/admin-auth";
import { adminCanViewRates } from "@/lib/admin-auth";

export const AdminAccessContext = createContext<{ session: AdminSession | null; canViewRates: boolean }>({
  session: null,
  canViewRates: true,
});

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}


export function AdminAccessProvider({
  session,
  children,
}: {
  session: AdminSession | null;
  children: React.ReactNode;
}) {
  const canViewRates = session ? adminCanViewRates(session.role) : true;
  return (
    <AdminAccessContext.Provider value={{ session, canViewRates }}>
      {children}
    </AdminAccessContext.Provider>
  );
}
