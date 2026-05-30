# W&G DOM — bieżąca sesja / wznowienie pracy

> **Aktualizuj ten plik na końcu każdej większej sesji z agentem AI.**  
> Hasło w Cursorze: **„kontynuuj WGDOM”** (czytaj też `.cursor/rules/wgdom-stan-projektu.mdc`).

**Ostatnia aktualizacja:** 2026-05-25  
**Wersja produkcji:** `2.45.13` (`CHANGELOG[0].version` w `App.tsx`)  
**Prod:** https://wgdom.fun · **Repo:** `main`

---

## Co jest skończone

- **v2.45.12** — mapa przetargów Wrocław z kafelkami OpenStreetMap (zamiast pustego SVG)
- **v2.45.12** — panel słownika słów kluczowych: podgląd wbudowanych haseł, licznik wbudowanych/własnych
- **v2.45.13** — docs AI: PROJECT-GUIDE, CHANGELOG.md, CURRENT-TASK, START HERE w AGENTS.md

---

## W trakcie

- *(pusto — wszystko z ostatniej sesji wdrożone i wypchnięte)*

---

## Następne (propozycje)

1. **Weryfikacja na produkcji** — mapa OSM i słownik w zakładce Przetargi (Ctrl+F5 po deploy Vercel)
2. **HelpView** — krótki opis mapy OSM i roli słownika (wbudowany vs własne słowa)
3. **ARCHITECTURE.md § 12.1.1** — doprecyzować mapę OSM v2.45.12 (jeśli jeszcze nie zaktualizowane w pełni)
4. Opcjonalnie: skrypt lub reguła sync `CHANGELOG.md` ← `App.tsx` przy nowych wersjach

---

## Znane otwarte uwagi

- Mapa pokazuje tylko **aktywne** przetargi we **Wrocławiu** (`isTenderOpenForOffers` + heurystyka adresów)
- Geolokacja przetargów to **heurystyka** (ulice znane + jitter) — nie geokodowanie API
- Słownik „pusty” w polach edycji = **brak własnych dopisków**; ~280 haseł jest wbudowanych w kod

---

## Szybki start dla nowego agenta

```
1. AGENTS.md
2. PROJECT-GUIDE.md  → docs/ARCHITECTURE.md
3. CHANGELOG.md      → App.tsx CHANGELOG (źródło prawdy)
4. TEN PLIK (CURRENT-TASK.md)
```
