# W&G DOM — bieżąca sesja

**Ostatnia aktualizacja:** 2026-06-26 · **prod 2.62.72** · **Etap 1 P0 Payroll — commit lokalny 2.62.73 (nie push)**

## STATUS

| Pole | Wartość |
|------|---------|
| **Wersja prod** | **2.62.72** — Workflow Cleanup P0 + Grouped Documents G7 fix |
| **Commit prod** | **`6cd8ebe`** |
| **Wersja lokalna (Etap 1)** | **2.62.73** — P0 Payroll Cloud Recovery (mutex + merge + guard) |
| **Walidacja Etap 1** | **PASS** (73 asercje auto) · raport: `audit/P0-PAYROLL-CLOUD-RECOVERY-ETAP1-VALIDATION.md` |
| **Poprzedni release** | 2.62.71 — Document Summary Header |
| **Workflow EPIC A/B/C** | **CLOSED** |
| **Workflow Cleanup P0** | **RELEASED** (2.62.72) |
| **Recovery Pack v2.62.72** | **COMPLETED** · PRODUCTION READY · OFFSITE READY |

---

## P0 Payroll Cloud Recovery — backlog (po code review, **nie** w Etapie 1)

| ID | Priorytet | Zadanie | Uwagi |
|----|-----------|---------|-------|
| **P0.1** | P0 | Synchronizacja `pullFromCloudAndMerge` z `runCloudSync` | Mutex tylko na pełnym sync; pull na focus/resume może nadpisać UI w trakcie zapisu |
| **P0.2** | P0 | Rozszerzenie `touchJobAt` na wszystkie ścieżki | `JobsView` (dodaj wpis, kopiuj), `fixJobsForConsistencyAlert` — bez bump `updatedAt` merge wraca do „bogatszego” |
| **P0.3** | P0 | Globalny fail-loud dla `pushKeysToCloudSafe` | Worker/inspektor: `.catch(() => {})` chowa błąd guarda; brak czerwonej chmury |
| **P0.4** | P0 | Eliminacja wybranych przypadków pull→apply→push | RCA-1: `runCloudSync` nadal merge przed push; Etap 2+ architektura |
| **P1** | P1 | Payroll Slice Push | Push tylko `kw-week-employees` + powiązane zamiast pełnego `DATA_KEYS` |
| **P1** | P1 | Edge `batch-set` hardening | try/catch, mniejsze payloady, mniej HTTP 500 |

**Etap 2 (planowany):** P1 slice + edge — **nie rozpoczęty** (na polecenie).

---

## Zamknięte w tej sesji (2026-06-26)

### Recovery Pack v2.62.72 — EPIC CLOSE

| Pole | Wartość |
|------|---------|
| **recoveryPackId** | `WGDOM-RP-2.62.72-20260626` |
| **packId** | `WGDOM-RECOVERY-PACK-2.62.72` |
| **Baseline commit** | **`6cd8ebe`** |
| **Utworzono** | 2026-06-26 |
| **G7 Validation** | **PASS** (git archive restore · npm build · workflow smoke) |
| **CHECKSUMS** | zsynchronizowane (6 archiwów) |
| **Pack root** | `../WGDOM-RECOVERY-PACK/WGDOM-RECOVERY-PACK-2.62.72/` |
| **Git tag** | `wgdom-recovery-pack-2.62.72` |

### Workflow Cleanup P0 + G7 fix (2.62.72)

| Pole | Wartość |
|------|---------|
| **Zakres** | Cleanup P0 + dokończenie migracji grouped docs (`tender-grouped-documents.ts` · `TenderAttachmentsPanel`) |
| **Klasyfikacja** | STANDARD REFACTOR + bugfix build |

---

## Następne (tylko na polecenie)

- **P1 Audit Hub** — WM Pomiary/Schematy → Hub (`AUDIT-HUB-WM-001`) — **rekomendowany następny epic**
- **Workflow Cleanup P1** — V2 key docs vs positions file, Analysis Status Strip na Przetargu
- **GuideView FAQ** — TOP 5 → grouped docs + Document Summary Header

---

## Dokumentacja agentów (zsynchronizowano)

- **★ START:** `docs/AGENT-CONTINUITY-GUIDE.md` — kontekst, struktura, mapa funkcji
- **SSOT Workflow:** `docs/WORKFLOW-ARCHITECTURE-v2.63.md`
- **SSOT Recovery Pack:** `docs/PROJECT-HANDOFF-CURRENT.md` § 2a
- **Mapa systemu:** `docs/AGENT-ONBOARDING.md`
- **Linki:** `AGENTS.md`, `ARCHITECTURE.md` § 12.1.9a, `PROJECT-GUIDE.md`

---

## Szybki start agenta

1. `CHANGELOG.md` + `changelog-data.ts` — wersja **2.62.72**
2. Testy: `test-tender-workflow-hub.mjs` · `test-tender-workflow-primary-action.mjs` · `test-tender-workspace-ux.mjs`
3. `npm run build`
4. Verify: `curl https://www.wgdom.fun/version.json`
