# INSPECTOR-UX-002 — Quick Wins — raport IMPLEMENT

**Data:** 2026-06-16  
**Wersja:** **2.59.47**  
**Audyt źródłowy:** [`INSPECTOR-UX-001-AUDIT.md`](INSPECTOR-UX-001-AUDIT.md)  
**Zakres:** TOP 3 quick wins · UI-only · bez nowych domen KV

---

## 1. Executive Summary

Zrealizowano trzy quick wins z audytu UX inspektora: **sticky status pakietu** w nagłówku roboty, **pakiet odbiorowy above the fold** (pierwszy blok scrollu, wszystkie sekcje), **pasek skrótów** Pobierz pakiet / Checklista / Zdjęcia. Bez zmian workflow publikacji ani sync.

| Werdykt | **PASS** |
|---------|----------|
| Build | po smoke |
| Smoke UX002 | 10/10 |
| Deploy | po push → verify FAST |

---

## 2. Zmiana 1 — Sticky Header

- Chip w sticky headerze roboty (widoczny na każdej zakładce sekcji)
- 🟢 **PAKIET GOTOWY** / 🔴 **BRAK PAKIETU**
- Helper: `inspectorDeliveryPackageStatusDisplay()` w `inspector-handover-ux.ts`

---

## 3. Zmiana 2 — Pakiet above the fold

- `InspectorDeliveryPackagePanel` przeniesiony **poza** sekcję WM
- Kolejność scrollu: nagłówek → **pakiet** → treść aktywnej sekcji
- `id="inspector-delivery-package"` + `scroll-mt-3` dla scrollIntoView

---

## 4. Zmiana 3 — Quick Actions

- `InspectorHandoverQuickBar` w sticky headerze
- **Pobierz pakiet** — download lub scroll do panelu gdy brak publikacji
- **Checklista** → sekcja `docs`
- **Zdjęcia** → sekcja `photos`

---

## 5. Pliki

| Plik | Rola |
|------|------|
| `src/lib/inspector-handover-ux.ts` | status, quick action defs, layout order |
| `src/app/InspectorHandoverQuickBar.tsx` | UI paska skrótów |
| `src/app/InspectorPanel.tsx` | integracja header + kolejność |
| `src/app/InspectorDeliveryPackagePanel.tsx` | id, shared download handler |
| `scripts/test-inspector-ux-002.mjs` | smoke |

---

## 6. Ograniczenia (bez zmian w UX-002)

- Billing nadal w sekcji WM (collapse — backlog UX-003)
- Desktop nadal `max-w-2xl`
- P1C stale detection — osobny sprint

---

## 7. Następne kroki (opcjonalne)

- Badge pakietu na karcie listy robót (quick win #6 z audytu)
- Collapse billing w WM
- Checklist X/Y w sticky headerze
