# CATALOG-COVERAGE-01 — PLAN

> **ID:** CATALOG-COVERAGE-01-PLAN  
> **EPIC:** CATALOG-COVERAGE-01 — coverage mapowania → Biblioteka → Quotes  
> **Etap:** **PLAN ONLY** · **DOCS ONLY**  
> **STATUS:** **PLAN COMPLETE · zaakceptowany** · DF **FROZEN** · **READY FOR ARCHITECTURE REVIEW** → [`CATALOG-COVERAGE-01-DESIGN-FREEZE.md`](CATALOG-COVERAGE-01-DESIGN-FREEZE.md)  
> **Data:** 2026-07-30  
> **AUDIT:** [`CATALOG-COVERAGE-01-AUDIT.md`](CATALOG-COVERAGE-01-AUDIT.md) · **RCA:** [`CATALOG-COVERAGE-01-RCA.md`](CATALOG-COVERAGE-01-RCA.md)  
> **Klasa docelowa:** FEATURE-DATA · Gate ALL-NIE (oczekiwane)  
> **Zakaz:** IMPLEMENT · commit · push · SMART P1 FULL · MS P2 · Cloud CORE · Payroll

```text
════════════════════════════════════════════════════════
One Bundle = One Goal:
  Podnieść Quotes coverage z 76.4% → cel DF ~88–92%
  przez filtr ATH + normalizację + aliasy + seed WC
  BEZ nowych torów SMART/MS Publish.
  DF FROZEN → docs/architecture/CATALOG-COVERAGE-01-DESIGN-FREEZE.md
════════════════════════════════════════════════════════
```

---

## 0. Cel biznesowy

| | |
|--|--|
| **IN** | Więcej pozycji z `catalogWorkId` trafiających w useful Product Quotes |
| **OUT** | SMART Evidence/One-shot/Save · MS Accept/Publish rewrite · drugi matcher |
| **KPI** | Quotes coverage na stałej próbie TV-01 (18 przetargów / 2228 linii) |
| **Baseline** | **76.4%** |
| **Target (rekomendowany DF)** | **88–92%** |

---

## 1. Architektura (PLAN binding)

```text
ATH line
  → [0] Noise filter (kalkulacja / transport / LP śmieci)     ★ NEW thin
  → [1] Description normalize (strip KNR/jm/ø blocks)       ★ NEW thin REUSE fold
  → [2] mapOfferBoqLine AS-IS (+ alias pack extend)        ★ REUSE
  → [3] Work Catalog works/keywords/Quotes                 ★ FEATURE-DATA seed
  → controlled_market / SMART Detect
```

**Zakaz:** nowy silnik match · fuzzy ON · auto-accept · commit Quotes z coverage EPIC.

---

## 2. Ranking działań wg ROI

| Rank | Działanie | Wpływ (est. pp Quotes) | Koszt | Ryzyko | Priorytet | Quick Win |
|------|-----------|----------------------:|------|--------|-----------|-----------|
| **1** | **Filtr ATH noise** (kalkulacja własna · transport · LP/śmieci) | +1–2 pp *eligible* · duży UX Detect | **Niski** | Niskie (false drop realnej roboty — mitygacja whitelist) | **P0** | **TAK** |
| **2** | **Normalizacja opisu** przed score (strip KNR / krotność / jm / ø) | **+4–6 pp** | Średni | Średnie (nadmierny strip) | **P0** | **TAK** |
| **3** | **Alias pack** (hydraulika/elewacja/teletech detale) REUSE CM-01 | **+1–3 pp** | Niski–średni | Średnie (false map) | **P0** | **TAK** |
| **4** | **Seed WC** priorytet: HYDRAULIKA · ELEKTRYKA · PRZYGOTOWANIE · ROZBIORKI · ELEWACJA detale + Quotes | **+5–8 pp** | Średni–wysoki | Średnie (jakość nazw) | **P0** | Częściowo (top-N) |
| **5** | **INNE / renowacja** (Helifix, detale zabytkowe, izolacje specjalne) | **+3–6 pp** (do ~92–95%) | Wysoki | Wyższe (nisza) | **P1** | NIE |
| **6** | UX SMART: „brak mapowania” vs „brak Quotes” | 0 pp Quotes · wysoki UX | Niski | Niskie | **P1** | **TAK** |
| **7** | Obniżenie progu score mapowania | +? | Niski | **Wysokie** false map | **BACKLOG** | NIE |
| **8** | SMART P1 / MS P2 | ~0 pp na TV-01 | Wysoki | Scope creep | **ODROCZ** | NIE |

