# CENY-MATERIAŁÓW-04 P2-B — OPS COMPLETE

> **ID:** CENY-MATERIAŁÓW-04-P2-B-OPS-COMPLETE  
> **Data:** 2026-07-30  
> **MODE:** OPS · Owner GO  
> **Evidence:** `.tmp/ceny-materialow-04-p2b-*.json`

```text
CENY-MATERIAŁÓW-04 P2-B OPS COMPLETE → READY FOR OV → PASS
```

## EXTEND E4–E8

| ID | Status |
|----|--------|
| `legacy-elektryka-szt` / `mb` | **OK** (A3: bez punkt oświetleniowy*) |
| `legacy-gk-m2` | **OK** (A2: bez na stelażu) |
| `legacy-hydraulika-szt` / `mb` | **OK** (A4: E8 zatrzymuje podejście wodociągowe wewnętrzne) |

## NEW `p2b-*` + Quotes

| ID | Unit | PLN | Quotes |
|----|------|-----|--------|
| `p2b-scianka-gk-na-stelazu-m2` | m2 | 118 | 100% |
| `p2b-sufit-podwieszany-gk-m2` | m2 | 95 | 100% |
| `p2b-punkt-elektryczny-oswietleniowy-szt` | szt | 85 | 100% |
| `p2b-tablica-rozdzielcza-mieszkaniowa-szt` | szt | 420 | 100% |
| `p2b-podejscie-wod-kan-mb` | mb | 78 | 100% |

**OPC skip:** `p2b-grzejnik-plytowy-szt` — residual CO bez klarownych linii grzejnik płytowy.

**namePl F2:** oprawa oświetleniowa / podejście … łączone — izolacja nameTok (`instalacji`, `wewnętrzne`).

## KPI / re-probe

| | Przed | Po |
|--|-------|-----|
| GK unmatched linie | 21 | **9** |
| INSTALACJE unmatched | 10 | **8** |
| ELEKTRYKA unmatched | 15 | 15 (głównie kable/teletech — poza depth P2-B) |
| C1 → p2b | 0 | **16** |
| CM/HE | 73.2/26.8 | **73.4/26.6** |
| False | — | **0** |
| P1+P2-A intact | — | **PASS** |

## Następne

P2 CLOSEOUT docs · commit docs · (cloud WC już zsynchronizowany).
