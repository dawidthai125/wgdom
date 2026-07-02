# Mobile Field Validation — standard certyfikacji terenowej

> **Status:** **DESIGN FREEZE · FROZEN** (procedura GATE + Etap 2)  
> **Pierwsze użycie:** MOBILE-P0-S1 (scroll Safari · v2.63.14)  
> **Zakres:** uniwersalny standard przy **każdej większej zmianie mobilnej** (UX, scroll, layout, performance UI)  
> **Implementacja:** ten dokument **nie** zawiera kroków kodowych — wyłącznie procedura terenowa.

**Powiązane:**

- Architektura scroll: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) § 6.2  
- Pełna certyfikacja historyczna (10 ekranów): [`audit/MOBILE-UX-FIELD-VALIDATION-REPORT.md`](../../audit/MOBILE-UX-FIELD-VALIDATION-REPORT.md)  
- Smoke statyczny (CI): `scripts/smoke-test-mobile-scroll-p0-s1.mjs`

---

## 0. Kiedy stosować

| Sytuacja | Wymagane |
|----------|----------|
| Epic / sprint mobile (scroll, layout, nawigacja) | **Etap 1 GATE** obowiązkowy |
| Release po PASS GATE | **Etap 2** przed `FIELD VALIDATION PASS` |
| Hotfix tylko desktop | GATE **pominięty** (decyzja Architekta) |
| Sprint performance (np. MOBILE-P0-S2) | GATE z Etapu 1 **już PASS** + akceptacja Architekta |

**Blokada release mobile:** `FIELD GATE RESULT = GATE PASS` **oraz** `FIELD VALIDATION PASS` **oraz** akceptacja Architekta.

---

## 1. Środowisko testowe

| Pole | Wymaganie |
|------|-----------|
| **Urządzenie referencyjne** | iPhone 17 Pro Max (lub najnowszy iPhone dostępny w zespole) |
| **Przeglądarka Etap 1** | **Safari** (nie PWA na pierwszym passie GATE) |
| **Konto** | Admin z dostępem do Przetargów i Robotów |
| **Dane** | Lista Przetargów ≥ 15 pozycji; lista Robotów ≥ 10 pozycji |
| **Przed startem** | Zamknięte wszystkie modale; świeże wejście w aplikację |

**Wersja/build:** wpisz `CHANGELOG[0].version` + źródło (prod / preview / lokalny build).

---

## 2. Kontrole wspólne (G1–G3)

Wykonuj po **każdym** kroku GATE i po **każdym** punkcie Etapu 2.

| ID | Sprawdzenie | PASS | FAIL |
|----|-------------|:----:|:----:|
| **G1** | Widok/lista **scrolluje się** palcem (góra ↔ dół) | ☐ | ☐ |
| **G2** | `document.documentElement.classList.contains('modal-scroll-locked')` → **false** (gdy brak otwartego modala) | ☐ | ☐ |
| **G3** | **Ostatni element** widoczny nad dolną nawigacją (nie ucięty przez bottom nav) | ☐ | ☐ |

**Szybki test G2 (Safari bookmarklet):**

```text
javascript:alert('modal-scroll-locked='+document.documentElement.classList.contains('modal-scroll-locked'))
```

---

## 3. ETAP 1 — GATE (~7–10 min)

**Zasada:** przy **pierwszym FAIL** w GATE-1, GATE-2 lub GATE-3 → **STOP** → raport RCA → **pomiń GATE-4 i Etap 2**.

### GATE-1 — Przetargi · scroll listy

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| G1-T1 | Bottom nav → **Przetargi** → zakładka **Lista** | ☐ | ☐ |
| G1-T2 | Scroll od góry **do końca** listy | ☐ | ☐ |
| G1-T3 | Scroll **powrotny na górę** | ☐ | ☐ |
| G1-T4 | **G1 + G2 + G3** | ☐ | ☐ |

**Wynik GATE-1:** ☐ PASS · ☐ FAIL

---

### GATE-2 — Roboty · lista + drill-in

#### 2A — Scroll listy

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| G2-R1 | Bottom nav → **Roboty** | ☐ | ☐ |
| G2-R2 | Scroll listy od góry **do końca** | ☐ | ☐ |
| G2-R3 | Scroll **powrotny na górę** | ☐ | ☐ |
| G2-R4 | **G1 + G2 + G3** | ☐ | ☐ |

