# Sprint 20.2A — Product Review + Release Candidate

> **Data:** 2026-06-06  
> **Tryb:** PRE-COMMIT REVIEW — bez implementacji, bez commit/push/deploy  
> **Wersja kandydacka:** **2.45.40**  
> **Źródło audytu:** [`INSPECTOR-AUDIT-20.2A.md`](INSPECTOR-AUDIT-20.2A.md)

---

## Metodologia

| Źródło | Zakres |
|--------|--------|
| `npm run dev` @ http://127.0.0.1:5173 | Serwer lokalny — PASS (Vite ready) |
| Analiza kodu + scenariusze `scripts/review-progress-20.2a.mjs` | Logika progress, KPI, Action Center |
| Smoke programowe | Build + 20.2A + regresje 20.1B / 20.0A |
| Flow inspektora (code walkthrough) | Dashboard → Roboty → sekcje → FAB → checklist |

**Uwaga:** Pełny test aparatu / offline queue wymaga urządzenia mobilnego lub symulacji `navigator.onLine` — zweryfikowano ścieżkę kodu (reuse `uploadInspectorPhoto` + `photo-queue` + `flushInspectorPhotoQueue` bez zmian w sync).

---

## KROK 1 — Self Review

### A. Dashboard (KPI · Dzisiaj · Action Center)

#### Co działa bardzo dobrze

- **KPI 4 kafle** z ikonami i akcentem koloru — czytelniejsze niż stary grid 6× `StatTile` bez ikon.
- **Action Center (max 3)** — sensowna hierarchia urgency: admin (2000+) > overdue (1800+) > brak pliku (1500+) > brak dok. (1200+).
- Przycisk **„Oznacz”** przy brakującym dokumencie/pliku — 1 tap bez wchodzenia w robotę.
- **„Dzisiaj i wkrótce”** sortuje po `daysUntilHandover` (overdue → dziś → za N dni).
- Szczegółowe alerty **ukryte domyślnie** — mniej szumu; dostępne pod „Pokaż szczegółowe alerty”.

#### Problemy UX

| ID | Problem | Priorytet |
|----|---------|-----------|
| D-A1 | **KPI „Wymagają uwagi”** — prawie każda aktywna robota z ≥1 brakiem wchodzi do zbioru (`needsAttentionCount` ≈ `activeCount`). KPI traci odróżnienie od „Aktywne”. | P2 |
| D-A2 | Sekcja nagłówkowa audytu mówiła „Dzisiaj”, UI ma **„Dzisiaj i wkrótce”** — OK, ale **zawiera też overdue** (plan `overdue` \|\| `soon`). Logiczne operacyjnie, wymaga zrozumienia że 🔴 też tu ląduje. | P2 |
| D-A3 | **KPI nieklikalne** — brak filtra listy jak w `JobListPanelHeader` (Roboty 2.1A). | P3 (20.2B) |
| D-A4 | **Action Center** przy wielu robotach z tym samym brakiem (np. 8× brak kosztorysu) pokazuje tylko top 3 — poprawne, ale bez wskazania „+5 więcej”. | P3 |

#### Odpowiedzi na pytania review

1. **Czy KPI są czytelne?** — **Tak**, z zastrzeżeniem że „Wymagają uwagi” bywa równe liczbie aktywnych.
2. **Czy „Dzisiaj” pokazuje właściwe roboty?** — **Tak** — `plannedHandoverDate` w zakresie overdue lub ≤7 dni (`soon`). Roboty bez daty lub >7 dni — **nie** (poprawne).
3. **Czy Action Center ma 3 najważniejsze akcje?** — **Tak** — urgency score + deduplikacja `jobId-kind`; admin i overdue dominują zgodnie z oczekiwaniem biznesowym.

---

### B. Karty robót

#### Scenariusze (analiza kodu + scenariusze testowe)

| Scenariusz | Postęp | Priorytet | Brakuje (max 3) | 3-sek. scan |
|------------|--------|-----------|-----------------|-------------|
| **Pusta** | 0% | normal | kosztorys, pomiary, kominiarz | ✅ jasne |
| **W trakcie** (3/8 dok.) | 60% | normal | kominiarz, zakres, oświadczenia | ⚠️ postęp wysoki |
| **Po terminie** | 25% | 🔴 overdue | kosztorys, pomiary, kominiarz | ✅ |
| **Prawie gotowa** (7/8) | 90% | 🟠 today | rysunek | ✅ |
| **Zakończona** | 100% | 🟢 complete | — | ✅ |

#### Czy po 3 sekundach użytkownik wie…?

| Pytanie | Werdykt |
|---------|---------|
| Co jest najważniejsze? | **Tak** — emoji 🔴🟠, pasek %, „Brakuje do odbioru”, badge WM |
| Czego brakuje? | **Tak** — linia pomarańczowa max 3 pozycje |
| Jaki jest postęp? | **Częściowo** — pasek + `Dokumenty n/8` czytelne; **wartość % bywa zawyżona** (patrz C) |

