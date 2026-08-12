# WORK RATE LEGAL ENABLEMENT

> **STATUS:** **PASS**  
> **DATA:** 2026-08-12  
> **AUTHORIZATION:** **OWNER ATTESTATION**  
> **PRIVATE EVIDENCE:** **HELD BY OWNER** · **NOT STORED IN REPOSITORY**

---

## STATUS

```text
PASS
```

## AUTHORIZATION

```text
OWNER ATTESTATION
```

## PRIVATE EVIDENCE

```text
HELD BY OWNER
NOT STORED IN REPOSITORY
```

Treść korespondencji emailowej, dane osobowe nadawców oraz pełna treść zgód **nie** są przechowywane w Git.

---

## SOURCES

| Źródło | Status | Authorization | Evidence | API |
|--------|--------|---------------|----------|-----|
| **KB.pl** | **VERIFIED** | OWNER_ATTESTATION | PRIVATE_OWNER_HELD | NOT AVAILABLE / NOT PROVIDED |
| **SCCOT** | **VERIFIED** | OWNER_ATTESTATION | PRIVATE_OWNER_HELD | NOT AVAILABLE / NOT PROVIDED |
| **Extradom** | **VERIFIED** | OWNER_ATTESTATION | PRIVATE_OWNER_HELD | NOT AVAILABLE / NOT PROVIDED |
| **CennikRemontow.pl** | **VERIFIED** | OWNER_ATTESTATION | PRIVATE_OWNER_HELD | NOT AVAILABLE / NOT PROVIDED |

### Role (model biznesowy)

| Źródło | Rola | Region (fokus) |
|--------|------|----------------|
| KB.pl | PRIMARY / REGIONAL | Wrocław |
| CennikRemontow.pl | PRIMARY / REGIONAL | Wrocław |
| SCCOT | SECONDARY | — |
| Extradom | SECONDARY | — |

Nie zakładamy, że każde źródło posiada każdą robotę.

---

## API

```text
NOT AVAILABLE / NOT PROVIDED
```

Brak oficjalnego API od wskazanych źródeł (wg informacji Ownera).

---

## RESEARCH MODEL

```text
SELECTIVE ONLY
```

Human-scale · **ONE WORK** (+ unit + region) · porównanie zatwierdzonych źródeł · mediana / kwalifikacja · **OWNER ACCEPT** → OUR RATE.

## FULL CATALOGUE

```text
FORBIDDEN
```

Zakaz: full catalogue · category crawl · preload · sync całych cenników.

## CROSS-TENDER REUSE

```text
ALLOWED ACCORDING TO OWNER ATTESTATION
```

Reuse zapisanej OUR RATE w Nasz Katalog Robót między przetargami — zgodnie z Owner Attestation (bez republishing treści źródeł).

## STORAGE

```text
Nasz Katalog Robót
```

(`kw-wgdom-work-catalog` · pole OUR RATE · identity `workId + unit`)

## OWNER ACCEPT

```text
REQUIRED
```

Research (gdy zaimplementowany) **nigdy** nie zapisuje automatycznie OUR RATE.

---

## WORK_RATE_LEGAL_GATE

```text
PASS
```

Osobny gate stawek **robót**.

## MATERIAL LEGAL GATE

```text
UNCHANGED
```

`MARKET_SYNC_P3_LEGAL_GATE` — **bez zmian** (domena materiałów).

---

## Semantyka zgody (Owner — skrót, bez treści prywatnej)

Owner może korzystać z cenników wskazanych źródeł w **prywatnym** systemie wycen/kosztorysowania przetargów.  
Źródła nie udostępniają API → model = selective research, nie full catalogue.

---

## Powiązania

| Dokument | Rola |
|----------|------|
| [`WORK-RATE-LEGAL-PASS-CLOSEOUT.md`](./WORK-RATE-LEGAL-PASS-CLOSEOUT.md) | Closeout enablement |
| [`WORK-RATE-REAL-SOURCE-LEGAL.md`](./WORK-RATE-REAL-SOURCE-LEGAL.md) | Audyt historyczny → supersedowany statusem PASS |
| [`WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md`](./WORK-CATALOG-REBUILD-01-DESIGN-FREEZE.md) | Design Freeze |
| Kod | `src/lib/work-catalog/work-rate-legal.ts` |

---

## Zakaz implementacji w tym kroku

- adaptery / scrapery / live HTTP / Edge lookup  
- P2 selective research runtime  
- Bid / Offer / companyPricePln / Material Price Memory  

**NEXT:** osobny **OWNER GO** dla P2 SELECTIVE WORK RATE RESEARCH.
