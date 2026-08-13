# 10 — TENDER PRICING CONTINUITY (WGDOM)

> **ROLA:** thin pointer · **domena** wyceny przetargowej (TENDER-BOQ-PRICING-REBUILD-01 + C-MODE-1a).
> **Tip numeryczny:** **NIE tutaj** — wyłącznie [`09_PRODUCTION_BASELINE.md`](./09_PRODUCTION_BASELINE.md) · live `version.json`.
> **Cold-start:** [`WGDOM-COLD-START-HANDOFF.md`](./WGDOM-COLD-START-HANDOFF.md) → [`MASTER-AI-HANDOFF.md`](./MASTER-AI-HANDOFF.md) → **09** → **ten plik** (gdy praca o Bid/Position Cost/OUR RATE/PM).
> **Data:** 2026-08-13

```text
ZERO DUPLICATE SSOT tipów.
Szczegóły = architecture handoff (link poniżej).
```

---

## Checkpoint (skrót)

| | |
|--|--|
| **Epic (BOQ)** | TENDER-BOQ-PRICING-REBUILD-01 F0–F6 + C-MODE-1a |
| **F0–F6 / C-MODE-1a** | **CLOSED** · **GREEN** |
| **OWNER-INPUT-BID GO-1** | **CLOSED** · Equipment Owner Input E2E · tip **09** (`83d2ccb`) |
| **OWNER-INPUT-01** | **CLOSED** · store foundation · hist. **`3642de23`** |
| **TRANSPORT-01 MODEL-1A** | **CLOSED** · CONTRACT ONLY · hist. **`a41854c3`** |
| **EQUIPMENT-01** | **CLOSED** · CONTRACT/GAP · GO-1 wires Owner Input resolve |
| **MODEL-1B / GO-2** | **NOT STARTED / FOLLOW-UP** |
| **Production tip** | patrz **09** (2.66.43 / `83d2ccb`) |
| **NEXT** | Owner GO · **GO-2 Transport Owner Input / MODEL-1B** / REAL SOURCE · **NIE** auto |

---

## Gdzie czytać (kolejność)

1. [`09_PRODUCTION_BASELINE.md`](./09_PRODUCTION_BASELINE.md) — tip live
2. [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md) · [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md)
3. [`../architecture/OWNER-INPUT-01-CLOSEOUT.md`](../architecture/OWNER-INPUT-01-CLOSEOUT.md) · [`../architecture/OWNER-INPUT-01-PRODUCTION-VERIFY.md`](../architecture/OWNER-INPUT-01-PRODUCTION-VERIFY.md)
4. [`../architecture/TRANSPORT-01-CLOSEOUT.md`](../architecture/TRANSPORT-01-CLOSEOUT.md) · [`../architecture/TRANSPORT-01-PRODUCTION-VERIFY.md`](../architecture/TRANSPORT-01-PRODUCTION-VERIFY.md)
5. [`../architecture/EQUIPMENT-01-CLOSEOUT.md`](../architecture/EQUIPMENT-01-CLOSEOUT.md) · [`../architecture/EQUIPMENT-01-PRODUCTION-VERIFY.md`](../architecture/EQUIPMENT-01-PRODUCTION-VERIFY.md)
6. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md) — **★★ pełny handoff BOQ**
7. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md)
8. C-MODE-1a Decision + PV · DF / F0–F6 closeouty w `docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-*.md`

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
Equipment GO-1 = Owner Input E2E CLOSED · tender-scoped rate · missing = GAP
Equipment REAL SOURCE = NOT IMPLEMENTED
Transport MODEL-1A contract = CLOSED · pricing = NOT IMPLEMENTED · MODEL-1B = NOT STARTED
Noise ≠ Bid Transport · orphan noiseKind=transport = AUXILIARY_GAP (nie transport_line)
0/85/45 / ath / catalog / companyPrice / PI31 / Expert = FORBIDDEN as Equipment fill
Transport GO-2 / MODEL-1B / REAL SOURCE / LEGAL = tylko Owner GO → AUDIT first
P7 / ATH rebuild = tylko Owner GO → AUDIT first
```

---

## Nie mylić z

| Plik | Rola |
|------|------|
| [`10_HANDOFF_TEMPLATE.md`](./10_HANDOFF_TEMPLATE.md) | szablon ogólny sesji — **nie** tip wyceny |
| [`MASTER-AI-HANDOFF.md`](./MASTER-AI-HANDOFF.md) | cold-start globalny — tip **przez 09** |
