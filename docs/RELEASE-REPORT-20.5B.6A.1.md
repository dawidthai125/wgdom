# Release Report — v2.50.55 Dokumentacja Robót Naming Refresh (20.5B.6A.1)

**Data:** 2026-06-09  
**Wersja UI:** **2.50.55**  
**Commit:** **`782fe87`**  
**Deploy:** **`4995467947`** — **SUCCESS**  
**CI Mobile:** run **`27233391718`** — **SUCCESS**  
**Status:** **RELEASED**

---

## Summary

Ujednolicono nazewnictwo modułu dokumentacji wykonania robót (dawniej „Raporty”) we wszystkich rolach: admin, pracownik, inspektor. Dodano hinty semantyczne: obrys/wymiary ≠ plan techniczny PDF; help przy checklistie „Rysunek/Plan”.

**Bez zmian:** `workerReports[]`, sync, KV, Edge, `REQUIRED_DOCS`, PDF/ZIP, kolejność tabów.

---

## Zmienione pliki (release)

| Plik | Zmiana |
|------|--------|
| `JobDetailSectionNav.tsx` | Tab „Dokumentacja” |
| `JobWorkerReportsPanel.tsx` | Nagłówek, podtytuł, hint obrys/plan |
| `WorkerPhotoView.tsx` | „Dokumentacja robót”, „Twoja dokumentacja” |
| `InspectorNavigation.tsx` | „Dokumentacja” / skrót „Dok.” |
| `InspectorPanel.tsx` | Copy sekcji + hint |
| `InspectorDocChecklist.tsx` | Help „Rysunek/Plan” |
| `DashboardView.tsx` | „Nowa dokumentacja od ekipy” |
| `GuideView.tsx` | FAQ + sekcja dokumentacja vs plan |
| `job-documents.ts` | Stałe UI help |
| `changelog-data.ts` | Wpis 2.50.55 |
| `scripts/smoke-test-job-documentation-labels-20.5b6a.mjs` | Smoke T1–T7 |

---

## Walidacja

| Check | Wynik |
|-------|-------|
| `npm run build` | **PASS** |
| `smoke-test-job-documentation-labels-20.5b6a.mjs` | **19/19 PASS** |
| `smoke-test-technical-drawing-20.5a9.mjs` | **21/21 PASS** |
| `smoke-test-media-separation-20.5a8.mjs` | **18/18 PASS** |
| `smoke-test-jobs-2.0-midb.mjs` | **21/21 PASS** |
| GitHub Actions `#27233391718` | **SUCCESS** |
| Vercel deploy `#4995467947` | **SUCCESS** |
| Prod bundle `smoke-prod-bundle-2.50.55.mjs` | **17/17 PASS** (wgdom.fun + wgdom.online) |

**Supabase / KV / Edge:** brak zmian

---

## Commit Report

| Pole | Wartość |
|------|---------|
| **SHA** | `782fe87` |
| **Message** | `feat(jobs): Dokumentacja robót naming refresh (20.5B.6A.1)` |
| **Body** | Rename Raporty tab to Dokumentacja across admin, worker and inspector; add obrys/plan hints without sync or model changes. |

---

## Deploy Report

| Pole | Wartość |
|------|---------|
| **Deployment ID** | `4995467947` |
| **Status** | **SUCCESS** |
| **URL** | https://www.wgdom.fun |
| **CI Mobile** | run `27233391718` — **SUCCESS** |

---

## Post-Deploy Smoke (bundle)

| Checklist | Wynik |
|-----------|-------|
| Wersja 2.50.55 | **PASS** |
| „Dokumentacja robót” (admin + pracownik) | **PASS** |
| Podtytuł zakres/wymiary/obrys | **PASS** |
| Hint obrys ≠ plan PDF | **PASS** |
| Help plan techniczny PDF | **PASS** |
| Dashboard „Nowa dokumentacja od ekipy” | **PASS** |
| Brak „Raporty”, „Raport z budowy”, „Zakresy i wymiary” | **PASS** |
| Brak „Nowe raporty od pracowników” | **PASS** |

---

## Final Verdict

```text
RELEASE SUCCESS
```

---

## Baseline po wdrożeniu

```text
Version: 2.50.55
Commit: 782fe87
Deploy: 4995467947
Status: RELEASED · STABLE

Sprint 20.5B.6A.1 — Dokumentacja Robót Naming Refresh

✓ Raporty → Dokumentacja
✓ Raport z budowy → Dokumentacja robót
✓ Zakresy i wymiary → Dokumentacja
✓ Dashboard: „Nowa dokumentacja od ekipy”
✓ Hint: obrys/wymiary ≠ plan techniczny PDF
✓ Help przy „Rysunek / Plan”
✓ Brak zmian sync, KV, Edge i REQUIRED_DOCS
✓ Regresja 20.5A.8 / 20.5A.9 / MID-B PASS
```
