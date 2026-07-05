# W&G DOM — PROJECT GUIDE

> Odpowiada na pytanie: **„Jak działa ten projekt?”**  
> Pełna treść techniczna (~700 linii) → **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**  
> **Nie zgaduj architektury** — czytaj ARCHITECTURE przed większymi zmianami.

**Produkcja:** https://www.wgdom.fun · **Stack:** React/Vite · Supabase Edge · Vercel · PWA · Capacitor

---

## Mapa dokumentu (ARCHITECTURE.md)

| Sekcja | Temat |
|--------|--------|
| § 1 | Szybki start, komendy |
| § 2–3 | Stack, architektura wysokiego poziomu |
| § 4–9 | Bootstrap, auth, panele (admin / inspektor / pracownik) |
| § 9.1 | **Dokumentacja robót** — workerReports[], worker → admin → inspektor |
| § 10 | Model danych (`Job`, `WeekEmployee`, klucze LS) |
| § 11 | **Sync i merge** (`cloud-sync.ts`) — **KRYTYCZNE** · ADR: [`ADR-CLOUD-SYNC-ARCHITECTURE.md`](docs/architecture/ADR-CLOUD-SYNC-ARCHITECTURE.md) (**PROPOSED**) |
| § 12 | Supabase backend, endpointy, **§ 12.1.1 przetargi**, **§ 12.1.3 COMMAND CENTER + pulpit 7G + polonizacja 20.3B+** |
| — | **[`docs/AGENT-CONTINUITY-GUIDE.md`](docs/AGENT-CONTINUITY-GUIDE.md)** — ★★ kontekst sesji + mapa struktury (2026-06-26) |
| — | **[`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md)** — ★★ mapa systemu dla programistów |
| — | **[`docs/WORKFLOW-ARCHITECTURE-v2.63.md`](docs/WORKFLOW-ARCHITECTURE-v2.63.md)** — ★★ SSOT Workflow (Hub, CTA, zakładki V4) |
| — | **[`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)** — ★★ SSOT baseline prod (**2.63.41**) |
| — | **[`docs/work-catalog/FOUNDATION-FREEZE-v1.0.md`](docs/work-catalog/FOUNDATION-FREEZE-v1.0.md)** — ★★ Biblioteka Robót v3.0 P1 FREEZE |
| — | **[`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md)** — ★★ P1 Audit Hub WM EPIC CLOSED |
| — | **[`docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md)** — ★★ P0 Vercel deploy unblock |
| — | **[`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md)** — POST ZI · WM Druk COMPLETE |
| — | **[`docs/ZI-2026-HANDOFF.md`](docs/ZI-2026-HANDOFF.md)** — ZI Tauron 2026 prod |
| — | **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 12.1.8** — Odbiory WM Druk |
| — | **[`docs/archive/command-center/`](docs/archive/command-center/)** — CC historyczny (SUPERSEDED) |
| § 15.1 | **Mapa widoków admina** — router, menu, mobile nav |
| § 13–14 | Vercel, PWA, mobile |
| § 15–16 | Struktura katalogów, mapa `src/lib/` |
| § 17 | Jak bezpiecznie rozbudować |
| § 18 | Testy (`test:mobile`, `audit:mobile`) |
| § 19 | Czego nie commitować |
| § 22 | Historia kluczowych wersji |

---

Po hasłach **„kontynuuj WGDOM”** / nowa sesja (przetargi / Workflow):

1. [`docs/WORKFLOW-ARCHITECTURE-v2.63.md`](docs/WORKFLOW-ARCHITECTURE-v2.63.md) — **SSOT Workflow**
2. [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md)
3. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
4. [`CURRENT-TASK.md`](CURRENT-TASK.md)

## Handoff sesji 2026-06-22 (Production Unblock + TP202A)

Po hasłach **„kontynuuj WGDOM”** / nowa sesja:

1. [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md)
2. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
3. [`docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md`](docs/SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md)
4. [`CURRENT-TASK.md`](CURRENT-TASK.md)

| Temat | Dokument |
|-------|----------|
| **Prod v2.62.31 — deploy unblock** | `SESSION-HANDOFF-PRODUCTION-UNBLOCK-2026-06-22.md` |
| **P1 Audit Hub WM (CLOSED)** | `audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md` · ARCHITECTURE § 15.6 |
| **Workflow Architecture** | `WORKFLOW-ARCHITECTURE-v2.63.md` |
| **SSOT baseline prod** | `PROJECT-HANDOFF-CURRENT.md` |

**Prod:** **2.63.41** @ `642a01d` · Work Catalog P2 **MVP PROD** (P2.1–P2.10) · Mobile Recovery **EPIC CLOSED** · P1 Audit Hub WM **EPIC CLOSED**

### Biblioteka Robót v3.0 (P1 Foundation + P2 MVP UI)

| Element | Wartość |
|---------|---------|
| Moduł | `src/lib/work-catalog/` — import `@/lib/work-catalog` |
| KV | `kw-wgdom-work-catalog`, `kw-wgdom-work-bundles` (legacy `kw-wgdom-cost-catalog` nadal w Przetargach) |
| FREEZE | [`docs/work-catalog/FOUNDATION-FREEZE-v1.0.md`](docs/work-catalog/FOUNDATION-FREEZE-v1.0.md) · [`P2-FREEZE-v1.0.md`](docs/work-catalog/P2-FREEZE-v1.0.md) |
| UI prod | P2.1–P2.6 Roboty · P2.7–P2.9 Pakiety · **2.63.37–40** |
| Test suite | `smoke-work-catalog-p2-mvp` — **16** testIds |
| PB-3 bootstrap | **PROD** · cutover Przetargi (#5C) **OPEN** |
| Test golden | `npx vite-node scripts/test-work-catalog-golden.mjs` |

---

## Handoff sesji 2026-06-16 (POST ZI-2026)

Po hasłach **„kontynuuj WGDOM”** / nowa sesja:

1. [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md)
2. [`docs/PROJECT-HANDOFF-CURRENT.md`](docs/PROJECT-HANDOFF-CURRENT.md)
3. [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md)
4. [`CURRENT-TASK.md`](CURRENT-TASK.md)

| Temat | Dokument |
|-------|----------|
| **Prod v2.59.25 — WM Druk COMPLETE** | `MASTER-HANDOFF-POST-ZI-2026.md` |
| **ZI Tauron 2026** | `ZI-2026-HANDOFF.md` |
| **SSOT baseline prod** | `PROJECT-HANDOFF-CURRENT.md` |
| Notatki operacyjne | `SESSION-HANDOFF-OPERATIONAL-NOTES.md` |
| P3 Wycena · BZP | `SESSION-HANDOFF-P3-PRICING-BZP-PIPELINE.md` |
| Przetargi 3.0 | `ARCHITECTURE.md` § 12.1.3 |
| Worker/Inspector GO | `AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md` |

**Prod HEAD:** **`2b03c9d`** · **UI:** **2.59.25** · **WM Druk stream COMPLETE** · nowe funkcje WM Druk tylko po AUDIT+PLAN z użytkownikiem.

---

## Handoff sesji 2026-06-13 (historyczny — P3)

## Handoff sesji 2026-06-09 (historyczny)

| Temat | Dokument |
|-------|----------|
| **Prod v2.50.56 — seria 20.5B** | `SESSION-HANDOFF-20.5B-ROBOTY-DOC-VERSION-2026-06.md` |
| Worker/Inspector readiness GO | `AUDIT-WORKER-INSPECTOR-READINESS-20.5B.md` |
| Generic Attachments 20.5A.10 | `SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md` |
| Przetargi 3.0 | `PROJECT-HANDOFF-CURRENT.md` · `ARCHITECTURE.md` § 12.1.3 |
| CC archiwum | `docs/archive/command-center/` |
| Billing + Roboty 20.5A | `SESSION-HANDOFF-20.5A-BILLING-JOBS.md` |

**Prod HEAD:** **`1be7a80`** · **UI:** **2.50.56** · **Nie implementować** 20.5B.7C / 20.3C / Roboty 2.0 FULL bez polecenia.

---

## Known Issues — przeczytaj przed większą zmianą

### Sync (§ 11.3–11.5) — najczęstsze regresje

1. **Nigdy** nie trzymaj trwałych danych tylko w React state — zawsze LS + chmura.
2. Partial push musi iść przez `prepareKeysForCloudPush` — inaczej nadpiszesz edycje z innej karty.
3. Inspektor + admin w jednej karcie — storage events; między urządzeniami — merge po timestamp.
4. Usuwanie roboty → `addDeletedJobId` + `pushJobsAfterDelete`.
5. **Stale localStorage** może przywrócić usunięte klucze KV (admin passwords, martwe URL w jobs) — fix P11/P15 w `CloudLoader`; po incydencie **hard refresh**. → [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md)
6. **Payroll Guard** — nie omijaj `wouldBlockPayrollShrink` przy push listy płac.
7. **`kw-admin-passwords`** — osobny merge (`mergeAdminPasswordOverrides`), nie ogólny `mergeDataKey`.

### Stabilność czerwiec 2026 (prod `main` @ `92d574e`)

| Temat | Commit | Test |
|-------|--------|------|
| Payroll Guard | `db1d05a` | symulacja w `INCIDENTS-2026-06.md` |
| Bootstrap payroll P11 | `c9db032` | `scripts/test-p11-bootstrap-payroll.mjs` |
| Admin passwords P15 | `92d574e` | `scripts/test-p15-admin-password-merge.mjs` |

Operacje KV (Szymon/Paweł override, martwe URL) — tylko read-then-set ze snapshotem; szczegóły w INCIDENTS.

### Audit Hub + WM Druk (AUDIT-HUB-WM-001)

- **Audit Hub** agreguje 6 źródeł read-only — **nie** ma własnego Event Store.
- **WM Odbiory** logują do `kw-wm-print-history` → widoczne jako źródło `wm_print`.
- **WM Pomiary + Schematy** — **brak integracji** (RAP CRUD, PDF schematu nie trafia do Hub).
- Plan P1: [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md).

### Monolit UI

- Główny plik: `src/app/App.tsx` (bardzo duży) — szukaj widoków po nazwie, nie czytaj od zera.
- Nowe duże panele → `src/app/*.tsx` (wzór: `TendersView`, `InspectorPanel`).

### Deploy

**★ Workflow A/B/C:** [`docs/WORKFLOW-RELEASE-DEPLOY.md`](docs/WORKFLOW-RELEASE-DEPLOY.md)

- **Frontend:** `git push origin main` → Vercel Git Integration. **Nie** `vercel deploy` / `vercel --prod`.
- **Edge Function:** zmiany w `supabase/functions/**` → GitHub Action (`deploy-supabase.yml`).
- **VERIFY DEPLOY:** push OK + `version.json` prod + app OK — bez pollingu deployment API.
- Po release z bumpiem CHANGELOG → `npm run build` (generuje `dist/sw.js`, cache `wgdom-shell-{APP_VERSION}`). **Nie** edytuj `public/sw.js` (usunięty w 20.5Z.2A).

### Przetargi (stan v2.45.12)

- Mapa: kafelki **OpenStreetMap** + markery (`TendersMapPanel.tsx`, `tenders-map-coords.ts`).
- **Nie używać** `staticmap.openstreetmap.de` — domena niedostępna.
- Słownik scoringu: wbudowany w `tenders-bzp-keywords.ts` + opcjonalne własne w chmurze (`kw-tenders-custom-keywords`).

### Mobile

- Playwright ≠ prawdziwy Safari — krytyczne scroll/touch sprawdź na iPhone.
- Inputy ≥16px, touch target ≥44px.

Pełna lista pułapek → **ARCHITECTURE.md § 11.3, § 17**.

---

## Kluczowe pliki

| Obszar | Pliki |
|--------|--------|
| Sync | `src/lib/cloud-sync.ts` |
| Backend API | `supabase/functions/make-server-0afb8820/index.tsx` |
| Auth admin | `src/lib/admin-auth.ts` |
| Przetargi | `src/lib/tenders-bzp.ts`, `src/app/TendersView.tsx` |
| Deploy docs | `DEPLOY.md`, `SUPABASE-DEPLOY.md` |

---

## Powiązane dokumenty

| Plik | Rola |
|------|------|
| [`AGENTS.md`](AGENTS.md) | **Jak pracować** nad projektem (workflow deweloperski) |
| [`docs/AGENT-ONBOARDING.md`](docs/AGENT-ONBOARDING.md) | **Mapa systemu** — start dla nowego programisty |
| [`docs/MASTER-HANDOFF-POST-ZI-2026.md`](docs/MASTER-HANDOFF-POST-ZI-2026.md) | **POST ZI-2026** — skrót stanu prod |
| [`CHANGELOG.md`](CHANGELOG.md) | **Co zrobiono** — skrót ostatnich wersji |
| [`CURRENT-TASK.md`](CURRENT-TASK.md) | **Gdzie skończyliśmy** — wznowienie sesji |
| [`docs/INCIDENTS-2026-06.md`](docs/INCIDENTS-2026-06.md) | **Incydenty sync/payroll/admin** — czerwiec 2026 |
| [`guidelines/ROZWOJ.md`](guidelines/ROZWOJ.md) | Skrót reguł rozwoju |
