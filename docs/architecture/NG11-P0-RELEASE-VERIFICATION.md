# NG11-P0 — Discovery Unification · RELEASE VERIFICATION

> **Program:** NG11-P0 Discovery Unification  
> **Wersja:** **2.65.1**  
> **Data:** 2026-07-12  
> **Class:** CORE DISCOVERY bugfix

---

## RELEASE MODE

```text
FAST RELEASE — jeden bundle · build PASS · smoke PASS · Owner QA PASS
```

---

## RCA — scenariusz produkcyjny (Owner QA)

| # | Scenariusz | Werdykt | Dowód |
|---|------------|---------|-------|
| 1 | Przetarg settled-empty — auto bootstrap bez „Odśwież BZP” | **PASS** | Owner QA · harness U1/G1 |
| 2 | Intelligence widzi dokumenty · brak „Pobierz dokumenty z BZP” | **PASS** | P0-C2 `discoveryMergedItem` |
| 3 | „Odśwież BZP” — identyczny fingerprint i liczba | **PASS** | harness U2–U3 |
| 4 | Reload strony — dokumenty + intelligence utrzymane | **PASS** | Owner QA · KV persist |

**Harness RCA:** `test-ng11-p0-discovery-unification.mjs` — **12/12 PASS** (AUTO_EMPTY → MANUAL_REFRESH → AUTO_RETRY).

---

## BUILD / TEST

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `test-ng11-p0-discovery-unification.mjs` | **12/12** |
| `test-tender-full-document-discovery.mjs` | **19/19** |
| `test-ng11-discovery-fork.mjs` | **27/27** |

---

## BOUNDARY

Payroll · cloud-sync transport · Edge · NG10 · App.tsx CORE · parsery · scoring — **NIE DOTKNIĘTE** · **PASS**

---

## PRODUCTION STATUS

| Pole | Wartość |
|------|---------|
| `version.json` | **2.65.1** @ **`f4697f9`** |
| **PRODUCTION VERIFIED** | po verify FAST |

---

## HOTFIX CLASSIFICATION

BUGFIX · UX
