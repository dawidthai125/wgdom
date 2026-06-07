# Sprint 20.3A — Product Review: Do rozliczenia (Recoverable Charges)

> **Data:** 2026-06-06  
> **Tryb:** PRE-COMMIT PRODUCT REVIEW — bez implementacji, bez commitów  
> **Wersja:** 2.46.00 (lokalnie)  
> **Perspektywa:** właściciel firmy / admin operacyjny (nie audyt techniczny)

---

## Spis treści

1. [KROK 1 — Test biznesowy](#krok-1--test-biznesowy)
2. [KROK 2 — KPI modułu](#krok-2--kpi-modułu)
3. [KROK 3 — Formularz](#krok-3--formularz)
4. [KROK 4 — Media](#krok-4--media)
5. [KROK 5 — Responsive 1366×768](#krok-5--responsive-1366768)
6. [KROK 6 — Gotowość do release](#krok-6--gotowość-do-release)
7. [RECOMMENDATION](#recommendation)

---

## KROK 1 — Test biznesowy

### Przykładowe dane (symulacja widoku listy)

Założenia testu: 5 pozycji `open`/`partial`, mieszanka `job` + `standalone`, opis = to, co właściciel wpisuje na co dzień.

| # | Pozycja | Kwota | sourceType | Jak wygląda w kolumnie **Opis** | Jak wygląda w **Źródło** |
|---|---------|-------|------------|----------------------------------|---------------------------|
| 1 | Szkoła nr 5 | 630 zł | `job` | `Szkoła nr 5 — Dodatkowe prace malarskie` | `ul. Szkolna 12 — Szkoła nr 5` |
| 2 | Przedszkole | 450 zł | `standalone` | `Przedszkole — Wymiana kontaktu` | `Przedszkole Słoneczko` |
| 3 | Naprawa bramy | 420 zł | `standalone` | `Naprawa bramy` (sam opis, bez tytułu) | `Wspólnota XYZ` |
| 4 | Komin | 800 zł | `job` | `Komin — Prace kominiarskie poza zakresem` | `ul. Długa 44 m.8 — Municipal` |
| 5 | Dodatkowe malowanie | 250 zł | `job` | `Dodatkowe malowanie` (tylko tytuł) | `ul. Krótka 1 2 — Jan Kowalski` |

**Suma OPEN + partial (wszystkie 5):** **2 550,00 zł**

### Ocena pytań biznesowych

| # | Pytanie | Ocena | Uzasadnienie |
|---|---------|-------|--------------|
| 1 | Czy od razu widać kwoty? | **TAK** | Dedykowana kolumna **Kwota**, `font-semibold`, format `1 250,50 zł`. Przy 1366 px czytelna. |
| 2 | Czy od razu widać status? | **TAK, z zastrzeżeniem** | Kolumna **Status** z emoji 🔴🟡🟢 + etykieta („Otwarta”). Kolumna wąska (~5.5 rem) — przy dłuższych etykietach OK, ale emoji + tekst konkurują z kwotą o uwagę. |
| 3 | Czy bez szczegółów wiadomo, czego dotyczy pozycja? | **CZĘŚCIOWO** | Kolumna **Opis** działa dobrze, gdy użytkownik wypełni tytuł lub opis. Przy `job` **Źródło** pokazuje pełny adres robota — użyteczne, ale często **ucięte** (`truncate`). Dla poz. 3 („Naprawa bramy”) — wystarczy opis; dla poz. 5 bez opisu — tylko tytuł, bez kontekstu „za co”. |
| 4 | Czy właściciel po 5 s rozumie, co jest do odzyskania? | **NIE w pełni** | Widać **listę pozycji i kwoty**, ale **brak sumy do odzyskania** na górze. Właściciel musi mentalnie zsumować 5 wierszy. Stopka pokazuje tylko `5 z 5 pozycji`, nie PLN. Podtytuł *„bez workflow rozliczeń (Sprint 20.3A)”* to żargon developerski — nie pomaga biznesowi. |

### Werdykt KROK 1

**PASS z rezerwą UX** — rejestr spełnia rolę „listy należności”, ale **nie odpowiada na pytanie „ile łącznie wiszą pieniądze?”** bez ręcznego liczenia.

### Minimalne poprawki UX (propozycja, bez implementacji)

| Priorytet | Poprawka | Effort |
|-----------|----------|--------|
| **P2** | Pasek pod nagłówkiem: `OPEN: 5 pozycji · 2 550,00 zł` (tylko `open`, opcjonalnie `+ partial`) | ~1–2 h |
| **P2** | W kolumnie **Opis** preferować krótki tytuł; adres przenieść do **Źródło** (już jest) — dodać tooltip na hover (już jest `title`) | istnieje częściowo |
| **P2** | Usunąć / zastąpić podtytuł sprintowy tekstem biznesowym: *„Kwoty do odzyskania od klientów”* | ~5 min |
| **P2** | Domyślne sortowanie listy: **Kwota ↓** lub filtr „tylko otwarte” jako szybki preset | ~30 min |

---

## KROK 2 — KPI modułu

### Co widać dziś w widoku **Do rozliczenia**

| Element | Obecny stan |
|---------|-------------|
| Liczba pozycji OPEN | **NIE** w widoku modułu |
| Suma OPEN (PLN) | **NIE** |
| Licznik w sidebarze | **TAK** — badge na menu „Do rozliczenia” = `countOpenRecoverableCharges()` = **open + partial** (nie samo OPEN) |
| Stopka listy | `N z M pozycji` — bez kwot |

### Symulacja oczekiwanego KPI (dane testowe)

```
OPEN (+ partial w badge)
5 pozycji
2 550,00 PLN
```

Moduł **nie pokazuje** tego bloku — właściciel widzi 5 wierszy, sumę musi policzyć sam.

### Rekomendacja: czy dodać mini KPI w 20.3A?

| Opcja | Rekomendacja |
|-------|--------------|
| Dodać już w **20.3A** (przed pierwszym commitem) | **Nie jako wymóg architektury** — spec 20.3A wyłączył KPI dashboardowe; mini pasek to 15–20 linii UI + helper sumy. |
| Dodać w **20.3A.1** (hotfix UX tuż po foundation) | **TAK — zalecane** |

**Uzasadnienie biznesowe:** Bez sumy PLN moduł jest „kartoteką”, nie „pulpicie odzyskań”. Właściciel pyta najpierw *„ile wiszą?”*, dopiero potem *„co to za pozycje?”*. Mini KPI (2 liczby) nie jest pełnym workflow 20.3B — to warstwa prezentacji foundation.

**Zakres 20.3A.1 (propozycja):**

- Jedna linia / dwa kafelki: `Otwarte: N · Suma: X zł` (status `open`; opcjonalnie drugi wiersz `Częściowo: …`)
- Bez wykresów, bez trendów, bez exportu — zgodne z zakresem foundation

---

## KROK 3 — Formularz

Analiza kodu: `ChargeFormPanel` + `saveDraft()` w `RecoverableChargesView.tsx`.

| Scenariusz | Wynik | Mechanizm |
|------------|-------|-----------|
| Pusty tytuł | **PASS** (z opisem) | Przycisk Zapisz aktywny, gdy `description` lub `title` niepuste. Tytuł opcjonalny — OK biznesowo. |
| Pusty tytuł + pusty opis | **PASS** (blokada) | `disabled={!draft.description.trim() && !draft.title.trim()}` |
| Pusta kwota (puste pole) | **FAIL** | `defaultRecoverableCharge()` → `amount: 0`; `parseFloat("") \|\| 0` → zapis **0,00 zł** |
| Kwota 0 PLN | **FAIL** | Brak walidacji `amount > 0`; zapis dozwolony |
| Kwota ujemna | **FAIL** | `min={0}` tylko na spinnerze HTML; ręczne wpisanie `-100` → `parseFloat` zapisuje **-100** |
| `job` bez wybranej roboty | **FAIL** (jakość danych) | Brak walidacji `sourceJobId`; źródło wyświetla „Robota” |

### Werdykt KROK 3

**FAIL** — walidacja kwoty i źródła job nie chronią danych finansowych.

### Rekomendacja 20.3A.1 (formularz)

| Fix | Opis |
|-----|------|
| **P1** | `amount > 0` wymagane; przycisk Zapisz nieaktywny przy `amount <= 0` |
| **P1** | `Math.max(0, amount)` przy zapisie + odrzucenie ujemnych w `onChange` |
| **P2** | Przy `sourceType === "job"` wymagaj `sourceJobId` |
| **P2** | Komunikat pod polem kwoty: *„Podaj kwotę większą od 0”* |

---

## KROK 4 — Media

### Układ po zmianie 20.3A

- Menu: jedna pozycja **Media** (ikona folderu)
- Wewnątrz: segmented control **Zdjęcia | Pliki** (wzorzec jak Instrukcja / Zmiany w `GuideView`)
- Zdjęcia: `JobPhotosGalleryView` z `embedded` (bez duplikatu H1)
- Pliki: `JobFilesBrowser` z `embedded`

### Ocena odnajdywalności

| Aspekt | Ocena |
|--------|-------|
| Zdjęcia | **Łatwe** — pierwsza zakładka domyślna, etykieta „Zdjęcia” + ikona |
| Pliki | **Łatwe** — jeden klik w zakładkę „Pliki”; ta sama funkcjonalność co wcześniej |
| Nawigacja z pamięci muscle | **Gorsza krótkoterminowo** — użytkownicy szukali „Zdjęcia” i „Pliki robot” osobno w sidebarze |
| Liczba pozycji menu | **Lepsza** — zwolnione miejsce na „Do rozliczenia” bez przeładowania nav |

### Czy zmiana jest lepsza od starego układu?

**TAK — netto lepsza**, przy założeniu że:

1. Hint w menu Media jest czytelny (*„Zdjęcia i pliki z robot…”*).
2. Zakładki są widoczne od razu pod nagłówkiem (są).
3. Instrukcja / GuideView wspomina o Media (zaktualizowane w 20.3A).

**Ryzyko adopcji:** 1–2 tygodnie przyzwyczajenia; brak deep-linków do starych widoków `photos` / `jobfiles` (usunięte z `View`) — bookmarki adminów mogą nie działać.

---

## KROK 5 — Responsive 1366×768

Analiza layoutu (sidebar `w-56` = 224 px + obszar treści + opcjonalny panel szczegółów `lg:w-[22rem]` = 352 px).

### Do rozliczenia

| Obszar | 1366×768, sidebar otwarty | Uwagi |
|--------|---------------------------|-------|
| Poziomy scrollbar (strona) | **Brak** (oczekiwany PASS) | `overflow-hidden`, `min-w-0`, `truncate` na komórkach |
| Poziomy scrollbar (tabela) | **Brak** | Grid `sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_5rem_4.5rem]` — elastyczne `1fr` |
| Pionowy scrollbar | **TAK** (oczekiwany) | Lista w `overflow-y-auto` — poprawne |
| Czytelność przy otwartym panelu szczegółów | **Średnia** | Treść listy ~790 px; kolumny Opis/Źródło mocno truncate; kwota i status OK |
| Filtry (3 selecty + search) | **OK** | `lg:flex-row` — przy 1366 mieszczą się w jednym rzędzie bez panelu; z panelem mogą zawinąć się do drugiego rzędu (`flex-wrap`) |
| Nagłówek techniczny | **Zajmuje miejsce** | Podtytuł sprintowy w pierwszym ekranie |

### Media

| Obszar | 1366×768 | Uwagi |
|--------|----------|-------|
| Poziomy scrollbar | **Brak** (PASS) | `max-w-4xl` centrowane |
| Zakładki Zdjęcia/Pliki | **Czytelne** | Pełna szerokość pod nagłówkiem |
| Zdjęcia — KPI 3 kafelki | **OK** | Grid `sm:grid-cols-3` |
| Pliki — lista robot | **OK** | Bez regresji vs stary widok admin |

### Znane problemy responsive (do ewentualnego 20.3A.1)

| ID | Problem | Priorytet |
|----|---------|-----------|
| R1 | Przy otwartym panelu szczegółów długie adresy w **Źródło** często niewidoczne w całości (tylko tooltip) | P2 |
| R2 | Kolumna **Inspektor** (5 rem) — przy pustych wpisach „—” zajmuje miejsce bez wartości biznesowej na pierwszym ekranie | P2 |
| R3 | Brak breakpointu ukrywającego Inspektor/Data przy wąskim obszarze listy (np. `< 900 px` content) | P2 |

---

## KROK 6 — Gotowość do release

### UX

| Obszar | Ocena | Komentarz |
|--------|-------|-----------|
| Lista / skanowanie wierszy | **7/10** | Dobre kolumny, emoji statusów, sort/filtr |
| Odpowiedź „ile do odzyskania?” | **4/10** | Brak sumy PLN w module |
| Formularz | **5/10** | Intuicyjny job/standalone; słaba walidacja kwoty |
| Panel szczegółów | **8/10** | Czytelny read-only; jasna informacja o 20.3B |
| Menu / odkrywalność | **7/10** | „Do rozliczenia” + badge; Media OK |

### Kompletność Foundation (vs spec 20.3A)

| Wymaganie spec | Stan |
|----------------|------|
| Encja + KV + sync | **GOTOWE** |
| CRUD | **GOTOWE** |
| Lista search/filter/sort | **GOTOWE** |
| Job / standalone | **GOTOWE** |
| Panel szczegółów read-only | **GOTOWE** |
| Bez settlements / workflow | **GOTOWE** |
| Bez KPI dashboard | **GOTOWE** (zgodnie ze spec — ale product gap) |
| Responsive 1366 bez poziomego scrolla | **GOTOWE** |
| Media merge | **GOTOWE** |

### Gotowość produkcyjna

| Warstwa | Ocena |
|---------|-------|
| Technika (build, smoke, sync) | **Wysoka** — foundation stabilne |
| Dane biznesowe (walidacja) | **Niska** — możliwe 0 zł i kwoty ujemne |
| Wartość dla właściciela | **Średnia** — rejestr działa, brak „sumy wiszącej” |

---

## RECOMMENDATION

### [ ] READY FOR COMMIT
### [x] NEEDS FIXES BEFORE COMMIT

**Uzasadnienie:** Fundament architektoniczny jest kompletny i zgodny ze spec 20.3A, ale **product review wykazał luki w walidacji finansowej (P1)**, które mogą zanieczyścić rejestr już przy pierwszym użyciu. Commit foundation bez P1 jest możliwy technicznie, ale **niezalecany przed produkcją** bez szybkiego 20.3A.1.

### Lista poprawek

#### P1 — blokujące przed release (20.3A.1, ~2–4 h)

1. **Walidacja kwoty** — wymagaj `amount > 0`; blokuj ujemne i zero przy zapisie.
2. *(Opcjonalnie w tym samym PR)* **Walidacja job** — przy „Z roboty” wymagaj wyboru roboty.

#### P2 — można zaraz po release lub w tym samym 20.3A.1

1. **Mini KPI** w nagłówku modułu: liczba OPEN (+ opcjonalnie partial) + suma PLN.
2. **Podtytuł** — usunąć „Sprint 20.3A” / „bez workflow”; tekst biznesowy.
3. **Sidebar badge** — rozważyć liczenie tylko `open` (dziś: open + partial).
4. **Responsive** — ukryć kolumnę Inspektor poniżej określonej szerokości content area.
5. **Domyślny filtr** — preset „Tylko otwarte” lub sort kwota malejąco.

### Sugerowana kolejność wdrożenia

```
20.3A foundation (obecny kod)
    → 20.3A.1 P1 walidacja (+ opcjonalnie P2 KPI + podtytuł)
    → commit + deploy
    → 20.3B workflow rozliczeń
```

### Podsumowanie jednym zdaniem

Moduł **Do rozliczenia** jako rejestr pozycji **działa i jest zrozumiały wiersz po wierszu**, ale **nie odpowiada jeszcze na główne pytanie właściciela („ile łącznie?”)** i **pozwala zapisać błędne kwoty** — przed produkcją zalecany krótki sprint **20.3A.1** (P1 obowiązkowo, KPI jako P2 silnie rekomendowane).

---

*Review wykonany na podstawie kodu: `RecoverableChargesView.tsx`, `recoverable-charges.ts`, `MediaView.tsx`, `admin-nav.ts`. Bez uruchamiania UI w przeglądarce — layout 1366×768 wyprowadzony z klas Tailwind i struktury flex/grid.*