---

## 3. Estymata coverage (skumulowana, konserwatywna)

| Etap | Coverage | Komentarz |
|------|----------|-----------|
| Baseline | **76.4%** | TV-01 |
| Po filtrze + normalizacji + aliasach (Quick Wins) | **~84–88%** | bez dużego seed |
| Po seed WC priorytetowych grup | **~88–92%** | **cel EPIC** |
| Po INNE głębokie | **~93–95%** | osobny slice / Owner GO |

---

## 4. Proponowane slice'y (po DF — nie IMPLEMENT teraz)

| Slice | IN | OUT |
|-------|----|-----|
| **P0a — Noise filter** | Drop/skip mapowania dla kalkulacja/transport/LP | Zmiana Quotes |
| **P0b — Normalize** | Pure normalize description → mapper | Nowy matcher |
| **P0c — Alias pack** | Rozszerzenie CM-01 / specialty aliases | Fuzzy |
| **P0d — WC seed top groups** | FEATURE-DATA works + keywords + Quotes (P3.3 path) | Cloud CORE |
| **P1 — INNE / renowacja** | Po metrykach P0 | — |
| **P1ux — SMART copy** | Thin banner reason | P1 Evidence |

---

## 5. Acceptance Criteria (szkic pod DF)

| ID | Kryterium |
|----|-----------|
| **AC-CC-1** | Stała próba TV-01: Quotes coverage ≥ **88%** (stretch 92%) |
| **AC-CC-2** | Unmapped reason≠noise spadają; noise oznaczony / wyłączony z Detect „brak Quotes” |
| **AC-CC-3** | mapped + missing Quotes pozostaje **~0** (regresja Quotes zabroniona) |
| **AC-CC-4** | False map rate monitorowany (OV na sample) — bez masowego obniżania progu |
| **AC-CC-5** | Zero SMART P1 / MS P2 / cloud-sync w scope |
| **AC-CC-6** | REUSE `mapOfferBoqLine` · ZERO DUPLICATE matcher |

---

## 6. Gate (oczekiwany przy IMPLEMENT)

```text
G1–G9: ALL-NIE · FEATURE-DATA
(G2: opc. FEATURE LS flag — bez migracji LP)
Owner GO CORE: NIE
```

---

## 7. Ryzyka PLAN

| Ryzyko | Mitygacja |
|--------|-----------|
| False map po alias/normalize | OV sample · nie ruszać global threshold bez DF |
| Seed WC bez Quotes | Quotes w tym samym slice (REUSE commit path tylko na Owner GO seed) |
| Scope creep SMART/MS | Denylist PLAN |
| INNE ∞ | Cap P0d na top grupy; INNE = P1 |

---

## 8. WERDYKT

```text
════════════════════════════════════════════════════════
CATALOG-COVERAGE-01
AUDIT + RCA + PLAN: COMPLETE

WERDYKT: READY FOR DESIGN FREEZE

CHANGES REQUIRED: NIE

Uzasadnienie:
  · Root cause jednoznaczny (mapping/WC, nie Quotes/SMART/MS)
  · Metryki i estymaty coverage policzone na TV-01
  · ROI ranking + slice'y IN/OUT gotowe pod DF
  · Zasady SSOT/REUSE/ZERO DUP/FEATURE-DATA/DATA FIRST: PASS

IMPLEMENT: ZABLOKOWANY do DF + AR + Owner GO
SMART P1 / MS P2: ODROCZONE (zgodne z TV-01)
════════════════════════════════════════════════════════
```

**NEXT:** Owner GO **DESIGN FREEZE** · **nie** auto-start IMPLEMENT.
