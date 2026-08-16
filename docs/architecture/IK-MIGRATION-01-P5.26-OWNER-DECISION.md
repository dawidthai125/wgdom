# IK-MIGRATION-01 — P5.26 OWNER DECISION

> **TRYB:** OWNER REVIEW → **DECISION RECORD ONLY**  
> **Date:** 2026-08-15  
> **Źródło kolejki:** [`IK-MIGRATION-01-P5.26-OWNER-REVIEW-QUEUE.md`](./IK-MIGRATION-01-P5.26-OWNER-REVIEW-QUEUE.md)  
> **JSON:** `.tmp/p526-owner-decisions.json`  
> **Accept execution:** [`IK-MIGRATION-01-P5.26-ACCEPT-EXECUTION.md`](./IK-MIGRATION-01-P5.26-ACCEPT-EXECUTION.md) → **STOPPED WITH GAP** (`BIND_TARGET_MISSING`) — **0 writes**

## Integrity (ten krok)

| Check | Value |
|---|---|
| Research | **0** |
| HTTP | **0** |
| Accept executed | **0** (record only) |
| Catalog / KV write | **0** |
| Code changes | **0** |
| Commit / Push | **0** |
| Lines / groups changed | **unchanged** |
| Research GAP | **159 groups / ~294 lines — untouched** |

**Actual Accept = osobny Owner GO** (`P5.26 ACCEPT EXECUTION`).  
Ten dokument **nie** wywołuje `acceptWorkRateResearchCandidate` / `saveWorkCatalogRouted` / KV.

---

## Summary

| Outcome | Count / items |
|---|---|
| **ACCEPT families** | **4** (10 groups: G015/024/081 · G035/036/067 · G092/107 · G153/154) |
| **REJECT candidate** | **G112** (97.3) |
| **INTERNAL REUSE REJECTED** | **G177** (118) · **G141** · **G143** (21.6) |
| **REVIEW_REQUIRED** | **G076 · G126 · G134 · G135 · G144** |
| **CONFIRMED FALSE POSITIVE** | **G111 · G149 · G150** |

---

## Full decision table

| Group/Family | Domain | Candidate | Owner Decision | Final status | Reason |
|---|---|---:|---|---|---|
| **wykucie-bruzd-72.5** (G015, G024, G081) | LABOR | 72.5 PLN/mb | **ACCEPT 72.5** | OWNER_ACCEPTED_PENDING_EXECUTION | Wykucie bruzd. **≠** zaprawianie/zamurowanie bruzd **20 PLN/mb** (`cc-p0c-w1-zaprawianie-bruzd`) — no semantic merge |
| G015 | LABOR | 72.5 | ACCEPT 72.5 PLN/mb | OWNER_ACCEPTED_PENDING_EXECUTION | Family wykucie-bruzd |
| G024 | LABOR | 72.5 | ACCEPT 72.5 PLN/mb | OWNER_ACCEPTED_PENDING_EXECUTION | Family wykucie-bruzd |
| G081 | LABOR | 72.5 | ACCEPT 72.5 PLN/mb | OWNER_ACCEPTED_PENDING_EXECUTION | Family wykucie-bruzd |
| **gruntowanie-13.5** (G035, G036, G067) | LABOR | 13.5 PLN/m² | **ACCEPT 13.5** | OWNER_ACCEPTED_PENDING_EXECUTION | Gruntowanie family |
| G035 | LABOR | 13.5 | ACCEPT 13.5 PLN/m² | OWNER_ACCEPTED_PENDING_EXECUTION | Family gruntowanie |
| G036 | LABOR | 13.5 | ACCEPT 13.5 PLN/m² | OWNER_ACCEPTED_PENDING_EXECUTION | Family gruntowanie |
| G067 | LABOR | 13.5 | ACCEPT 13.5 PLN/m² | OWNER_ACCEPTED_PENDING_EXECUTION | Family gruntowanie |
| **malowanie-emulsja-21.8** (G092, G107) | PACKAGE | 21.8 PLN/m² | **ACCEPT 21.8** | OWNER_ACCEPTED_PENDING_EXECUTION | Tylko malowanie emulsją. **Nie** stolarka / olejne / G141 / G143 |
| G092 | PACKAGE | 21.8 | ACCEPT 21.8 PLN/m² | OWNER_ACCEPTED_PENDING_EXECUTION | Emulsja ≠ stolarka |
| G107 | PACKAGE | 21.8 | ACCEPT 21.8 PLN/m² | OWNER_ACCEPTED_PENDING_EXECUTION | Emulsja ≠ stolarka |
| **montaz-grzejnika-97.3** (G153, G154) | PACKAGE | 97.3 PLN/szt | **ACCEPT 97.3** | OWNER_ACCEPTED_PENDING_EXECUTION | Kompletna cena jednostkowa (R+M) gdy brak osobnego wykazu materiału. **≠** «Grzejnik» MATERIAL |
| G153 | PACKAGE | 97.3 | ACCEPT 97.3 PLN/szt | OWNER_ACCEPTED_PENDING_EXECUTION | Montaż grzejnika PACKAGE |
| G154 | PACKAGE | 97.3 | ACCEPT 97.3 PLN/szt | OWNER_ACCEPTED_PENDING_EXECUTION | Montaż grzejnika PACKAGE |
| **G112** | PACKAGE | 97.3 PLN/szt | **REJECT 97.3** | REJECTED_CANDIDATE / RESEARCH_REQUIRED_LATER | Nie przenosić ceny grzejnika na głowicę. Bez nowej ceny. Bez re-research teraz |
| G076 | LABOR | 42 | REVIEW_REQUIRED | INTERNAL_SEMANTIC_REVIEW_REQUIRED | Brak wystarczającego dowodu — bez Accept |
| G126 | PACKAGE | 65.8 | REVIEW_REQUIRED — nie używać 65.8 | INTERNAL_SEMANTIC_REVIEW_REQUIRED | Legacy gaz mb — REVIEW |
| G134 | PACKAGE | 276 | REVIEW_REQUIRED | INTERNAL_SEMANTIC_REVIEW_REQUIRED | Legacy gaz szt — REVIEW |
| G135 | PACKAGE | 257.5 | REVIEW_REQUIRED | INTERNAL_SEMANTIC_REVIEW_REQUIRED | Legacy c.o. szt — REVIEW |
| **G141** | PACKAGE | 21.6 | **REJECT INTERNAL REUSE 21.6** | INTERNAL_MATCH_REJECTED | «Malowanie (m2)» ≠ malowanie stolarki |
| **G143** | PACKAGE | 21.6 | **REJECT INTERNAL REUSE 21.6** | INTERNAL_MATCH_REJECTED | «Malowanie (m2)» ≠ malowanie stolarki |
| G144 | PACKAGE | 120 | REVIEW_REQUIRED | INTERNAL_SEMANTIC_REVIEW_REQUIRED | Otulina ≠ MW-ETICS — REVIEW |
| **G177** | PACKAGE | 118 | **REJECT INTERNAL REUSE 118** | RESEARCH_REQUIRED_LATER / INTERNAL_MATCH_REJECTED | PACKAGE ≠ LABOR; kompletność 118 niejasna; nie zapisywać; bez research teraz |
| G111 | PACKAGE | 4.33 | CONFIRMED_FALSE_POSITIVE | CONFIRMED_FALSE_POSITIVE | PACKAGE → MATERIAL puszka — nie reuse, nie pytaj ponownie |
| G149 | PACKAGE | 4.33 | CONFIRMED_FALSE_POSITIVE | CONFIRMED_FALSE_POSITIVE | PACKAGE → MATERIAL puszka — nie reuse, nie pytaj ponownie |
| G150 | PACKAGE | 38 | CONFIRMED_FALSE_POSITIVE | CONFIRMED_FALSE_POSITIVE | Montaż gniazd ≠ przygotowanie osprzętu — nie reuse, nie pytaj ponownie |

