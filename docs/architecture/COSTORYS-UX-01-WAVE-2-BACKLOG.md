# COSTORYS-UX-01 — WAVE 2 BACKLOG

> **ID:** COSTORYS-UX-01-WAVE-2-BACKLOG  
> **MODE:** ANALIZA / BACKLOG PREPARATION · **bez implementacji** · **bez commit** · **bez push**  
> **Data:** 2026-07-28  
> **Język:** polski  
> **Wejście:** WAVE 1 **CLOSED** · PV **PASS** (`2.65.69` / `3e57e8d`) · [`COSTORYS-UX-01-AUDIT.md`](COSTORYS-UX-01-AUDIT.md) · [`COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md`](COSTORYS-UX-01-WAVE-1-DESIGN-FREEZE.md) · [`COSTORYS-UX-01-WAVE-1-PRODUCTION-VERIFY.md`](COSTORYS-UX-01-WAVE-1-PRODUCTION-VERIFY.md)

```text
════════════════════════════════════════════════════════
CEL:
  Zamrozić priorytety i kolejność WAVE 2 (Density & Scan)
  na podstawie doświadczeń WAVE 1 — bez kodu.

WAVE 2 NIE STARTUJE bez:
  Owner GO + Design Freeze WAVE 2.
════════════════════════════════════════════════════════
```

---

## 1. Kontekst po WAVE 1

### 1.1 Co WAVE 1 już rozwiązał

| Problem (audit) | Stan po W1 |
|-----------------|------------|
| Cena oferty znika przy scrollu | **CLOSED** — Sticky Offer Bar |
| Puste boki / wąski kontener | **CLOSED** — full width tab Kosztorysy |
| Chrome explainability nad listą | **CLOSED** — accordion „Szczegóły wyceny” |
| Evidence zajmuje pierwszy ekran | **CLOSED** — collapsed default |
| Szybki fokus na review | **CLOSED** — filtr „Tylko do weryfikacji” |

### 1.2 Co nadal boli (doświadczenie W1 → W2)

Po W1 użytkownik **szybciej widzi cenę i listę**, ale:

1. **Lista pozycji** nadal to wysokie karty `LineExplainCard` (Comfort) — mało wierszy / viewport przy 100–500 poz.  
2. Po rozwinięciu linii **komponenty = pełny formularz** (`EditableComponentCard`) — największy „skok wysokości” i utrata orientacji.  
3. Brak **scan tools** na liście L1: search / sort (filtr review jest, ale to nie search po opisie/LP).  
4. W1 **nie** adresował czytelności 300–500 pozycji — to świadomie Wave 2/3.

**Wniosek:** największy wzrost ergonomii w W2 = **gęstość listy + gęstość edycji komponentów**. Sort/Search to wzmacniacze scan — wartościowe, ale wtórne wobec density.

---

## 2. Zakres kandydatów WAVE 2 (z audytu)

| ID | Element | Opis skrót |
|----|---------|------------|
| **W2-A** | **Compact Mode** | Domyślnie (np. ≥50 linii): 1 wiersz LP · opis · direct · confidence · chevron; Comfort zachowany |
| **W2-B** | **Collapsed Components** | W expand linii: komponenty jako 1-liniowe chipy/rows; pełna edycja dopiero na żądanie |
| **W2-C** | **Sortowanie** | Sort po LP / direct / confidence (client-side na `view.lines`) |
| **W2-D** | **Search** | Szukaj w opisach / LP linii OfferBoq (scoped do L1, nie BOQ Evidence) |
| **W2-E*** | Drawer / bottom sheet edycji | *Opcjonalny wariant W2-B — audit wskazał drawer; może być **inline expand** zamiast drawer* |

\*W2-E nie jest osobnym „must” — to **pattern realizacji** W2-B.

**Poza WAVE 2 (zostaje WAVE 3):** virtualization · dense data-table · pin/resize columns.

**Nadal OOS całego EPIC:** Bid calculator · AI Cost engines · parser · sync · COST-PIPELINE logika.

---

## 3. Ranking wpływu na UX (ergonomia)

Skala wpływu: 1–5 (5 = największy zysk przy typowym BOQ 100–300).

| Rank | Element | Wpływ UX | Effort (szacunek) | Uzasadnienie po W1 |
|------|---------|----------|-------------------|---------------------|
| **1** | **Collapsed Components (W2-B)** | **5** | M | Otwarta linia nadal „zjada” ekran formularzami — to #1 ból Ownera z audytu (§3 komponenty zbyt wysokie); W1 tego nie tknął |
| **2** | **Compact Mode (W2-A)** | **5** | M | 3–5× więcej pozycji w viewportcie; bez tego W1 sticky pomaga, ale lista nadal „długa w milach” |
| **3** | **Search (W2-D)** | **3–4** | S–M | Przy 150+ pozycjach skok do konkretnego opisu; uzupełnia filtr review z W1 |
| **4** | **Sortowanie (W2-C)** | **3** | S | Szybki scan: najdroższe / najniższa pewność najpierw; mniejszy zysk niż density |
| **5** | Drawer jako jedyny pattern (W2-E hard) | **2–4*** | M–L | Wysoki zysk mobilny; na desktop często wystarczy inline expand — nie blokować W2 na drawer |

