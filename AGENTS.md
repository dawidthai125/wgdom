# W&G DOM — instrukcja dla agentów AI i programistów

> **Zanim cokolwiek zmienisz — przeczytaj pliki poniżej w tej kolejności.**

---

## START HERE

```text
1. AGENTS.md              ← ten plik (JAK pracować)
2. docs/PROJECT-HANDOFF-CURRENT.md  ← ★★ SSOT baseline prod (2.59.24, commity, decyzje)
3. docs/ZI-2026-HANDOFF.md            ← ★★★ ZI Tauron 2026 prod SSOT (PRODUCTION STABLE)
4. docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md  ← ★★ Odbiory WM Druk (P0 CLOSED · ZI 2026 STABLE)
5. docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md  ← ★★ Notatki operacyjne P0→HF (COMPLETE)
6. docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md  ← ★★ P3 wycena · BZP · P3.6 · P1 WM
7. docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md  ← ★★ P2-H dokumenty · ZIP · 7Z · Marketplanet
8. docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md  ← ★★ UX.1A/1B workspace + ARCH-001 (COMPLETE)
9. docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md  ← ★★ P2-F kwalifikacja ofertowa (COMPLETE)
10. docs/SESSION-HANDOFF-DASHBOARD-V3.md  ← ★★ Pulpit V3 — operacje, liczniki, backlog
11. CURRENT-TASK.md        ← ★ status sesji / wznowienie
12. docs/WORKFLOW-RELEASE-DEPLOY.md  ← ★★ release/deploy A/B/C + VERIFY (oficjalny)
13. docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md  ← Dashboard V2 (historyczny — nie przywracać Hero)
14. docs/PROJECT-HANDOFF.md  ← proces AUDIT→RCA→PLAN→IMPLEMENT (baseline → CURRENT)
15. docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md  ← backup baseline 2.50.64
16. docs/BACKUP-REPORT-2.50.64.md  ← pre-feature backup + storage-full
17. docs/AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md  ← audyt 100% storage
18. docs/PROJECT-HANDOFF-FINAL-20.5Z.md  ← oficjalny handoff końcowy serii 20.5Z (COMPLETE)
19. docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md  ← seria 20.5Z — szczegóły sprintów
20. docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md  ← Files Hub 20.5A.12
21. docs/RELEASE-REPORT-20.5Z.2B.md  ← E2E Version Awareness (20.5Z.2B)
22. docs/RELEASE-REPORT-20.5A.12.md  ← Files Hub Consolidation (2.50.58)
23. docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md  ← Roboty UX, Version, Worker Mobile
24. docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md  ← pliki roboty (trzy warstwy)
25. docs/archive/command-center/  ← CC historyczny (SUPERSEDED v2.51.0)
26. docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md  ← Billing + Roboty 20.3A–20.5A.6 CLOSED
27. docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md  ← Seria 2.50.x CLOSED (desktop scroll + mobile + MID-B)
28. docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md  ← gotowość worker/admin/inspektor GO
29. PROJECT-GUIDE.md       ← JAK działa projekt (+ Known Issues)
30. docs/ARCHITECTURE.md   ← pełna architektura (§ 12.1.7 P2-H, § 12.1.5 P2-F, § 9.2 inspektor, § 11 sync)
31. docs/ARCHITECTURE.md § 12.1.3  ← Przetargi 3.0 (TendersModule)
32. CHANGELOG.md          ← CO już zrobiono (skrót)
33. changelog-data.ts → CHANGELOG[]  ← źródło prawdy wersji + UI zakładka „Zmiany”
```

### WAŻNE

