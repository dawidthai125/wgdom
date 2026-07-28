# TRE-01 — RELEASE REPORT (Slice A)

> **ID:** TRE-01-SLICE-A-RELEASE  
> **EPIC:** TENDER RECOMMENDATION ENGINE (TRE-01)  
> **Slice:** A — Offer Run Spine + Outcome MVP  
> **STATUS:** **PRODUCTION VERIFIED** · **POST RELEASE PASS** · ready for CLOSE  
> **Data:** 2026-07-28  
> **UI:** **2.65.63**  
> **Feature commit:** **`74ac6a0`** (`74ac6a0f20160177dcf5b8bf5bd8f9b0445a7983`)  
> **DF:** [`TRE-01-DESIGN-FREEZE.md`](TRE-01-DESIGN-FREEZE.md)  
> **Product SSOT:** [`WGDOM-TENDER-PRODUCT-SSOT.md`](WGDOM-TENDER-PRODUCT-SSOT.md)  
> **Blueprint:** [`WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`](WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md)  
> **Closeout:** [`TRE-01-CLOSEOUT.md`](TRE-01-CLOSEOUT.md)  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)  
> **Język:** polski

---

## 1. Cel Slice A

Po otwarciu przetargu (flaga TRE-01 ON) użytkownik widzi **Outcome MVP** z **rekomendowaną ceną oferty (PLN)** ze **Silnika Bid Proposal** albo uczciwym statusem, plus CTA **„Pokaż pełny kosztorys”**. Hub V4 = **recovery**. Foundation FND-01…05 = spine niewidoczny.

**Nie:** rewrite AI-COST / Bid / parserów / sync / Edge · FND-06 · usuwanie Hub · e-składanie.

---

## 2. Werdykt release

```text
RELEASE MODE: FAST RELEASE
BUILD PASS · TEST PASS (28) · PUSH PASS · PRODUCTION VERIFIED
```

| Kryterium | Wynik |
|-----------|--------|
| Design Freeze + Owner GO | **PASS** |
| IMPLEMENT ⊆ allowlist DF | **PASS** |
| `npm run build` | **PASS** (close session) |
| `test-tre-01-offer-run.mjs` | **28 PASS / 0 FAIL** |
| Commit · push `origin/main` | **PASS** · **`74ac6a0`** |
| `version.json` live | **2.65.63** / **`74ac6a0`** · **PRODUCTION VERIFIED** |
| Prod bundle markers (`TendersModule`) | **PASS** (patrz §5) |
| Flaga R0 default OFF | **PASS** |
| Payroll / cloud-sync / Edge | **nienaruszone** |

---

## 3. Production Verify (VERIFY FAST + bundle)

### 3.1 version.json (jedno odczytanie)

```json
{
  "version": "2.65.63",
  "commit": "74ac6a0",
  "timestamp": "2026-07-28T07:54:04.818Z"
}
```

**Werdykt:** **PRODUCTION VERIFIED**.

### 3.2 Runtime markers w prod chunk `TendersModule-*.js`

| Marker | Obecność |
|--------|----------|
| `kw-tre-01-slice-a` | TAK |
| `data-tre-01-outcome` | TAK |
| `data-tre-01-cta-hub` | TAK |
| `Pokaż pełny kosztorys` | TAK |
| `Szczegóły / Hub` | TAK |
| `Rekomendowana cena oferty` | TAK |
| `TRE_OFFER_RUN*` / `TRE_OFFER_RECOMMENDATION*` | TAK |
| `FND_OFFER_INSUFFICIENT` | TAK |

### 3.3 Outcome ON / Rollback OFF

| Krok | Metoda | Wynik |
|------|--------|--------|
| Default OFF (`TRE_01_SLICE_A_DEFAULT=false`) | unit F1/F2 + kod | **PASS** — Hub-first bez LS |
| ON: `localStorage['kw-tre-01-slice-a']='1'` | kod `isTre01SliceAEnabled` + Outcome mount w `TenderDetailPage` | **PASS** (ścieżka) |
| OFF: `'0'` / `removeItem` | kod flagi | **PASS** (ścieżka) |
| Interaktywny login prod (klik w przetarg) | Playwright | **N/E** — brak `WGDOM_ADMIN_PASS` w env sesji (C3) · **Owner QA checklist** w Closeout § Owner QA |

