# Sprint 20.3A–20.5A.4 — Do rozliczenia + Roboty (handoff dla AI)

> **Hasło:** „kontynuuj WGDOM” → [`CURRENT-TASK.md`](../CURRENT-TASK.md) · [`AGENTS.md`](../AGENTS.md)

---

## Stan prod (2026-06-09)

| Pole | Wartość |
|------|---------|
| **Wersja UI** | **v2.50.43** |
| **Prod `origin/main`** | **`61cb33b`** — `feat(ui): complete command center polish translation pack (20.3B+)` |
| **Production** | https://www.wgdom.fun · https://www.wgdom.online |
| **Deploy CC** | GitHub **`4987528369`** — **SUCCESS** |
| **Handoff CC** | [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](SESSION-HANDOFF-20.3B-CC-POLISH.md) |
| **Następny sprint** | **20.3C** / **Roboty 2.0 FULL** — tylko na polecenie · **20.5A.6 IMPLEMENT lokalnie (bez deploy)** |

---

## Release 2.50.44 — Billing Proposal 20.5A.6 (**LOKALNIE, bez deploy**)

| Pole | Wartość |
|------|---------|
| **Wersja** | **2.50.44** |
| **Wariant** | **B1** — `JobNote.billing_proposal` → admin approve → `RecoverableCharge` |
| **Raport** | [`RELEASE-REPORT-20.5A.6.md`](RELEASE-REPORT-20.5A.6.md) |
| **Smoke** | `smoke-test-inspector-billing-proposal-20.5a6.mjs` — **52/52 PASS** |

**Kluczowe pliki:** `job-wm.ts`, `InspectorBillingProposalModal.tsx`, `BillingProposalReviewCard.tsx`, `InspectorPanel.tsx`, `JobsView.tsx`.

**Sync:** inspektor → tylko `kw-jobs`; approve → `commitRecoverableCharges`.

---

## Release 2.50.43 — CC Polonizacja 20.3B+ (**CLOSED**, osobny handoff)

Szczegóły → [`SESSION-HANDOFF-20.3B-CC-POLISH.md`](SESSION-HANDOFF-20.3B-CC-POLISH.md)

---

## Release 2.50.42 — Billing Evidence Pack (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Commit** | **`d3874ad`** |
| **Deploy** | **`4986920110`** |
| **Smoke** | `smoke-test-inspector-billing-evidence-20.5a5.mjs` (30/30), E2E prod PASS |

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
| **20.5A.2** | 2.49.10 | `571b90b` | Create from job — modal na robocie |
| **20.5A.3A** | 2.49.70 | `4fec9cc` | Inspektor read-only billing review na robocie |
| **20.5A.4** | **2.49.80** | **`9990921`** | **Billing notes** — uwagi inspektora per pozycja |
| **20.5A.5** | **2.50.42** | **`d3874ad`** | **Billing Evidence Pack** — zdjęcia/PDF do uwag, preview |

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

## Sprint 20.5A.3A — Inspektor read-only billing review

**Commit:** `4fec9cc` · **v2.49.70**

| Element | Opis |
|---------|------|
| **InspectorPanel** | Read-only fetch/merge `kw-recoverable-charges` + tombstones (bez push billing) |
| **JobRecoverableChargesPanel** | `variant="inspector"` — KPI, kwoty, historia `settlements[]` |
| **InspectorJobCard** | Badge 💰 + tooltip PLN przy `unsettledCount > 0` |

**Smoke:** `scripts/smoke-test-inspector-billing-20.5a3a.mjs`

---

## Sprint 20.5A.4 — Billing notes workflow

**Commit:** `9990921` · **v2.49.80**

| Element | Opis |
|---------|------|
| **Model** | `JobNote.recoverableChargeId` + `context: billing`; `activityLog` typ `inspector_billing_note` |
| **Inspektor** | „Zgłoś uwagę” na karcie pozycji; push tylko `kw-jobs` |
| **Admin** | Wątek + odpowiedź w `JobRecoverableChargesPanel`; Pulpit prefiks „Do rozliczenia” |
| **WM** | `wmJobNotes()` — separacja od notatek billing |
| **Kluczowe pliki** | `job-wm.ts`, `JobRecoverableChargesPanel.tsx`, `InspectorPanel.tsx`, `JobsView.tsx`, `JobWmPanel.tsx`, `DashboardView.tsx` |

**Smoke:** `scripts/smoke-test-inspector-billing-notes-20.5a4.mjs` (T1–T10, 28/28 PASS)

**Bez zmian:** KV `kw-recoverable-charges`, create/edit/delete/settle charge w trybie inspektora.

---

## Sprint 20.5A.5 — Billing Evidence Pack

**Commit:** `d3874ad` · **v2.50.42** · **Deploy:** `4986920110`

| Element | Opis |
|---------|------|
| **Model** | `JobNoteAttachment` + `JobNote.attachments?` w `job-wm.ts` |
| **Upload** | `billing-evidence-upload.ts` → `storage-upload`, max 3 zdjęć + 1 PDF (8 MB) |
| **Inspektor** | `BillingNoteModal` — pickery, miniatury, „Wgrywanie dowodów…” |
| **Admin / inspektor** | Wątek + `JobFilePreviewModal` (podgląd inline) |
| **Sync** | Tylko `kw-jobs` (jak 20.5A.4) |

**Smoke:** `scripts/smoke-test-inspector-billing-evidence-20.5a5.mjs` (30/30 PASS)  
**E2E prod:** inspektor + admin + storage HEAD — PASS (2026-06-09)  
**Post-release cleanup:** nota E2E + 3 pliki storage usunięte z Okulickiego 22 m.9

**Poza scope (backlog):** usuwanie załączników po zapisie, upload admina, nowa pozycja billing przez inspektora.

---

## Kluczowe pliki (20.5A)

| Plik | Rola |
|------|------|
| `src/lib/recoverable-charges.ts` | Model, helpery, agregacja, draft from job |
| `src/lib/job-wm.ts` | Model notatek billing + `JobNoteAttachment` (20.5A.5) |
| `src/lib/billing-evidence-upload.ts` | Upload dowodów billing (20.5A.5) |
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
- Payroll, leaves (poza planowanym 20.5A.6+)

---

## Testy regresji (closeout 20.5A.5 / 2.50.42)

```bash
npm run build
npx vite-node scripts/smoke-test-inspector-billing-evidence-20.5a5.mjs
npx vite-node scripts/smoke-test-inspector-billing-notes-20.5a4.mjs
npx vite-node scripts/smoke-test-jobs-2.0-midb.mjs
npx vite-node scripts/smoke-test-mobile-fix-pack-2.50.1.mjs
```

Wszystkie **ALL PASS** przy closeout `d3874ad` (prod bundle **2.50.42**).

---

## Testy regresji (closeout 20.5A.4)

```bash
npm run build
npx vite-node scripts/smoke-test-inspector-billing-notes-20.5a4.mjs
npx vite-node scripts/smoke-test-inspector-billing-20.5a3a.mjs
npx vite-node scripts/smoke-test-inspector-20.2a.mjs
```

Wszystkie **ALL PASS** przy closeout `9990921` (prod bundle **2.49.80** na obu domenach).
