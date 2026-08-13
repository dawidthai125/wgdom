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
| **MULTI-BOQ-NORMA-KALK P0** | **CLOSED** · Norma kalk fold + DF-16 incomplete KNR · RUNTIME **09** (`dec7335` / deploy `5892250601`) · WM/TP/239 D01–D04 · F5/Bid **NOT GREEN** |
| **INGEST-01** | **CLOSED** · Owner/fixture lossless ingest · hist. **`d1b2e7ca`** · Połczyn = **fixture only** · **NOT TARGET** |
| **MULTI-BOQ-01** | **CLOSED** · Owner map → dwelling resolve → compose → OfferBoq v5 → attach → F5_D → PackageGate → SUM → Bid · hist. **`669d2872`** |
| **MULTI-DWELLING-01** | **CLOSED** · Package · N dwelling · document mapping HARD · PackageGate · hist. **`0f1a52f4`** |
| **OWNER-INPUT-BID MODEL-1B** | **CLOSED** · Transport mark → OI → F5 · hist. **`f9324eb6`** |
| **OWNER-INPUT-BID GO-1** | **CLOSED** · Equipment Owner Input E2E · hist. **`83d2ccb5`** |
| **OWNER-INPUT-01** | **CLOSED** · store foundation · hist. **`3642de23`** |
| **TRANSPORT-01 MODEL-1A** | **CLOSED** · CONTRACT ONLY · hist. **`a41854c3`** |
| **EQUIPMENT-01** | **CLOSED** · CONTRACT/GAP · GO-1 wires Owner Input resolve |
| **COST-MULTI** | **CLOSED** · branch ≠ dwelling |
| **REAL SOURCE / Cloud Sync OI** | **NOT IMPLEMENTED / UNKNOWN** |
| **F5 / costing / Final Bid** | **NOT VERIFIED GREEN** (real Wrocław) |
| **Production RUNTIME** | patrz **09** (2.66.43 / `dec7335`) · docs tip ≠ runtime |
| **Session handoff** | [`SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md`](../architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md) |
| **NEXT** | **Wrocław REAL TENDER AUDIT** · WM → ZZK → MOPS → uczelnie · REAL SOURCE **NIE** auto |

---

## Gdzie czytać (kolejność)

1. [`09_PRODUCTION_BASELINE.md`](./09_PRODUCTION_BASELINE.md) — tip live / RUNTIME
2. [`../architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md`](../architecture/SESSION-HANDOFF-2026-08-13-WROCLOW-TENDER-CONTINUITY.md) — **★★ session SSOT 2026-08-13**
3. [`../architecture/MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md`](../architecture/MULTI-BOQ-NORMA-KALK-P0-CLOSEOUT.md) · [`../architecture/MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md`](../architecture/MULTI-BOQ-NORMA-KALK-P0-PRODUCTION-VERIFY.md)
4. [`../architecture/INGEST-01-CLOSEOUT.md`](../architecture/INGEST-01-CLOSEOUT.md) · [`../architecture/INGEST-01-PRODUCTION-VERIFY.md`](../architecture/INGEST-01-PRODUCTION-VERIFY.md)
5. [`../architecture/MULTI-BOQ-01-CLOSEOUT.md`](../architecture/MULTI-BOQ-01-CLOSEOUT.md) · [`../architecture/MULTI-BOQ-01-PRODUCTION-VERIFY.md`](../architecture/MULTI-BOQ-01-PRODUCTION-VERIFY.md)
6. [`../architecture/MULTI-DWELLING-01-CLOSEOUT.md`](../architecture/MULTI-DWELLING-01-CLOSEOUT.md) · [`../architecture/MULTI-DWELLING-01-PRODUCTION-VERIFY.md`](../architecture/MULTI-DWELLING-01-PRODUCTION-VERIFY.md)
7. [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-CLOSEOUT.md) · [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-MODEL-1B-PRODUCTION-VERIFY.md)
8. [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-CLOSEOUT.md) · [`../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md`](../architecture/OWNER-INPUT-BID-EQUIPMENT-TRANSPORT-01-GO1-PRODUCTION-VERIFY.md)
9. [`../architecture/OWNER-INPUT-01-CLOSEOUT.md`](../architecture/OWNER-INPUT-01-CLOSEOUT.md) · [`../architecture/OWNER-INPUT-01-PRODUCTION-VERIFY.md`](../architecture/OWNER-INPUT-01-PRODUCTION-VERIFY.md)
10. [`../architecture/TRANSPORT-01-CLOSEOUT.md`](../architecture/TRANSPORT-01-CLOSEOUT.md) · [`../architecture/TRANSPORT-01-PRODUCTION-VERIFY.md`](../architecture/TRANSPORT-01-PRODUCTION-VERIFY.md)
11. [`../architecture/EQUIPMENT-01-CLOSEOUT.md`](../architecture/EQUIPMENT-01-CLOSEOUT.md) · [`../architecture/EQUIPMENT-01-PRODUCTION-VERIFY.md`](../architecture/EQUIPMENT-01-PRODUCTION-VERIFY.md)
12. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-AI-CONTINUITY-HANDOFF.md) — **★★ pełny handoff BOQ**
13. [`../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md`](../architecture/TENDER-BOQ-PRICING-REBUILD-01-SESSION-CLOSEOUT.md)
14. C-MODE-1a Decision + PV · DF / F0–F6 closeouty w `docs/architecture/TENDER-BOQ-PRICING-REBUILD-01-*.md`

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
Transport MODEL-1A contract = CLOSED
Transport MODEL-1B = CLOSED · explicit bid_candidate mark only · OI price only
MULTI-DWELLING-01 = CLOSED · PackageGate + Owner document mapping HARD · local LS only
MULTI-BOQ-01 = CLOSED · dwelling-scoped compose · provenance side-map · legacy_single KEEP · schema v5
MULTI-BOQ-NORMA-KALK P0 = CLOSED · kalk fold + DF-16 quantity="" · merge UNCHANGED · F5/Bid NOT GREEN
INGEST-01 = CLOSED · UPSTREAM lossless Owner/fixture pin+registry+ZIP children · artifact documentId · LS-only · NOT Bid/F5/PackageGate engine
Noise ≠ Bid Transport · orphan noiseKind=transport = AUXILIARY_GAP (nie Bid Transport)
0/85/45 / ath / catalog / companyPrice / PI31 / Expert = FORBIDDEN as Equipment/Transport fill
REAL SOURCE / LEGAL / Cloud Sync OI = tylko Owner GO → AUDIT first
Wrocław REAL TENDER AUDIT = NEXT (WM → ZZK → MOPS → uczelnie · AUDIT ONLY)
Połczyn = fixture only · NOT operational target
P7 / ATH rebuild = tylko Owner GO → AUDIT first
```

---

## Nie mylić z

| Plik | Rola |
|------|------|
| [`10_HANDOFF_TEMPLATE.md`](./10_HANDOFF_TEMPLATE.md) | szablon ogólny sesji — **nie** tip wyceny |
| [`MASTER-AI-HANDOFF.md`](./MASTER-AI-HANDOFF.md) | cold-start globalny — tip **przez 09** |
