# TEST-HARNESS-LIGHTBOX-01 — IMPLEMENT / VERIFY

> **STATUS:** **CLOSED** · cross-platform audit **35/35 PASS**  
> **Data:** 2026-07-25  
> **Produkt `src/**`:** **NIE zmieniany** w tym ticketcie  
> **Commit:** `97f0424` (pushed z MOBILE-LIGHTBOX-IOS-01)  
> **RCA SSOT:** [`INSPECTOR-LIGHTBOX-L3-X-RCA.md`](INSPECTOR-LIGHTBOX-L3-X-RCA.md)

---

## 1. Diff harness

| Plik | Zmiana |
|------|--------|
| `e2e/lightbox-cross-platform-audit.spec.ts` | `closeXSel` z `button` w **obu** członach; `closeViaX` asercja `tagName === "BUTTON"`; rozdział path X vs backdrop; tytuły testów L1–L5 |
| Probe RCA files | usunięte po potwierdzeniu |

**Kluczowa poprawka:**

```ts
// BYŁO (złe — .first() = DIV .modal-sheet):
`${overlaySel} button[aria-label='Zamknij']`

// JEST:
const closeXSel =
  ".modal-overlay.modal-sheet button[aria-label='Zamknij'], .modal-overlay.modal-lightbox button[aria-label='Zamknij']";
```

---

## 2. Wyniki

| | |
|--|--|
| Cross-platform audit | **35/35 PASS** |
| L3 X | **PASS** |

---

## 3. Ticket

| | |
|--|--|
| TEST-HARNESS-LIGHTBOX-01 | **CLOSED** |

---

**Koniec toru TEST-HARNESS-LIGHTBOX-01.**