- **Nie zgaduj architektury** — sprawdź `PROJECT-GUIDE.md` i `docs/ARCHITECTURE.md`.
- **Nie zmieniaj syncu / merge** bez przeczytania ARCHITECTURE § 11.
- **Przed większą zmianą** przeczytaj **Known Issues** w `PROJECT-GUIDE.md`.
- **Na końcu sesji** zaktualizuj `CURRENT-TASK.md` + `docs/PROJECT-HANDOFF-CURRENT.md` (baseline prod, commity, decyzje).
- Hasło użytkownika: **„kontynuuj WGDOM”** → czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`.

---

## 1. Rola każdego pliku

| Plik | Pytanie, na które odpowiada |
|------|-----------------------------|
| **AGENTS.md** | Jak pracować nad projektem? (zasady, workflow, zakazy) |
| **PROJECT-GUIDE.md** | Jak działa projekt? (architektura, API, pułapki) |
| **docs/ARCHITECTURE.md** | Pełny techniczny przewodnik (living document) |
| **CHANGELOG.md** | Co zostało zrobione? (skrót dla AI) |
| **CURRENT-TASK.md** | Gdzie skończyliśmy? (wznowienie po nowym koncie / miesiącu) |
| **audit/ZI-FINAL-HANDOFF.md** | **Historyczne RCA LiveCycle 2021** — CLOSED · superseded by ZI 2026 |
| **docs/ZI-2026-HANDOFF.md** | **★★★ ZI Tauron 2026 prod SSOT** — PRODUCTION STABLE |
| **docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md** | **★★ Odbiory WM Druk** — P0 CLOSED · ZI 2026 STABLE |
| **docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md** | **★★ Notatki operacyjne COMPLETE** (v2.57.0–2.58.1) — P0→P2C+HF, KV, ACL, testy, backlog P3 |
| **docs/SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md** | **★★ P3 wycena · BZP pipeline · P3.6 filtry · P1 WM** (2.56.0–2.56.10) |
| **docs/SESSION-HANDOFF-P2-H-TENDER-DOCUMENTS.md** | **★★ P2-H dokumenty / ZIP / 7Z / Marketplanet** (H.1–H.6 CLOSED) |
| **docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md** | **★★ UX.1 Tender Workspace CLOSED** (2.53.1–2.53.4) — 5 tabs, lazy render, Anti-CC, ARCH-001 |
| **docs/PROJECT-HANDOFF-CURRENT.md** | **★ SSOT baseline prod** — wersja, commity, releasy po 20.5Z, decyzje |
| **docs/SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md** | **★ Pre-next-feature** — 5A/5B, backup, storage, komendy |
| **docs/BACKUP-REPORT-2.50.64.md** | Pre-feature backup v2.50.64 — artefakty, PASS/FAIL |
| **docs/AUDIT-STORAGE-BACKUP-COMPLETENESS-2.50.64.md** | Audyt storage 100% — bucket, mapa kodu |
| **docs/SESSION-HANDOFF-PERFORMANCE-2.x-2026-06.md** | Performance 2.x **CLOSED** (`35614f0`) — startup 1119 KB, seria 2.2C→2.4A |
| **docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md** | Files Hub **20.5A.12 CLOSED** (`211364b`, v2.50.58) — hub UI, liczniki SSOT, bez migracji danych |
| **docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md** | Seria **20.5B.5–7 + 20.5B.6A.4** — Roboty UX, Dokumentacja naming, Version Awareness, Worker Mobile |
| **docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md** | Audyt operacyjny worker/admin/inspektor — **GO** |
| **docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md** | Generic Attachments **20.5A.10 CLOSED** (`e6758e5`, v2.50.52) — pliki roboty, trzy warstwy |
| **docs/archive/command-center/** | CC historyczny **SUPERSEDED** (v2.51.0) — polonizacja 20.3B archiwum |
| **docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md** | Seria **2.50.x CLOSED** — desktop scroll, mobile fix, MID-B, CI |
| **docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md** | Billing + Roboty **20.3A–20.5A.6 CLOSED** (`99295e5`, v2.50.44) |
| **docs/SESSION-HANDOFF-UX-1-TENDER-WORKSPACE.md** | **UX.1 CLOSED** (2.53.1–2.53.4) — 5 workspace tabs, lazy render, Anti-CC, ARCH-001 |
| **docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md** | **★★ P2-F CLOSED** (v2.51.19–2.51.24) — kwalifikacja ofertowa, profil wykonawcy, wykaz robót |
| **docs/SESSION-HANDOFF-DASHBOARD-V3.md** | **★★ Pulpit V3 (SSOT)** — operacje, liczniki, kategorie, backlog P1-B/P2 |
| **docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md** | Dashboard V2 **historyczny** — Hero usunięty w V3 |
| **docs/PROJECT-HANDOFF-FINAL-20.5Z.md** | **★ Oficjalny handoff końcowy 20.5Z** — baseline, architektura, E2E, PWA, readiness, werdykt COMPLETE |
| **docs/SESSION-HANDOFF-20.5Z-PLATFORM-STABILIZATION.md** | Seria **20.5Z CLOSED** — szczegóły sprintów, komendy, pułapki E2E |
| **docs/PROJECT-HANDOFF.md** | Proces AUDIT→RCA→PLAN→IMPLEMENT · baseline historyczny → użyj **PROJECT-HANDOFF-CURRENT** |
| **docs/SETTLEMENT-WORKFLOW-AUDIT-20.4A.md** | Audyt settlement ledger — design 20.4A |
| **docs/SETTLEMENT-REPORTING-AUDIT-20.4C.md** | Audyt reporting + dashboard KPI |
| **docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md** | Sprint 20.1B **CLOSED** — saved ≠ closed, defer po zapisie, live vs snapshot |
| **docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md** | Sprint 20.1A **CLOSED** (`f24fafe`) — odroczenie wypłaty, MODEL A, archive freeze |
| **docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md** | Sprint 20.0A **CLOSED** (`778f616`) — nieobecności, overlay payroll, tombstones |
| **docs/SESSION-HANDOFF-PERFORMANCE-2026-06.md** | Performance 1.x CLOSED — CloudLoader CORE/DEFERRED, pomiary, tag `v2.45.34-perf-1.3a` |
| **docs/SESSION-HANDOFF-2026-06.md** | Handoff sesji: audyty, commity, Roboty 2.0, UX greeting |
| **docs/jobs-2.0-product-audit.md** | Audyt produktowy Roboty (MIN/MID/FULL) |
| **docs/dead-code-audit-2026-06.md** | Martwy kod — repo-wide |
| **docs/permissions-roles-audit-2026-06.md** | Uprawnienia Przetargów — PASS |
| **docs/INCIDENTS-2026-06.md** | Incydenty stabilności — payroll, admin passwords, media (czerwiec 2026) |
| **`changelog-data.ts` → CHANGELOG** | Źródło prawdy wersji + UI użytkownika (zakładka Zmiany, lazy `GuideView`) |

**Nie analizuj `App.tsx` plik po pliku od zera** — najpierw PROJECT-GUIDE + ARCHITECTURE.

---

## 2. Przy każdej zmianie w kodzie

1. Implementacja (+ chmura, jeśli dane trwałe)
2. `CHANGELOG` w `src/app/changelog-data.ts` (nowy wpis na górze)
3. **`CHANGELOG.md`** — dopisz ostatnią wersję (skrót)
4. Instrukcja użytkownika (`HelpView`, hinty) — jeśli widoczne w UI
5. **`docs/ARCHITECTURE.md`** — sekcja dotycząca zmiany + data na górze
6. **`CURRENT-TASK.md`** + **`docs/PROJECT-HANDOFF-CURRENT.md`** — na końcu większej sesji
7. Podsumowanie po **polsku**

Szczegóły: [`.cursor/rules/wgdom-development.mdc`](.cursor/rules/wgdom-development.mdc) · skrót: [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md)

---

## 2a. Release / deploy (obowiązkowy)

**★ Źródło prawdy:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

**Frontend:** `git push origin main` → Vercel Git Integration (auto-build). **Nie** używaj `vercel deploy` / `vercel --prod`.

**VERIFY DEPLOY FAST** — po push **jedno** `curl -s https://www.wgdom.fun/version.json`, potem **koniec raportu**:

