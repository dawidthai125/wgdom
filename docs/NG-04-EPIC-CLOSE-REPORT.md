# NG-04 — EPIC CLOSE REPORT

> **Epic:** NG-04 — Kosztorys Workspace PRO  
> **Status:** **EPIC CLOSED** · prod **2.63.12**  
> **Data closeout:** 2026-07-01  
> **Commit 04.4:** **`ab6637f`**

---

## Mission

Unified **BOQ Explorer** na tab Kosztorys — jeden ViewModel ATH + WGDOM, search, benchmark rbh, wyjaśnienia ATH — bez duplikacji parsera w UI.

---

## Timeline

| Faza | Wersja | Commit (prod) |
|------|--------|---------------|
| NG-04.1 BOQ Explorer | 2.63.9 | `5112718` |
| NG-04.2 Benchmark | 2.63.10 | `05d1473` |
| NG-04.3 ATH Fidelity | 2.63.11 | `adccb4e` |
| NG-04.4 Polish & Close | 2.63.12 | `ab6637f` |

---

## Principles SHIPPED (#001–#010)

| # | Nazwa | Faza |
|---|-------|------|
| #001 | One BOQ Row · One ViewModel · Many Views | 04.1 |
| #002 | Lazy Rendering First | 04.1 |
| #003 | Search ≠ Merge | 04.1 |
| #004 | Benchmark is Presentation | 04.2 |
| #005 | Derived UI Cache | 04.2 |
| #006 | UI Consumes Cache Only | 04.2 |
| #007 | Presentation Metadata Only | 04.2/04.3 |
| #008 | ATH Fidelity is Explain, Not Re-parse | 04.3 |
| #009 | Explain Before Expand | 04.3 |
| #010 | Polish Only | 04.4 |

---

## Architecture (final)

```text
buildKosztorysBoqExplorerView(item)     [#001 · #002]
  → filterKosztorysBoqRows()            [#003]
  → buildBoqLaborBenchmarkCache()       [#004–#006]
  → buildBoqAthPresentationCache()      [#007–#008]
  → BoqAthTooltip / BoqLaborBenchmarkBadge / BoqAthSourceStrip  [#009–#010]
```

---

## Known limitations (post-epic backlog)

- `code` parsera nie w snapshot (G-08)
- R/M/S tylko w `JobFilePreviewModal` (G-02)
- Brak virtualizacji 500+ wierszy
- Skeleton BOQ przy parse — P3 odłożony

---

## EPIC CLOSE checklist

| Kryterium | Status |
|-----------|--------|
| NG-04.4 P1+P2 zaimplementowane | ✅ |
| Regresja epic PASS | ✅ |
| `npm run build` PASS | ✅ |
| HelpView zaktualizowany | ✅ |
| RELEASE 2.63.12 na prod | ✅ |
| CURRENT-TASK EPIC CLOSED | ✅ |
| ARCHITECTURE REVIEW 2026 | ✅ |

**Werdykt:** **EPIC NG-04 CLOSED** — bez nowego epicu Przetargi.

---

## Review

[`ARCHITECTURE-REVIEW-2026-TENDERS.md`](ARCHITECTURE-REVIEW-2026-TENDERS.md) — NG-01–NG-04, review only.
