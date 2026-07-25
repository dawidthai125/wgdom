# TEST-HARNESS-LIGHTBOX-01 — IMPLEMENT / VERIFY

> **STATUS:** IMPLEMENT COMPLETE · cross-platform audit **35/35 PASS**  
> **Data:** 2026-07-25  
> **Produkt `src/**`:** **NIE zmieniany** w tym ticketcie  
> **Commit:** tylko po zatwierdzeniu Ownera · **Push: NIE**  
> **RCA SSOT:** [`INSPECTOR-LIGHTBOX-L3-X-RCA.md`](INSPECTOR-LIGHTBOX-L3-X-RCA.md)

---

## 1. Diff harness

| Plik | Zmiana |
|------|--------|
| `e2e/lightbox-cross-platform-audit.spec.ts` | `closeXSel` z `button` w **obu** członach; `closeViaX` asercja `tagName === "BUTTON"`; rozdział path X vs backdrop; tytuły testów L1–L5 |
| `e2e/l3-x-rca-probe.spec.ts` | **usuniety** (probe RCA) |
| `e2e/l3-x-rca-confirm.spec.ts` | **usuniety** |
| `playwright.l3-x-rca.config.mjs` | **usuniety** |

**Kluczowa poprawka:**

```ts
// BYŁO (złe — .first() = DIV .modal-sheet):
`${overlaySel} button[aria-label='Zamknij']`
// → ".modal-overlay.modal-sheet, .modal-overlay.modal-lightbox button[…]"

// JEST:
const closeXSel =
  ".modal-overlay.modal-sheet button[aria-label='Zamknij'], .modal-overlay.modal-lightbox button[aria-label='Zamknij']";
```

`src/**` — **0 linii** w tym IMPLEMENT.

---

## 2. Wyniki przed / po

| | Przed (cross-platform audit) | Po (harness fix) |
|--|------------------------------|------------------|
| Score | **28 PASS / 7 FAIL** | **35 PASS / 0 FAIL** |
| L3 X (7 devices) | **FAIL** (klik w DIV) | **PASS** (BUTTON + close) |
| Czas | ~3.4 min (z FAIL) | ~1.8 min |

```text
npx playwright test --config=playwright.lightbox-cross-platform.config.mjs
→ 35 passed (1.8m)
```

---

## 3. L1–L5 (po fix, wszystkie 7 device)

| Lightbox | Escape | X (BUTTON assert) | Backdrop | Rapid / reopen |
|----------|--------|-------------------|----------|----------------|
| **L1** | PASS | PASS | PASS | PASS ×10 |
| **L2** | PASS | PASS | PASS | PASS |
| **L3** | PASS | PASS | N/A (by design) | PASS ×5 X |
| **L4** | PASS | PASS | PASS | PASS |
| **L5** | PASS | PASS | PASS | PASS |

Devices: iPhone SE, 12, 14 Pro, 15 Pro Max, Pixel 7, Pixel 8-approx, Galaxy S23-proxy.

---

## 4. Czy wszystkie ścieżki X przechodzą?

**TAK** — L1, L2, L3, L4, L5 na wszystkich 7 projektach Chromium emul; każda `closeViaX` wymaga `tagName === "BUTTON"`.

---

## 5. Potwierdzenie: brak zmian `src/**` w tym ticketcie

```text
IMPLEMENT TEST-HARNESS-LIGHTBOX-01 = tylko e2e (+ usunięcie probe RCA)
InspectorPhotoGallery / JobPhotoGallery / mobile.css / modal-scroll-lock = nietknięte w tej fazie
```

*(Working tree może mieć wcześniejsze diffy MUX/IOS-01 w `src/` — to nie jest częścią tego harness IMPLEMENT.)*

---

## 6. Commit / push

```text
Commit harness: TYLKO po „commit TEST-HARNESS-LIGHTBOX-01” od Ownera
Push: NIE
```

**Raport:** `docs/architecture/TEST-HARNESS-LIGHTBOX-01-VERIFY.md`