#### Minimalne poprawki (propozycja — nie zaimplementowano)

| Fix | Effort | Efekt |
|-----|--------|-------|
| Usunąć **podwójne liczenie** zlecenie/kosztorys w `filesPct` (już w `documentsPct`) | ~5 linii | Uczciwy % |
| Na karcie: **pogrubić** linię „Brakuje do odbioru” nad ostatnią aktywnością | CSS | Szybszy scan |
| **🟢 complete** tylko przy `handed_over` / `completed`, nie przy `percent>=100` z aktywnością | logika | Mniej fałszywych zielonych |

---

### C. Progress % — `computeInspectionProgress()`

#### Wyniki scenariuszy (`scripts/review-progress-20.2a.mjs`)

```
PUSTA           →  0%  (0/8 dok.)
CZĘŚCIOWO       → 60%  (3/8 dok.: zlecenie, kosztorys, pomiary + etap + foto + aktywność)
PRAWIE GOTOWA   → 90%  (7/8 dok., ready_for_handover)
ZAKOŃCZONA      → 100% (8/8, handed_over, completed)
PO TERMINIE     → 25%  (1/8 dok., docs_pending)
```

#### Breakdown CZĘŚCIOWO (3/8 dokumentów)

| Składnik | Wartość | Uwaga |
|----------|---------|-------|
| documentsPct | 15% | 3/8 × 40% — OK |
| filesPct | **20%** | zlecenie + kosztorys — **duplikat** dokumentów już w 15% |
| stagePct | 5% | in_progress → 25% × 20% |
| photosPct | 10% | ≥1 foto |
| notesPct | 10% | dowolna aktywność inspector_* |

**Wniosek:** Przy 3/8 dokumentów użytkownik widzi **60%**, choć obiektywnie ukończono ~38% wymagań. To **najpoważniejszy problem produktowy** sprintu.

#### Propozycja korekty wag (20.2A.1 — micro-fix, poza tym review)

**Opcja A (zalecana):** Usunąć `filesPct` — zlecenie i kosztorys już są w `REQUIRED_DOCS` (40%).

```
documentsPct = (docsDone / 8) × 50%
stagePct     = STAGE_PROGRESS × 25%
photosPct    = 0–15% (0 / 1+ foto)
notesPct     = 0–10%
```

**Opcja B:** Zostawić `filesPct` ale **wykluczyć** zlecenie/kosztorys z `documentsPct` — bardziej skomplikowane.

**Decyzja release:** Logika nie blokuje commitu (zamierzony model z audytu), ale **zalecana korekta przed deploy na prod**.

---

### D. Missing Items — „Brakuje do odbioru”

| Kryterium | Werdykt |
|-----------|---------|
| Przydatność | **Tak** — krótkie etykiety po polsku |
| Najważniejsze braki | **Częściowo** — stała kolejność: kosztorys → pomiary → kominiarz → zlecenie. Gdy brakuje **zlecenia**, użytkownik widzi najpierw kosztorys (może mylić). |
| Szum | **Niski** — max 3 pozycje, ukryte dla `completed` |

**Minimalna poprawka:** Sortować braki wg `urgencyScore` lub: zlecenie → kosztorys → pomiary → reszta.

---

### E. FAB 📷

| Krok | Weryfikacja | Status |
|------|-------------|--------|
| Wybór roboty | Modal przy >1 aktywnej; skip przy 1 | ✅ kod |
| Aparat | `HiddenFileInput` + `capture="environment"` | ✅ (mobile); desktop → picker pliku — OK |
| Upload | `uploadInspectorPhotoForJob` → `uploadInspectorPhoto` → `appendJobActivity` → `persistJobs` | ✅ reuse |
| Offline queue | `queuePhoto({ kind: "inspector" })` + toast/msg | ✅ bez zmian sync |
| Powrót online | `flushInspectorPhotoQueue` on `online` + native resume | ✅ bez zmian |

| Ryzyko | Ocena |
|--------|-------|
| Utrata zdjęć | **Niskie** — IndexedDB queue istniejąca |
| Regresja sync | **Niskie** — ten sam path co galeria w sekcji photos |
| Brak feedbacku offline | **Średnie** — brak badge „X w kolejce” (plan 20.2C) |

**Desktop:** FAB otwiera file picker — akceptowalne dla MVP.

---

### F. Checklist dokumentów

| Kryterium | Werdykt |
|-----------|---------|
| Grupowanie | **Tak** — Dokumentacja / Pomiary i odbiory / Zdjęcia |
| Licznik 5/8, 7/8, 8/8 | **Tak** — badge `n/8` w nagłówku |
| Mobile | **Lepsze** — `grid-cols-1` na wąskim ekranie vs stary `grid-cols-2` z małymi etykietami |
| vs poprzedni układ | **Wyraźnie lepiej** — grupy + licznik + pełna szerokość przycisków na mobile |

