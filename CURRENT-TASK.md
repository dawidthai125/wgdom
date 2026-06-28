# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-27 · **prod 2.62.79** · Mobile Recovery **EPIC CLOSED**

---

## Mobile Recovery EPIC — **CLOSED** (v2.62.78–2.62.79)

| Pole | Wartość |
|------|---------|
| **Status** | **COMPLETED** · **EPIC CLOSED** |
| **Prod** | **2.62.79** · commit **`4397eac`** |
| **Verify deploy** | **PASS** |
| **Production smoke** | **PASS** (7 PASS / 1 BLOCKED) |
| **Outstanding production bugs** | **NONE** |
| **Releases** | **2.62.78** (`78582db`) Mobile UX pack · **2.62.79** (`4397eac`) Jobs full-screen drill-in (MV-2) |

**Known blocked test (not a defect):**

| Test | Status | Reason |
|------|--------|--------|
| **SMOKE-03** Tender Details | **BLOCKED** | Brak przetargu produkcyjnego w runie Playwright — nie regresja |

**Follow-up:** ręczna weryfikacja workspace przetargu przy następnym przetargu produkcyjnym.

**Zakres zamknięty:** scroll/drill-in/touch (2.62.78) · Roboty pełnoekranowy drill-in (2.62.79).

---

## Mobile Certification — FIELD VALIDATION (osobny tor, nie Mobile Recovery)

| Pole | Wartość |
|------|---------|
| **Dokumentacja** | **FROZEN** — spec + tracker structure |
| **Execution phase** | **PASS 1 — iPhone Safari** (`ios-safari`) — **nie rozpoczęty** |
| **SSOT spec** | [`audit/MOBILE-UX-FIELD-VALIDATION-REPORT.md`](audit/MOBILE-UX-FIELD-VALIDATION-REPORT.md) |
| **Execution tracker** | [`audit/MOBILE-CERTIFICATION-FIELD-VALIDATION-EXECUTION.md`](audit/MOBILE-CERTIFICATION-FIELD-VALIDATION-EXECUTION.md) |
| **Progress** | **0 / 4** passes · **0 / 9** MV (all P0) |
| **Werdykt §16** | Tylko po Completion gate = MET |

**Uwaga:** Mobile Certification ≠ Mobile Recovery EPIC. Recovery **CLOSED**; certyfikacja terenowa pozostaje w backlogu jako osobny program.

---

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.79** |
| **Commit prod** | **`4397eac`** |
| **Release 2.62.79** | **COMPLETE** · PRODUCTION VERIFIED |
| **Release 2.62.78** | **COMPLETE** · Mobile UX pack |
| **Poprzedni release** | 2.62.77 (`21d4a1b`) · P1 Audit Hub WM Etap 4 |
| **Mobile Recovery EPIC** | **CLOSED** |
| **Recovery Pack v2.62.72** | **COMPLETED** · OFFSITE READY |

---

## P1 Audit Hub WM — **EPIC CLOSED** (Etap 1–4 RELEASED)

| Etap | Wersja | Commit | Status |
|------|--------|--------|--------|
| **1** — infra KV + adapter | 2.62.74 | `b4fde0c` | **RELEASED** |
| **2** — hooki Pomiary/Katalog | 2.62.75 | `c31e1bd` | **RELEASED** |
| **3** — hooki Schematy | 2.62.76 | `36718cc` | **RELEASED** |
| **4** — UX Audit Hub + docs | 2.62.77 | `21d4a1b` | **RELEASED** |

**SSOT techniczny:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 15.6  
**Epic closeout:** [`audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md`](audit/P1-AUDIT-HUB-WM-EPIC-CLOSE-REPORT.md)

**Backlog P1.1 (na polecenie):** `schematic_edited` przy zamknięciu sesji edycji (anti-flood).

---

## P0 Payroll Cloud Recovery — **EPIC OPEN**

> **Etap 1 = RELEASED** · **Etap 2 = NOT STARTED** · epic **nie** CLOSED dopóki P0.1–P0.4 są OPEN.

### Etap 1 · **RELEASED** (2026-06-26 · v2.62.73 · `9121a84`)

| Fix | Zakres | Commit |
|-----|--------|--------|
| **C** | Mutex `runCloudSync` | `9121a84` |
| **A** | `mergeWorkEntriesById` + `touchJobAt` (panel LP) | `9121a84` |
| **B** | Payroll Guard fail-loud | `9121a84` |