#### 2B — Drill-in (po PASS 2A)

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| G2-R5 | **Otwarcie** dowolnej roboty (detal fullscreen MV-2) | ☐ | ☐ |
| G2-R6 | **Przewinięcie detalu** (góra ↔ dół) | ☐ | ☐ |
| G2-R7 | **Powrót** do listy (← UI lub native back) | ☐ | ☐ |
| G2-R8 | **Ponowny scroll listy** (góra ↔ dół) | ☐ | ☐ |
| G2-R9 | **G1 + G2 + G3** po powrocie | ☐ | ☐ |

**Wynik GATE-2:** ☐ PASS (2A **i** 2B) · ☐ FAIL

---

### GATE-3 — Modal · lock / unlock

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| G3-M1 | Otwarcie modala ze scroll lockiem (np. email z roboty lub **⚙ Ustawienia** Super Admin) | ☐ | ☐ |
| G3-M2 | Scroll **wewnątrz** modala działa | ☐ | ☐ |
| G3-M3 | **Zamknięcie** modala | ☐ | ☐ |
| G3-M4 | **G2 = false** zaraz po zamknięciu | ☐ | ☐ |
| G3-M5 | **G1** scroll na liście/tle (Roboty lub Przetargi) | ☐ | ☐ |

**Wynik GATE-3:** ☐ PASS · ☐ FAIL

---

### Decyzja przed GATE-4

| Warunek | Akcja |
|---------|--------|
| GATE-1 **i** GATE-2 **i** GATE-3 = **PASS** | → **GATE-4**, potem **Etap 2** |
| Jakikolwiek **FAIL** w GATE-1…3 | → **STOP** · RCA · **bez** GATE-4 i Etapu 2 |

**FIELD GATE RESULT:** `GATE PASS` | `GATE FAIL`

---

### GATE-4 — Responsywność (subiektywna)

Wykonuj **wyłącznie po PASS** GATE-1…3. Krótka interakcja w każdym module (~30 s).

| Skala | Znaczenie |
|:-----:|-----------|
| **5** | Bardzo płynnie |
| **4** | Płynnie |
| **3** | Lekkie przycięcia |
| **2** | Wyraźne zacięcia |
| **1** | Praktycznie nieużywalne |

| Moduł | Ocena (1–5) | Uwagi |
|-------|:-----------:|-------|
| Dashboard | | |
| Roboty | | lista + drill-in |
| Przetargi | | lista |

**Uwaga:** GATE-4 **nie blokuje** `GATE PASS` — służy raportowi jakości i decyzji Architekta (np. czy uruchomić sprint performance).

---

## 4. ETAP 2 — Full Field Validation

**Warunek wejścia:** `FIELD GATE RESULT = GATE PASS`.

### 4.1 Dashboard

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| D1 | Scroll: KPI → Braki dokumentów → Pilne uwagi → skrót Przetargi | ☐ | ☐ |
| D2 | Brak niechcianego overflow-x całego ekranu | ☐ | ☐ |
| D3 | **G1 + G2 + G3** | ☐ | ☐ |

### 4.2 Przetargi — rozszerzenie listy

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| T1 | Filtry scrollują z listą (mobile: nie sticky) | ☐ | ☐ |
| T2 | Brak trwałej blokady gestu scroll | ☐ | ☐ |
| T3 | Tap wiersz → detal V4 (sanity) | ☐ | ☐ |
| T4 | **G1 + G2 + G3** | ☐ | ☐ |

### 4.3 T7 — Powrót z tła

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| T7-1 | Przetargi → przewiń listę w dół | ☐ | ☐ |
| T7-2 | Przejdź do **ekranu głównego** iPhone → wróć do Safari | ☐ | ☐ |
| T7-3 | Scroll listy nadal działa (góra ↔ dół) | ☐ | ☐ |
| T7-4 | **G1 + G2 + G3** | ☐ | ☐ |

### 4.4 T8 — Zmiana orientacji

| ID | Krok | PASS | FAIL |
|----|------|:----:|:----:|
| T8-1 | Przetargi → **Landscape** → scroll listy | ☐ | ☐ |
| T8-2 | **Portrait** → ponowny scroll | ☐ | ☐ |
| T8-3 | **G1 + G2 + G3** | ☐ | ☐ |

### 4.5 Nawigacja (pojedyncza ścieżka)

Po każdym przejściu: **G1 + G2 + G3** na **liście Przetargów**.

