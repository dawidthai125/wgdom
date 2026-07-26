# WGDOM — AP2-S2 RELEASE REPORT

> **ID:** AP2-S2  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **IMPLEMENT COMPLETE**  
> **Data:** 2026-07-26  
> **UI:** **2.65.49**  
> **DF:** [`WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-DESIGN-FREEZE.md`](WGDOM-ANALIZA-PRZETARGOW-2.0-AP2-S2-DESIGN-FREEZE.md)  
> **Prior:** AP2-S1 `2.65.48` @ `01d8981`

---

## 1. Cel

Auto-analiza jako default UX (REUSE istniejącego bootstrap/heavy/Autonomous) + przycisk **„Uruchom ponownie analizę”** + historia/etapy na Dokumentach — bez redesignu fingerprint i bez dużego panelu.

---

## 2. Implementacja

| Obszar | Zmiana |
|--------|--------|
| Auto-run | **REUSE** `useTenderDocumentsBootstrap` + `useTenderDossierHeavyLazy` + Autonomous fingerprint — **zero nowego `useEffect` triggera** |
| CTA | `analyzeDocuments` → „Uruchom ponownie analizę” |
| Hinty | Usunięto „Otwórz Dokumenty aby rozpocząć…” |
| Historia | Blok „Ostatnia analiza” (status · liczba docs · absolute/relative) |
| Etapy | 6 stage labels zmapowane na istniejące fazy procesu |
| Live UX | Brak pełnego skeletonu gdy busy + prior data → wyniki (S1) widoczne od razu |
| Glance | Rekomendacja (fit) + ryzyko dokumentacyjne (S1 readiness) |
| Changelog | **2.65.49** |

**Nienaruszone:** Pricing Gate · Autonomous Gate · heavy/bootstrap guards · parsers · dolny panel.

---

## 3. Pliki

### src
- `src/lib/tender-analysis-auto-ux.ts` (**NOWY**)
- `src/lib/tender-documents-tab-summary.ts`
- `src/lib/tender-owner-language-pl.ts`
- `src/lib/tender-analysis-status-ux.ts`
- `src/lib/tender-owner-view-ux.ts`
- `src/lib/tender-detail-v4-display.ts`
- `src/app/TenderDocumentsSummaryHeader.tsx`
- `src/app/TenderDocumentsWorkspace.tsx`
- `src/app/GuideView.tsx`
- `src/app/changelog-data.ts`

### scripts / docs
- `scripts/test-ap2-s2-auto-analysis-ux.mjs` (**NOWY**)
- `scripts/test-p5-owner-language.mjs`
- DF + RELEASE · `09` · `CURRENT-TASK`

---

## 4. Testy / build

| | |
|--|--|
| `npx vite-node scripts/test-ap2-s2-auto-analysis-ux.mjs` | **PASS** (33) |
| `npx vite-node scripts/test-p5-owner-language.mjs` | **PASS** |
| `npx vite-node scripts/test-ap2-s1-documentation-completeness.mjs` | **PASS** |
| `npx vite-node scripts/test-ap2-s0-valuation-semantics.mjs` | **PASS** |
| `npm run build` | **PASS** |

---

## 5. AC

| AC | Status |
|----|--------|
| Auto przy otwarciu / zmianie docs / błędzie | **PASS** (REUSE pipeline + guards) |
| Brak zbędnego re-run | **PASS** (guards nienaruszone; zero nowego triggera) |
| CTA „Uruchom ponownie analizę” | **PASS** |
| Status + postęp etapów | **PASS** |
| Wyniki po zakończeniu bez extra klików | **PASS** (live header + S1) |
| Ostatnia analiza | **PASS** |
| Gate’y OUT | **PASS** |

---

## 6. Production Readiness

**READY TO PUSH** → PV: `version.json` **2.65.49**.

**Następny:** AP2-S3 tylko po Owner GO.

---

**AP2-S2 RELEASE REPORT** · 2026-07-26
