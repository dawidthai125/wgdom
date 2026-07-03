# PAYROLL — F1 · Lost Update `extraCosts` · REPRO + EVIDENCE PLAN

> **Typ:** Praktyczny plan reprodukcji F1 na rzeczywistych urządzeniach. **NIE** Design Freeze, **NIE** implementacja.
> **Data:** 2026-07-03 · **HEAD `main`:** `0cdbc54` · **Prod:** https://www.wgdom.fun (v2.63.27)
> **Źródło F1:** `docs/PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md` · `docs/PAYROLL-CERTIFICATION-2026-AUDIT.md`
> **Workflow:** REPRO → EVIDENCE PLAN → STOP. Bez zmian kodu, bez BUILD, bez COMMIT.
> **Uwaga:** Wszystkie snippety konsoli poniżej są **tylko odczytem** (diagnostyka) — nie zmieniają aplikacji.

---

## 0. Model zachowania sync (parametry, które wymuszają okno kolizji)

| Parametr | Wartość | Plik | Znaczenie dla repro |
|----------|---------|------|---------------------|
| Debounce auto-sync | **2 000 ms** | `cloud-sync-throttle.ts:14` | Po edycji push idzie po ~2 s bez dalszych zmian |
| Pull throttle (focus/visibility) | **15 000 ms** (leading-edge) | `cloud-sync-throttle.ts:17,24` | Drugie urządzenie **nie pobiera** zmian częściej niż co 15 s |
| No-change skip | `bundleFingerprint` | `cloud-sync-throttle.ts:39` | Push pomijany, gdy bundle bez zmian |
| Pull endpoint | `POST {API_BASE}/batch-get` | `cloud-sync.ts:2640` | Obserwuj w Network |
| Push endpoint | `POST {API_BASE}/batch-set` | `cloud-sync.ts:2182` | Obserwuj w Network |
| Guard shrink | log `[PAYROLL-GUARD] blocked suspicious payroll shrink` | `cloud-sync.ts:1253` | Jeśli się pojawi — to inny mechanizm, nie F1 |
| Klucz danych | `kw-week-employees` (localStorage + KV) | całość | SSOT do inspekcji |

**Root cause (do udowodnienia):** `extraCosts` scala się **całościowo** po `dataUpdatedAt` (`cloud-sync.ts:1299–1310`), a `dataUpdatedAt` jest **wspólny** dla godzin/Sob.pr./extraCosts/carry. Brak union po `id`.

---

## 1. Przygotowanie środowiska (wspólne dla wszystkich scenariuszy)

### 1.1 Urządzenia / sesje
- **2 (lub 3) niezależne sesje** zalogowane na to samo konto admina (Dawid). Opcje:
  - dwa fizyczne urządzenia, **lub**
  - dwa różne profile przeglądarki / okno normalne + incognito (osobny localStorage), **lub**
  - dwa laptopy.
- **Nie** używać tej samej karty w dwóch zakładkach jednego profilu (współdzielą localStorage → brak realnej kolizji).

### 1.2 Dane testowe
- Ten sam **aktywny** tydzień Listy Płac (nie archiwalny, nie zamknięty).
- Jeden **wspólny pracownik testowy** `E` obecny na obu urządzeniach (ten sam `directoryId`/`name` → ten sam merge-key).
- Stan startowy `E.extraCosts = []` (brak wpisów). Zapisać stan bazowy (§1.4).

### 1.3 DevTools na KAŻDYM urządzeniu
- **Network:** filtr `batch` → widoczne `batch-get` (pull) i `batch-set` (push). Włączyć „Preserve log”.
- **Console:** czyścić przed każdym scenariuszem; obserwować `[PAYROLL-GUARD]`.
- **Application → Local Storage:** klucz `kw-week-employees`.

