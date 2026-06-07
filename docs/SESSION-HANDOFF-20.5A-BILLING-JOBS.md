# Sprint 20.3A–20.5A.2 — Do rozliczenia + Roboty (handoff dla AI)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Stan prod (2026-06-07)

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.49.10** |
| **Prod `origin/main`** | **`571b90b`** — `feat(jobs): create recoverable charges from job view (20.5A.2)` |
| **Production** | https://www.wgdom.fun |
| **Vercel deploy** | **PASS** @ `571b90b` |
| **Następny sprint** | **20.5A.3** — Inspektor billing (nie rozpoczęty) |

---

## Łańcuch release (billing + jobs)

| Sprint | Wersja | Commit | Skrót |
|--------|--------|--------|-------|
| **20.3A** | 2.46.x | *(wcześniejszy)* | Moduł Do rozliczenia — CRUD, KV `kw-recoverable-charges` |
| **20.4A** | 2.47.00 | — | Settlement foundation — `settlements[]`, `deriveChargeAmounts()` |
| **20.4B** | 2.47.10 | — | UI Rozlicz, historia, KPI modułu |
| **20.4C.1** | 2.48.00 | `1d65ec5` | Dashboard karta Do odzyskania |
| **20.4C.2A** | 2.48.10 | `699f70a` | Aging analytics |
| **20.4C.2B** | 2.48.20 | `7cc3c77` | Alerty odzyskiwania |
| **20.4C.2C** | 2.48.30 | `81554f0` | Top listy + KPI czasowe |
| **20.5A.1** | 2.49.00 | `637f12c` | Roboty ↔ Do rozliczenia (read-only) |
| **20.5A.2** | **2.49.10** | **`571b90b`** | **Create from job** — modal na robocie |

---

## Sprint 20.5A.1 — Roboty ↔ Do rozliczenia (read-only)

**Commit:** `637f12c` · **v2.49.00**

| Element | Plik / helper |
|---------|----------------|
| Agregacja po robocie | `getRecoverableChargesForJob`, `getRecoverableChargesRecoveredOnJob`, `getRecoverableChargeJobStats` |
| Badge na liście | `JobListCardV2` — 💰 + tooltip PLN |
| Karta w Przeglądzie | `JobRecoverableChargesPanel` — KPI, max 5 pozycji źródłowych, rozliczenia na robocie |
| Deep link (select) | `pendingRecoverableChargeId` → `RecoverableChargesView.initialChargeId` |

**Smoke:** `scripts/smoke-test-recoverable-charges-jobs-20.5a1.mjs`

**Bez zmian:** KV, sync, merge, dashboard KPI, tworzenie pozycji z roboty.

---

## Sprint 20.5A.2 — Create from job

**Commit:** `571b90b` · **v2.49.10**

| Element | Opis |
|---------|------|
| Przycisk | ➕ **Dodaj do rozliczenia** — zawsze widoczny na karcie roboty |
| Modal inline | `JobCreateRecoverableChargeModal` — bez nawigacji do modułu |
| Preset | `buildRecoverableChargeDraftFromJob()` — `sourceType=job`, `sourceJobId`, klient, adres (UI), inspektor = lider ekipy (`executionLeadDirectoryId`) |
| Zapis | `appendRecoverableChargeCreate` + `finalizeRecoverableChargeDraftForSave` |
| Deep link create | `pendingRecoverableChargeCreatePreset` → moduł, formularz auto-open, consumed once |
| Karta | Widoczna zawsze (nawet 0 pozycji) |

**Smoke:** `scripts/smoke-test-recoverable-charges-create-from-job-20.5a2.mjs`

**UX po zapisie:** modal zamknięty, użytkownik na robocie, KPI odświeżone (props `recoverableCharges`).

---

## Kluczowe pliki (20.5A)

| Plik | Rola |
|------|------|
| `src/lib/recoverable-charges.ts` | Model, helpery, agregacja, draft from job |
| `src/app/JobRecoverableChargesPanel.tsx` | Karta 💰 na robocie |
| `src/app/JobCreateRecoverableChargeModal.tsx` | Modal tworzenia (20.5A.2) |
| `src/app/JobsView.tsx` | Wiring charges + modal |
| `src/app/RecoverableChargesView.tsx` | Moduł + `initialCreatePreset` |
| `src/app/App.tsx` | `pendingRecoverableChargeId`, `pendingRecoverableChargeCreatePreset` |

---

## Audyty (read-only, docs)

| Dokument | Zakres |
|----------|--------|
| [`ADDITIONAL-BILLING-AUDIT-20.3A.md`](ADDITIONAL-BILLING-AUDIT-20.3A.md) | Audyt modułu billing 20.3A |
| [`RECOVERABLE-CHARGES-20.3A-PRODUCT-REVIEW.md`](RECOVERABLE-CHARGES-20.3A-PRODUCT-REVIEW.md) | Przegląd produktowy |
| [`SETTLEMENT-WORKFLOW-AUDIT-20.4A.md`](SETTLEMENT-WORKFLOW-AUDIT-20.4A.md) | Settlement ledger design |
| [`SETTLEMENT-REPORTING-AUDIT-20.4C.md`](SETTLEMENT-REPORTING-AUDIT-20.4C.md) | Reporting + dashboard plan |
| [`SETTLEMENT-REPORTING-AUDIT-20.4C.2.md`](SETTLEMENT-REPORTING-AUDIT-20.4C.2.md) | Seria 20.4C.2 (aging/alerts/insights) |
| [`UI-LANGUAGE-AUDIT-20.3B.md`](UI-LANGUAGE-AUDIT-20.3B.md) | Język UI modułu |

**Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § Do rozliczenia — wersje 2.47–2.49.

---

## Testy regresji (closeout 20.5A.2)

```bash
npm run build
npx vite-node scripts/smoke-test-recoverable-charges-create-from-job-20.5a2.mjs
npx vite-node scripts/smoke-test-recoverable-charges-jobs-20.5a1.mjs
npx vite-node scripts/smoke-test-recoverable-charges-settlement-ui-20.4b.mjs
npx vite-node scripts/smoke-test-recoverable-charges-insights-20.4c2c.mjs
npx vite-node scripts/smoke-test-recoverable-charges-alerts-20.4c2b.mjs
npx vite-node scripts/smoke-test-recoverable-charges-aging-20.4c2a.mjs
npx vite-node scripts/smoke-test-recoverable-charges-dashboard-20.4c1.mjs
npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs
npx vite-node scripts/smoke-test-inspector-20.2a.mjs
```

Wszystkie **ALL PASS** przy closeout `571b90b`.

---

## Nie zmieniaj bez polecenia

- KV `kw-recoverable-charges`, sync, merge settlements
- `deriveChargeAmounts()` / status wyliczany z ledgeru
- Dashboard KPI (20.4C.1) — bez nowych kafelków w 20.5A
- Payroll, leaves, inspector (poza planowanym 20.5A.3)

---

## Plan 20.5A.3 (nie rozpoczęty)

Widoczność billing w Inspektorze — read-only lub akcje inspektora; bez zmian sync/KV.
