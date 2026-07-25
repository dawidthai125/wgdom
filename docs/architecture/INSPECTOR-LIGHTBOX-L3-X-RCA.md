# INSPECTOR-LIGHTBOX-L3-X — RCA

> **ID:** INSPECTOR-LIGHTBOX-L3-X  
> **STATUS:** **CLOSED** · false alarm (harness) · fix w TEST-HARNESS-LIGHTBOX-01 (`97f0424`) · **brak zmian w `src/**`**  
> **Data:** 2026-07-25  
> **Scope:** wyłącznie `InspectorPhotoGallery` (L3) + harness, który fałszywie raportował FAIL X  
> **NIE jest** kontynuacją MOBILE-LIGHTBOX-IOS-01 (IOS-01 nadal OPEN tylko na field Safari)

```text
WERDYKT: bug TESTU (selektor CSS), nie bug produktu L3 X.
Escape ≠ X w teście, bo Escape nie używa zepsutego selektora.
```

---

## 1. Przepływ zdarzeń X (produkt)

```text
Stan: lightboxIndex: number | null
Open:  openSlide(slide) → setLightboxIndex(idx)
Lock:  useModalScrollLock(lightboxIndex != null)

Render (gdy lightbox && lightboxIndex != null):
  <div.fixed.inset-0.z-[100].modal-overlay.modal-sheet>   // BRAK onClick backdrop
    … chevron / img …
    <button aria-label="Zamknij" onClick={() => setLightboxIndex(null)}>
      <X/>
    </button>
  </div>

X tap (produkt):
  1. click na <button aria-label="Zamknij">
  2. onClick → setLightboxIndex(null)
  3. lightbox = null → overlay odmontowany
  4. useEffect cleanup lock → html.modal-scroll-locked znika

Escape (produkt):
  window keydown Escape → setLightboxIndex(null)
  (ta sama ścieżka stanu co X)
```

**Odpowiedzi na checklistę Ownera (produkt):**

| # | Pytanie | Odpowiedź |
|---|---------|-----------|
| 1 | Czy klik trafia do X? | W **złym** teście: **NIE** (trafia w cały overlay `DIV`) |
| 2 | Czy handler X jest wykonywany? | W złym teście: **NIE** |
| 3 | Czy close callback / setState? | W złym teście: **NIE** wywołany |
| 4 | Czy stan resetowany? | Po złym kliku: **NIE**; po Escape / poprawnym X: **TAK** |
| 5 | Czy overlay odmontowany? | Po złym kliku: **NIE**; po Escape / poprawnym X: **TAK** |
| 6 | Escape vs X ścieżka? | **Ta sama** w produkcie (`setLightboxIndex(null)`); różnica tylko w **wejściu** testu |
| 7 | Czy Playwright trafia w przycisk? | Przy zepsutym selektorze: **NIE** |
| 8 | Harness vs produkt? | **Wyłącznie harness** (potwierdzone probe) |

---

## 2. Escape vs X (porównanie)

| | Escape | X (w audycie cross-platform) |
|--|--------|------------------------------|
| Mechanizm produktu | `keydown` → `setLightboxIndex(null)` | `button.onClick` → `setLightboxIndex(null)` |
| Stan / unmount / lock | Identyczne | Identyczne (gdy X naprawdę kliknięty) |
| Wejście w teście | `page.keyboard.press("Escape")` | `closeViaX()` → **zły locator** |
| Wynik w audycie | **PASS** | **FAIL** (overlay zostaje) |

**Wniosek:** Escape „działa”, X „nie działa” **tylko dlatego**, że test X nie klika przycisku.

---

## 3. Najbardziej prawdopodobna przyczyna

### Root cause — błąd konkatenacji selektora CSS w harnessie

W `e2e/lightbox-cross-platform-audit.spec.ts`:

```ts
const overlaySel = ".modal-overlay.modal-sheet, .modal-overlay.modal-lightbox";

async function closeViaX(page) {
  await page.locator(`${overlaySel} button[aria-label='Zamknij']`).first().click();
}
```

Po podstawieniu powstaje **niepoprawny** selektor:

