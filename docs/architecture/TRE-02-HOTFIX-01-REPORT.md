# TRE-02-HOTFIX-01 — HOTFIX REPORT

> **ID:** TRE-02-HOTFIX-01  
> **PRIORITY:** P0  
> **Owner GO:** ✅  
> **Data:** 2026-07-28  
> **UI:** **2.65.65**  
> **RCA:** [`TRE-02-HOTFIX-RCA.md`](TRE-02-HOTFIX-RCA.md)  
> **Język:** polski

---

## RELEASE MODE: FAST RELEASE

Powód: jeden thin bundle (mapper + testy + changelog + docs) · &lt;15 plików · brak Shared/payroll · zero Bid/AI-COST/sync/Edge.

---

## 1. Cel

Naprawa wyłącznie terminalnego mapowania w `deriveOfferRunSnapshot` — Outcome nie może wisieć na „Trwa wycena…” po zakończonej wycenie Bid bez ceny.

---

## 2. Zmiana

| Plik | Opis |
|------|------|
| `src/lib/tender-offer-run.ts` | `pricingSettledWithoutBid` → `insufficient_data` / „Brak rekomendowanej ceny”; „Trwa wycena…” tylko przy `workInFlight` |
| `scripts/test-tre-02-hotfix-01-offer-run-terminal.mjs` | HF1–HF6 |
| `scripts/test-tre-01-offer-run.mjs` | R5 terminal assertions |
| `src/app/changelog-data.ts` · `CHANGELOG.md` | **2.65.65** |

**OUT:** Bid · AI-COST · Edge · polling · sync · parsery · Outcome UI · TRE-03 · refactor.

---

## 3. BUILD / TEST

| | |
|--|--|
| **BUILD** | `npm run build` — **PASS** |
| **TEST** | hotfix **17 PASS** · TRE-01 **30 PASS** · TRE-02 default **6 PASS** |

---

## 4. Gate

G1–G9: **NIE** (mapper Offer Run only).

---

## 5. HOTFIX CLASSIFICATION

```text
BUGFIX
UX
```

---

## 6. WERDYKT

```text
RELEASE GO
IMPLEMENTATION COMPLETE
Commit 5eef0ff · UI 2.65.65
```

---

## 7. PRODUCTION STATUS

VERIFY FAST po push — jedno `curl version.json`.