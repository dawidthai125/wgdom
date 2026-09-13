# IK Labor Rate Research — TPI/729 · 48 residual BRAK_STAWKI_ROBOT · V1

> **Baseline HEAD:** `7cb6d9fb` · **Version tip:** `2.66.198` → docs/code `2.66.199`  
> **Machine SSOT:** `src/lib/intelligent-estimator/knr-knowledge/tpi729-48-residual-labor-research-v1.ts`  
> **Owner research GO:** 2026-09-13 (ChatGPT external research — Cursor executes verify + durable persist)  
> **HARD:** Evidence ≠ OUR RATE · KNR r-g ≠ OUR RATE PLN · companyPrice ≠ OUR RATE · no semantic transfer · no unit invent

---

## 0. Hard rules (must survive cold start)

1. **KNR labor norm is not OUR RATE.**
2. **Historical cost-estimate labor price is Evidence, not automatic OUR RATE.**
3. **No companyPricePln migration without separate Owner GO.**
4. **No semantic rate transfer** across codes/families.
5. **No** `r-g × arbitrary hourly rate → OUR RATE`.
6. **No** szt/prob/pomiar conversion without a hard compatibility rule.
7. Host lock requires **exact Owner-authorized URL** — unresolved URL ⇒ **no** durable PLN Evidence ingest.
8. **CLLR does not create OUR RATE** — requires leaf `CURRENT`.

---

## 1. Residual classification (after 1118-09 + 0829-03 CURRENT)

| Bucket | Lines | Role |
|--------|------:|------|
| COMPOUND / LABOR LEAF | **27** | Parent IDs — CLLR exact-scope only · never parent OUR RATE |
| CANONICAL KNR / OUR RATE | **12** | Leaf identities needing Evidence → AUT-R1 |
| EXCLUDED / SPECIAL | **9** | Transport×3 · Unit×1 · ETICS×2 · P31×3 — **outside AUT-R1** |
| **Total BRAK_STAWKI_ROBOT** | **48** | Finance shadow @ post-`7cb6d9fb` |

Prior closed (not in the 48 as MISSING leaves, but keep immutable):

| Leaf | OUR RATE | Source |
|------|----------|--------|
| `cw.knr.knr-2-02.1118-09.m2` | **48.20 CURRENT AUTO_R1** | BIP Olecko PDF |
| `cw.knr.knr-2-02.0829-03.m2` | **61.12 CURRENT AUTO_R1** | Public estimate (fliphtml5) |
| `cw.knr.knr-2-02.0815-05.m2` | **22.88 CURRENT AUTO_R1** | prior TechnologyPack GO — **immutable** |

---

## 2. Live Catalog identity verification (Cursor)

| Code | Live `workId` | Live family | Research claim | Verdict |
|------|---------------|-------------|----------------|---------|
| 0815-04 | `cw.knr.knr-2-02.0815-04.m2` | KNR 2-02 | KNR 2-02 walls skim | **MATCH** · leaf exists · rate MISSING |
| 2006-04 | `cw.knr.knr-2-02.2006-04.m2` | KNR 2-02 | KNR 2-02 GK ceiling | **MATCH** · leaf exists · rate MISSING |
| 1205-09 | `cw.knr.knnr-2.1205-09.m2` | **KNNR 2** | KNNR 2 panels | **MATCH family** · GO proposed `cw.knr.knr-2-02.1205-09.m2` **REJECTED** (KNR≠KNNR) |
| 0135-01 | `cw.knr.knr-w-2-15.0135-01.szt` | KNR-W 2-15 zawory | KNR 4-02 demontaż wodomierza | **IDENTITY_HOLD** — do not attach |
| 1205-05 | `cw.knr.knr-4-03.1205-05-00.pomiar` | KNR 4-03 | KNR 4-03 pomiar | **MATCH family** · no PLN/pomiar |
| 0602-01 | `cw.knr.knr-k-04.0602-01.m2` | **KNR-K 04** | KNR-W 2-02 | **IDENTITY_HOLD** |
| 0216-10 | `cw.knr.knr-35.216-10.szt` | KNR 35 / 216-10 | KNR 0-35 0216-10 | **IDENTITY_HOLD** |
| 0401-11 | `cw.knr.knr-5-08.0401-11.szt` | **KNR 5-08** | KNR 4-04 | **IDENTITY_HOLD** |

---

## 3. Research rows (summary)

### 3.1 AUT_R1_CURRENT (immutable unless Owner GO)