### 1.4 Snippet inspekcji (READ-ONLY, wklejany w Console)
```js
// Odczyt rekordu pracownika E z lokalnego stanu (bez zmiany danych)
(() => {
  const raw = localStorage.getItem('kw-week-employees');
  const arr = raw ? JSON.parse(raw) : [];
  const e = arr.find(x => (x.name||'').toLowerCase().includes('E_NAZWA'));
  return e && {
    id: e.id, directoryId: e.directoryId,
    dataUpdatedAt: e.dataUpdatedAt,
    extraCosts: (e.extraCosts||[]).map(c => ({id:c.id, desc:c.description, amount:c.amount, status:c.status})),
    monday: e.days?.monday
  };
})();
```
> Podmień `E_NAZWA` na fragment imienia pracownika testowego. Wynik zapisać do dowodów (§EVIDENCE) na każdym urządzeniu, w każdym kroku „PRZED/PO”.

### 1.5 Konwencja znaczników czasu
Dla każdej akcji notować **czas ściany** (zegar urządzenia) — F1 zależy od `dataUpdatedAt` generowanego zegarem klienta. Zanotować ewentualny **skew** (różnica zegarów A vs B).

---

## 2. Scenariusze reprodukcji

Legenda: **Oczekiwany** = poprawny wynik biznesowy · **Przewidywany (kod)** = co wynika z analizy F1 · **PASS/FAIL** = kryterium.

> **PASS = brak utraty** (obie zmiany przetrwały). **FAIL = utrata** (którakolwiek zmiana zniknęła) — FAIL **potwierdza F1**.

---

### Scenariusz A — godziny (A) + premia (B)  ★ główny

**Setup:** `E.extraCosts=[]`. Oba urządzenia mają świeży, identyczny stan (wykonać pull na obu, potem odczyt §1.4 — muszą być zgodne).

**Kroki (wymuszenie okna kolizji):**
1. **B:** przełącz kartę w tło / wyłącz sieć (DevTools → Network → Offline). Cel: B nie pobierze zmiany A przez ≥15 s.
2. **A:** edytuj **godziny** pracownika `E` (np. poniedziałek 8→9 h). Odczyt §1.4 (PRZED/PO) → zanotuj `dataUpdatedAt=TA`, `monday`.
3. Poczekaj aż **A** wykona `batch-set` (Network) — potwierdzenie push do chmury.
4. **B:** (nadal bez świeżego pull) dodaj wpis **premia** do `E.extraCosts` (np. „Premia 200”). Odczyt §1.4 → `dataUpdatedAt=TB`, `extraCosts=[premia]`.
5. **B:** przywróć sieć / aktywuj kartę → wymuś sync (odczekaj >15 s lub przeładuj). Obserwuj `batch-get` potem `batch-set`.
6. Po ustabilizowaniu: odczyt §1.4 na **A** i **B** oraz wartość chmury (§4).

| | |
|---|---|
| **Oczekiwany** | `E` ma **9 h w poniedziałek** ORAZ **premię 200**. netPay uwzględnia oba. |
| **Przewidywany (kod)** | Whole-record LWW po `dataUpdatedAt`: `TA>TB` → premia znika; `TB>TA` → zmiana godzin znika. Zawsze **jedno** ginie. |
| **PASS** | Oba przetrwały na obu urządzeniach i w chmurze. |
| **FAIL (=F1)** | Zniknęła premia **lub** zmiana godzin (zależnie od tego, który `dataUpdatedAt` wyższy). |
| **Evidence** | §1.4 PRZED/PO na A i B; wartość chmury (§4); `TA`, `TB`; screeny netPay PRZED/PO; Network `batch-set`/`batch-get`; brak `[PAYROLL-GUARD]`. |

---

### Scenariusz B — premia (A) + dodatek (B)

**Setup:** `E.extraCosts=[]`.

**Kroki:**
1. **B:** tło/offline (blokada pull ≥15 s).
2. **A:** dodaj wpis **„Premia 200”**. Odczyt §1.4 → `extraCosts=[premia]`, `dataUpdatedAt=TA`. Poczekaj na `batch-set`.
3. **B:** dodaj wpis **„Dodatek 100”**. Odczyt §1.4 → `extraCosts=[dodatek]`, `dataUpdatedAt=TB`.
4. **B:** przywróć sieć → sync. Odczyt na A i B + chmura.