**Release:** SUCCESS · verify `version.json` 2.62.73 · smoke M1/M4 PASS  
**Raport walidacji:** `audit/P0-PAYROLL-CLOUD-RECOVERY-ETAP1-VALIDATION.md`

---

## Aktywne zadania (kolejność rekomendowana)

| ID | Priorytet | Zadanie | Status |
|----|-----------|---------|--------|
| **P0.1** | P0 | Synchronizacja `pullFromCloudAndMerge` z `runCloudSync` | **OPEN** |
| **P0.2** | P0 | Rozszerzenie `touchJobAt` na wszystkie ścieżki edycji `workEntries` | **OPEN** |
| **P0.3** | P0 | Globalny fail-loud dla `pushKeysToCloudSafe` | **OPEN** |
| **P0.4** | P0 | Eliminacja wybranych przypadków pull→apply→push (RCA-1) | **OPEN** |
| **P1** | P1 | Payroll Slice Push | **OPEN** |
| **P1** | P1 | Edge `batch-set` hardening | **OPEN** |

**Etap 2** (slice push + edge hardening) — **NOT STARTED** · tylko na polecenie.

---

## Następny aktywny EPIC (SSOT)

| EPIC | Status | Następny krok |
|------|--------|----------------|
| **P0 Payroll Cloud Recovery** | **EPIC OPEN** (Etap 1 done) | P0.1–P0.4 backlog — **bez implementacji** bez polecenia |

**Inne (na polecenie):** Workflow Cleanup P1 · P3 Export · P2-H.7 · P2-G.3D/E · P2-F.6 · P1.1 `schematic_edited` · Mobile Certification Pass 1

---

## Backlog mobile (future — nie production bugs)

| Temat | Typ | Uwagi |
|-------|-----|-------|
| **Inspector mobile improvements** | Enhancement | UX inspektora na telefonie — backlog produktowy |
| **WM Measurements UX improvements** | Enhancement | Pomiary WM Druk — dalsze usprawnienia drill-in/flow |
| **WM Catalog drill-in improvements** | Enhancement | Katalog Pomiarów — spójność z Schematy/Notatki |
| **Browser history integration (Jobs)** | Optional enhancement | `history.pushState` + Safari back dla drill-in Roboty — obecnie **Lista** + Capacitor Android back |
| **SMOKE-03 Tender workspace** | Manual follow-up | Weryfikacja przy następnym przetargu produkcyjnym (BLOCKED w auto smoke) |
| **E2E label „Lista” vs „Powrót do listy”** | CI maintenance | Aktualizacja Playwright — nie defect prod |

---

## Historia sesji (2026-06-27)

### Mobile Recovery EPIC — **CLOSED** · release 2.62.79 **COMPLETE**

- Commits `78582db` (2.62.78) + `4397eac` (2.62.79) → push `main` · prod VERIFIED (`version.json` 2.62.79)
- Production smoke: **7 PASS / 1 BLOCKED** (SMOKE-03 — brak danych testowych przetargu)
- MV-2: pełnoekranowy drill-in Roboty · ukrycie KPI/listy · przycisk **Lista**
- **Outstanding production bugs: NONE**

---

## Historia sesji (2026-06-26)

### P1 Audit Hub WM Etap 4 — release 2.62.77 **COMPLETE** · **EPIC CLOSED**

- Commit `21d4a1b` → push `main` · prod VERIFIED (`version.json` 2.62.77)

### Recovery Pack v2.62.72 — EPIC CLOSE

| Pole | Wartość |
|------|---------|
| **recoveryPackId** | `WGDOM-RP-2.62.72-20260626` |
| **Baseline commit** | **`6cd8ebe`** |

---

## Dokumentacja agentów

- **★ START:** `docs/AGENT-CONTINUITY-GUIDE.md`
- **SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md`
- **SSOT baseline:** `docs/PROJECT-HANDOFF-CURRENT.md`
- **Mapa systemu:** `docs/AGENT-ONBOARDING.md`

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.79**
2. Verify prod: `curl -s https://www.wgdom.fun/version.json` → **2.62.79** / **4397eac**
3. Mobile smoke (prod): Playwright iPhone 14 @ wgdom.fun · `npm run test:mobile` (shell)
4. WM audit smoke: `npx vite-node scripts/smoke-wm-druk-audit-etap3-s1.mjs`
5. Payroll smoke: `node scripts/smoke-prod-payroll-etap1-m1-m4.mjs`
6. `npm run build`
