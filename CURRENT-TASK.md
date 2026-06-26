# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-26 · **prod 2.62.76** · **PRODUCTION VERIFIED** (`36718cc`)

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.76** |
| **Commit prod** | **`36718cc`** |
| **Release 2.62.76** | **COMPLETE** |
| **Poprzedni release** | 2.62.75 (`c31e1bd`) · Etap 2 Audit Hub WM |
| **Workflow Cleanup P0** | **RELEASED** (2.62.72) |
| **Recovery Pack v2.62.72** | **COMPLETED** · OFFSITE READY |

---

## P1 Audit Hub WM — **EPIC OPEN** (Etap 1–3 RELEASED)

| Etap | Wersja | Commit | Status |
|------|--------|--------|--------|
| **1** — infra KV + adapter | 2.62.74 | `b4fde0c` | **RELEASED** |
| **2** — hooki Pomiary/Katalog | 2.62.75 | `c31e1bd` | **RELEASED** |
| **3** — hooki Schematy | 2.62.76 | `36718cc` | **RELEASED** |
| **4** — UX Audit Hub + docs | — | — | **NOT STARTED** |

**SSOT:** [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md)  
**Smoke Etap 2 D1:** `scripts/smoke-wm-druk-audit-etap2-d1.mjs` — 10/10 PASS  
**Smoke Etap 2 akcje:** `scripts/smoke-wm-druk-audit-etap2-actions.mjs` — 7/7 PASS  
**Smoke Etap 3 S1:** `scripts/smoke-wm-druk-audit-etap3-s1.mjs` — 11/11 PASS

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

Powyższe P0.1–P0.4 należą do epica **P0 Payroll Cloud Recovery (OPEN)** — nie mylić z P1 Audit Hub WM.

---

## Następny aktywny EPIC (SSOT)

| EPIC | Status | Następny krok |
|------|--------|----------------|
| **P1 Audit Hub WM** | **OPEN** (Etap 1–3 **RELEASED**) | **Etap 4** (UX Audit Hub + docs) — tylko na polecenie |
| P0 Payroll Cloud Recovery | **EPIC OPEN** (Etap 1 done) | P0.1–P0.4 backlog — **bez implementacji** bez polecenia |

**SSOT:** [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md) · Etap 1–3 RELEASED · Etap 4 NOT STARTED

**Inne (na polecenie):** Workflow Cleanup P1

---

## Historia sesji (2026-06-26)

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

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.76**
2. WM audit smoke Etap 3: `npx vite-node scripts/smoke-wm-druk-audit-etap3-s1.mjs`
3. WM audit smoke Etap 2: `npx vite-node scripts/smoke-wm-druk-audit-etap2-d1.mjs`
4. Payroll smoke: `node scripts/smoke-prod-payroll-etap1-m1-m4.mjs` · `node scripts/smoke-prod-bundle-2.62.73.mjs`
5. Payroll unit: `test-payroll-work-entry-merge-fidelity.mjs` · `test-payroll-guard-push-fail-loud-p0.mjs`
6. `npm run build`