| | |
|---|---|
| **Oczekiwany** | `E.extraCosts` = **[premia 200, dodatek 100]** (union). |
| **Przewidywany (kod)** | Whole-array LWW → przetrwa tablica jednego zwycięzcy → **jeden wpis znika**. |
| **PASS** | Oba wpisy obecne (2 elementy). |
| **FAIL (=F1)** | Tylko 1 element (premia **lub** dodatek). |
| **Evidence** | §1.4 (liczność i `id` wpisów) na A/B/chmura; `TA/TB`; screeny listy kosztów. |

---

### Scenariusz C — premia (A) + koszt (B)

Mechanika identyczna jak B (oba to wpisy `EmployeeExtraCost`).

**Kroki:** jak B, ale B dodaje **„Koszt paliwo 150”** (można też z statusem `pending`, by sprawdzić czy status też ginie).

| | |
|---|---|
| **Oczekiwany** | `[premia 200, koszt 150]`. |
| **Przewidywany (kod)** | Jeden wpis ginie (whole-array LWW). |
| **PASS** | Oba wpisy obecne. |
| **FAIL (=F1)** | Tylko 1 wpis. |
| **Evidence** | §1.4 (wpisy + `status`); `TA/TB`; screeny. |

---

### Scenariusz D — trzy urządzenia (premia / dodatek / koszt równolegle)

**Setup:** 3 sesje, `E.extraCosts=[]`.

**Kroki:**
1. Wszystkie 3 w tło/offline.
2. **A:** „Premia 200” (`TA`) · **B:** „Dodatek 100” (`TB`) · **C:** „Koszt 150” (`TC`) — każde na bazie `[]`, bez wzajemnego pull.
3. Kolejno przywracaj sieć A→B→C (notuj kolejność) → sync.
4. Odczyt §1.4 na A/B/C + chmura.

| | |
|---|---|
| **Oczekiwany** | `[premia, dodatek, koszt]` (3 elementy). |
| **Przewidywany (kod)** | Konwergencja do tablicy o **najwyższym** `dataUpdatedAt` → **2 wpisy giną**. |
| **PASS** | 3 elementy. |
| **FAIL (=F1)** | 1 element (dwa zniknęły). |
| **Evidence** | §1.4 na 3 urządzeniach + chmura; `TA/TB/TC`; kolejność reconnect; screeny. |

---

### Scenariusz E — offline → online

**Setup:** `E.extraCosts=[]`.

**Kroki:**
1. **A (offline):** DevTools → Offline. Dodaj **„Premia 200”**. Zanotuj `dataUpdatedAt=TA` (czas offline).
2. **B (online):** dodaj **„Koszt 150”** **później** niż `TA`. `batch-set`. `dataUpdatedAt=TB (> TA)`.
3. **A:** przywróć sieć → sync. Odczyt na A/B/chmura.
4. **Wariant skew:** powtórz z zegarem A ustawionym „do przodu” (`TA > TB`) — sprawdź, czy premia offline **nadpisuje** koszt online.

| | |
|---|---|
| **Oczekiwany** | `[premia, koszt]` niezależnie od kolejności/zegara. |
| **Przewidywany (kod)** | `TB>TA` → premia offline ginie; skew `TA>TB` → koszt online ginie. |
| **PASS** | Oba wpisy obecne. |
| **FAIL (=F1)** | Jeden ginie (zależnie od znaczników zegara). |
| **Evidence** | §1.4; `TA/TB`; zapis skew zegara; screeny; Network reconnect. |

---

### Scenariusz F — okno throttle 15 s

**Cel:** udowodnić, że throttle pull 15 s **tworzy** okno kolizji nawet bez ręcznego offline.

**Kroki:**
1. Oba urządzenia aktywne, świeży pull (odczyt zgodny).
2. **A:** dodaj „Premia 200”, poczekaj na `batch-set`.
3. **B: w ciągu <15 s** od ostatniego pull B (bez przeładowania) dodaj „Dodatek 100”. (B nie zdążył pobrać premii — `shouldPullNow`=false.)
4. Pozwól B na push. Odczyt na A/B/chmura.