---

## Price semantic separation (kontrakt)

| Cena | Znaczenie | Status |
|---:|---|---|
| **72.5 PLN/mb** | Wykucie bruzd | ACCEPTED (decision) |
| **20 PLN/mb** | Zaprawianie / zamurowanie bruzd | OSOBNA usługa — **no merge** |
| **13.5 PLN/m²** | Gruntowanie | ACCEPTED (decision) |
| **21.8 PLN/m²** | Malowanie emulsją | ACCEPTED (decision) — **≠ stolarka** |
| **21.6 PLN/m²** | Legacy malowanie ogólne | **REJECTED** for stolarka (G141/G143) |
| **97.3 PLN/szt** | Montaż grzejnika (PACKAGE) | ACCEPTED (decision) |
| **97.3 PLN/szt** | Głowica termostatyczna | **REJECTED** (G112) |
| **118 PLN/m²** | Ścianka GK internal | **REJECTED** reuse (G177) |

---

## Owner Knowledge — twardy kontrakt (bez zmian)

- PACKAGE = jedna cena kompletnego wykonania  
- Montaż/wymiana bez osobnego wykazu materiałów = `LABOR_MATERIAL_PACKAGE`  
- «Grzejnik» = MATERIAL · «Montaż grzejnika» = PACKAGE  
- «Gniazdo» = MATERIAL · «Montaż gniazda» = PACKAGE  
- Bateria / podejście PVC / rurociągi PCW / otuliny / ustęp kompakt = PACKAGE  
- Malowanie bez wykazu farby = PACKAGE · Malowanie stolarki = PACKAGE  
- Wzmocnienie nadproża = PACKAGE  
- Opłata utylizacyjna / Opinia kominiarska = NON_COST  
- Skrzydła drzwiowe = MATERIAL  
- **Owner Knowledge ≠ automatyczny BASE / Accept**

---

## Research GAP

**159 grup / ~294 linii** — nietknięte. Bez researchu w tym kroku.

---

## Next (NIE teraz)

Osobny Owner GO: **P5.26 ACCEPT EXECUTION** — dopiero wtedy zapis katalogu / Accept API.

```text
P5.26 OWNER DECISION RECORD COMPLETE
ACCEPT EXECUTED = 0 · HTTP = 0 · WRITES = 0 · CODE = 0
STOP — czekaj na P5.26 ACCEPT EXECUTION GO
```
