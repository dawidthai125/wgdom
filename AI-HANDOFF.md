# AI-HANDOFF — W&G DOM

> Pełny handoff dla nowego AI. Architektura, workflow, SSOT, zasady, mapa modułów, zakazy, stan.

| Meta | Wartość |
|------|---------|
| **Ostatnia aktualizacja** | 2026-07-03 |
| **Commit (HEAD `main`)** | `fd56cf7` |
| **Production version (UI)** | **v2.63.27** |
| **Status** | **STABILIZATION WINDOW ACTIVE** |

---

## 1. Przegląd produktu

W&G DOM to produkcyjna aplikacja SaaS/PWA dla firmy budowlano‑elektrycznej. Domeny:

- **Roboty (Jobs)** — zlecenia, dokumentacja robocza (`workerReports[]`), pliki (`jobFiles[]` / `jobAttachments[]`), zdjęcia, billing „Do rozliczenia".
- **Lista Płac (Payroll)** — tygodniowe rozliczenia (`kw-week-employees`), archiwum tygodni (`kw-archive`), rollover, carry‑forward (MODEL A freeze), nieobecności (`kw-employee-leaves`), status „Rozliczony".
- **Przetargi (Tenders / COMMAND CENTER AI)** — pipeline BZP, discovery dokumentów, kwalifikacja ofertowa, kosztorys PRO (BOQ Explorer), automatyzacja.
- **WM Druk** — Odbiory (`wm_print`), Pomiary Elektryczne (EM), Schematy jednokreskowe, generatory PDF/DOCX (ZI Tauron 2026).
- **Audit Hub** — read‑only feed audytowy (Super Admin), 7 źródeł.

---

## 2. Architektura (wysokopoziomowo)

```
┌───────────────────────────────────────────────┐
│  Klient: React 18 + Vite 6 + TS (PWA/Capacitor)│
│  ─ src/app/App.tsx  (monolit UI + orkiestracja)│
│  ─ src/app/*  panele widoków                    │
│  ─ src/lib/*  logika domenowa (pure gdzie się da)│
│  ─ src/lib/cloud-sync.ts  ← SSOT merge/sync KLIENT │
└───────────────┬───────────────────────────────┘
                │ HTTPS (fetch/persist per klucz KV)
┌───────────────▼───────────────────────────────┐
│  Supabase Edge Function                        │
│  supabase/functions/make-server-0afb8820/index.tsx │
│  ← SSOT merge/sync EDGE (mirror parytetu)      │
│  KV store (klucze DATA_KEYS)                    │
└────────────────────────────────────────────────┘

Deploy: git push origin main → Vercel (frontend)
        push supabase/functions/** → GitHub Actions (Edge)
```

- **Stack:** React 18.3, Vite 6.3, TypeScript, MUI 7 + Radix + Tailwind 4, react-router 7, pdf‑lib/pdfmake/pdfjs/docx, xlsx, Capacitor 8.
- **Persystencja:** Supabase KV per klucz `kw-*` (30 kluczy w `DATA_KEYS`). Brak klasycznej bazy relacyjnej dla danych domenowych — merge po stronie klienta i Edge.
- **PWA:** service worker `wgdom-shell-{APP_VERSION}` generowany build‑time z `changelog-data.ts`.

---

## 3. SSOT — Single Source of Truth

| Obszar | Plik / miejsce |
|--------|----------------|
| **Merge/sync klient** | `src/lib/cloud-sync.ts` |
| **Merge/sync Edge** | `supabase/functions/make-server-0afb8820/index.tsx` |
| **Lista kluczy KV** | `DATA_KEYS` w `cloud-sync.ts` (30 kluczy `kw-*`) |
| **UI + orkiestracja** | `src/app/App.tsx` |
| **Wersja UI** | `src/app/changelog-data.ts` (`CHANGELOG[0]`) |
| **Architektura (living doc)** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| **Baseline prod** | [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) |
| **Mapa widoków/modułów/KV** | [`docs/AGENT-APP-MAP.md`](docs/AGENT-APP-MAP.md) |
| **Workflow deweloperski** | [`AGENTS.md`](AGENTS.md) |
| **Workflow Przetargi (Hub/Process Strip/V4)** | [`docs/WORKFLOW-ARCHITECTURE-v2.63.md`](docs/WORKFLOW-ARCHITECTURE-v2.63.md) |

