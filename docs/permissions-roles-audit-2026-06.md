# Audyt regresji uprawnień — Przetargi (2026-06)

> Po Fazie 8 i 9. **Tylko audyt.** Werdykt: **PASS**. Indeks: [`SESSION-HANDOFF-2026-06.md`](SESSION-HANDOFF-2026-06.md)

---

## Źródło prawdy

```ts
// src/lib/admin-auth.ts
export function adminCanViewTendersTab(role, settings) {
  if (role === "super_admin") return true;
  if (!settings.tendersTabForStaffEnabled) return false;
  return role === "admin" || role === "moderator";
}
```

Ustawienie: `kw-app-settings` → `tendersTabForStaffEnabled` (domyślnie `false`).  
UI przełącznika: `AdminSettingsModal.tsx` — tylko Super Admin.

Propagacja: `App.tsx` → `canViewTendersNav` → `AdminViewRouter`, `buildAdminNavItems`, `DashboardView`, `CommandCenterProvider`.

---

## Macierz ról

| Rola | Przetargi w menu |
|------|------------------|
| Super Admin (`dawid`) | Zawsze TAK |
| Administrator (`stanislaw`) | TAK gdy przełącznik włączony |
| Moderator (`pawel`) | TAK gdy przełącznik włączony |
| Inspektor (`szymon`) | NIE |

---

## Powierzchnie UI

| Obszar | Warunek | PASS? |
|--------|---------|-------|
| Menu Przetargi | `canViewTendersNav` | Tak |
| `view === "tenders"` | `&& canViewTendersNav` | Tak |
| Pulpit Executive | `canViewTenders && …` | Tak |
| Command Center / KPI | `CommandCenterProvider enabled={canViewTendersNav}` | Tak |
| Fetch `tenderDashStats` | `if (!canViewTendersNav) return` | Tak |

---

## Uwaga (nie regresja 8/9)

`JobsView` dostaje `onOpenTender` zawsze — przycisk „Otwórz przetarg” może być widoczny bez uprawnień do zakładki; po kliknięciu `App.tsx` cofa `view` na Pulpit.

---

## Faza 8–9

Brak zmian w `adminCanViewTendersTab` — regresji nie wykryto.

---

## Dodatek 2026-06-29 — Instrukcja + Zmiany (2.62.92)

**SSOT:** [`SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md`](SESSION-HANDOFF-SUPER-ADMIN-ACL-GUIDE-CHANGES.md)

| Rola | Instrukcja (`guide`) | Zmiany (`changelog`) |
|------|----------------------|----------------------|
| Super Admin | zawsze | zawsze |
| Administrator | gdy `instructionsForAdminEnabled` | gdy `changesForAdminEnabled` |
| Moderator / Inspektor | nigdy | nigdy |

Helpery: `adminCanViewInstructions`, `adminCanViewChanges` · test: `scripts/test-admin-guide-acl.mjs`
