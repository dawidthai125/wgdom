# NG11-P0 — Discovery Unification · OWNER QA REPORT

| Pole | Wartość |
|------|---------|
| **Program** | NG11-P0 Discovery Unification |
| **Wersja** | **2.65.1** |
| **Status** | **OWNER QA PASS** · **PRODUCTION VERIFIED** |
| **Data** | 2026-07-12 |
| **Baseline** | 2.65.0 NG11-A5 CLOSED |

---

## Zakres QA

| # | Scenariusz | Oczekiwanie | Automat |
|---|------------|-------------|---------|
| Q1 | AUTO_EMPTY settled + 0 docs | fetch BZP wykonany | `test-ng11-p0` U1 |
| Q2 | MANUAL_REFRESH | force=true · ten sam fingerprint | `test-ng11-p0` U2–U3 |
| Q3 | AUTO_RETRY po manual | identyczny komplet dokumentów | `test-ng11-p0` U4 |
| Q4 | Bootstrap guards 0 attachments | nie skip discovery | `test-ng11-p0` G1 |
| Q5 | Intelligence merged item | `discoveryMergedItem` w runtime | kod P0-C2 |
| Q6 | Persist przed intelligence | discovery patch → onUpdate przed shell | kod P0-C3 |
| Q7 | Regresja NG-02.1B orchestrator | 19/19 PASS | `test-tender-full-document-discovery` |
| Q8 | Regresja NG11-A3 fork | 27/27 PASS | `test-ng11-discovery-fork` |
| Q9 | Build prod | PASS | `npm run build` |

---

## Scenariusz manualny (prod — Owner)

1. Otwórz przetarg z historycznym `documentsFetchedAt` i pustymi załącznikami w KV.
2. Wejdź w detal — Autonomous Run powinien pokazać dokumenty w intelligence po auto discovery.
3. Kliknij „Odśwież BZP” — ten sam komplet co auto (lub więcej jeśli BZP zaktualizował).
4. Odśwież stronę — dokumenty utrzymane w KV.

**Werdykt Owner:** ☐ PASS · ☐ FAIL · ☐ DEFER

**Uwagi:**

---

## Boundary Check

| Granica | Dotknięta? | OK |
|---------|------------|-----|
| Payroll | NIE | ✓ |
| cloud-sync transport | NIE | ✓ |
| Edge Functions | NIE | ✓ |
| NG10 gate-exit | NIE | ✓ |
| App.tsx CORE | NIE | ✓ |
| Parsery | NIE | ✓ |
| Scoring | NIE | ✓ |

**Allowlist plików:**

- `src/lib/tender-document-discovery-ssot.ts` (NOWY)
- `src/lib/tender-pipeline/tender-full-document-discovery.ts`
- `src/app/hooks/useTenderDocumentsBootstrap.ts`
- `src/app/hooks/useTenderPipelineRuntime.ts`
- `src/lib/tender-pipeline/tender-pipeline-types.ts`
- `src/app/TenderDetailPage.tsx`
- `src/app/TenderDetailPanel.tsx`
- `scripts/test-ng11-p0-discovery-unification.mjs` (NOWY)

---

## Werdykt implementacji

**IMPLEMENTATION COMPLETE** · **RELEASE NOT READY** (brak Owner QA PASS · brak push)
