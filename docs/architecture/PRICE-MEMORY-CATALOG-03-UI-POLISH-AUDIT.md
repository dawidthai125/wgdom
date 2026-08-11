# PRICE-MEMORY-CATALOG-03 — UX/UI POLISH AUDIT

> **STATUS:** AUDIT COMPLETE · IMPLEMENT follows  
> **DATA:** 2026-08-11  
> **ZAKRES:** tylko `OurPriceCatalogPanel.tsx` (+ changelog) · **ZERO** change Price Memory / seed / C4/C5 / KV

## Techniczne stringi w UI (do usunięcia z widoku)

| Miejsce | Było | Ma być |
|---------|------|--------|
| Opis nagłówka | Price Memory · CURRENT/STALE/MISSING · live HTTP | PL biznesowy |
| Filtry | CURRENT / STALE / MISSING | Aktualne / Przeterminowane / Brak ceny |
| Kolumna Fresh | `row.freshness` raw | AKTUALNA / PRZETERMINOWANA / BRAK CENY + kolor |
| Zmiana | `UNKNOWN` | Brak danych porównawczych |
| Accept banner | Accept · commitMarketQuotesImport | Potwierdź / Zapisz nową cenę |
| Błędy | CURRENT · Research · Accept | PL |
| title/aria | MISSING · CURRENT · research | PL |
| Placeholder | materialKey… | nazwa lub klucz materiału |
| Kolumna Źródła | `2/3` coverage | czytelne źródło (origins) |
| Pagination | „pozycji” | PL + podsumowanie statusów |

## Bez zmian

- Enumy `CURRENT`/`STALE`/`MISSING`/`UNKNOWN` w lib  
- `buildOurPriceCatalogRows` · seed · force refresh · Accept → commit  
- `pageSize` 100 · labor gate · marża MAX floor  
