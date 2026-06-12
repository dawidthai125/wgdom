# PROJECT HANDOFF CURRENT — W&G DOM

> **★ Główny handoff projektu (SSOT)** · **Data closeout:** 2026-06-12 (P2-F CLOSED — Documentation closeout)  
> **Hasło agenta:** „kontynuuj WGDOM”  
> **Poprzedni handoff końcowy serii:** [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) — nadal ważny dla architektury platformy 20.5Z; **ten dokument** aktualizuje baseline prod i releasy **po** 20.5Z.

**Wejście dla nowego GPT / Cursor:**

```text
1. docs/PROJECT-HANDOFF-CURRENT.md        ← TEN PLIK (baseline prod)
2. docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md  ← P2-F kwalifikacja ofertowa (COMPLETE)
3. docs/SESSION-HANDOFF-DASHBOARD-V3.md   ← Pulpit V3 (COMPLETE — referencja)
4. CURRENT-TASK.md                         ← status sesji / wznowienie
5. docs/WORKFLOW-RELEASE-DEPLOY.md         ← workflow A/B/C
6. AGENTS.md → docs/ARCHITECTURE.md § 12.1.5
```

---

## 1a. Completed Epics (P1 + P2-F CLOSED)

| Epic | Wersja | Status | SSOT |
|------|--------|--------|------|
| **P2-F Tender Qualification** | 2.51.19–**2.51.24** (`e015453`) | **COMPLETE** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Dashboard V3** | 2.50.74 (`5a54399`) | **COMPLETE** | [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md) |
| **Command Center Removal** | 2.51.0 (`39b1892`) | **COMPLETE** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 |
| **Przetargi 3.0** | 2.51.0–2.51.1 | **COMPLETE** | `TendersModule` · `TendersProvider` |

**Command Center removed in v2.51.0** — archiwum docs: [`archive/command-center/`](archive/command-center/).

### Architektura produktu (główne domeny)

```text
Dashboard
Roboty
Do Rozliczenia
Przetargi (+ Karta ofertowa P2-F, Profil wykonawcy)
```

**Przetargi 3.0** — zakładki: Lista · Strategia · Mapa · Profil firmy · Ustawienia.  
Strategia (GO/HOLD/NO-GO, prognoza, health) wyłącznie w **Przetargi → Strategia**.  
Pulpit: operacje + `TendersShortcutPanel` (CTA → Strategia).

---

## 1. PROJECT

**W&G DOM** — React/Vite, monolit UI + panele w `src/app/`, sync LocalStorage ↔ Supabase KV.

| Element | Wartość |
|---------|---------|
| **Repo** | https://github.com/dawidthai125/wgdom · branch `main` |
| **Prod** | https://www.wgdom.fun · https://www.wgdom.online |
| **Backend** | Supabase Edge `make-server-0afb8820` |
| **Sync** | `src/lib/cloud-sync.ts` |
| **Wersja UI (SSOT)** | `CHANGELOG[0].version` w `src/app/changelog-data.ts` |

---

## 2. PRODUCTION BASELINE

```text
Version:              2.51.24         ← baseline P2-F.5 Works Register
Feature commit (P2-F.5): e015453      feat(tenders): works register generator (P2-F.5)
Poprzedni P2-F:       77b352a         v2.51.23 P2-F.4
Feature commit (P1):  39b1892         refactor: remove command center runtime architecture
Docs/rename commit:   45ad21e         refactor: finalize command center removal cleanup
Dashboard V3:           5a54399         feat(dashboard): V3 operational layout (2.50.74)
Git tag backup:         pre-next-feature-2.50.64 → c7bc58f
E2E (origin/main):      8906485         20.5Z.2B E2E Version Awareness
PWA (origin/main):      46556a7         20.5Z.2A
```

| Status | Wartość |
|--------|---------|
| **RELEASED** | TAK |
| **STABLE** | TAK |
| **PRODUCTION VERIFIED** | Po propagacji — `version.json` = **2.51.24** |
| **P2-F (Kwalifikacja ofertowa)** | **CLOSED** (F.0 → F.5) |
| **P1 (Dashboard V3 + CC removal + Przetargi 3.0)** | **CLOSED** |
| **Inspector 2.1** | **2.1.0 + 2.1.1 COMPLETE** · **2.1.2 CANCELLED** |