### Zasada parytetu klient↔Edge (KRYTYCZNA)

Logika merge listy płac istnieje **dwukrotnie** — w `cloud-sync.ts` (klient) i w Edge `index.tsx` (serwer). Funkcje takie jak `mergeWeekEmployeeRecord`, `pickSettledByTimestamps`, `pickDaysByTimestamps`, `pickSettledUpdatedAtForMerge` są ręcznie mirrorowane. **Wynik merge musi być identyczny po obu stronach** (regresja B6). Zmieniając jedną stronę, oceniasz wpływ na drugą i utrzymujesz parytet (test `scripts/test-payroll-edge-parity-b6.mjs`).

---

## 4. Model danych Payroll (najczęściej dotykany, najbardziej wrażliwy)

- `WeekEmployee` — rekord pracownika w tygodniu (`id`, `directoryId`, `name`, `rate`, `days`, `settled`, znaczniki `*UpdatedAt`).
- Merge oparty na **Last‑Write‑Wins** po znacznikach: `dataUpdatedAt` (dane/dni), `rateUpdatedAt` (stawka), `settledUpdatedAt` (status rozliczenia).
- **UNION po `weekEmployeeMergeKey`** (directoryId / legacy name|id) dla listy rostera — z guardami week‑scope i tombstonami.
- **Tombstones** (`kw-week-employees-deleted-ids`) — week‑scoped, żeby usunięty pracownik nie wracał z chmury.
- **Richness override** w `finalizePayrollBundleMerge()` — bogatszy skład z chmury jest adoptowany, ale status `settled` rozstrzygany LWW (PR‑PAY‑S5), nie richness.

Historia P0 (dlaczego to wrażliwe): dodatywny UNION rostera (`1a65341`) → seria naprawcza S1 (week guard), S2 (tombstones), S3 (zero‑hours clear‑wins), S5 (settled persistence). **Payroll P0 Incident CLOSED.**

---

## 5. Mapa modułów (gdzie czego szukać)

| Moduł | Kluczowe pliki |
|-------|----------------|
| **Sync / merge** | `src/lib/cloud-sync.ts`, `src/lib/payroll-week-employee-merge.ts`, Edge `index.tsx` |
| **Payroll** | `src/app/PayrollView.tsx`, `src/lib/payroll-*.ts` (carry-forward, rollover, cycle, leave-overlay, export) |
| **Roboty (Jobs)** | `src/app/JobsView.tsx`, `src/lib/job-*.ts`, `files-hub-index.ts`, `recoverable-charges.ts` |
| **Przetargi** | `src/app/tenders/*`, `src/lib/tenders-*.ts`, `tender-*.ts`, `TendersModule` / `TendersProvider` |
| **Kosztorys PRO (BOQ)** | `src/lib/tender-dossier-*.ts`, NG‑04 (BOQ Explorer, benchmark, ATH fidelity) |
| **WM Druk / EM / Schematy** | `src/lib/wm-print/*`, `src/lib/electrical-measurements/*`, `src/lib/electrical-schematics/*`, `WmPrintView.tsx` |
| **Work Catalog** | `src/lib/work-catalog/*`, `src/app/hooks/useWorkCatalog.ts` (market quotes, adapters, CSV import) |
| **Audit Hub** | `src/lib/audit-hub/*`, `src/app/AuditHubView.tsx` |
| **Auth / ACL** | `src/lib/admin-auth.ts`, `app-settings.ts` |
| **Wersja / update** | `src/app/changelog-data.ts`, `app-version-check.ts`, `AppUpdateBanner.tsx` |
| **Test‑infra** | `test-infra/test-manifest.json`, `scripts/test-infra-orchestrator.mjs`, `scripts/test-*.mjs` |

> **Nie analizuj `App.tsx` linia po linii od zera** — najpierw `PROJECT-GUIDE.md` + `ARCHITECTURE.md` + `docs/AGENT-APP-MAP.md`.

---

## 6. Workflow (obowiązkowy)

```
AUDIT → DESIGN FREEZE → IMPLEMENT → BUILD → TEST → COMMIT → PUSH → VERIFY → CLOSE
```

