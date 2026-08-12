# 10 — TENDER PRICING CONTINUITY (WGDOM)

> **ROLA:** thin pointer · **domena** wyceny przetargowej (TENDER-BOQ-PRICING-REBUILD-01 + C-MODE-1a).  
> **Tip numeryczny:** **NIE tutaj** — wyłącznie [`09_PRODUCTION_BASELINE.md`](./09_PRODUCTION_BASELINE.md) · live `version.json`.  
> **Cold-start:** [`WGDOM-COLD-START-HANDOFF.md`](./WGDOM-COLD-START-HANDOFF.md) → [`MASTER-AI-HANDOFF.md`](./MASTER-AI-HANDOFF.md) → **09** → **ten plik** (gdy praca o Bid/Position Cost/OUR RATE/PM).  
> **Data:** 2026-08-12

```text
ZERO DUPLICATE SSOT tipów.
Szczegóły = architecture handoff (link poniżej).
```

---

## Checkpoint (skrót)

| | |
|--|--|
| **Epic** | TENDER-BOQ-PRICING-REBUILD-01 |
| **F0–F6** | **CLOSED** |
| **C-MODE-1a** | **PRODUCTION VERIFIED · GREEN** |
| **Production tip** | patrz **09** (2.66.43 / `d92aef0`) |
| **NEXT** | OWNER REVIEW · **GAP:** EQUIPMENT / TRANSPORT / AUXILIARY · **NIE** P7 auto |

---

## Gdzie czytać (kolejność)

1. [`09_PRODUCTION_BASELINE.md`](./09_PRODUCTION_BASELINE.md) — tip live  
2. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md) — **★★ pełny handoff**  
3. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md) — zamknięcie sesji  
4. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-OWNER-DECISION-C-MODE-1A.md)  
5. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-C-MODE-1A-FALLBACK-REMOVAL-PRODUCTION-VERIFY.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-C-MODE-1A-FALLBACK-REMOVAL-PRODUCTION-VERIFY.md)  
6. DF / ARCH / F0–F6 closeouty w `docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-*.md`

---

## Twardy kontrakt (1 ekran)

```text
NEW BID = F5 Position Cost pipeline
OfferBoq null → GAP (C-MODE-1a)
ath_priced / catalog / companyPricePln = NO auto Bid fallback
OUR RATE = SSOT robocizny
Price Memory + sell = SSOT materiału
BOM = SSOT składu
ATH = SEPARATE INPUT (struktura)
HTTP / research w Bid = 0
P7 / Equipment / ATH rebuild = tylko Owner GO → AUDIT first
```

---

## Nie mylić z

| Plik | Rola |
|------|------|
| [`10_HANDOFF_TEMPLATE.md`](./10_HANDOFF_TEMPLATE.md) | szablon ogólny sesji — **nie** tip wyceny |
| [`MASTER-AI-HANDOFF.md`](./MASTER-AI-HANDOFF.md) | cold-start globalny — tip **przez 09** |