| | |
|---|---|
| **Oczekiwany** | `[premia, dodatek]`. |
| **Przewidywany (kod)** | B edytował na starej bazie (`[]`) → whole-array LWW → jeden wpis ginie. |
| **PASS** | Oba wpisy. |
| **FAIL (=F1)** | Jeden wpis. |
| **Evidence** | Znacznik ostatniego `batch-get` B vs czas edycji B (dowód okna <15 s); §1.4; screeny. |

---

### Scenariusz G — karta otwarta długo („2 dni” — analog)

**Cel:** analog scenariusza „Komputer A otwarty 2 dni, B robi zmiany, A zapisuje”.

**Kroki:**
1. **A:** otwórz Listę Płac, **zostaw kartę w tle** (nie odświeżaj) — symulacja długiego otwarcia. Odczyt §1.4 (stan bazowy `S0`).
2. **B:** przez ten czas wykonuje wiele zmian `E`: dodaje premię, dodatek, edytuje godziny — każda z `batch-set`. Chmura = bogaty stan `S1`.
3. **A:** (nadal stary stan `S0` w pamięci) wykonaj **dowolną edycję** `E` (np. godziny) → bump `dataUpdatedAt=TA`, po czym A wykona push.
   - Kluczowe: jeśli `TA` > znaczniki B, `dataWinner=A` → chmura przyjmie **stary** `extraCosts` A (`[]`/`S0`).
4. Odczyt na A/B/chmura.

| | |
|---|---|
| **Oczekiwany** | Zmiany B (premia/dodatek) zachowane; edycja A dołożona. |
| **Przewidywany (kod)** | Jeśli `dataUpdatedAt` A > B → **cały `extraCosts` A (stary) nadpisuje** bogaty stan B → **premie/dodatki B giną**. (Richness override może częściowo ratować przy remisie/wyższej chmurze — do zaobserwowania.) |
| **PASS** | Zmiany B obecne po zapisie A. |
| **FAIL (=F1)** | Zmiany B (extraCosts) zniknęły po zapisie A. |
| **Evidence** | `S0` (A przed), `S1` (chmura po B), stan finalny A/B/chmura; `TA` vs znaczniki B; screeny; obserwacja czy zadziałał richness override; brak/obecność `[PAYROLL-GUARD]`. |

---

### Scenariusz H — conflict overwrite po automatycznym pull  ★ weryfikacja formularza

**Cel:** rozstrzygnąć hipotezę: czy edytor Listy Płac po auto-pull pracuje na **aktualnym** stanie (patch pola), czy trzyma **własną kopię** rekordu i przy zapisie nadpisuje świeżo pobrane `extraCosts`.

**Przebieg (wg zlecenia):**
1. **A:** otwarta Lista Płac, otwarty panel szczegółów pracownika `E` (`extraCosts=[]`).
2. **B:** dodaje wpis `extraCosts` (np. „Premia 200”) → `batch-set` do chmury.
3. **A:** **nie** wykonuje własnej edycji jeszcze (nie zapisuje).
4. **A:** następuje **automatyczny pull** (focus/visibility/interval >15 s) → `batch-get` → merge → stan A zawiera premię B. Potwierdź odczytem §1.4 na A (**musi** pokazać premię).
5. **A:** użytkownik edytuje **godziny** `E` (np. wt. 8→9 h).
6. **A:** zapis (auto-sync `batch-set`).

