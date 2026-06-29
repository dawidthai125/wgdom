# W&G DOM — optymalizacja Web + Mobile (audyt)

> **Ostatnia aktualizacja:** 2026-05-25 · v2.45.17  
> **Prod:** https://wgdom.fun · PWA + Capacitor (Android/iOS ładują ten sam frontend)

---

## Stan po optymalizacji v2.45.17

| Metryka | v2.45.16 | v2.45.17 |
|---------|----------|----------|
| Główny chunk JS (gzip) | ~107 KB | **~64 KB** |
| Roboty (JobsView) | W głównym bundle | **panel-jobs** (~23 KB gzip) |
| Lista płac (PayrollView) | W głównym bundle | **panel-payroll** (~27 KB gzip) |
| Audyt statyczny mobile | 36/36 ✓ | 36/36 ✓ |

## Stan po optymalizacji v2.45.16

| Metryka | Przed (v2.45.14) | v2.45.15 | v2.45.16 |
|---------|------------------|----------|----------|
| Główny chunk JS (gzip) | ~204 KB | ~154 KB | **~107 KB** |
| Instrukcja + Changelog | W głównym bundle | W głównym bundle | **Osobny chunk** `panel-guide` (~41 KB gzip) |
| Przetargi (pdf.js, panele) | W głównym bundle | Osobny chunk | Bez zmian |
| Audyt statyczny mobile | 36/36 ✓ | 36/36 ✓ | 36/36 ✓ |

---

## Stan po optymalizacji v2.45.15 (archiwum)

| Metryka | Przed | Po (v2.45.15) |
|---------|-------|----------------|
| Główny chunk JS (gzip) | ~204 KB | **~154 KB** (−25%) |
| Przetargi (pdf.js, panele) | W głównym bundle | **Osobny chunk** — ładuje się przy wejściu w Przetargi |
| pdf.js | W głównym bundle | **Osobny chunk** `pdfjs` |
| pdfmake | Osobny (lazy export) | Bez zmian |
| Audyt statyczny mobile | 36/36 ✓ | 36/36 ✓ |

---

## Web (przeglądarka desktop)

### Zrobione
- **Code splitting:** lazy load — Przetargi, Inspektor, Pliki robot, muzyka, Instrukcja/Changelog, **Roboty (JobsView), Lista płac (PayrollView)**
- **Preconnect** do Supabase w `index.html` — szybszy pierwszy sync
- **manualChunks** w Vite — pdfmake, pdfjs, ui-vendor, panele inspektora/przetargów
- **Service Worker** `wgdom-shell-v21` — cache powłoki PWA

### Nadal w głównym bundle (świadomie)
- `App.tsx` — Pulpit, Grafik, Archiwum, Pracownicy, Kontakty (~8k linii)
- **JobPhotosGalleryView** — inline; można wydzielić w przyszłości

### Rekomendacje na później (duży refactor)
1. ~~Wydzielić `GuideView` + `CHANGELOG`~~ ✓ v2.45.16
2. ~~Wydzielić `JobsView` / `PayrollView`~~ ✓ v2.45.17
3. Virtualizacja długich list (roboty, przetargi BZP) — gdy >100 pozycji

---

## Mobile (iOS / Android / PWA)

### Zrobione (v2.45.15)
- Szybszy **start aplikacji** — mniejszy pierwszy JS
- **overscroll-behavior: contain** — mniej „gumowego” scrolla i przypadkowego pull-to-refresh
- **GPU layer** na dolnej nawigacji — mniej migotania
- Lazy panele — krótki spinner „Ładowanie…” zamiast blokady UI

### Już było (audyt 36/36)
- `100dvh`, `safe-area-inset`, inputy ≥16px (brak zoom iOS)
- Dolna nawigacja 4+Menu, bottom sheets modali
- Touch target ≥44px, `touch-action: manipulation`
- Pull-to-refresh, keyboard inset, Capacitor bridge
- Playwright smoke: iPhone SE + Pixel 7

### Testy po każdej większej zmianie mobile
```bash
npm run audit:mobile      # statyczny — 36 reguł
npm run test:mobile       # Playwright na wgdom.fun
```

### Na prawdziwym telefonie sprawdź
1. Logowanie admin → Pulpit (szybkość)
2. Lista płac → dodaj pracownika → godziny (scroll, klawiatura)
3. Roboty → zdjęcie / raport
4. Menu „Więcej” → Przetargi (lazy load)
5. PWA: Dodaj do ekranu głównego → cold start

---

## iOS / Android (Capacitor)

- UI z **Vercel** — optymalizacja JS dotyczy też natywnej skorupy
- Po deploy: użytkownicy PWA/APK dostają nowy JS automatycznie (cache SW v21)
- Szczegóły: [`docs/MOBILE-NATIVE.md`](MOBILE-NATIVE.md)

---

## Dla programistów

Przy optymalizacji wydajności:
1. **Nie** importuj ciężkich modułów statycznie w `App.tsx` — lazy lub dynamic `import()`
2. **pdfmake / pdf.js** — tylko on-demand (wzór: `loadPdfMake()`, analiza SWZ)
3. Po zmianie wersji UI → wpis w `changelog-data.ts` + `npm run build` (SW: `dist/sw.js`, cache `wgdom-shell-{APP_VERSION}`)
4. Uruchom `npm run build` i porównaj rozmiary `dist/assets/index-*.js`
