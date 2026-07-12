# NG11-P0 — Tender Pipeline Discovery · EPIC CLOSE REPORT

> **Program:** NG11-P0 (Discovery Unification + Bootstrap + Transport)  
> **Status:** **EPIC COMPLETE** · **PRODUCTION VERIFIED**  
> **Prod baseline:** **2.65.3** @ **`281ede1`** · https://www.wgdom.fun  
> **Data closeout:** 2026-07-12 (Owner CLOSEOUT)  
> **Następny stan:** **STABILIZATION WINDOW** — brak nowego programu bez Owner GO

---

## Werdykt Owner

| Pole | Wartość |
|------|---------|
| **Program** | **CLOSED** |
| **Production Verified** | **PASS** |
| **Protected Core** | **GREEN** |
| **Release Quality** | **PASS** |
| **Architecture** | **APPROVED** |

---

## Timeline slice'ów

| Slice | Wersja | Commit | Skrót |
|-------|--------|--------|-------|
| **P0** — Discovery Unification SSOT | **2.65.1** | `f4697f9` | `discoverTenderDocumentsSSOT` · manual = auto |
| **P0.1-A** — Bootstrap deferred retry | **2.65.2** | `db927ea` | RC-1 key drift · cap retry |
| **P0.2** — HTTP 414 transport (C-lite) | **2.65.3** | `281ede1` | Bez `noticeHtml` w GET gdy jest `noticeNumber` |

**Docs closeout chain:** `ed6f3ce` → `bba41fe` → `7b9ee7a` → feature `db927ea` → `281ede1`

---

## Problemy rozwiązane

| # | RCA | Fix |
|---|-----|-----|
| 1 | Manual vs auto discovery fork | SSOT `discoverTenderDocumentsSSOT` |
| 2 | Bootstrap key drift → brak retry (RC-1) | `inflightKeyAtStart` + deferred retry P0.1-A |
| 3 | HTTP **414** — `noticeHtml` ~26 KB w GET query | P0.2 C-lite — krótki URL · Edge pobiera HTML server-side |

---

## Production smoke (P0.2 — Owner)

**Przetarg:** `08deb7df-c8a3-22f4-5fad-9500012bb032` · settled-empty · `noticeHtmlLen=26693`

| Check | Wynik |
|-------|-------|
| Otwarcie przez AI · bez „Odśwież z BZP” | **PASS** |
| Auto discovery · **7** dokumentów | **PASS** |
| HTTP 414 / ERR_FAILED | **PASS** (brak) |
| GET `tenders-bzp-documents` — tylko `tenderId` + `noticeNumber` | **PASS** |
| Autonomous outcome | **PASS** |

---

## Test harness (release)

| Skrypt | Wynik |
|--------|-------|
| `test-ng11-p0-discovery-unification.mjs` | **12/12** |
| `test-ng11-p0.1-bootstrap-race.mjs` | **15/15** |
| `test-ng11-p0.2-documents-transport.mjs` | **11/11** |

---

## Protected Core

Payroll · Cloud Sync · CloudLoader · Parser · ATH · Intelligence · Scoring · App.tsx CORE · Edge Functions — **ZERO DIFF** w slice P0.2.

---

## SSOT dokumentacja

| Dokument | Rola |
|----------|------|
| [`NG11-P0-CLOSEOUT.md`](./NG11-P0-CLOSEOUT.md) | Closeout programu |
| [`NG11-P0-RELEASE-VERIFICATION.md`](./NG11-P0-RELEASE-VERIFICATION.md) | P0 release verify |
| [`NG11-P0.1-DESIGN-FREEZE.md`](./NG11-P0.1-DESIGN-FREEZE.md) | P0.1-A design |
| [`NG11-P0.2-DESIGN-FREEZE.md`](./NG11-P0.2-DESIGN-FREEZE.md) | P0.2 C-lite design |

---

## Backlog (poza epikiem)

| Item | Status |
|------|--------|
| **P0.2.1** — html-only anchor (brak numeru) | **OPEN** — Owner GO |
| **POST** transport BZP documents | **nie implementowano** (design) |
| **NG11-Q4** | Optional · Owner GO |
| **TWSL 2.63.91** | WIP lokalny · osobny bundle |

---

## Rollback

Revert kolejno: `281ede1` → `db927ea` → `f4697f9` (tylko na polecenie Owner). Edge bez zmian w P0.2.

---

*Owner CLOSEOUT 2026-07-12 · NG11-P0 EPIC COMPLETE*
