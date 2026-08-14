# IK-MIGRATION-01 — BOQ DISCOVERY CONTRACT

> **ID:** `IK-MIGRATION-01-BOQ-DISCOVERY-CONTRACT`  
> **STATUS:** P0 FROZEN  
> **Parent:** [`IK-MIGRATION-01-DESIGN-FREEZE.md`](./IK-MIGRATION-01-DESIGN-FREEZE.md)  
> **Data:** 2026-08-15

```text
PRZEDMIAR / PRZEDMIARY = PODSTAWOWE WEJŚCIE KOSZTORYSOWANIA.
NIE projektuj happy-path: „brak przedmiaru → HOLD → koniec”.
HOLD / PARTIAL / GAP = tylko realny problem techniczny lub danych.
NIGDY nie udawaj, że kosztorysowanie się wykonało.
```

---

## 1. Document Expert = first real task

```text
TENDER
→ DOCUMENT DISCOVERY
→ DOCUMENT CLASSIFICATION
→ COST DOCUMENT IDENTIFICATION
→ PRZEDMIAR DISCOVERY (1..N)
→ EXTRACTION
→ VALIDATION
→ NORMALIZATION
→ MASTER BOQ READY
→ handoff Labor / Material
```

„Ocena opłacalności” **po** BOQ READY (lub PARTIAL z jawnym scope).

---

## 2. REUSE (nie nowy pipeline)

| Krok | Path |
|------|------|
| BZP / notice docs | `src/lib/tenders-bzp.ts` (`tenders-bzp-documents`, bytes) |
| External / ZIP / 7z | `tender-external-docs`, `tender-document-discovery`, `wgdom-7z-archive` |
| Ingest lossless | `src/lib/tender-ingest/*` · INGEST-01 CLOSEOUT |
| Resolver / heavy parse | `tender-document-resolver.ts`, `tender-dossier-pipeline.ts` |
| Cost doc type | `tender-cost-discovery.ts` `classifyCostDocument` |
| Coverage types | `tender-analysis-coverage.ts` `FILE_TYPE_SUPPORT` |
| ATH/NOR/XML | `ath-parser.ts` `parseKosztorysBytes` |
| XLS/XLSX | `tenders-bzp-doc-parse.ts` / parse XLSX kosztorys |
| PDF przedmiar | `pdf-przedmiar-heuristic.ts` (tekst); skan OCR = backlog, PARTIAL |
| DOC/DOCX | SWZ tekst (mammoth); **kosztorys=false** w coverage — PARTIAL jeśli jedyny plik |
| Snapshot | `tenders-bzp-brief.ts` `athPreviewToSnapshot` |
| OfferBoq | `tender-offer-boq.ts` `buildOfferBoqFromSnapshot` |
| Multi compose | `src/lib/multi-boq/*` |

IK **orkiestruje i raportuje** te kroki w EC. Nie drugi parser.

---

## 3. Formaty (istniejące capabilities)

| Ext | Kosztorys parse | Uwaga freeze |
|-----|-----------------|--------------|
| PDF | TAK (heurystyka) | skan bez OCR → PARTIAL |
| XLS/XLSX | TAK | |
| ATH/NOR/XML | TAK | input NORMA; **brak writer** |
| ZIP/7Z | TAK (inner) | INGEST children; auto cap 6 na external KEEP |
| DOC/DOCX | SWZ TAK / kosztorys NIE w coverage | nie udawać BOQ z DOC |

---

## 4. Acceptance — zanim Labor/Material

System **musi umieć wykazać** (Gate B):

1. znalezione dokumenty (lista + count)
2. które są cost documents
3. wszystkie znalezione przedmiary (1..N)
4. źródło każdego (`documentId`, filename, archive parent)
5. strony / arkusze jeśli parser je daje; inaczej `unknown` + PARTIAL
6. liczba wykrytych pozycji
7. liczba poprawnie wyodrębnionych (qty+unit+opis)
8. quantity
9. unit
10. description
11. source position number (`lp` / index)
12. address/object (`dwellingId` po Owner map; bez mapy = unassigned HOLD)
13. branch (`branchHint` / unknown)
14. validation result
15. duplicate check (MULTI-BOQ KEEP ONE / KEEP BOTH / CONFLICT)
16. missing-line check
17. **BOQ READY** albo **PARTIAL / HOLD / GAP** z powodem

Komunikat „przedmiar gotowy” **tylko** gdy extraction spełnia READY.

---

## 5. READY vs PARTIAL vs HOLD vs GAP

| Status | Znaczenie | Dalej |
|--------|-----------|--------|
| **BOQ READY** | linie z qty+unit+opis; lineage; (multi: mapping Owner) | Labor/Material |
| **PARTIAL** | część stron/plików/linii OK, reszta nie | costing **tylko** na READY subset + lista braków |
| **HOLD** | uszkodzony/nieczytelny/konflikt/niejednoznaczny | zero udawanego Bid complete |
| **GAP** | brak cost document po **zakończonym** discovery | Document Expert **kontynuuje diagnostykę** (inne ZIP, platforma LoginTrade, upload Owner) — **nie** kończy IK hasłem „HOLD i nic” |

**GAP discovery** ≠ rezygnacja z przetargu. To stan „jeszcze nie ma wejścia”; UI pokazuje co sprawdzono i czego brak. Auto-wycena F5 przy braku OfferBoq = C-MODE-1a null — zgodne, ale EC musi powiedzieć **dlaczego**.

---

## 6. Przykładowe fakty EC (Document Expert)

Dozwolone tylko z evidence:

- „Znalazłem N dokumentów.”
- „K z nich to dokumenty kosztorysowe: …”
- „Przedmiar 1 — budowlane (plik …).”
- „Wyodrębniłem X pozycji; Y z qty+jm; Z braków.”
- „Przypisanie do adresu: mapped / unassigned.”

Zakaz: „Budowa kosztorysu” done bez `rowCount` / OfferBoq.

---

## 7. Known code gaps (nie ukrywać)

| Gap | Evidence | P0 decyzja |
|-----|----------|------------|
| KNR `pd` gubi się w `athPreviewToSnapshot` | F6 ATH audit | NIE naprawiać w P1; P2/P3 AUDIT czy blokuje identity |
| PDF skan OCR | coverage notes | PARTIAL |
| DOC jako przedmiar | kosztorys=false | PARTIAL / upload ATH/XLS |
| Auto external parse cap 6 | INGEST-01 KEEP | Owner ingest lossless N→N |
| Live `08def45d` snapshot 0 BOQ | AUDIT-01 | P2 zmierzyć live, nie zakładać 0 na zawsze |

---

## 8. STOP

Document Expert nie jest NG-10 timeline. Jest **wykonaniem** istniejącego pipeline + prawdą w EC.