\*Drawer: wysoki wpływ **jeśli** Compact+Collapsed już są; sam drawer bez Compact = średni.

---

## 4. Zależności (Compact · Collapsed · Sort · Search)

```text
                    ┌─────────────────────┐
                    │  WAVE 1 (CLOSED)    │
                    │  sticky · filtr     │
                    │  accordion · width  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌─────────────┐   ┌──────────┐
        │ Compact  │◄──►│ Collapsed   │   │ Search   │
        │ Mode     │    │ Components  │   │ (L1)     │
        │ (W2-A)   │    │ (W2-B)      │   │ (W2-D)   │
        └────┬─────┘    └──────┬──────┘   └────┬─────┘
             │                 │               │
             │    row model    │  edit surface │
             └────────┬────────┘               │
                      ▼                        │
               ┌─────────────┐                 │
               │ Sort (W2-C) │◄────────────────┘
               └─────────────┘
                 działa na tym samym
                 filtered+searched set
```

### 4.1 Macierz zależności

| Od ↓ / Do → | Compact (A) | Collapsed (B) | Sort (C) | Search (D) |
|-------------|-------------|---------------|----------|------------|
| **Compact** | — | **Silna:** Compact definiuje wiersz; B działa w expand wiersza | Sort renderuje wiersze Compact | Search filtruje listę Compact |
| **Collapsed** | Preferuje A najpierw (inaczej Comfort+form nadal wysoki) | — | Niezależne | Niezależne |
| **Sort** | Słaba (można sortować karty Comfort) | Słaba | — | **Średnia:** sort po wynikach search |
| **Search** | Słaba | Słaba | Wspólny pipeline widoku | — |

### 4.2 Reguły zależności (zamrożone dla backlogu)

1. **W2-A + W2-B = rdzeń WAVE 2** — bez nich Sort/Search to „szybsze przewijanie nadal zbyt wysokich kart”.  
2. **W2-B bez W2-A** = możliwy thin slice, ale **niepełny** zysk (nagłówek karty nadal gruby).  
3. **W2-A bez W2-B** = duży zysk przy skanie, ale po expand nadal „form hell” — Owner nadal zgłosi punkt 3 z audytu.  
4. **Search i Sort** operują na **tej samej** liście co filtr W1 (`reviewOnly` ∩ search ∩ sort) — jeden `visibleLines` pipeline (UI-only).  
5. **Sort nie wymaga** Compact, ale **AC wizualne** Sort sensownie mierzyć dopiero na Compact.  
6. **Search L1 ≠** Search BOQ Explorer (L0) — osobny scope; nie łączyć w W2.

---

## 5. Ryzyka WAVE 2

| Ryzyko | Element | Impact | Mitygacja backlog |
|--------|---------|--------|-------------------|
| Utrata discoverability edycji komponentów | W2-B | Wysoki | Chip „Edytuj” + zachowanie approve w 1 klik / menu |
| Comfort vs Compact — użytkownik „gubi” wyjaśnienia | W2-A | Średni | Toggle Comfort; confidence badge w wierszu Compact |
| Drawer vs inline — scope creep mobilny | W2-E | Średni | DF W2: **preferuj inline expand**; drawer tylko jeśli AC mobile fail |
| Sort/Search mylone z mutacją danych | W2-C/D | Niski | Jak filtr W1: tylko widok; reset przy `item.id` |
| Double filter UX (review W1 + search) | W2-D | Średni | Jasny chip „aktywne filtry”; empty states |
| Regresja sticky W1 (drugi sticky toolbar) | Toolbar W2 | Średni | DF: **jeden** sticky cenowy; toolbar search/sort **pod** sticky lub w flow |
| Przedwczesna virtualizacja | Scope creep → W3 | Wysoki | Twardy OOS W2 |
| Zmiana wysokości form = „prawie logika” | W2-B | Niski | Zero zmian patch/approve API — tylko prezentacja |

---

## 6. Rekomendowana kolejność realizacji

