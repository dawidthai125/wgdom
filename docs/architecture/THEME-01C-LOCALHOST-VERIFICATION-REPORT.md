# THEME-01C — LOCALHOST VERIFICATION REPORT (rev. 2)

> **Data:** 2026-07-15  
> **Poprzedni raport (rev. 1):** **UNVALID** — PASS bez czystego dev po fixie JobsView  
> **Wersja lokalna:** 2.65.30 (THEME-01C)  
> **Werdykt rev. 2:** **PASS** — po restarcie dev + potwierdzeniu braku overlay

---

## Root Cause Analysis — fałszywy PASS (rev. 1)

| # | Przyczyna |
|---|-----------|
| 1 | Playwright test 05 przeszedł po **programowym** usunięciu `vite-error-overlay` z DOM — ukrył realny błąd dev |
| 2 | Fix duplikatu `PHOTO_LABEL_NAMES` był w working tree, ale **dev server nie został zrestartowany** — Vite trzymał stary stan błędu |
| 3 | Raport PASS bez weryfikacji logu Vite po wejściu w **Roboty** |

**Wniosek:** LOCALHOST VERIFICATION rev. 1 = **FAILED** (procedura, nie motyw).

---

## Analiza — `PHOTO_LABEL_NAMES` w `JobsView.tsx`

### Importy (stan po fixie)

| Linia | Import |
|-------|--------|
| **53** | `import { uploadPhoto, prepareWatermarkedPhoto, PHOTO_LABEL_NAMES } from "@/app/app-domain";` |
| **118–130** | Duży blok `from "@/app/app-domain"` — **bez** `PHOTO_LABEL_NAMES` |

### Użycia (nie importy)

- 445, 859, 2789, 2840 — odwołania runtime

### Dlaczego był duplikat?

Historycznie symbol trafił do **dwóch** deklaracji `import … from "@/app/app-domain"`:

1. **L53** — import funkcji upload/watermark + `PHOTO_LABEL_NAMES` (photos pipeline)
2. **L129 (stary)** — zbiorczy import domain — przypadkowo **powtórzył** `PHOTO_LABEL_NAMES` obok `PHOTO_LABEL_ORDER`

Babel w dev (`@vitejs/plugin-react`) scala oba importy w jeden scope modułu → **Identifier 'PHOTO_LABEL_NAMES' has already been declared**.

`npm run build` (esbuild) mógł przechodzić — dev Babel failuje wcześniej.

### Fix (wyłącznie duplikat)

Usunięto `PHOTO_LABEL_NAMES,` z drugiego importu (linia 129):

```diff
-  PHOTO_LABEL_NAMES, PHOTO_LABEL_ORDER, getAppPhotoLabelSection, ...
+  PHOTO_LABEL_ORDER, getAppPhotoLabelSection, ...
```

**Canonical import:** linia 53 (bez innych zmian w pliku).

---

## Weryfikacja techniczna (rev. 2)

| Check | Wynik |
|-------|-------|
| `npm run dev` (fresh restart) | ✅ http://127.0.0.1:5173/ |
| Log Vite po pełnym smoke (w tym Roboty) | ✅ **brak** Internal server error |
| Czerwony overlay Vite | ✅ **brak** |
| Babel parse error | ✅ **brak** |
| `npm run build` | ✅ PASS |
| Playwright 9/9 | ✅ PASS |

```bash
PW_BASE_URL=http://127.0.0.1:5173 npx playwright test --config=playwright.theme01c.config.ts
```

---

## Motyw / moduły (skrót)

- Dark → Light → Dark + `wg-theme` persystencja: ✅
- FOUC / F5 dark bez białego flasha: ✅
- Moduły admin (Pulpit, LP, Grafik, Kadry, Archiwum, **Roboty**, Przetargi, Instrukcja): ✅
- Dark parity login vs prod: ✅
- Inspector/Worker login: ✅

Screenshoty: `.tmp/theme-01c-local-verify/`

---

## Końcowy werdykt

```text
THEME-01C LOCALHOST VERIFICATION: PASS (rev. 2)
Poprzedni PASS (rev. 1): FAILED / UNVALID
COMMIT: wstrzymany — czeka na Owner GO
PUSH: wstrzymany
```

**Uwaga:** `JobsView.tsx` fix duplikatu importu jest **poza scope THEME-01C**, ale **wymagany** dla czystego localhost — Owner decyduje o bundlu commit.