**Verify prod (bez pollingu API):**

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: { "version": "2.51.24" }
```

---

## 2a. P1-B — Przetargi 3.0 / Command Center removal (**CLOSED**)

**Command Center removed in v2.51.0** — brak runtime `CommandCenterProvider`, `TenderCenterProView`, `OwnerDashboard`.

| ETAP | Wersja | Skrót |
|------|--------|-------|
| 1 | 2.50.75 | Usunięcie legacy UI CC (Morning Briefing, AI Insights, …) |
| 2 | 2.50.76 | `TendersModule` — 5 zakładek |
| 3 | 2.51.0 | `TendersProvider` + `TendersShortcutPanel`; hard delete CC shell |
| 4 | 2.51.1 | Rename: `src/app/tenders/strategy/`, lib `tenders-strategy-*` |

**Architektura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.3 · **Archiwum CC (SUPERSEDED):** [`archive/command-center/`](archive/command-center/)

---

## 3. KEY RELEASES (po [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md))

Chronologia releasów aplikacyjnych na `main` po baseline **2.50.65** (20.5Z.5C):

| Wersja | Sprint | Commit | Skrót |
|--------|--------|--------|-------|
| **2.50.66** | 20.7C.2 Dashboard V2 Complete | `3e46ae8` | Hero DZIŚ SSOT, dedupe Uwaga dziś, E2E hero |
| **2.50.67** | 20.7D.1 Hero Compression | `f94b530` | KPI first, Hero accordion compact |
| **2.50.68** | 20.7E Dashboard IA Cleanup | `65f3a8d` | Najważniejsze dziś, Uwaga accordion, Hero standalone, Przetargi — skrót |
| *(hotfix)* | Payroll extraCostStatus | `add9338` | `extraCostStatus is not defined` w WeekEmployeeDetail |
| *(docs)* | Workflow Release/Deploy | `79174b3` | SSOT: [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) |
| **2.50.69** | 2.1.0 Inspector Communication Templates | `5391d03` | Szablony A–D, modal, `isInspector`, Edge `inspector_template` |
| **2.50.70** | 2.1.1 Default Inspector Recipient | `ee2cd72` | `isDefaultInspector`, domyślny odbiorca, modal UX |
| *(housekeeping)* | `.gitignore` P0+P1 | `77e1052` | untracked 49 → 19 (diag/smoke artifacts) |
| **2.50.72–73** | Hero filtry operacyjne | `4426c72` / `ad859e6` | Prognoza tylko w CC; Hero bez CC |
| **2.50.74** | **Dashboard V3 (P1-A)** | `5a54399` | Usunięto Hero; Braki + Pilne uwagi; liczniki policzalne |
| **2.50.75–76** | P1-B ETAP 1–2 | `098f651` / `58b4cd7` | CC legacy UI out; TendersModule 5 zakładek |
| **2.51.0** | P1-B ETAP 3 | `39b1892` | CC runtime removal; TendersProvider; TendersShortcutPanel |
| **2.51.1** | P1-B ETAP 4 | `45ad21e` | Rename `tenders/strategy/`, `tenders-strategy-*` lib |
| **2.51.19** | P2-F.0 | `a2d0f8a` | Formal Requirements Extraction |
| **2.51.20** | P2-F.1 | `28c5602` | Warunki udziału vs `kw-company-profile` |
| **2.51.21** | P2-F.2 | `73683f8` | Experience & References Qualification |
| **2.51.22** | P2-F.3 | `7dd7563` | Company Experience Auto-Build |
| **2.51.23** | P2-F.4 | `77b352a` | Referencje upload + ATH Quick Access |
| **2.51.24** | **P2-F.5** | **`e015453`** | Works Register Generator PDF/DOCX |

**Handoff P2-F:** [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md)  
**Handoff Pulpit (SSOT):** [`SESSION-HANDOFF-DASHBOARD-V3.md`](SESSION-HANDOFF-DASHBOARD-V3.md)  
**Historyczny Dashboard V2:** [`SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](SESSION-HANDOFF-20.7-DASHBOARD-V2.md) — **nie przywracać** rankera Hero  
**Architektura inspektor email:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 9.2

---

## 3a. P2-F — Tender Qualification Pipeline (**CLOSED**)

