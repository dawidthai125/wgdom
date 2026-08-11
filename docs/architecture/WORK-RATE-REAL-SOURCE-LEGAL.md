# WORK-RATE-REAL-SOURCE-LEGAL

> **STATUS:** **LEGAL REVIEW (AUDIT ONLY)** · **NO IMPLEMENTATION** · **NO GATE FLIP**  
> **DATA:** 2026-08-11  
> **PRIMARY CANDIDATE:** KB.pl (Kalkulatory Budowlane / Grupa KB.pl)  
> **ZAKAZ:** nie zmieniać `MARKET_SYNC_P3_LEGAL_GATE` · nie zmieniać D1 materiałów · nie scraping

---

## 1. Werdykt

| Pole | Wartość |
|------|---------|
| **Źródło** | KB.pl (`https://kb.pl/` · cenniki usług) |
| **Rola w planie** | PRIMARY CANDIDATE dla selective research stawek **robót** |
| **LEGAL** | **REVIEW / UNKNOWN** (domyślnie traktować jako **BLOCKED** dla live HTTP) |
| **Automatyczny research** | **ZABRONIONY** do osobnego Owner GO + dowodu prawnego |
| **Gate materiałów** | `MARKET_SYNC_P3_LEGAL_GATE` = **UNCHANGED** (obecnie PASS dla LM/Casto/OBI) |

**NIE** przełączamy żadnego istniejącego Legal Gate.  
Labor wymaga **osobnego** gate’u (propozycja nazwy roboczej: `WORK_RATE_LEGAL_GATE`) — **nie** reuse `MARKET_SYNC_P3_LEGAL_GATE`.

---

## 2. Co ustalono publicznie (bez scrapingu treści cen)

| Fakt | Źródło publiczne |
|------|------------------|
| Serwis publikuje cenniki / koszty usług budowlanych, w tym warianty regionalne (wiele miast) | kb.pl · sekcja Cenniki |
| Wydawca: Grupa KB.pl sp. z o.o. | grupakb.pl |
| Regulamin zastrzega prawa do serwisu; korzystanie poza zakresem regulaminu wymaga zgody Usługodawcy (pisemnej wg regulaminu grupakb.pl) | https://grupakb.pl/regulamin |
| **Brak** publicznie udokumentowanego API feedu cenników robót dla komercyjnego reuse w aplikacji trzeciej | brak dowodu w publicznym materiale (stan na audyt) |
| Ogólne ryzyko scrapingu / automatycznego pobierania bez umowy | praktyka compliance (regulamin + baza danych) |

---

## 3. Checklist Legal (roboczy)

| Pytanie | Stan |
|---------|------|
| Regulamin — automatyzacja / boty / kopiowanie | **REVIEW** — wymaga pełnej lektury ToS KB.pl + grupakb.pl pod kątem botów / baz danych |
| Oficjalne API | **UNKNOWN** — nie potwierdzono |
| Zgoda / licencja na storage + cross-tender reuse | **BRAK** w repo |
| Komercyjne użycie derived data w wycenie firmowej | **UNKNOWN** |
| Ograniczenia regionalne / redistribucja | **UNKNOWN** |
| robots.txt / warunki techniczne | **NIE AUDYTOWANO** w tym dokumencie (wymaga osobnego kroku Owner) |

---

## 4. Rekomendacja procesu

1. Owner / prawnik: pełny przegląd ToS KB.pl + kontakt z Grupą KB.pl ws. **licencjonowanego** dostępu (API / feed / umowa).  
2. Dopiero przy **PASS** + Owner Attestation: flip **osobnego** `WORK_RATE_LEGAL_GATE`.  
3. Do tego czasu: research zewnętrzny = **BLOCKED**; Owner może ustawiać stawki **ręcznie** (source = OWNER).  
4. **NIE** obchodzić gate’u materiałów ani Legal Gate DIY.

---

## 5. Powiązanie

Plan przebudowy: [`WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md`](./WORK-CATALOG-REBUILD-01-AUDIT-PLAN.md)