- **One Bundle = One Goal** — jeden cel, minimalny zakres, commituj tylko relevantne pliki.
- **SSOT FIRST / AUDIT FIRST** — najpierw źródło prawdy i audyt, potem kod.
- **DESIGN FREEZE** — zamrożone założenia przed implementacją (dla większych bundli).
- **TEST** — Golden Regression + odpowiedni gate (A/B/C) w test‑infra.
- **CLOSE** — pełny raport (AUDIT / IMPLEMENT / TEST / VERIFY / COMMIT / PUSH / STATUS) + aktualizacja `CURRENT-TASK.md` / `PROJECT-HANDOFF-CURRENT.md`.

Release / deploy A/B/C i VERIFY FAST: [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md).

---

## 7. Testowanie (test‑infra)

- **Manifest SSOT:** `test-infra/test-manifest.json` (klasy `lib`/`smoke`/`e2e`/`audit`, `releaseTier` A/B/C, `condition` np. `scope:payroll`).
- **Orchestrator:** `node scripts/test-infra-orchestrator.mjs --suite <suite> --scope <scope>` lub `--gate <A|B|C>`.
- **Gate B (regresja):** np. `node scripts/test-infra-orchestrator.mjs --suite gate-b-relevant --scope payroll`.
- **Golden test:** pojedynczy plik `npx vite-node scripts/test-*.mjs`.
- **E2E mobile:** Playwright (`npm run test:mobile` i pokrewne).

Szczegóły: [`docs/TEST-INFRA-LIFECYCLE.md`](docs/TEST-INFRA-LIFECYCLE.md).

---

## 8. Czego NIE wolno robić

- ❌ **Nowe epiki** — STABILIZATION WINDOW ACTIVE; start tylko na jawne polecenie właściciela.
- ❌ **Zmiana sync/merge bez audytu i bez parytetu klient↔Edge** (`cloud-sync.ts` ↔ Edge `index.tsx`) — patrz `ARCHITECTURE.md` § 11.
- ❌ **Zmiana modelu Payroll** (MODEL A carry freeze, tombstones, week‑scope guard, zero‑hours, settled LWW) bez briefu.
- ❌ **NG‑05 MPI implementacja** — IMPLEMENT BLOCKED (AD‑01 legal + STABILIZATION + owner command).
- ❌ **`vercel deploy` / `vercel --prod`** — deploy wyłącznie przez `git push origin main`.
- ❌ **Retry/polling `version.json`** — VERIFY DEPLOY FAST (jedno `curl`), nie czekaj na propagację.
- ❌ **Commit śmieci:** `_206_app.txt`, `_old_app.txt`, `restore-lista-plac-*.json`, `supabase/.temp/`, `icons/`, `music/`.
- ❌ **Zgadywanie architektury** — czytaj SSOT.
- ⚠️ **PowerShell:** brak `&&`/heredoc; rozdzielaj `;`; commit message przez `git commit -F <plik>`.

Dług i pułapki: [`TECHNICAL-DEBT.md`](TECHNICAL-DEBT.md).

---

## 9. Aktualny stan projektu

- **Prod v2.63.27** GREEN · HEAD `fd56cf7`.
- **Payroll P0 Incident** (S1–S3, S5) — **CLOSED** (guardy + Golden Regression w Gate B).
- **Work Catalog** P3.1/P3.2 CLOSED; P3.3 UX w design freeze (decyzje pending).
- **STABILIZATION WINDOW ACTIVE** — utrzymanie, W01 Health GREEN, Z‑05 field validation PENDING (device).
- **NG‑05 MPI** — DESIGN COMPLETE, IMPLEMENT BLOCKED.

Szczegóły: [`PROJECT-STATUS.md`](PROJECT-STATUS.md) · [`ROADMAP.md`](ROADMAP.md) · [`CHANGELOG-SUMMARY.md`](CHANGELOG-SUMMARY.md).

---

## 10. Dalsze źródła

- [`AI-START-HERE.md`](AI-START-HERE.md) — wejście
- [`CURSOR-HANDOFF.md`](CURSOR-HANDOFF.md) — praca agenta Cursor
- [`AGENTS.md`](AGENTS.md) — pełne zasady + indeks handoffów tematycznych
- [`PROJECT-GUIDE.md`](PROJECT-GUIDE.md) — jak działa projekt + Known Issues
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — living document
- [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md) — baseline prod (SSOT)