**Drobna uwaga:** Grupa „Zdjęcia” to tylko `zdjecia` (dokument); zdjęcia inspektora (`inspectorPhotos`) są w sekcji Zdjęcia — spójne z modelem danych, może wymagać hintu w Help.

---

## KROK 2 — Release Audit

| Test | Wynik | Data |
|------|-------|------|
| `npm run build` | **PASS** | 2026-06-06 |
| `smoke-test-inspector-20.2a.mjs` | **PASS** (10/10) | 2026-06-06 |
| Regresja `smoke-test-payroll-carry-forward-20.1b.mjs` | **PASS** | 2026-06-06 |
| Regresja `smoke-test-employee-leaves-20.0a.mjs` | **PASS** | 2026-06-06 |

**Ryzyko regresji sync / payroll:** **LOW** — brak zmian w `cloud-sync.ts`, `mergeJobsById`, modelu Job.

---

## KROK 3 — Backlog 20.2B (priorytety ROI)

| # | Temat | ROI | Effort | Uzasadnienie |
|---|-------|-----|--------|--------------|
| **1** | **Korekta wag `computeInspectionProgress`** (usunięcie double-count) | ★★★★★ | XS | Blokuje zaufanie do %; 5–15 min |
| **2** | **Timeline kontroli** (`activityLog` inspector_*, grupy Dziś/Wczoraj) | ★★★★☆ | M | Dane gotowe; duży zysk operacyjny vs scroll w sekcji WM |
| **3** | **Admin refresh** — KPI executive + grupowanie feedu po `jobId` | ★★★★☆ | M | Właściciel widzi to samo co inspektor; poza 20.2A scope |
| **4** | **Mapa kontroli OSM** (reuse `tenders-map-coords`) | ★★★☆☆ | M | Wartość terenowa; heurystyka adresów Wrocław |
| **5** | **Score jakości rozszerzony** (penalty overdue, bonus komplet) | ★★☆☆☆ | S | Postęp % już jest; rozszerzenie reguł marginalne |
| **6** | **Ostatnia aktywność — polish** (czas względny, tylko ostatnie 24h, ikona typu) | ★★☆☆☆ | S | Już w 20.2A; polish niski koszt |

**Uwaga:** „Ostatnia aktywność na kartach” została **dostarczona w 20.2A** — w 20.2B tylko dopracowanie, nie greenfield.

---

## Podsumowanie werdyktów

### Co działa bardzo dobrze

- Action Center + szybkie „Oznacz” — realna oszczędność tapów
- Karty robót z paskiem %, brakami i emoji priorytetów — skok vs stara lista
- Checklist grupowany + `n/8` — czytelniejszy mobile
- FAB 📷 — reuse sprawdzonej ścieżki upload/offline
- Zero zmian sync/KV — regresje payroll/urlopy PASS

### Co wymaga korekty przed release (deploy)

| Priorytet | Item | Blokuje deploy? |
|-----------|------|-----------------|
| **P1** | Podwójne liczenie zlecenie/kosztorys w progress % | **Zalecane** — może wprowadzać w błąd przy planowaniu odbiorów |
| **P2** | KPI „Wymagają uwagi” zbyt szerokie | Nie — kosmetyka analityczna |
| **P2** | Kolejność missing items (zlecenie przed kosztorysem) | Nie |
| **P3** | Badge offline photo queue | Nie — 20.2C |

### Czy sprint jest gotowy do commit?

**Tak** — zakres 20.2A zrealizowany, testy PASS, brak regresji, dokumentacja zaktualizowana.

### Czy sprint jest gotowy do deploy?

**Warunkowo TAK** — deploy możliwy po świadomej akceptacji zawyżonego %; **zalecany** micro-fix P1 (20.2A.1) przed prod dla zaufania do metryki postępu.

---

## RECOMMENDATION

```
[x] READY FOR COMMIT
[ ] NEEDS FIXES BEFORE COMMIT
```

**Uzasadnienie:** Sprint spełnia zaakceptowany zakres 20.2A; wszystkie testy release PASS; problem progress % to **korekta produktowa P1**, nie blocker commitu (fix ~5 linii — opcjonalnie 20.2A.1 przed deploy).

---

## Aktualizacja 20.2A.1 (po review)

| Scenariusz | Stare % | Nowe % |
|------------|---------|--------|
| Pusta | 0 | 0 |
| Częściowa (3/8) | 60 | **50** |
| Prawie gotowa (7/8) | 90 | **88** |
| Zakończona | 100 | 100 |
| Po terminie (1/8) | 25 | **19** |

Wagi: documents **50%** · stage **25%** · photos **15%** · notes **10%** · `filesPct=0`.

---

## Załączniki

- Scenariusze progress: `scripts/review-progress-20.2a.mjs` (artefakt review, nie commitować bez decyzji)
- Smoke: `scripts/smoke-test-inspector-20.2a.mjs`
- Audyt design: `docs/INSPECTOR-AUDIT-20.2A.md`

---

*Koniec product review Sprint 20.2A.*