```text
WAVE 2 — proponowane slice’y (po osobnym DF + Owner GO):

  Slice 2.0  Design Freeze WAVE 2 (docs)
       │
  Slice 2.1  Compact Mode (W2-A) + Comfort toggle
       │     ← największy skok „ile pozycji widać”
       │
  Slice 2.2  Collapsed Components (W2-B)  [inline expand first]
       │     ← domyka ból formularzy; zależny od modelu wiersza 2.1
       │
  Slice 2.3  Search L1 (W2-D)  — thin, reuse pattern z BOQ search UX
       │     ← szybko łączy się z filtrem review W1
       │
  Slice 2.4  Sort (W2-C)  — LP / direct / confidence
       │
  (opcjonalnie) Slice 2.5  Drawer/bottom sheet tylko jeśli 2.2 inline
                            nie spełnia AC mobile
```

### 6.1 Dlaczego ta kolejność

| Kolejność | Powód |
|-----------|--------|
| **A przed B** | Wspólny **row model** Compact; Collapsed Components to zawartość expand — projektować raz |
| **A+B przed C/D** | Największy ROI ergonomii; Sort/Search na gęstej liście ma sens |
| **D przed C** | Search częściej używany przy „znajdź pozycję”; Sort = pro power |
| **Drawer na końcu / opcjonalnie** | Unikać dużego surface mobile w pierwszym DF W2 |

### 6.2 Czego **nie** łączyć w jednym commit

- Compact + Virtualization (W3)  
- Search L1 + rewrite Search L0 Evidence  
- Collapsed Components + zmiana `patchOfferBoqComponentInDocument`  
- Sort + zmiana kolejności w `OfferBoqDocument` (persist) — W2 = **tylko view order**

---

## 7. Szacowany wpływ na UX (metryki jakościowe)

| Metryka (jakościowa) | Po W1 | Po W2 (A+B) | Po W2 (+D+C) |
|----------------------|-------|-------------|--------------|
| Pozycje widoczne / pierwszy viewport | ~3–6 kart | **~12–25** compact rows | podobnie + szybszy skok do celu |
| Scroll do pozycji #80 | Długi | Krótszy 2–3× | + search ≈ natychmiast |
| Wysokość expand 1 linii z 2–3 komponentami | ~1–2 ekrany form | **~0.3–0.5 ekranu** chipów | j.w. |
| Czas „znajdź i popraw jedną stawkę” | Wysoki | Średni | **Niski** (search + compact) |
| Ryzyko utraty sticky/ceny | Niski (W1) | Niski (zachować W1) | Niski |

**Największy skok ergonomii:** przejście **W1 → W2-A+W2-B** (density).  
**Drugi skok:** **Search** przy BOQ ≥150.  
**Sort:** incremental dla power users / review po confidence.

---

## 8. Priorytety backlogu (MoSCoW)

| Priorytet | Elementy |
|-----------|----------|
| **Must** | W2-A Compact Mode · W2-B Collapsed Components (inline) |
| **Should** | W2-D Search L1 · integracja z filtrem review W1 |
| **Could** | W2-C Sort (LP / direct / confidence) · Comfort default &lt;50 linii |
| **Won’t (W2)** | Virtualization · pin/resize · dense AG-Grid-like table · drawer mandatory · LS persist filtrów · zmiany Bid/AI Cost |

---

## 9. Wejście do Design Freeze WAVE 2 (checklist)

Zanim Owner GO IMPLEMENTATION W2:

- [ ] DF W2: row anatomy Compact (pola, badges, touch)  
- [ ] DF W2: Collapsed component row + stany edit (inline)  
- [ ] DF W2: pipeline `visibleLines = reviewOnly ∩ search ∩ sort`  
- [ ] DF W2: zakaz drugiego sticky „toolbarowego” nad Offer Bar  
- [ ] DF W2: AC ilościowe (np. ≥3× pozycji w viewport vs Comfort)  
- [ ] DF W2: mobile — min 44px, brak hover-only  
- [ ] Potwierdzenie: Drawer = Won’t lub Could late  

---

## 10. Relacja do WAVE 3

| Po sukcesie W2 | WAVE 3 nabiera sensu gdy |
|----------------|---------------------------|
| Compact + Collapsed | DOM nadal ciężki przy 500 otwartych/virtual need |
| Search/Sort OK | Power users chcą pin LP/Direct + resize |

**Nie** startować W3 równolegle z W2.

---

## 11. STOP

```text
BACKLOG PREPARATION COMPLETE — COSTORYS-UX-01 WAVE 2
Dokument: docs/architecture/COSTORYS-UX-01-WAVE-2-BACKLOG.md

Rekomendacja kolejności:
  1) Compact Mode
  2) Collapsed Components (inline)
  3) Search L1
  4) Sort
  (opcjonalnie Drawer)

Największy wzrost ergonomii: Compact + Collapsed Components.

Bez implementacji.
Bez commit.
Bez push.

Czekam na Owner GO → Design Freeze WAVE 2 (gdy będzie gotowość).
```
