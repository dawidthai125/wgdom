# POST-ZI DOCS CLEANUP — raport P0.5A

**Data:** 2026-06-15  
**Zakres:** dokumentacja only · **bez zmian kodu / funkcjonalnych**  
**Cel:** ujednolicenie SSOT po zamknięciu **ZI-Tauron-2026 PRODUCTION STABLE** (prod **v2.59.24**)

---

## Werdykt

| Status | Wynik |
|--------|-------|
| **P0.5A DOCS CLEANUP** | **COMPLETE** |
| **Prod baseline** | **2.59.24** · commit `65051a3` |
| **ZI LiveCycle 2021** | **CLOSED** (tombstone) |
| **ZI Tauron 2026** | **PRODUCTION STABLE** |

---

## Zmienione pliki

| Plik | Rodzaj zmiany |
|------|----------------|
| `docs/PROJECT-HANDOFF-CURRENT.md` | Baseline 2.59.24, ZI STABLE, canonical UUID, START HERE |
| `AGENTS.md` | START HERE, prod 2.59.24, ZI 2026 jako SSOT |
| `docs/ARCHITECTURE.md` § 12.1.8 | KV 8 templates, routing Tauron 2026, tombstone |
| `docs/SESSION-HANDOFF-WM-PRINT-ODBIORY-DRUK.md` | Diagram ZIP, sekcje 5–9a, testy, werdykt closeout |
| `CURRENT-TASK.md` | Closeout 2.59.24 + linki SSOT/validation |
| `docs/ZI-2026-HANDOFF.md` | PRODUCTION STABLE, canonical UUID, validation link, tombstone smoke |
| `docs/RELEASE-REPORT-ZI-2026.md` | Sekcje 2.59.22–24, verify 2.59.24 |
| `docs/ZI-2026-IMPACT-REPORT.md` | Stan prod 2.59.24, KV tombstone |
| `.cursor/rules/wgdom-stan-projektu.mdc` | Prod 2.59.24, ZI STABLE (hasło kontynuuj WGDOM) |
| `.cursor/rules/wgdom-read-architecture-first.mdc` | Kolejność czytania, ZI 2026 SSOT |
| `audit/README.md` | **NOWY** — mapa katalogu audit/ |

**Nie zmieniano (już poprawne / historyczne):**

- `audit/ZI-FINAL-HANDOFF.md` — banner „superseded by ZI 2026” (historyczne RCA)
- `audit/tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md` — werdykt prod (źródło)
- `CHANGELOG.md` / `changelog-data.ts` — 2.59.24 już obecne (bez bump w P0.5A)

---

## Stare informacje usunięte / zastąpione

| Stara informacja | Nowa informacja |
|------------------|-----------------|
| Prod **2.59.19** / commit `1a8c892` | Prod **2.59.24** / commit `65051a3` |
| **ZI §3 OPEN · NO-GO** | **ZI-Tauron-2026 PRODUCTION STABLE** |
| Canonical UUID **`26f02c78-…`** | Canonical **`2b22da48-…`** · legacy = **TOMBSTONE** |
| KV **15** rekordów templates | KV **8** · **1× aktywny ZI** |
| ZI przez `generate-pdf.ts` / `generatePdfFormFromTemplate` | ZI przez `generate-pdf-zi-tauron2026.ts` |
| Mapping TextField2[8/9/10] @ §3 y≈142 | Mapping **99/111/112** @ §4 (Tauron 2026) |
| SSOT ZI = `audit/ZI-FINAL-HANDOFF.md` (pierwsze źródło) | SSOT = `docs/ZI-2026-HANDOFF.md` |
| Backlog P1: „nowy szablon ZI” | Zamknięte — Tauron 2026 wdrożony |
| `audit/ZI-FINAL-HANDOFF.md` jako ★★★ start | Historyczne RCA — tylko archiwum LiveCycle |

---

## Nowe informacje dodane

| Informacja | Gdzie |
|------------|-------|
| **PRODUCTION STABLE** werdykt | PROJECT-HANDOFF-CURRENT, CURRENT-TASK, SESSION-HANDOFF §9a |
| Link **FINAL-ZI-2026-PROD-VALIDATION.md** | ZI-2026-HANDOFF, audit/README, cursor rules, SESSION-HANDOFF §7 |
| Canonical UUID **`2b22da48-46dc-42a0-8236-d42b5b5562dc`** | Wszystkie SSOT + audit/README |
| Legacy tombstone **`26f02c78-871c-4d65-aeac-d0ca06bf060c`** | SSOT + sekcja „Czego NIE zmieniać” |
| Release chain **2.59.22 → 2.59.23 → 2.59.24** | RELEASE-REPORT-ZI-2026, PROJECT-HANDOFF baseline |
| Smoke **`test-wm-print-zi-2026-tombstone-smoke.mjs`** | SESSION-HANDOFF §8, ZI-2026-HANDOFF |
| **`audit/README.md`** — mapa katalogu | audit/ (nowy plik) |
| Backlog **P0.5** kod/audit cleanup | POST-ZI-CLEANUP-AUDIT, CURRENT-TASK |
| P1 backlog: dual-fill §4 pola 95/96/97 | SESSION-HANDOFF §6 (nie blokuje prod) |

---

## Workflow

| Krok | Status |
|------|--------|
| IMPLEMENT (docs) | **DONE** |
| BUILD (`npm run build`) | **PASS** |
| COMMIT | **`596a72e`** |
| PUSH | **PASS** → `origin/main` |
| VERIFY DEPLOY FAST | **PASS** — `version.json` = **2.59.24** |
| RAPORT (ten plik) | **DONE** |

### VERIFY DEPLOY FAST (2026-06-16)

```text
GET https://www.wgdom.fun/version.json
→ { "version": "2.59.24" }
```

**RELEASE GO:** TAK (docs-only — wersja UI bez zmian) · **PRODUCTION VERIFIED:** TAK

---

## Następny agent

1. Czytaj [`docs/ZI-2026-HANDOFF.md`](../docs/ZI-2026-HANDOFF.md) — **nie** traktuj §3 LiveCycle NO-GO jako stan prod.
2. Walidacja: [`tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md`](tauron-audit-2026-06-15/FINAL-ZI-2026-PROD-VALIDATION.md).
3. Housekeeping kodu: [`POST-ZI-CLEANUP-AUDIT.md`](POST-ZI-CLEANUP-AUDIT.md) — tylko na polecenie.
