# WGDOM — AP2-S3 DESIGN FREEZE (Deep Tender Intelligence)

> **ID:** AP2-S3  
> **Parent:** WGDOM-ANALIZA-PRZETARGOW-2.0  
> **STATUS:** **FROZEN** · **Owner GO YES** (2026-07-26)  
> **Klasa:** FEATURE / TEUX · Gate G1–G9 **ALL-NIE**  
> **Prior:** AP2-S2 **LIVE** `2.65.49` @ `7c04203`

```text
One Bundle = One Goal: kluczowe fakty z SWZ/przedmiaru/umowy + panel „Najważniejsze informacje”
```

---

## PAYROLL SAFETY GATE

```text
G1–G9: ALL-NIE
Owner GO: YES (prompt AP2-S3)
```

---

## 1. IN (allowlist)

| Plik | Zmiana |
|------|--------|
| `src/lib/tender-deep-intelligence.ts` | **NOWY** — SSOT faktów (value · source · confidence) |
| `src/lib/tender-documents-tab-summary.ts` | pole `deepIntelligence` |
| `src/app/TenderDocumentsSummaryHeader.tsx` | panel „Najważniejsze informacje” |
| `src/app/changelog-data.ts` | **2.65.50** |
| `scripts/test-ap2-s3-deep-intelligence.mjs` | **NOWY** |
| docs DF/RELEASE · `09` · `CURRENT-TASK` | tip + status |

**REUSE (read-only):** SWZ fields · brief · formal/participation/experience · kosztorys rows/categories/catalog · `buildConstructionScopeFromTenderDossier` · `extractKnrCodeSpan` / katalog hints · `canPrepareValuation` · document roles (umowa presence).

**Lekkie heurystyki tekstu (nie PDF parser):** klauzule umowy/gwarancji z już dostępnego tekstu brief/SWZ (`technicalRequirements`, `tableExtracts`, `paymentTerms`, …).

---

## 2. OUT

- Pricing Gate · Autonomous Gate · fingerprint  
- Rewrite ATH / `pdf-przedmiar-heuristic` / Edge  
- Pełna ocena ryzyk (S4+) · BundleV2 · duży panel (S7)  
- Nowe modele AI / OCR  

---

## 3. Kontrakt faktu

```ts
{
  id, label, value,
  sourceDoc,      // np. „SWZ.pdf” | „Ogłoszenie BZP” | „Przedmiar”
  sourceSection,  // np. „Termin realizacji” | „Kosztorys · kategorie”
  confidence: "high" | "medium" | "low",
  group: "swz" | "przedmiar" | "umowa" | "aggregate"
}
```

### Panel kluczowy

Max **15** faktów, priorytet: termin ofert · realizacja · wadium · gwarancja · branża · pozycje · formalne · kryteria · gotowość oferty · ZNW/ubezpieczenie/personel (gdy dostępne).

---

## 4. AC

1. Fakty SWZ / przedmiaru / umowy (gdy sygnały w danych).  
2. Każdy fakt: value + source + confidence.  
3. Panel „Najważniejsze informacje” na Dokumentach bez extra klików.  
4. Zero nowych parserów PDF.  
5. Gate’y OUT.  
6. build + testy PASS · RR · commit · push · PV.

---

**FROZEN** · IMPLEMENT dozwolony