#### Weryfikacja kodu (HEAD `0cdbc54`) — hipoteza „własna kopia” OBALONA
| Punkt | Ustalenie | Plik |
|-------|-----------|------|
| Selekcja to **ID**, nie obiekt | `const [selectedEmpId, setSelectedEmpId] = useState<string\|null>` | `PayrollView.tsx:529` |
| Rekord **re-derived co render z żywej tablicy** | `selectedEmp = displayEmployees.find(e=>e.id===selectedEmpId)` | `PayrollView.tsx:749` |
| Panel **bezstanowy** względem rekordu | `safeEmp = ensureWeekEmployeeDays(emp)` (z prop, brak `useState(emp)`) | `WeekEmployeeDetail.tsx:86` |
| Edycja przekazuje **tylko id + payload** | `onPatchDay=(key,next)=>onUpdateWeekEmployeeDay(selectedEmp.id,key,next)` | `PayrollView.tsx:1471` |
| Handler **patchuje tylko `days` na `prev`** | `setWeekEmployees(prev=>...{...e, days, dataUpdatedAt:now})` | `App.tsx:1421–1434` |
| Fix intencjonalny | komentarz „ETAP 1 — patch na prev state (**bez stale safeEmp snapshot**)” | `App.tsx:1401,1420` |

➡️ Edytor **nie** trzyma własnej kopii i **nie** zapisuje całego rekordu. Edycja godzin dotyka wyłącznie `days` na najświeższym stanie (po pull), więc premia B **pozostaje** i zostaje wypchnięta razem z nowymi godzinami.

| | |
|---|---|
| **Oczekiwany** | `E` ma **premię 200** (od B) ORAZ **9 h wt.** (od A). Nic nie ginie. |
| **Przewidywany (kod)** | **PASS — brak utraty.** Patch-na-`prev` (ETAP 1) zachowuje `extraCosts` pobrane pullem; force-replace push wysyła stan zawierający premię B + godziny A. |
| **PASS** | Po zapisie A: premia B i godziny A obecne na A, B i w chmurze. |
| **FAIL** | Premia B zniknęła **mimo** potwierdzonego pull w kroku 4 → **regresja fixu ETAP 1** (powrót bugu „safeEmp snapshot”). |
| **Evidence** | §1.4 na A: „po pull” (premia obecna) i „po edycji godzin” (premia + 9 h); wartość chmury (§4); potwierdzenie `batch-get` (krok 4) i `batch-set` (krok 6) w Network; `dataUpdatedAt` przed/po; brak `[PAYROLL-GUARD]`. |

#### Klasyfikacja H
- **H NIE jest nowym wektorem Lost Update.** Przy **potwierdzonym** pull (krok 4) formularz pracuje na aktualnym stanie → premia zachowana (weryfikacja kodu powyżej).
- **H pełni rolę REGRESSION GUARD** dla fixu ETAP 1 (`updateWeekEmployeeDay`/`updateWeekEmployeeExtraCosts` patch-na-`prev`). FAIL = regresja, nie nowy mechanizm.
- **Warunek brzegowy:** jeśli auto-pull w kroku 4 **nie** wykonał się przed edycją (karta cały czas aktywna → brak eventu focus/visibility; okno throttle 15 s), A edytuje na **starej** bazie (`[]`) i force-replace nadpisuje premię B. **To NIE jest osobny wektor — to dokładnie F1 (stale base, klasa scenariusza G).**

➡️ **Werdykt: H = pokrywany przez F1** (ścieżka „pull nie wylądował” = F1/G; ścieżka „pull wylądował” = PASS dzięki ETAP 1). Brak nowego wektora na poziomie formularza.

---

## 3. Zbiorcza tabela scenariuszy

| ID | Sytuacja | Oczekiwany | Przewidywany (kod) | FAIL potwierdza F1 |
|----|----------|-----------|--------------------|:------------------:|
| A | godziny + premia | oba | jedno ginie | ✅ |
| B | premia + dodatek | 2 wpisy | 1 wpis | ✅ |
| C | premia + koszt | 2 wpisy | 1 wpis | ✅ |
| D | 3 urządzenia | 3 wpisy | 1 wpis | ✅ |
| E | offline → online | oba | jedno ginie (zegar) | ✅ |
| F | throttle 15 s | 2 wpisy | 1 wpis | ✅ |
| G | karta długo otwarta | zmiany B + A | extraCosts B ginie | ✅ |
| H | conflict po auto-pull | premia B + godziny A | **PASS** (pull landed) / F1 (pull nie landed) | ➖ regression guard ETAP 1 |

---

## 4. Jak odczytać wartość CHMURY (dowód niezależny od UI)

