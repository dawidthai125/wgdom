# PROJECT HANDOFF CURRENT — W&G DOM

> **★ Główny handoff projektu (SSOT)** · **Data closeout:** 2026-06-11  
> **Hasło agenta:** „kontynuuj WGDOM”  
> **Poprzedni handoff końcowy serii:** [`PROJECT-HANDOFF-FINAL-20.5Z.md`](PROJECT-HANDOFF-FINAL-20.5Z.md) — nadal ważny dla architektury platformy 20.5Z; **ten dokument** aktualizuje baseline prod i releasy **po** 20.5Z.

**Wejście dla nowego GPT / Cursor:**

```text
1. docs/PROJECT-HANDOFF-CURRENT.md   ← TEN PLIK (baseline prod)
2. CURRENT-TASK.md                    ← status sesji / wznowienie
3. docs/WORKFLOW-RELEASE-DEPLOY.md  ← workflow A/B/C
4. AGENTS.md → docs/ARCHITECTURE.md
```

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
Version:              2.50.70
Feature commit (app):   ee2cd72   feat(jobs): default inspector recipient (2.1.1)
Housekeeping:         77e1052   chore(git): ignore local audit and smoke artifacts
Poprzedni feature:    5391d03   Inspector Communication Templates 2.1.0 (2.50.69)
Git tag backup:       pre-next-feature-2.50.64 → c7bc58f
E2E (origin/main):    8906485   20.5Z.2B E2E Version Awareness
PWA (origin/main):    46556a7   20.5Z.2A
```

| Status | Wartość |
|--------|---------|
| **RELEASED** | TAK |
| **STABLE** | TAK |
| **PRODUCTION VERIFIED** | TAK — `version.json` = **2.50.70** |
| **Inspector Communication Templates** | **2.1.0 + 2.1.1 COMPLETE** · **2.1.2 CANCELLED** |

**Verify prod (bez pollingu API):**

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: { "version": "2.50.70" }
```

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

**Handoff Dashboard V2:** [`SESSION-HANDOFF-20.7-DASHBOARD-V2.md`](SESSION-HANDOFF-20.7-DASHBOARD-V2.md)  
**Architektura inspektor email:** [`ARCHITECTURE.md`](ARCHITECTURE.md) § 9.2

---

## 4. SERIA 20.7 — Dashboard V2 (**COMPLETE**)

| Etap | Wersja | Commit | Status |
|------|--------|--------|--------|
| 20.7C.1 | — | `070e52f` | CC executive simplify |
| 20.7C.2 | 2.50.66 | `3e46ae8` | **Dashboard V2 COMPLETE** |
| 20.7D.1 | 2.50.67 | `f94b530` | Hero Compression |
| 20.7E | 2.50.68 | `65f3a8d` | Dashboard IA Cleanup |

**Kolejność Pulpicu (20.7E):** KPI → Najważniejsze dziś → Uwaga dziś (accordion) → Do odzyskania → Przetargi — skrót.

**Nie zmieniaj bez polecenia:** ranker Hero (`dashboard-hero-today.ts`), dedupe Uwaga dziś, model scrollu 2.50.20.

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

## 11. CO NIE ZMIENIAĆ BEZ POLECENIA

- Sync/merge `kw-contacts`, `kw-jobs`, payroll guard
- Model scrollu desktop 2.50.20, mobile shell
- Dashboard Hero ranker / dedupe (20.7C–E)
- `inspector_template` Edge semantics (2.1.0)
- Seria 20.5Z zamknięta — patrz FINAL handoff
- **2.1.2** — plan odrzucony, nie wracać do pełnej listy kontaktów w modalu

---

## 12. NASTĘPNY KROK (dla agenta)

```text
Brak otwartego sprintu w Inspector Communication Templates.
Nowy feature stream — tylko na polecenie użytkownika po AUDIT.
```

Przy wznowieniu:

1. Przeczytaj **ten plik** + `CURRENT-TASK.md`
2. `curl -s https://www.wgdom.fun/version.json` — potwierdź baseline
3. Stosuj workflow A/B/C z [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md)
4. Hasło **„kontynuuj WGDOM”** → `.cursor/rules/wgdom-stan-projektu.mdc`

---

## 13. MAPA HANDOFFÓW (referencje)

| Temat | Dokument |
|-------|----------|
| **★ Baseline prod (TEN)** | `PROJECT-HANDOFF-CURRENT.md` |
| Platform 20.5Z (architektura) | `PROJECT-HANDOFF-FINAL-20.5Z.md` |
| Dashboard V2 | `SESSION-HANDOFF-20.7-DASHBOARD-V2.md` |
| Inspector 2.1 § 9.2 | `ARCHITECTURE.md` |
| Workflow release | `WORKFLOW-RELEASE-DEPLOY.md` |
| Backup pre-feature | `SESSION-HANDOFF-PRE-NEXT-FEATURE-2.50.64.md` |
| Billing / Roboty 20.5A | `SESSION-HANDOFF-20.5A-BILLING-JOBS.md` |
| Files Hub | `SESSION-HANDOFF-20.5A.12-FILES-HUB.md` |
| Legacy PROJECT-HANDOFF | `PROJECT-HANDOFF.md` (częściowo nieaktualny baseline — używaj CURRENT) |

---

**Werdykt closeout sesji 2026-06-11:**

```text
SESSION CLOSED · BASELINE 2.50.70 · STABLE · PRODUCTION VERIFIED
Inspector 2.1.0 + 2.1.1 RELEASED · 2.1.2 CANCELLED
Housekeeping 77e1052 · Ready for new GPT / new Cursor agent
```