---

## 4. REUSE Summary

| Silnik / warstwa | Użycie Slice A |
|------------------|----------------|
| `useTenderPipelineRuntime` | **Obserwacja only** — Offer Run nie zastępuje orchestratora |
| Bid Proposal `recommendedBidPln` | **Jedyna** wartość `recommendedOfferPln` |
| AI-COST S1–S7 | **REUSE pośredni** (przez Bid) — zero zmian S1–S7 |
| Trust layer | **Odczyt** → `qualityStatus` / review_required |
| Tab `kosztorys` | CTA Outcome → istniejąca nawigacja V4 |
| Hub / detal V4 | Recovery — nie usunięty |
| Discovery / dossier / parsers / Edge / cloud-sync | **Nietknięte** |

---

## 5. Foundation Summary (FND-01…05)

| Pakiet | Slice A |
|--------|---------|
| **FND-01** | `createId("start")` → `runId`; memory + LS `kw-tre-01-offer-run-id:*` |
| **FND-02** | `createDigest` na payloadzie rekomendacji (gdy cena) |
| **FND-03** | `FND_OFFER_*` → status PL w Outcome (bez dump Foundation w UI) |
| **FND-04** | Audit `TRE_OFFER_RUN_CREATED` · `TRE_OFFER_RECOMMENDATION_ISSUED` |
| **FND-05** | Eventy `TRE_OFFER_RUN_STARTED` · `TRE_OFFER_RECOMMENDED` · degraded/failed |
| **FND-06** | **ABSENT** (OUT) |

**UI Foundation:** brak (AC-P4 / O12).

---

## 6. Pliki w commicie `74ac6a0` (16)

1. `CHANGELOG.md`  
2. `CURRENT-TASK.md`  
3. `docs/AI/09_PRODUCTION_BASELINE.md`  
4. `docs/architecture/TRE-01-ARCHITECTURE-REVIEW.md`  
5. `docs/architecture/TRE-01-DESIGN-FREEZE.md`  
6. `docs/architecture/WGDOM-TENDER-ARCHITECTURE-BLUEPRINT.md`  
7. `docs/architecture/WGDOM-TENDER-PRODUCT-SSOT.md`  
8. `scripts/test-tre-01-offer-run.mjs`  
9. `src/app/TenderDetailPage.tsx`  
10. `src/app/changelog-data.ts`  
11. `src/app/hooks/useTenderOfferRun.ts`  
12. `src/app/tenders/outcome/TenderRecommendationOutcomeView.tsx`  
13. `src/lib/tender-offer-run-foundation.ts`  
14. `src/lib/tender-offer-run.ts`  
15. `src/lib/tender-recommendation-result.ts`  
16. `src/lib/tenders-v4-config.ts`  

---

## 7. Rollback (R0)

| Akcja | Skutek |
|-------|--------|
| `localStorage.setItem('kw-tre-01-slice-a','0')` lub `removeItem` | Natychmiastowy Hub-first (bez redeployu silników) |
| `TRE_01_SLICE_A_DEFAULT=false` w tipie | Prod default bezpieczny |
| Revert `74ac6a0` | R1 — tylko na polecenie Ownera |

---

## 8. HOTFIX CLASSIFICATION

```text
UX
OTHER (Foundation spine · Offer Run thin orchestrator)
```

---

## 9. Next

- Closeout: [`TRE-01-CLOSEOUT.md`](TRE-01-CLOSEOUT.md)  
- **TRE-02:** **NIE rozpoczynać** — czekać na decyzję Ownera + nowy DF  

---

**Koniec TRE-01-RELEASE-REPORT.**