```text
.modal-overlay.modal-sheet, .modal-overlay.modal-lightbox button[aria-label='Zamknij']
```

CSS `,` rozdziela **dwa pełne selektory**:

1. `.modal-overlay.modal-sheet` → **cały root overlay (DIV)**  
2. `.modal-overlay.modal-lightbox button[aria-label='Zamknij']` → button tylko dla L1 (`modal-lightbox`)

`.first()` przy L3 (ma `modal-sheet`) wybiera **DIV overlaya**, nie button X.

L3 **nie ma** `onClick` na root (brak backdrop close) → klik w DIV **nic nie zamyka**.

### Dowód laboratoryjny (probe, bez `src/**`)

```text
HIT_TEST / BAD_TAG  → DIV
GOOD_TAG            → BUTTON
AFTER_DOM_CLICK na złym target → overlayCount=1
AFTER_PW_CLICK (listener na prawdziwym button) → clicks=0, overlayCount=1
AFTER_ESCAPE → overlayCount=0
Poprawny selektor:
  .modal-overlay.modal-sheet button[aria-label='Zamknij'],
  .modal-overlay.modal-lightbox button[aria-label='Zamknij']
→ GOOD_TAG BUTTON → click → overlayCount=0, lock=0  (PASS)
```

Pliki probe: `e2e/l3-x-rca-probe.spec.ts`, `e2e/l3-x-rca-confirm.spec.ts`, `playwright.l3-x-rca.config.mjs`.

### Dlaczego L2/L4/L5 „X PASS” w tym samym audycie były mylące

Dla L2/L4/L5 root ma **backdrop `onClick` → close**.  
Zły selektor klika **DIV overlay** = w praktyce **backdrop close**, nie X.  
Fałszywy PASS ścieżki „X”.

L1 PASS był prawdziwy: L1 używa `modal-lightbox`, więc pierwsza gałąź `.modal-overlay.modal-sheet` nie matchuje; druga gałąź trafia w **button**.

---

## 4. Klasyfikacja

| Opcja | Werdykt |
|-------|---------|
| Bug produktu (`InspectorPhotoGallery` X) | **NIE** — handler i stan OK; potwierdzone poprawnym selektorem |
| Bug testu (harness) | **TAK** — priorytet P0 dla wiarygodności audytu |
| Fałszywy alarm | **TAK** względem regresji produktu L3 X |

```text
INSPECTOR-LIGHTBOX-L3-X = FALSE ALARM produktu
                       = REAL BUG harness CSS selector
```

---

## 5. Minimalny plan naprawy (NIE implementować w tym ticketcie)

### MUST (harness only)

1. Zmienić `closeViaX` / wspólny locator na **oba człony z `button[...]`**:

```ts
page.locator(
  ".modal-overlay.modal-sheet button[aria-label='Zamknij'], .modal-overlay.modal-lightbox button[aria-label='Zamknij']",
)
```

albo:

```ts
page.locator(".modal-overlay").locator("button[aria-label='Zamknij']")
```

2. Ponowić L3 (i opcjonalnie L2/L4/L5) — asercja, że klikany node to `BUTTON`.  
3. Opcjonalnie: osobny test „X vs backdrop” (klik w padding vs klik w X), żeby nie mylić ścieżek.

### OUT

- Zmiany w `InspectorPhotoGallery.tsx`  
- Portal L3 / swipe / share  
- MOBILE-LIGHTBOX-IOS-01 field Safari (osobny tor)

### Po fix harness

```text
Oczekiwany wynik: L3 X PASS na Chromium emul
Produkt L3: bez diff
```

---

## 6. Relacja do innych ticketów

| Ticket | Relacja |
|--------|---------|
| MOBILE-LIGHTBOX-IOS-01 | **Niezależny** — nadal OPEN na fizyczny iPhone Safari |
| Cross-platform audit L3 FAIL | **Wyjaśniony** — nie blokuje wiarygodności L1 portal PASS |
| MUX-B1 L3 | Produkt X OK; ewentualny harness mux-b1 używał Escape, więc nie wykrył tego błędu selektora |

---

**Raport:** `docs/architecture/INSPECTOR-LIGHTBOX-L3-X-RCA.md`