Po ustabilizowaniu sync, na dowolnym urządzeniu w Console (READ-ONLY):
```js
// Podejrzenie wartości chmurowej kw-week-employees przez batch-get
// (użyj wartości z Network → ostatni batch-get → Response, albo odśwież i odczytaj §1.4 po pull)
```
Zalecana metoda bez ręcznego fetch: **przeładuj** urządzenie C (nieedytujące) → wykona `batch-get` → jego localStorage odzwierciedli stan chmury → odczyt §1.4. To pokazuje „prawdę serwera” bez modyfikacji kodu.

---

## 5. Checklista wykonawcza (do wydruku)

**Przygotowanie**
- [ ] 2–3 niezależne sesje (osobny localStorage) zalogowane jako admin
- [ ] Ten sam aktywny tydzień, wspólny pracownik `E`, `extraCosts=[]`
- [ ] DevTools na każdym: Network (filtr `batch`, Preserve log), Console (czyste), Application→LocalStorage
- [ ] Zsynchronizowany stan bazowy (odczyt §1.4 identyczny na wszystkich)
- [ ] Zanotowany skew zegarów A/B(/C)

**Dla KAŻDEGO scenariusza A–H**
- [ ] Zapis „PRZED” (§1.4) na wszystkich urządzeniach
- [ ] Wykonanie kroków w opisanej kolejności + wymuszenie okna (tło/offline/<15 s)
- [ ] Zanotowane `dataUpdatedAt` (TA/TB/TC) i czasy ściany
- [ ] Potwierdzenie `batch-set`/`batch-get` w Network (status 200)
- [ ] Zapis „PO” (§1.4) na wszystkich urządzeniach
- [ ] Odczyt wartości chmury (§4) przez urządzenie nieedytujące
- [ ] Screeny netPay/listy kosztów PRZED/PO
- [ ] Sprawdzenie Console pod `[PAYROLL-GUARD]` (jeśli jest — odnotować, to inny tor)
- [ ] Werdykt PASS/FAIL + który wpis/zmiana zniknęła

**Zamknięcie**
- [ ] Zestawienie wyników w tabeli §3 (PASS/FAIL per scenariusz)
- [ ] Załączone dowody (odczyty §1.4, screeny, HAR z Network) do `audit/` lub jako komentarz
- [ ] Przywrócenie danych testowych `E` do stanu wyjściowego

---

## 6. Interpretacja wyników

- **Dowolny FAIL (A–G)** → **F1 potwierdzony na produkcji** → uzasadnia przejście do DESIGN FREEZE F1 (propozycja w `PAYROLL-F1-EXTRACOSTS-LOST-UPDATE-AUDIT.md` §8). **Nie w tym etapie.**
- **Scenariusz H — odrębna interpretacja:**
  - **PASS przy potwierdzonym pull (krok 4)** = oczekiwany wynik; potwierdza, że fix ETAP 1 (patch-na-`prev`) działa. H = **regression guard**, nie nowy wektor.
  - **FAIL przy potwierdzonym pull** = **regresja fixu ETAP 1** (powrót bugu „safeEmp snapshot”) — traktować jako osobny P0, niezależny od F1.
  - **FAIL bez pull w kroku 4** = to F1 (stale base, klasa G), nie nowy problem.
- **Wszystko PASS** → okno kolizji nieosiągalne w praktyce mimo teoretycznego ryzyka → zarejestrować warunki i rozważyć obniżenie priorytetu (nadal FAIL w analizie statycznej).
- Pojawienie się `[PAYROLL-GUARD]` **nie** jest F1 (to guard shrink rostera) — odnotować osobno.

---

## 7. Granice etapu
- To jest **plan** repro + zbierania dowodów. Wykonanie na urządzeniach fizycznych = kolejny krok (poza tym zleceniem).
- **Bez** zmian architektury, **bez** Design Freeze, **bez** kodu. Snippety §1.4/§4 są wyłącznie odczytem diagnostycznym.

---

*SSOT REPRO F1: ten plik. Workflow: REPRO → EVIDENCE PLAN → STOP.*
