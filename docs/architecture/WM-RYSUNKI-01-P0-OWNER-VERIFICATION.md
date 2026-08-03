# WM-RYSUNKI-01 P0 — OWNER VERIFICATION

> **STATUS:** **SUPERSEDED** przez [`WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL.md`](./WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL.md) (**OV PASS**)  
> **Slice:** P0 FOUNDATION  
> **UI:** **2.65.96** (changelog) · flaga **OFF**  
> **Data:** 2026-08-03  
> **Commit/Push:** **NIE** — czekaj na Owner GO COMMIT  

## Jak włączyć

```js
localStorage.setItem("kw-wm-rysunki-01", "1");
location.reload();
```

Wyłączenie: `localStorage.setItem("kw-wm-rysunki-01", "0")` + reload.

## Checklist OV (MR-08)

| # | Kryterium | PASS? |
|---|-----------|-------|
| 1 | Flaga OFF → brak zakładki Rysunki | PASS (FINAL) |
| 2 | Flaga ON → zakładka po Odbiory | PASS (FINAL) |
| 3 | Nowy rysunek z szablonu + robota → zapis | PASS (FINAL) |
| 4 | Reload → rysunek wraca | PASS (FINAL) |
| 5 | Ściana (2 kliknięcia) + tekst | PASS (FINAL) |
| 6 | Grid / Snap toggle | PASS (FINAL) |
| 7 | Undo / Redo | PASS (FINAL) |
| 8 | Autosave (wskaźnik „Zapisano”) | PASS (FINAL) |
| 9 | Duplikuj dokument | PASS (FINAL) |
| 10 | Usuń dokument (nie wraca po reload) | PASS (FINAL) |
| 11 | AC-P0-09: ściany+tekst z szablonu ≤ 3 min (wąski UX) | PASS kontrakt (FINAL) |

**OUT P0 (nie testować jako bug):** drzwi, okna, PDF, ZIP, punkty.

## Testy automatyczne

```bash
npx vite-node scripts/test-wm-rysunki-01-p0.mjs
```

**33 PASS** · SSOT: [`WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL.md`](./WM-RYSUNKI-01-P0-OWNER-VERIFICATION-FINAL.md)
