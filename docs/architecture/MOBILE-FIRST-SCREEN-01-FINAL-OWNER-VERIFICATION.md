# MOBILE-FIRST-SCREEN-01 — FINAL Owner Verification

> **STATUS:** **FIELD PENDING OWNER** · ticket **NIE ZAMKNIĘTY**  
> **Data:** 2026-07-25  
> **DF:** [`MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md`](MOBILE-FIRST-SCREEN-01-DESIGN-FREEZE.md)  
> **OV (implement):** [`MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md`](MOBILE-FIRST-SCREEN-01-OWNER-VERIFICATION.md)  
> **Kod / commit / push w tej fazie:** **ZERO** (zakaz Ownera)

```text
FINAL FIELD VERIFY — agent nie ma fizycznego iPhone Safari.
Wynik końcowy = wyłącznie werdykt Ownera: PASS iPhone / FAIL iPhone.
```

---

## 0. Ważne: co weryfikować

| Środowisko | MFS-01 w buildzie? | Uwaga |
|------------|-------------------|--------|
| **Produkcja 2.65.44 / `57b059d`** | **NIE** | Tip bez MFS-01 — field na prod = test **starego** UI |
| **Lokalny `dist` / preview z IMPLEMENT** | **TAK** | Jedyna prawidłowa baza do field przed commit |
| Emulacja Chromium @390 | **TAK** (sesja IMPLEMENT) | **NIE** zastępuje Safari |

**Przed field:** otwórz build z lokalnym IMPLEMENT (np. preview po `npm run build`), hard-refresh Safari, ścieżka **Przetargi → Wybrany przetarg**.

---

## 1. Scorecard FINAL (Owner)

| # | Kryterium | Emulacja (agent) | **iPhone Safari (Owner)** |
|---|-----------|------------------|---------------------------|
| **1** | Po wejściu widoczna rzeczywista treść przetargu (above the fold) | **PASS** (content **53.1%** @390) | **⬜ PENDING** |
| **2a** | Operator Bar = jeden rząd | **PASS** | **⬜ PENDING** |
| **2b** | Horizontal scroll działa | **PASS** (layout A) | **⬜ PENDING** |
| **2c** | Upload działa | **PASS*** (handler bez zmian; smoke DOM) | **⬜ PENDING** |
| **2d** | Analiza działa | **PASS*** | **⬜ PENDING** |
| **2e** | Eksport działa | **PASS*** | **⬜ PENDING** |
| **3a** | Process collapsed | **PASS** | **⬜ PENDING** |
| **3b** | Rozwija się poprawnie | **PASS** | **⬜ PENDING** |
| **3c** | Zwija się poprawnie | **PASS** (toggle) | **⬜ PENDING** |
| **4a** | CTA compact | **PASS** (H≈54px) | **⬜ PENDING** |
| **4b** | Bez description | **PASS** | **⬜ PENDING** |
| **4c** | Busy = „Przetwarzam…” | **PASS** (gdy busy) | **⬜ PENDING** |
| **5a** | Scroll płynny | **PASS** (Chromium) | **⬜ PENDING** |
| **5b** | Brak skoków | **PASS** (emul.) | **⬜ PENDING** |
| **5c** | Brak konfliktu pion/poziom | **PASS** (emul.) | **⬜ PENDING** |
| **6a** | Safe Area / notch | n/a (emul. safe≈0) | **⬜ PENDING** |
| **6b** | Home indicator — nic nie ucięte | n/a | **⬜ PENDING** |
| **7** | Desktop bez regresji | **PASS** @1280 | **⬜ PENDING** (Owner desktop) |

\* Emulacja potwierdziła obecność akcji w 1-rzędowym toolbarze; pełne wywołanie Upload/Analiza/Eksport na fizycznym urządzeniu = Owner.

---

## 2. Werdykt zagregowany

| Warstwa | Status |
|---------|--------|
| Emulacja IMPLEMENT | **PASS** (3/3 Playwright) |
| **Field iPhone Safari** | **PENDING OWNER** |
| Ticket MOBILE-FIRST-SCREEN-01 | **OTWARTY** (nie CLOSED) |
| RELEASE REPORT (final) | **NIE** — dopiero po **PASS iPhone** |
| Commit / push | **ZAKAZ** do osobnego polecenia |

---

## 3. Instrukcja odpowiedzi Ownera

Po field na buildzie z MFS-01 odpowiedz jedną linią + opcjonalnie listą FAIL:

```text
PASS iPhone
```

albo

```text
FAIL iPhone
#1 … / #2c … / #5c …
```

**Przy PASS iPhone:** agent zamknie ticket, napisze RELEASE REPORT, **czeka** na osobne GO commit/push.  
**Przy FAIL iPhone:** tylko nowe RCA (objaw Safari) — **bez** implementacji.

---

## 4. Boundary (ta faza)

| | |
|--|--|
| `src/**` | **bez zmian** |
| commit / push | **nie** |
| DESIGN FREEZE | bez zmian kontraktu |

---

**Koniec FINAL OV — czekam na PASS iPhone / FAIL iPhone.**