| Pole | Wartość |
|------|---------|
| **Zakres** | P2-F.0–F.5 · SWZ → profil wykonawcy → dopasowanie → wykaz/referencje/ATH |
| **Wersja końcowa** | **2.51.24** · commit **`e015453`** |
| **Klucz chmury** | `kw-company-profile` — `CompanyQualificationProfile` schema **v4** |
| **Handoff** | [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |
| **Architektura** | [`ARCHITECTURE.md`](ARCHITECTURE.md) § 12.1.5 |
| **Test regresji** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (161 PASS) |

**Kluczowe moduły:** `tender-formal-requirements.ts`, `tender-participation-check.ts`, `tender-experience-check.ts`, `company-experience-discovery.ts`, `tender-works-register.ts`, `tender-ath-quick-access.ts`.

**UI:** `TenderBidPrepPanel.tsx`, `TenderParticipationPanel.tsx`, `TenderWorksRegisterPanel.tsx`, `CompanyQualificationProfilePanel.tsx`.

**Nie zmieniaj bez polecenia:** merge `kw-company-profile`, semantyka `referenceStatus`, parsery SWZ, reuse ATH viewer.

---

## 4. DASHBOARD V3 — Pulpit operacyjny (**COMPLETE**, P1-A)

| Element | Wartość |
|---------|---------|
| **Wersja** | 2.50.74 · commit `5a54399` |
| **Cel** | „Co muszę dzisiaj zrobić?” — bez strategii CC na Pulpicie |
| **KPI** | Wypłata · Ekipa dziś · Aktywne WM · **Braki dokumentów** · **Pilne uwagi** |
| **Sekcje** | Roboty → Braki dokumentów · Pilne uwagi na dziś (7 kategorii) · Przetargi — skrót |
| **Liczniki SSOT** | `src/lib/dashboard-urgent-today.ts` · `buildUrgentTodayCategories()` |
| **Usunięte** | Hero stack, `attentionCount`, KPI „Do ogarnięcia”, `RecoverableChargesDashboardCard` |

**Kolejność Pulpicu (V3):** KPI → Braki dokumentów → Pilne uwagi → Przetargi — skrót → dolna siatka.

**Nie zmieniaj bez polecenia:** model liczników V3 (suma kategorii = badge), pełne listy bez `slice`, model scrollu 2.50.20.

**Seria 20.7 (V2) — historyczna:** Hero DZIŚ, dedupe Uwaga — **zamknięta** przez V3.

---

## 5. INSPECTOR COMMUNICATION TEMPLATES — seria 2.1 (**CLOSED**)

### 2.1.0 — MVP (v2.50.69 · `5391d03`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **UI** | `JobsView` → „Kontakt z inspektorem” → `JobInspectorContactModal.tsx` |
| **Szablony** | A–D w `inspector-message-templates.ts` (auto-sugestia, ready/missing) |
| **Odbiorca** | `EmailContact.isInspector` w `kw-contacts` |
| **Wysyłka** | `POST /send-job-email` · `mode: inspector_template` (Edge) |
| **Historia** | `activityLog` · `email_sent` + nazwa szablonu |
| **Smoke** | `scripts/smoke-test-inspector-templates-2.1.mjs` |

### 2.1.1 — Default Inspector Recipient (v2.50.70 · `ee2cd72`) · **PRODUCTION VERIFIED**

| Element | Opis |
|---------|------|
| **Model** | `EmailContact.isDefaultInspector` (max jeden, wymaga `isInspector`) |
| **Helpery** | `contactIsDefaultInspector`, `resolveDefaultInspectorContact`, `applyDefaultInspectorContact` |
| **Kontakty UI** | Checkbox „Domyślny odbiorca inspektora”, badge Inspektor + Domyślny |
| **Modal UX** | Auto-odbiorca (Szymon lub oznaczony), „Zmień odbiorcę”, hint wysyłki testowej |
| **Edge / Job / sync** | **Bez zmian** |

**Operacyjnie na prod:** oznacz Szymona jako „Domyślny odbiorca inspektora”; usuń duplikaty testowe „Walidacja 2.1” z Kontaktów (dane testowe z walidacji 2.1.0 — nie bug kodu).

### 2.1.2 — Job Correspondence Recipients · **CANCELLED**

| | |
|---|---|
| **Status** | **ANULOWANY — nie implementować** |
| **Powód** | Problem wynikał z danych testowych („Walidacja 2.1”), konfiguracji Kontaktów i chwilowego braku wpisu — **nie z architektury 2.1.0/2.1.1** |
| **Decyzja** | Zostaje: „Kontakt z inspektorem”, filtr `isInspector`, „Domyślny odbiorca inspektora” |

**Brak dalszych prac w obszarze Inspector Communication Templates do czasu nowego AUDIT.**

**Backlog zamknięty (bez polecenia):** szablon E (podziękowanie), CRM/historia konwersacji, 2.1.2 pełna lista kontaktów.

---

## 6. WORKFLOW WGDOM

### Proces pracy

```text
AUDIT → RCA → PLAN → IMPLEMENT
```

**Brak implementacji bez audytu.** Plan odrzucony (np. 2.1.2) = **zero kodu**.

### Release / deploy — SSOT

**[`docs/WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)**

| Wariant | Kroki |
|---------|-------|
| **A** Minor | build → commit → push → verify FAST |
| **B** Standard | build → smoke → commit → push → verify FAST |
| **C** Major | build → smoke → E2E → commit → push → verify FAST |

**Frontend:** tylko `git push origin main` → Vercel Git Integration.

**VERIFY DEPLOY FAST:** po push **jedno** `curl version.json` → PASS lub **DEPLOY PROPAGATING** → koniec raportu.

**Zakazane:** `vercel deploy`, `vercel --prod`, retry/sleep/polling `version.json`, polling GitHub/Vercel Deployments API.

**Werdykty:** **RELEASE GO** (build+smoke+push) ≠ **PRODUCTION VERIFIED** (`version.json` = oczekiwana wersja w jednym curl).

**Backend Edge:** tylko gdy zmiana `supabase/functions/**` → GitHub Action `deploy-supabase.yml`.  
2.1.0 wymagał deploy Edge dla `inspector_template`; **2.1.1 nie wymagał** deploy Supabase.

---

## 7. ARCHITEKTURA (skrót — bez zmian od 20.5Z)

Pełny opis: [`ARCHITECTURE.md`](ARCHITECTURE.md) · fundament platformy: [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) § 5–9.

| Temat | SSOT / pliki |
|-------|----------------|
| Pliki roboty (3 warstwy) | `jobFiles[]` · `workerReports[]` · `jobAttachments[]` · [`SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md`](SESSION-HANDOFF-20.5A.10-GENERIC-ATTACHMENTS.md) |
| Files Hub | `files-hub-index.ts` · [`SESSION-HANDOFF-20.5A.12-FILES-HUB.md`](SESSION-HANDOFF-20.5A.12-FILES-HUB.md) |
| Sync / merge | `cloud-sync.ts` § 11 · **nie zmieniaj merge bez audytu** |
| Version Awareness | `app-version-check.ts` · E2E `version-awareness.spec.ts` |
| PWA | `sw.template.js` · `generate-service-worker.mjs` |
| Kontakt inspektora § 9.2 | `inspector-message-templates.ts`, `email-contacts.ts`, `JobInspectorContactModal.tsx` |
| **Pulpit V3** | `DashboardView.tsx`, `DashboardPilneUwagiSection.tsx`, `dashboard-urgent-today.ts` |
| Przetargi (strategia) | `TendersModule` → zakładka **Strategia** — **nie** na Pulpicie (tylko `TendersShortcutPanel`) |
| **P2-F Kwalifikacja ofertowa** | `kw-company-profile` · § 12.1.5 · [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) |

---

## 8. REPO HOUSEKEEPING (2026-06-11)

**Commit:** `77e1052` — `chore(git): ignore local audit and smoke artifacts`

| Przed | Po |
|-------|-----|
| 49 untracked (diag, smoke-output, UX audit PNG) | 19 untracked (gł. `smoke-prod-bundle-*` historyczne — celowo poza `.gitignore`) |

**Nie commitować:** backupy z hashami adminów, `restore-lista-plac-*.json`, artefakty lokalne (patrz `.gitignore`, ARCHITECTURE § 19).

---

## 9. E2E I TESTY

| Gate | Komenda |
|------|---------|
| Happy path | `npm run build` → preview `:4173` → `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:happy` |
| Version | `PW_BASE_URL=http://127.0.0.1:4173 npm run test:e2e:version` |
| Inspector 2.1 | `npx vite-node scripts/smoke-test-inspector-templates-2.1.mjs` |
| **P2-F regresja** | `npx vite-node scripts/test-tender-dossier-pipeline.mjs` (161) |
| **Dashboard V3** | `npx vite-node scripts/test-dashboard-v3-counts.mjs` |
| Mobile | `npm run test:mobile` |

**Ostatni znany CI E2E:** `#27260457990` (20.5Z.2B) — regresja po 20.7/2.1 lokalnie: build + smoke 2.1 PASS.

---

## 10. KNOWN ISSUES / RYZYKA (aktualne)

| Ryzyko | Uwagi |
|--------|-------|
| Stale LS nadpisuje KV | [`INCIDENTS-2026-06.md`](INCIDENTS-2026-06.md) · Payroll Guard, admin passwords merge |
| Duplikaty „Walidacja 2.1” na prod | Dane testowe z walidacji biznesowej 2.1.0 — cleanup w Kontaktach |
| Brak domyślnego inspektora przy wielu `isInspector` | Oznacz Szymona „Domyślny odbiorca” w Kontaktach |
| 19 untracked `smoke-prod-bundle-*` | Lokalne historyczne smokes — opcjonalnie commit per release lub delete |

---

## 11. BACKLOG PRODUKTOWY

| Priorytet | Temat | Status |
|-----------|-------|--------|
| **P1** | Dashboard V3 + CC removal + Przetargi 3.0 | **CLOSED** (v2.51.x) |
| **P2-F** | Kwalifikacja ofertowa (F.0–F.5) | **CLOSED** (v2.51.19–2.51.24) |
| **P2** | Audit Center / Security Log (Super Admin) | **OTWARTY** |
| P2-F.6+ | investorName · auto-pakiet referencji | opcjonalnie, na polecenie |
| **P3** | Dalsze usprawnienia Przetargów | **OTWARTY** (bez polecenia) |

---

## 12. CO NIE ZMIENIAĆ BEZ POLECENIA

- Sync/merge `kw-contacts`, `kw-jobs`, payroll guard
- Model scrollu desktop 2.50.20, mobile shell
- **Przywracanie Hero / `attentionCount` / KPI „Do ogarnięcia”** — zamknięte przez V3
- Podłączanie CC (forecast, health) do `DashboardView`
- `inspector_template` Edge semantics (2.1.0)
- Seria 20.5Z zamknięta — patrz FINAL handoff
- **2.1.2** — plan odrzucony, nie wracać do pełnej listy kontaktów w modalu
- **P2-F merge/parsery** — `kw-company-profile`, filtry śmieci PDF SWZ, ATH viewer reuse

---

## 13. NASTĘPNY KROK (dla agenta)

```text
P2-F CLOSED (F.0 → F.5 · v2.51.24).
P1 CLOSED (Dashboard V3 + Przetargi 3.0 + CC removed).
Kolejny stream: P2 (Audit Center) lub P2-F.6+ / P3 — tylko na polecenie po AUDIT.
Inspector 2.1 — CLOSED (2.1.2 CANCELLED).
```

Przy wznowieniu:

1. Przeczytaj **ten plik** + [`SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md`](SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md) (przy Przetargi) + `CURRENT-TASK.md`
2. `curl -s https://www.wgdom.fun/version.json` — potwierdź baseline **2.51.24**
3. `npx vite-node scripts/test-tender-dossier-pipeline.mjs` — przed release P2-F
4. Stosuj workflow A/B/C z [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)
5. Hasło **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 14. MAPA HANDOFFÓW (referencje)

| Temat | Dokument |
|-------|----------|
| **★ P2-F Kwalifikacja ofertowa** | `SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md` |
| **★ Baseline prod (TEN)** | `PROJECT-HANDOFF-CURRENT.md` |
| **★ Pulpit V3 (SSOT)** | `SESSION-HANDOFF-DASHBOARD-V3.md` |
| Platform 20.5Z (architektura) | `PROJECT-HANDOFF-FINAL-20.5Z.md` |
| Dashboard V2 (historyczny) | `SESSION-HANDOFF-20.7-DASHBOARD-V2.md` |
| Inspector 2.1 § 9.2 | `ARCHITECTURE.md` |
| Workflow release | `WORKFLOW-RELEASE-DEPLOY.md` |
| Backup pre-feature | `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md` |
| Billing / Roboty 20.5A | `SESSION-HANDOFF-20.5A-BILLING-JOBS.md` |
| Files Hub | `SESSION-HANDOFF-20.5A.12-FILES-HUB.md` |
| CC historyczny | `docs/archive/command-center/` (**SUPERSEDED**) |

| Legacy PROJECT-HANDOFF | `PROJECT-HANDOFF.md` (częściowo nieaktualny baseline — używaj CURRENT) |

---

**Werdykt closeout (P2-F):**

```text
BASELINE v2.51.24 · STABLE · RELEASE GO (verify version.json)
P2-F CLOSED — F.0 Formal → F.5 Works Register
P1 CLOSED — Dashboard V3 · Przetargi 3.0 · Command Center REMOVED
Inspector 2.1 CLOSED · 2.1.2 CANCELLED
Open backlog: P2 Audit Center · P3 Przetargi · P2-F.6+ optional
Ready for new GPT / new Cursor agent
```
