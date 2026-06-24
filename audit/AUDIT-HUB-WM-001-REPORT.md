# AUDIT-HUB-WM-001 — Raport audytowy

**Moduł:** WM Druk → Audit Hub Integration  
**Data:** 2026-06-24  
**Tryb:** AUDIT ONLY · bez implementacji · bez commit kodu  
**Handoff agentów:** [`docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md`](../docs/SESSION-HANDOFF-AUDIT-HUB-WM-001.md)

---

## Cel

Ustalić, dlaczego działania w WM Druk (Pomiary, Schematy) nie pojawiają się w Audit Hub.

**Scenariusze testowe (wszystkie FAIL w Audit Hub):**

- tworzenie / edycja / usuwanie RAP
- tworzenie / edycja schematu
- eksport PDF schematu

---

## Werdykt

> **WM Druk nie jest zintegrowany z Audit Hub** (Pomiary + Schematy)

Częściowa integracja wyłącznie dla **Odbiorów** (`kw-wm-print-history`).

---

## A. Czy WM Druk generuje eventy audytowe?

**TAK — częściowo.**

| Zakres | Eventy | Widoczne w Audit Hub |
|--------|--------|----------------------|
| Odbiory — PDF/DOCX/ZIP szablonów | `kw-wm-print-history` | TAK (`wm_print`) |
| Publikacja pakietu inspektora | `kw-delivery-package-publications` + history | TAK (`delivery_package` + `wm_print`) |
| Pomiary (RAP) | brak | NIE |
| Schematy | brak | NIE |
| Katalog Pomiarów | brak | NIE |

---

## B. Gdzie zapisane / dlaczego niewidoczne

Testowany scenariusz (RAP, schematy) **nie zapisuje nic** — brak hooków, nie problem filtrów UI.

Istniejące wpisy Odbiorów wymagają akcji na zakładce **Odbiory** z przypisaną robotą (`jobId` obowiązkowy w `WmPrintHistoryEntry`).

---

## C. Brakujące eventy (GAP)

### Pomiary

- RAP created (linked / detached / TEST)
- RAP edited
- RAP deleted (+ Registry Guard)
- DOCX exported
- ZIP exported (katalog)

### Schematy

- schematic created
- schematic edited
- schematic deleted
- PDF exported
- measurement imported
- schematic duplicated (opcjonalnie)

---

## D. Rekomendacja P1

Nowy append-only KV `kw-wm-druk-audit-log` + adapter Audit Hub (wzorzec: `operational-notes-audit.ts`).

Szczegóły implementacji → handoff § 6.

---

## E. Szacunek

| Pracochłonność | Ryzyko |
|----------------|--------|
| **M** | **LOW–MEDIUM** |

---

## Security Log vs Audit Hub

Dwa osobne strumienie KV. WM nie zapisuje do Security Log. Brak pomyłki strumienia — po prostu brak integracji.

---

## UI Audit Hub

Filtry (`source`, `actor`, `search`) **nie ukrywają** WM Pomiary/Schematy — wpisy nie istnieją.

Źródło `wm_print` w filtrze pokazuje tylko historię Odbiorów.

---

*Raport wygenerowany w ramach audytu AUDIT-HUB-WM-001 · 2026-06-24*