| ID | Po przejściu do… | PASS | FAIL |
|----|------------------|:----:|:----:|
| N1 | Roboty (z Przetargów) | ☐ | ☐ |
| N2 | Dashboard (z Robotów) | ☐ | ☐ |
| N3 | Przetargi (z Dashboardu) — lista musi scrollować | ☐ | ☐ |

### 4.6 G4 — Stress test (5 cykli)

**Cykl:** Przetargi → Roboty → Dashboard → Przetargi  
**Po każdym cyklu:** G1 + G2 + G3 na liście Przetargów.

| Cykl | G1 | G2 | G3 | PASS | FAIL |
|:----:|:--:|:--:|:--:|:----:|:----:|
| 1 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | ☐ | ☐ | ☐ | ☐ | ☐ |

**Warunek PASS G4:**

- zero `modal-scroll-locked` bez modala,
- zero utraty scrolla,
- zero uciętych elementów,
- **zero odświeżeń strony** w trakcie 5 cykli.

---

## 5. Kryteria PASS / FAIL

### FIELD GATE RESULT

| Werdykt | Warunek |
|---------|---------|
| **GATE PASS** | GATE-1 **i** GATE-2 **i** GATE-3 = PASS |
| **GATE FAIL** | Jakikolwiek FAIL w GATE-1…3 → Etap 2 **pominięty** |

### FIELD VALIDATION

| Werdykt | Warunek |
|---------|---------|
| **FIELD VALIDATION PASS** | GATE PASS **oraz** wszystkie punkty Etapu 2 = PASS |
| **FIELD VALIDATION FAIL** | GATE FAIL **lub** jakikolwiek FAIL w Etapie 2 **lub** G2=true bez modala **lub** konieczność refresh strony w G4 |

---

## 6. Szablon raportu terenowego

### 6.1 GATE FAIL — RCA (STOP)

```text
FIELD GATE RESULT: GATE FAIL

RCA — [GATE-1 | GATE-2-2A | GATE-2-2B | GATE-3]
Niezaliczony krok: …
Objaw: …
Kroki reprodukcji: …
G2 przy FAIL: modal-scroll-locked = true/false
Wersja/build: …
Urządzenie: iPhone … · Safari …
Screenshot/wideo: …
Hipoteza (scroll / lock / sticky / dvh / flex / MV-2): …

FIELD VALIDATION: POMINIĘTO (Etap 2 nie wykonano)
GATE-4: POMINIĘTO
```

### 6.2 Raport końcowy (po Etapie 1 + 2)

```text
MOBILE FIELD VALIDATION — [EPIC-ID / wersja]

Tester: …
Data: …
Urządzenie: iPhone … · Safari …
Build: … (prod / preview / local)

FIELD GATE RESULT: GATE PASS | GATE FAIL

FIELD VALIDATION PASS | FIELD VALIDATION FAIL

Moduł        | Ocena (1–5)
-------------|------------
Dashboard    |
Roboty       |
Przetargi    |

Niezaliczone punkty: …
Uwagi Architekta: …
```

---

## 7. MOBILE-P0-S1 — stan sesji

| Pole | Wartość |
|------|---------|
| IMPLEMENT Sprint 1 | **COMPLETE** (v2.63.14 w working tree) |
| FIELD VALIDATION | **PENDING** — oczekuje testów terenowych iPhone Safari |
| COMMIT / PUSH | **NIE** — decyzja właściciela repo |
| Sprint 2 (performance) | **BLOCKED** do GATE PASS + FIELD VALIDATION PASS + akceptacja Architekta |

**Po otrzymaniu wyników terenowych:** wypełnij § 6.2 i wydaj werdykt `FIELD VALIDATION PASS` lub `FIELD VALIDATION FAIL` — **bez** dodatkowej implementacji w tej samej sesji, chyba że Architekt otworzy hotfix.

---

## 8. Zamrożenie procedury

| Reguła | Status |
|--------|--------|
| Dodawanie nowych scenariuszy GATE / Etap 2 | **ZABRONIONE** bez nowego DESIGN FREEZE |
| Zmiana kolejności GATE-1…4 | **ZABRONIONE** |
| Skrócenie Etapu 2 bez audytu | **ZABRONIONE** |
| Pominięcie GATE przed release mobile | **ZABRONIONE** (wyjątek: decyzja Architekta na piśmie) |

**Ostatnia aktualizacja dokumentu:** 2026-07-01 · **MOBILE-P0-S1 DESIGN FREEZE TEST PROCEDURE**