| Leaf | OUR RATE | Evidence source |
|------|----------|-----------------|
| 1118-09 | **48.20 AUTO_R1** | BIP Olecko PDF |
| 0829-03 | **61.12 AUTO_R1** | fliphtml5 estimate |
| 0815-05 | **22.88 AUTO_R1** | prior TechnologyPack GO |
| **0815-04** | **13.15 AUTO_R1** (2.66.200) | BIP Obornicki `…/3924/kosztorys-inwestorski-branza-budowlana.pdf` · 0.5093×25.82=13.15013 Evidence |
| **2006-04** | **9.62 AUTO_R1** (2.66.200) | `https://www.winbud.pl/images/Szczegolowy.pdf` · 0.7039×13.67=9.62 Evidence |

**Rule:** Historical cost-estimate labor price is valid Evidence only; it becomes OUR RATE only through existing AUT-R1 contract.

### 3.2 EVIDENCE_ONLY_HOLD (norm / no AUT-R1 PLN yet)

| Leaf | Norm | Claimed PLN | Why HOLD |
|------|------|-------------|----------|
| 1205-09 | 0.96 r-g/m² | — | No labor-only PLN/m² · **no** 0.96×hourly · keep `knnr-2` ID |
| 1205-05 | identity OK | — | No trusted PLN/pomiar · no unit convert |

### 3.3 IDENTITY_HOLD

- **0135-01** — live zawory KNR-W 2-15 ≠ research demontaż KNR 4-02
- **0602-01** — live KNR-K 04 ≠ research KNR-W 2-02
- **0216-10** — live `216-10` / knr-35 ≠ assumed `0216-10` / 0-35 without Owner confirm
- **0401-11** — live KNR 5-08 ≠ research KNR 4-04

### 3.4 COMPOUND_CLLR_DEPENDENT (27)

Parents: `legacy-gladzie_tynki-m2` · `cc-w2-scianki-dzialowe-gr-pakiet-m2` · `legacy-podlogi-m2` · `legacy-glazura-m2` · `legacy-stolarka-szt`  
Rules: exact scope · leaf CURRENT · relevant TechnologyPack/ALLB when required · **never force-bind**.

### 3.5 EXCLUDED (9)

| Item | Count | Plane |
|------|------:|-------|
| TRANSPORT | 3 | bid/transport — not AUT-R1 |
| UNIT mismatch | 1 | UNIT_HOLD |
| ETICS substrate | 2 | MATERIAL / AUT-MAT |
| P31 provisional | 3 | identity plane — no invent |

---

## 4. AUT-R1 execution result

| Candidate | Durable PLN Evidence | AUT-R1 | Final OUR RATE |
|-----------|----------------------|--------|----------------|
| 0815-04 | YES · Obornicki BIP exact URL | **ACCEPT** (2.66.200) | **13.15 CURRENT AUTO_R1** |
| 2006-04 | YES · winbud Szczegolowy.pdf | **ACCEPT** (2.66.200) | **9.62 CURRENT AUTO_R1** |
| 1205-09 | NO (no PLN) | HOLD | — |
| identity conflicts | NO | IDENTITY_HOLD | — |

Finance after 0815-04+2006-04 ACCEPT (ops IdentityPhase): `BRAK_STAWKI_ROBOT` **48→35** · complete often still 22 (BOM next) · see tip ops report.

---

## 5. Next Owner actions (not this GO)

1. Find **labor-only PLN/m²** for KNNR 2 1205-09 (or Owner Accept GO).
2. Resolve identity for 0135-01 / 0602-01 / 0216-10 / 0401-11 with live Catalog truth.
3. Transport / ETICS / P31 / UNIT — separate plane GOs.
4. BOM / TechnologyPack for compounds now unblocked on labor (0815-04 / 2006-04 leaves CURRENT).

---

## 6. Finance / CLLR impact expectation

- Closing leaf rates alone does **not** guarantee Finance COMPLETE (BOM/TechnologyPack often next).
- CLLR ACCEPT only after leaf `CURRENT` + exact scope + gated identity persist.
- False closure forbidden: prefer durable HOLD with reason over invented CURRENT.

---

## 7. Related docs

- [`COMPOUND-PARENT-LABOR-LEAF-RESOLUTION-V1.md`](./COMPOUND-PARENT-LABOR-LEAF-RESOLUTION-V1.md)
- Master SSOT §34 / compound policy block
- Prior ops: `scripts/catalog-aut-r1-durable-pln-evidence-tpi729-ops.mjs`