| `version.json` | Deploy | PRODUCTION VERIFIED |
|----------------|--------|---------------------|
| Oczekiwana wersja | PASS | TAK |
| Poprzednia wersja | **DEPLOY PROPAGATING** | NIE |
| Push FAIL | FAIL | NIE |

**RELEASE GO** = build + smoke (B/C) + commit + push PASS — **nie czekaj** na propagację Vercel.

**Zakazane:** retry/sleep/polling `version.json`, GitHub Deployments API, Vercel API, oczekiwanie na SUCCESS deployment.

Szczegóły: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md) § 3.

| Zakres | Workflow |
|--------|----------|
| **A — minor** (docs, hotfix import) | build → commit → push → verify FAST → report |
| **B — functional UI** | build → relevant smoke → commit → push → verify FAST → report |
| **C — major release** | build → smoke → E2E → commit → push → verify FAST → report |

---

## 3. Szybkie fakty

| | |
|---|---|
| Produkcja | https://www.wgdom.fun |
| Repo | https://github.com/dawidthai125/wgdom · branch `main` |
| Wersja UI | `CHANGELOG[0].version` w `changelog-data.ts` (**2.59.24**) |
| Prod `main` (app) | **v2.59.24** · WM Druk COMPLETE · **ZI Tauron 2026 PRODUCTION STABLE** · Notatki COMPLETE · P3.6 + P1 WM |
| Poprzedni feature | **2.1.0** · **v2.50.69** · commit **`5391d03`** |
| SSOT handoff | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| Dashboard V2 docs | [`docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](docs/SESSION-HANDOFF-20.7-DASHBOARD-V2.md) |
| Git tag backup | **`pre-next-feature-2.50.64`** → `c7bc58f` (snapshot przed 5C) |
| E2E `main` | **20.5Z.2B** · **`8906485`** · `test:e2e:happy` + `test:e2e:version` · CI `#27260457990` |
| E2E komendy | `npm run build` → `preview @4173` → `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy` / `test:e2e:version` |
| Seria 20.5Z | **COMPLETE** — audyt 20.5Z.3 **GO** · [`PROJECT-HANDOFF-FINAL-20.5Z.md`](docs/PROJECT-HANDOFF-FINAL-20.5Z.md) |
| PWA prod | SW **`wgdom-shell-2.50.65`** · build-time z `CHANGELOG[0]` (20.5Z.2A infra · commit **`46556a7`**) |
| Jobs Cleanup `main` | **20.5Z.4A** · **`640e3a9`** · deploy **`5000967334`** · ukryte KPI/kolejki Bez ekipy + WM po terminie |
| Performance 2.x (baza) | commit **`35614f0`** · tag `v2.45.38-perf-2.4a` · seria **CLOSED** |
| Payroll carry (łańcuch) | 20.0A `778f616` → 20.1A `f24fafe` → 20.1B **`74e65d9`** |
| Frontend deploy | push `main` → Vercel |
| Backend deploy | push `supabase/functions/**` → GitHub Action |
| Sync | `src/lib/cloud-sync.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/index.tsx` |
| Monolit UI | `src/app/App.tsx` (+ panele w `src/app/`) |

---

## 3a. Moduł przetargów + COMMAND CENTER (skrót)

- **Pulpit + Przetargi:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.3 — `TendersShortcutPanel`, `TendersModule`, `TendersProvider`
- **CC archiwum:** [`docs/archive/command-center/`](docs/archive/command-center/) — **SUPERSEDED** (v2.51.0)
- **Etykiety PL:** `src/lib/tenders-strategy-ui-labels-pl.ts` — źródło prawdy (20.3B+); marka COMMAND CENTER AI bez zmian
- **Lista BZP / pipeline:** **ARCHITECTURE.md § 12.1.1**. Kluczowe pliki:

- `src/lib/tenders-bzp.ts` — pipeline, typy, API klienta, scoring
- `src/lib/tenders-actions.ts` — chipy akcji, auto-wynik BZP, alerty pulpitu, .ics
- `src/lib/tenders-bzp-analyze-local.ts` — analiza SWZ pdf.js (klient)
- `src/lib/tenders-wadium.ts` — wadium + blokada vs limit profilu
- `src/lib/tenders-map-coords.ts` + `TendersMapPanel.tsx` — **mapa OSM** Wrocław + markery
- `src/app/TenderKeywordsPanel.tsx` — własne słowa kluczowe (+ wbudowany słownik w kodzie)
- `src/app/TenderBidPrepPanel.tsx` — karta ofertowa
- Edge: `GET /tenders-bzp-*`, `GET /tenders-bzp-award-result`, `POST /tenders-external-discover`

---

## 3c. FAZA 8 — Tender → Job (CLOSED, nie rozpoczynaj 8.5 bez polecenia)

**Prod:** `88c25f8` · pełny opis: **ARCHITECTURE.md § 12.1.4**

| Etap | Skrót |
|------|--------|
| 8.0 | `executeCreateJobFromTender`, `TenderJobLinkButtons` |
| 8.0A | Jeden `useTendersPipeline` w Provider; Classic × CC |
| 8.1 | Kwota + daty z umowy / `implementationDays` |
| 8.2 | Baner kontraktu, `plannedHandoverDate`, attach → dokumenty |
| 8.3 | Executive KPI + Utwórz/Otwórz robotę |
| 8.4 | Fallback dat z SWZ (`resolveJobDraftDatesFromTender`) |

**Nie zmieniaj bez polecenia:** pipeline, Provider, `linkedJobId`, `TenderJobLinkButtons` (tylko reuse).

---

## 3b. Galeria admin (skrót)

Szczegóły: **ARCHITECTURE.md § 12.1.2**.

- `JobPhotosGalleryView` w `App.tsx` — zakładka **Zdjęcia**
- `src/lib/photo-download.ts` — `downloadJobGalleryZip`

---

## 3d. Nieobecności pracowników — Sprint 20.0A (**CLOSED**, prod `778f616`)

- **Handoff:** [`docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md`](docs/SESSION-HANDOFF-20.0A-EMPLOYEE-LEAVES.md)
- **Architektura:** **ARCHITECTURE.md § 10.1** — `kw-employee-leaves`, `kw-employee-leaves-deleted-ids`, overlay, archive freeze
- **Pliki:** `employee-leaves.ts`, `payroll-leave-overlay.ts`, `EmployeeLeavesSection.tsx`, `PayrollView.tsx`, `payroll-export.ts`
- **Test smoke:** `npx vite-node scripts/smoke-test-employee-leaves-20.0a.mjs`

**Nie zmieniaj bez polecenia:** merge leaves + tombstones, overlay archiwum (snapshot-only), Edge walidacja leaves.

---

## 3e. Odroczenie wypłaty — Sprint 20.1A (**CLOSED**, prod `f24fafe`, release **v2.45.38**)

- **Handoff:** [`docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md`](docs/SESSION-HANDOFF-20.1A-DEFERRED-PAYROLL.md)
- **Architektura:** **ARCHITECTURE.md § 10.1** — `payrollCarryForward`, MODEL A (frozen amount), archive snapshot freeze
- **Kluczowe pliki:**
  - `src/lib/payroll-carry-forward.ts` — logika defer, `canDeferPayroll`, `calcWeekEmployeeForPayroll`
  - `src/lib/payroll-carry-snapshot.ts` — snapshot carry (bez cyklu importów z `app-domain`)
  - `src/app/PayrollView.tsx` — UI ⏭, totals, export
  - `src/app/WeekEmployeeDetail.tsx` — przycisk defer, banery carry
- **Test smoke:** `npx vite-node scripts/smoke-test-payroll-carry-forward-20.1a.mjs`, `scripts/post-smoke-20.1a.mjs`

**Biweekly carry forward nieobsługiwany w V1** — tylko tygodniówka; wypłata co 2 tygodnie → `biweekly_blocked`.

**Nie zmieniaj bez polecenia:** MODEL A freeze, merge `pickPayrollCarryForward`, closed vs saved semantics (20.1B).

---

## 3f1. Rollover + dashboard alerts — Sprint 20.1C (**CLOSED**, prod `75de889`, v2.49.40)

- **20.1C** (`c6614cc`, v2.49.20): `blocksPayrollRollover` — blokuje tylko nierozliczoną kasę sobotnią
- **20.1C.1** (`a728528`, v2.49.30): sync integrity — bootstrap week mismatch, push po rolloverze
- **20.1C.2** (`75de889`, v2.49.40): **DashboardView** alerty = `listPayrollRolloverBlockers` (nie `!settled`)
- **Kluczowe pliki:** `payroll-rollover.ts`, `DashboardView.tsx`, `cloud-sync.ts` (20.1C.1)
- **Smoke:** `smoke-test-payroll-rollover-20.1c.mjs`, `smoke-test-payroll-dashboard-20.1c2.mjs`, `smoke-test-payroll-rollover-sync-20.1c1.mjs`

**Nie zmieniaj bez polecenia:** rollover w `App.tsx`, MODEL A carry, archiwum, cash split, sync merge.

---

## 3e2. Closed week semantics — Sprint 20.1D (**CLOSED** po deploy, v2.49.60)

- **Problem:** Nd ≥20:00 + `hasPayrollRolloverBlockers` — zegar W2, stan W1; `isPayrollWeekClosed` = fałszywy „historyczny”
- **Fix:** `isPayrollWeekClosedForUi(week, hasRolloverBlockers)` — blockers → operacyjny (defer ⏭, live lista, snapshot refresh)
- **Pliki:** `payroll-cycle.ts`, `PayrollView.tsx`, `App.tsx`, `payroll-leave-overlay.ts`
- **Smoke:** `npx vite-node scripts/smoke-test-payroll-week-closed-20.1d.mjs` (T1–T6)

**Nie zmieniaj bez polecenia:** `isPayrollWeekClosed` (legacy kalendarzowe), logika blockers 20.1C.

---

## 3f. Carry workflow — Sprint 20.1B (**CLOSED**, prod `74e65d9`, v2.45.39)

- **Handoff:** [`docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md`](docs/SESSION-HANDOFF-20.1B-CARRY-WORKFLOW.md) — **czytaj najpierw** (audyt Kamila → fix → deploy)
- **Architektura:** **ARCHITECTURE.md § 10.1** — `isPayrollWeekSaved`, `isPayrollWeekClosedForUi`, `refreshSavedActiveWeekSnapshot`
- **Test smoke:** `npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs`, `scripts/pre-commit-verify-20.1b.mjs`

**saved ≠ closed** — defer ⏭ do rolloveru; zapisany operacyjny tydzień = live payroll + auto snapshot refresh.

**Kontekst z sesji 2026-06-06:** 20.1A traktował `savedWeeks` jak archiwum (`archived_week`) — po „Zapisz tydzień” ⏭ znikał. 20.1B naprawia to bez zmiany MODEL A freeze ani logiki urlopów 20.0A.

---

## 3g. Do rozliczenia + Roboty — Sprint 20.5A (**CLOSED**, prod `99295e5`, v2.50.44)

- **Handoff:** [`docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md`](docs/SESSION-HANDOFF-20.5A-BILLING-JOBS.md) · [`docs/PROJECT-HANDOFF.md`](docs/PROJECT-HANDOFF.md)
- **Architektura:** **ARCHITECTURE.md** § Do rozliczenia (2.47–2.50)
- **20.5A.6** (`99295e5`, v2.50.44): Billing Proposal B1 — inspektor `kw-jobs`, admin approve → `kw-recoverable-charges`; idempotency P1
- **20.5A.5** (`d3874ad`): dowody billing w uwagach (zdjęcia/PDF)
- **20.5A.4** (`9990921`): uwagi inspektora per pozycja
- **20.5A.3A** (`4fec9cc`): inspektor read-only billing review
- **Kluczowe pliki:** `recoverable-charges.ts`, `job-wm.ts`, `InspectorBillingProposalModal.tsx`, `BillingProposalReviewCard.tsx`, `JobRecoverableChargesPanel.tsx`, `InspectorPanel.tsx`, `JobsView.tsx`
- **Smoke:** `smoke-test-inspector-billing-proposal-20.5a6.mjs` (59), `smoke-prod-bundle-2.50.44.mjs`

**Nie zmieniaj bez polecenia:** KV/sync/merge settlements, dashboard KPI (20.4C), payroll, leaves, granica inspektor read-only charges.

---

## 3g2. Generic File Attachments — Sprint 20.5A.10 (**CLOSED**, prod `e6758e5`, v2.50.52)

- **Handoff:** [`docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](docs/SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) — **czytaj najpierw** przy pracy nad plikami roboty
- **Architektura:** **ARCHITECTURE.md § 12.1.2** — trzy warstwy: `jobFiles[]` / `jobAttachments[]` / obrazy
- **Model:** `jobAttachments[]` + `deletedJobAttachmentTombstones[]` — **NIE** rozszerzać `jobFiles[]`
- **Kluczowe pliki:** `job-attachments.ts`, `job-attachment-upload.ts`, `job-attachments-pack.ts`, `JobGenericAttachmentsSection.tsx`
- **Smoke:** `smoke-test-generic-attachments-20.5a10.mjs` (T1–T20) + regresja 20.5A.8/9, 20.5B.2/3

**Nie zmieniaj bez polecenia:** `jobFiles[]`, plan_techniczny, media-separation, tombstone 20.5B.3, billing sync.

---

## 3g3. Seria 20.5B — Roboty UX + Dokumentacja + Version Awareness (**CLOSED**, prod `1be7a80`, v2.50.56)

- **Handoff sesji:** [`docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md`](docs/SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md) — **czytaj najpierw** przy Roboty / dokumentacja / worker flow
- **Audyt operacyjny:** [`docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md`](docs/AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md) — worker → admin → inspektor **GO**

| Sprint | Wersja | Skrót |
|--------|--------|-------|
| **20.5B.7** | **2.50.56** | `/version.json`, banner odświeżenia, brak auto-reload |
| **20.5B.6A.1** | 2.50.55 | Raporty → **Dokumentacja** (copy only) |
| **20.5B.5** | 2.50.54 | Filtr W trakcie, Socjalny, piec gazowy, docs plan PDF |

- **Model dokumentacji:** `workerReports[]` w `kw-jobs` — wymiary = `rooms[]`, obrys = `sketch` (≠ plan PDF w `jobFiles[]`)
- **Kluczowe pliki:** `app-version-check.ts`, `AppUpdateBanner.tsx`, `JobWorkerReportsPanel.tsx`, `WorkerPhotoView.tsx`, `JobReportForm.tsx`
- **ARCHITECTURE:** § 9.1 (workflow dokumentacji), § 13.1 (version awareness)
- **Smoke:** `smoke-test-app-version-check-20.5b7.mjs`, `smoke-test-job-documentation-labels-20.5b6a.mjs`, `smoke-prod-bundle-2.50.56.mjs`

**Nie zmieniaj bez polecenia:** `workerReports[]` sync, auto-reload (20.5B.7C poza zakresem), media-separation 20.5A.8.

---

## 3g4. Files Hub Consolidation — Sprint 20.5A.12 (**CLOSED**, prod `211364b`, v2.50.58)

- **Handoff:** [`docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](docs/SESSION-HANDOFF-20.5A.12-FILES-HUB.md) — **czytaj najpierw** przy Roboty → Pliki / liczniki / Media
- **Architektura:** **ARCHITECTURE.md § 12.1.2** — Files Hub warstwa prezentacji
- **SSOT liczników:** `countFilesHubItems()` = jobFiles + workerReports + jobAttachments (bez photos, bez checklisty)
- **Kluczowe pliki:** `files-hub-index.ts`, `JobFilesHub.tsx`, `JobsView.tsx`, `MediaView.tsx`, `JobAllFilesView.tsx`
- **Smoke:** `smoke-test-files-hub-20.5a12.mjs`, `smoke-prod-bundle-2.50.58.mjs`

**Nie zmieniaj bez polecenia:** sync/KV/Edge, modele danych, semantyka ZIP/email. **12B.1-min:** kafle JobAllFilesView nadal tylko kontrakt — pełny hub w backlogu 12B.1-full.

---

## 3h. Polonizacja UI — Sprint 20.3B MIN (**CLOSED**, prod `3d6a63e`, v2.49.90)

- **Zakres:** prezentacja only — Pulpit CC executive, Action Center, decyzje przetargowe, Portfolio WM, billing Administrator
- **Mapy:** `ACTION_PRIORITY_LABEL_PL`, `DECISION_LABEL_PL` (bez nowych enumów)
- **Smoke:** `smoke-test-ui-language-20.3b.mjs` (T1–T8, 31/31)
- **Audyt:** `docs/UI-LANGUAGE-AUDIT-20.3B.md` · backlog **20.3B+** (pełny CC: AI Insights, Explainability, Financial Capacity)

**Nie zmieniaj bez polecenia:** marka COMMAND CENTER AI, enumy GO/HOLD/NO-GO w danych.

---

## 3i. Seria 2.50.x — MID-B + Mobile + Desktop Layout (**CLOSED**, prod `5a664c2`, v2.50.20)

- **Handoff:** [`docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md`](docs/SESSION-HANDOFF-2.50-DESKTOP-LAYOUT.md) — **czytaj najpierw** przy layout / Roboty mobile / e2e
- **Architektura scrollu:** **ARCHITECTURE.md § 6.2** — dokument `overflow: hidden`, scroll w widokach

| Wersja | Commit | Skrót |
|--------|--------|-------|
| **2.50.20** | **`5a664c2`** | Desktop — eliminacja podwójnego scrollbara admin (Fix A) |
| CI P0 | `74a013d` | Mobile audit + Playwright CI infrastructure |
| **2.50.10** | `4427b7a` | Mobile Fix Pack — toolbar, touch 44px, kolejki bez sticky |
| **2.50.00** | `860e8d9` | Roboty MID-B — Lista/Kolejki, filtr lidera |

- **Kluczowe pliki layout:** `index.html`, `src/styles/mobile.css`, `AdminViewRouter.tsx`, `DashboardView.tsx`, `MediaView.tsx`
- **Smoke:** `smoke-test-desktop-layout-2.50.20.mjs`, `smoke-test-mobile-fix-pack-2.50.1.mjs`, `smoke-test-jobs-2.0-midb.mjs`
- **E2E:** `e2e/desktop-layout.spec.ts`, `e2e/desktop-smoke.spec.ts` — `npm run test:mobile` (39 testów)

**Nie zmieniaj bez polecenia:** model scrollu dokumentu (2.50.20), mobile shell `<768px`, logika kolejek MID-B.

---

## 3j. Inspector Communication Templates — Sprint 2.1 (**CLOSED**, prod `ee2cd72`, v2.50.70)

- **Handoff SSOT:** [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) § Inspector 2.1
- **Architektura:** **ARCHITECTURE.md § 9.2** — szablony A–D, `isInspector`, `isDefaultInspector`, Edge `inspector_template`
- **2.1.0** (`5391d03`, v2.50.69): modal „Kontakt z inspektorem”, szablony, Resend
- **2.1.1** (`ee2cd72`, v2.50.70): domyślny odbiorca inspektora w Kontaktach + modal UX
- **2.1.2:** **CANCELLED** — nie implementować pełnej listy odbiorców z Kontaktów
- **Kluczowe pliki:** `email-contacts.ts`, `ContactsView.tsx`, `JobInspectorContactModal.tsx`, `job-email.ts`
- **Smoke:** `smoke-test-inspector-templates-2.1.mjs`

**Nie zmieniaj bez polecenia:** architektura 2.1.0+2.1.1, filtr `isInspector`, sync kontaktów KV.

---

## 3k. P2-F — Tender Qualification Pipeline (**CLOSED**, prod `e015453`, v2.51.24)

- **Handoff SSOT:** [`docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)
- **Architektura:** **ARCHITECTURE.md § 12.1.5** — SWZ → profil → dopasowanie → wykaz/referencje/ATH
- **P2-F.0–F.5** (`a2d0f8a` → `e015453`, v2.51.19–2.51.24): formal requirements, warunki udziału, doświadczenie, auto-build, referencje, wykaz PDF/DOCX
- **Klucz chmury:** `kw-company-profile` — schema v4 (`company-qualification-profile.ts`)
- **Kluczowe pliki:** `tender-participation-check.ts`, `tender-experience-check.ts`, `company-experience-discovery.ts`, `tender-works-register.ts`, `TenderBidPrepPanel.tsx`, `CompanyQualificationProfilePanel.tsx`
- **Test:** `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (161 PASS)

**Nie zmieniaj bez polecenia:** merge profilu, `referenceStatus`, parsery SWZ, reuse ATH viewer.

---

## 3l. Notatki operacyjne — P0→P2C+HF (**COMPLETE**, prod `1f8e2bd`, v2.58.1)

- **Handoff SSOT:** [`docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md`](docs/SESSION-HANDOFF-OPERATIONAL-NOTES.md)
- **Architektura:** **ARCHITECTURE.md** — sekcja Notatki operacyjne · § 15.1 (`operationalnotes`)
- **Fazy CLOSED:** P0 (2.57.0) · P1 (2.57.2) · P2B (2.57.4) · P2C (2.57.5) · P2A (2.58.0) · HF backup (2.58.1)
- **4 klucze KV:** `kw-operational-notes` · read-state · audit-log · deleted-ids — SSOT `OPERATIONAL_NOTES_BACKUP_KEYS`
- **Kluczowe pliki:** `operational-notes.ts`, `OperationalNotesView.tsx`, `InspectorPanel.tsx`, `DashboardOperationalNotesWidget.tsx`, `JobOperationalNotesPanel.tsx`
- **Test:** `test-operational-notes-p0.mjs` … `test-operational-notes-hotfix-2.58.1.mjs` (6 skryptów)

**Nie zmieniaj bez polecenia:** granica od `job.notes` / `job.jobNotes[]`; ACL inspektor (create/comment/ACK only); brak zapisu do `kw-jobs`.

**Backlog OPEN:** P3 Export (PDF/DOCX/Email) · P2A.1 panel inspektora w detalu roboty — tylko na polecenie.

---

## 4. Komendy

```bash
npm run dev          # localhost:5173
npm run build
npm run test:mobile  # Playwright → www.wgdom.fun
npm run audit:mobile # statyczny audyt mobile
```

---

## 5. Nie commitować

`_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`, `icons/`, `music/` (chyba że celowo).
