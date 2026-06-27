# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-26 · **prod 2.62.77** · **PRODUCTION VERIFIED** (`21d4a1b` runtime · housekeeping `56c4e2f`)

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.77** |
| **Commit prod** | **`21d4a1b`** |
| **Release 2.62.77** | **COMPLETE** |
| **Poprzedni release** | 2.62.76 (`36718cc`) · Etap 3 Audit Hub WM |
| **Workflow Cleanup P0** | **RELEASED** (2.62.72) |
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
**Handoff historyczny audytu:** [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md) (**SUPERSEDED**)

**Smoke Etap 2 D1:** `scripts/smoke-wm-druk-audit-etap2-d1.mjs` — 10/10 PASS  
**Smoke Etap 2 akcje:** `scripts/smoke-wm-druk-audit-etap2-actions.mjs` — 7/7 PASS  
**Smoke Etap 3 S1:** `scripts/smoke-wm-druk-audit-etap3-s1.mjs` — 11/11 PASS

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
**Post-release:** residue probe PASS (M4 przywrócony; M1 godziny 5h = zgodne z logiem 18.06)

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
| P0 Payroll Cloud Recovery | **EPIC OPEN** (Etap 1 done) | P0.1–P0.4 backlog — **bez implementacji** bez polecenia |

**Inne (na polecenie):** Workflow Cleanup P1 · P3 Export · P2-H.7 · P2-G.3D/E · P2-F.6 · P1.1 `schematic_edited`

---

## Historia sesji (2026-06-26)

### P1 Audit Hub WM Etap 4 — release 2.62.77 **COMPLETE** · **EPIC CLOSED**

- Commit `21d4a1b` → push `main` · prod VERIFIED (`version.json` 2.62.77)
- UX: filtr `wm_druk` · chip teal · deep link labels · Help · ARCHITECTURE § 15.6
- Testy: adapters 77/77 · view-model 49/49 · regresja wm-druk 24/24 PASS

### P1 Audit Hub WM Etap 3 — release 2.62.76 **COMPLETE**

- Commit `36718cc` → push `main` · prod VERIFIED (`version.json` 2.62.76)
- Hooki: `schematic_created` / `measurement_imported` / `schematic_duplicated` / `schematic_deleted` / `pdf_exported`
- Smoke S1 (11/11) + unit T11 (24/24) PASS

### P1 Audit Hub WM Etap 2 — release 2.62.75 **COMPLETE**

- Commit `c31e1bd` → push `main` · prod VERIFIED (`version.json` 2.62.75)
- Hooki: `rap_created` / `rap_deleted` / `rap_edited` / `docx_exported` / `zip_exported`
- Smoke D1 (10/10) + akcje (7/7) PASS

### P1 Audit Hub WM Etap 1 — release 2.62.74

- Commit `b4fde0c` · infra `kw-wm-druk-audit-log` + adapter

### P0 Payroll Etap 1 — release 2.62.73

- Push `9121a84` → prod VERIFIED
- Housekeeping: smoke scripts `5667bd5` · docs `978d400` (bez zmian runtime)

### Recovery Pack v2.62.72 — EPIC CLOSE

| Pole | Wartość |
|------|---------|
| **recoveryPackId** | `WGDOM-RP-2.62.72-20260626` |
| **Baseline commit** | **`6cd8ebe`** |
| **Git tag** | `wgdom-recovery-pack-2.62.72` |

### Workflow Cleanup P0 + G7 fix (2.62.72)

Cleanup P0 + grouped docs migration — **RELEASED**

---

## Dokumentacja agentów

- **★ START:** `docs/AGENT-CONTINUITY-GUIDE.md`
- **SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md`
- **SSOT baseline:** `docs/PROJECT-HANDOFF-CURRENT.md`
- **Mapa systemu:** `docs/AGENT-ONBOARDING.md`

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.77**
2. WM audit smoke Etap 3: `npx vite-node scripts/smoke-wm-druk-audit-etap3-s1.mjs`
3. WM audit smoke Etap 2: `npx vite-node scripts/smoke-wm-druk-audit-etap2-d1.mjs`
4. Audit Hub adapters: `npx vite-node scripts/test-audit-hub-adapters.mjs`
5. Payroll smoke: `node scripts/smoke-prod-payroll-etap1-m1-m4.mjs` · `node scripts/smoke-prod-bundle-2.62.73.mjs`
6. `npm run build`
