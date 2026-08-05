# WM-DRUK-OST-AUTO-GENERATE-01 — DESIGN FREEZE

> **STATUS:** **DESIGN FREEZE · FROZEN = S2** (Owner GO 2026-08-05)  
> **ID:** WM-DRUK-OST-AUTO-GENERATE-01-DESIGN-FREEZE  
> **EPIC:** WM-DRUK-OST-AUTO-GENERATE-01  
> **FAZA:** **DESIGN FREEZE FROZEN** · IMPLEMENT **ALLOWED** (Owner GO)  
> **Data:** 2026-08-05  
> **AUDIT:** **COMPLETE** · [`WM-DRUK-OST-AUTO-GENERATE-01-AUDIT.md`](./WM-DRUK-OST-AUTO-GENERATE-01-AUDIT.md)  
> **AcroForm:** **PASS** (pdf-lib · getForm · setText · save · round-trip)  
> **Wariant FROZEN:** **S2 Hard Ensure**  
> **Następne:** IMPLEMENT → BUILD → TEST → OWNER VERIFY → COMMIT → PUSH → PV → CLOSE  
> **Tip:** [`../AI/09_PRODUCTION_BASELINE.md`](../AI/09_PRODUCTION_BASELINE.md)

```text
════════════════════════════════════════════════════════
WM-DRUK-OST-AUTO-GENERATE-01 — DESIGN FREEZE · FROZEN S2

OWNER GO: S2 Hard Ensure

PIPELINE (FROZEN — bez debaty):
  buildWmPrintDeliveryZipBytes
    → buildWmPrintFilesForJob
      → mergeActiveOstIntoWmPrintTemplatePool  ★ S2
      → generateFromTemplateBytes
        → generatePdfFormFromTemplate
          → AcroForm fill → PDF w RAM → ZIP Odbiory/

ZAKAZ (FROZEN):
  · nowy generator
  · zmiana pdf-lib / generatePdfFormFromTemplate (silnik)
  · cache filled PDF
  · Storage filled PDF
  · zapis do KV / jobDocs filled OST
  · drugi pipeline OST
════════════════════════════════════════════════════════
```

---

## 0. Relacja dokumentów

| Dokument | Rola |
|----------|------|
| [`WM-DRUK-OST-AUTO-GENERATE-01-AUDIT.md`](./WM-DRUK-OST-AUTO-GENERATE-01-AUDIT.md) | Pipeline map · A vs B · REUSE · **ACCEPTED** |
| **Ten plik** | **SSOT decyzji biznesowej** S0/S1/S2 |
| [`WM-DRUK-OST-01-*`](./WM-DRUK-OST-01-CLOSEOUT.md) · mapping · AcroForm | Slot + silnik — **NO TOUCH** |

**Konflikt zakresu:** ten Design Freeze wygrywa dla AUTO-GENERATE-01. Silnik OST-01 / mapping / AcroForm PDF — poza zmianami.

### Zasady FROZEN (wszystkie warianty)

| Zasada | Wiązanie |
|--------|----------|
| **PIPELINE FIRST** | Tylko istniejący ZIP orchestrator |
| **REUSE FIRST** | `generateFromTemplateBytes` L114 · `buildWmPrintVariableMap` |
| **ON-THE-FLY** | Fill wyłącznie przy budowie listy plików ZIP |
| **NO PERSIST FILL** | Zakaz Storage / KV / cache filled PDF |
| **NO NEW ENGINE** | Zakaz nowego generatora / XFA / obejść pdf-lib |
| **SSOT SELECTION** | `selectedTemplateIds` + `enabled` — jak dziś (zmiana tylko w S1/S2) |

### Definicja ACTIVE OST (wspólna)

```text
ACTIVE OST  ⇔
  name.trim() === "OST"
  ∧ type === "pdf_form"
  ∧ enabled === true
  ∧ getWmPrintTemplateFiles(t).length > 0
```

(Mapping `pdfFieldMapping` non-empty — oczekiwane po MAPPING-MIGRATION-01; brak mappingu = setText×0, poza DF UX.)

---

## 1. Contract wspólny (wszystkie S*)

| Element | Wartość FROZEN |
|---------|----------------|
| Fill | `generatePdfFormFromTemplate(bytes, vars, t.pdfFieldMapping)` |
| Vars | `buildWmPrintVariableMap(job, settings, opts)` |
| Output | `WmPrintGeneratedFile` w RAM → `Odbiory/{fileName}` |
| Persist filled | **NIE** |
| Cache | **NIE** |
| Nowy generator | **NIE** |
| Zmiana pdf-lib | **NIE** |
| ZI / DOCX / static PDF / Pomiary / Rysunki | **NO TOUCH** (poza ewentualnym fingerprint przy S2) |

---

## 2. Wariant S0 — Status quo (checkbox)

### 2.1 Zachowanie

OST trafia do ZIP **tylko gdy** jest w `selectedTemplateIds` (oraz ACTIVE).  
Domyślna selekcja UI = wszystkie **enabled** → przy starcie OST jest zaznaczony, jeśli ACTIVE.

### 2.2 UX

| | |
|--|--|
| Lista szablonów | Checkbox OST jak ZI / inne |
| Generuj ZIP | Tylko zaznaczone |
| Odznaczenie OST | OST **nie** w paczce |
| Extra copy / toast | Brak |
| Publish dla inspektora | Ta sama selekcja |

### 2.3 Zgodność z architekturą

| | |
|--|--|
| Pipeline | **100%** — zero zmian orchestratora |
| REUSE | Pełne |
| Thin slice | **0 LOC** (ew. tylko docs / smoke VERIFY) |

### 2.4 Wpływ na pipeline

| Warstwa | Zmiana |
|---------|--------|
| `buildWmPrintFilesForJob` | **brak** |
| UI `WmPrintView` | **brak** |
| Fingerprint publish | **brak** |
| Generator | **brak** |

### 2.5 Ryzyko regresji

| Ryzyko | Poziom |
|--------|--------|
| Regresja ZI/DOCX/Pomiary/Rysunki | **NONE** |
| Użytkownik odznaczy OST → brak w ZIP | **NISKI** (świadomy wybór) |
| Nowy admin nie wie o OST | **NISKI** (default ON) |

### 2.6 Zgodność z SSOT

| SSOT | |
|------|--|
| Selection SSOT (`template-selection.ts`) | **Zachowany** |
| Completeness (job_upload only) | **Bez zmian** |
| Historia / publish | **Bez zmian** |

### 2.7 Rekomendacja S0

**RECOMMENDED (domyślna rekomendacja DF).**  
AcroForm PASS + istniejący dispatch = wymóg „generuj on-the-fly do ZIP” **już spełniony** przy zaznaczonym ACTIVE OST. Epic może domknąć się jako **VERIFY / CLOSE** bez IMPLEMENT, albo thin smoke docs-only.

---

## 3. Wariant S1 — Soft Ensure (informacja)

### 3.1 Zachowanie

Gdy ACTIVE OST i użytkownik startuje Generuj ZIP / Publish:  
pokaż informację *"Do paczki zostanie automatycznie dołączony formularz OST."*  
**Bez** wymuszenia dołączenia — faktyczna zawartość ZIP nadal = selekcja.

### 3.2 UX

| | |
|--|--|
| Moment | Przed / przy kliknięciu Generuj / Publish (toast lub stały hint) |
| Treść | Stały copy PL (powyżej) |
| Gdy OST odznaczony | Toast może **kłamać** („dołączony”) vs rzeczywistość — **konflikt UX** |
| Gdy OST zaznaczony | Toast redundantny względem checkboxa |

### 3.3 Zgodność z architekturą

| | |
|--|--|
| Pipeline generate | **Bez zmian** |
| Warstwa | Tylko prezentacja (`WmPrintView` / hint) |
| REUSE | Tak (brak logiki ZIP) |

### 3.4 Wpływ na pipeline

| Warstwa | Zmiana |
|---------|--------|
| `generate-zip.ts` | **brak** |
| `WmPrintView.tsx` | thin: toast/hint gdy ACTIVE OST |
| GuideView / changelog | copy |

### 3.5 Ryzyko regresji

| Ryzyko | Poziom |
|--------|--------|
| Mismatch copy vs ZIP (OST odznaczony) | **WYSOKI** — zaufanie UI |
| Hałas toast przy każdym ZIP | **ŚREDNI** |
| Regresja generatorów | **NONE** |

### 3.6 Zgodność z SSOT

| | |
|--|--|
| Selection SSOT | Zachowany, ale copy sugeruje „auto” ≠ selection |
| Semantyka „automatycznie” | **Niespójna** z S1 (brak enforce) |

### 3.7 Rekomendacja S1

**NIE REKOMENDOWANY.**  
Soft ensure bez enforce = połowiczność: albo S0 (checkbox = prawda), albo S2 (auto = prawda). S1 wprowadza ryzyko fałszywego komunikatu.

---

## 4. Wariant S2 — Hard Ensure (zawsze ACTIVE → ZIP)

### 4.1 Zachowanie

Jeżeli ACTIVE OST istnieje, generator **zawsze** dołącza wypełniony OST do `Odbiory/`, **niezależnie** od `selectedTemplateIds`.

### 4.2 UX

| | |
|--|--|
| Checkbox OST | Opcje DF: (a) ukryty/disabled „wymagany”, (b) widoczny ale ignorowany przy odznaczeniu, (c) zawsze checked + locked |
| Generuj ZIP | OST zawsze w paczce gdy ACTIVE |
| Odznaczenie | Brak efektu na OST (lub zablokowane) |
| Brak pliku w slocie | Fail-loud zalecane: toast/throw „Wgraj szablon OST” |

### 4.3 Zgodność z architekturą

| | |
|--|--|
| Fill path | **REUSE** (bez nowego generatora) |
| Orchestrator | Thin: union `pool ∪ {OST}` gdy ACTIVE |
| On-the-fly / no Storage | **Zachowane** |
| Selection SSOT | **Częściowo naruszony** — wyjątek „forced template” |

### 4.4 Wpływ na pipeline

| Warstwa | Zmiana |
|---------|--------|
| `buildWmPrintFilesForJob` | thin: force-include ACTIVE OST |
| `WmPrintView` | UX checkbox lock / hint |
| `buildDeliveryPackageGenerationFingerprint` | **musi** uwzględniać forced OST (parity publish) |
| GuideView / changelog | copy „OST zawsze w paczce” |
| Smoke | assert OST w ZIP mimo deselect |

### 4.5 Ryzyko regresji

| Ryzyko | Poziom |
|--------|--------|
| Fingerprint publish ≠ faktyczny ZIP | **ŚREDNI** — wymaga sync w tym samym slice |
| Użytkownik chce ZIP **bez** OST | **ŚREDNI** — utrata kontroli (świadoma decyzja produktowa) |
| ZI/DOCX inne szablony | **NISKI** przy allowlist tylko `name==="OST"` |
| Empty files ciche pominięcie | **ŚREDNI** — zalecany fail-loud |

### 4.6 Zgodność z SSOT

| | |
|--|--|
| „Automatycznie” z briefu AUTO-GENERATE | **Najbliższe** |
| Template selection SSOT | Wymaga jawnego wyjątku w DF |
| Completeness job_upload | Bez zmian |

### 4.7 Rekomendacja S2

**ALTERNATE — tylko gdy Owner wymaga twardej gwarancji biznesowej** („paczka odbiorowa bez OST = niedopuszczalna”).  
Thin IMPLEMENT, ale **nie** zero-cost.

---

## 5. Macierz porównawcza

| Kryterium | S0 | S1 | S2 |
|-----------|----|----|-----|
| UX jasność | Wysoka (checkbox = prawda) | Niska (copy vs reality) | Wysoka jeśli lock |
| Architektura / REUSE | Idealna | Idealna (UI only) | Dobra (thin force) |
| Wpływ pipeline | 0 | ~0 | Thin |
| Regresja | Minimalna | Copy mismatch | Fingerprint / deselect |
| SSOT selection | Pełna | Napięta | Wyjątek |
| Spełnia „auto” brief | Częściowo (default ON) | Słabo | Pełnie |
| LOC / ryzyko | Najniższe | Niskie + UX debt | Średnie |
| **Werdykt DF** | **RECOMMENDED** | **REJECT** | **OPTIONAL UPGRADE** |

---

## 6. Rekomendacja Design Freeze (dla Ownera)

### 6.1 Wybór rekomendowany: **S0**

**Uzasadnienie:**

1. Pipeline już wypełnia AcroForm OST on-the-fly do ZIP — cel techniczny epicu **osiągnięty**.  
2. Default selection = wszystkie enabled → ACTIVE OST jest w paczce bez dodatkowej logiki.  
3. Zero ryzyka regresji fingerprint / ZI / Pomiary.  
4. Zgodność z zakazami: no cache, no Storage, no new generator.  
5. Checkbox pozostaje SSOT kontroli użytkownika (świadome wyłączenie OST możliwe).

### 6.2 Kiedy Owner wybiera S2 zamiast S0

Wybierz **S2**, jeśli reguła biznesowa brzmi:

> „Paczka odbiorowa WM **musi** zawierać OST, gdy szablon jest aktywny — użytkownik nie może tego wyłączyć.”

Wtedy DF FROZEN = S2 + fail-loud empty files + fingerprint parity.

### 6.3 S1

**REJECT** — nie zamrażać jako target.

---

## 7. AC per wariant (do OV / PV)

### S0

1. ACTIVE OST + zaznaczony → ZIP zawiera wypełniony OST (JOB_STREET / BUILDING / APARTMENT).  
2. ACTIVE OST + odznaczony → ZIP **bez** OST.  
3. Brak nowego obiektu Storage filled.  
4. (Opcjonalnie) smoke VERIFY lokalny / prod — bez zmiany kodu.

### S1 *(jeśli mimo REJECT Owner wymusi)*

1. Toast/hint przy ACTIVE OST.  
2. Treść copy zgodna z **rzeczywistą** selekcją (nie wolno mówić „dołączony”, gdy odznaczony).  
→ praktycznie degeneruje do S0+hint lub S2.

### S2

1. ACTIVE OST → OST **zawsze** w `Odbiory/` po Generuj i Publish.  
2. Deselect nie usuwa OST z ZIP.  
3. Fingerprint publikacji uwzględnia forced OST.  
4. ACTIVE bez pliku → fail-loud.  
5. ZI / inne szablony bez zmian semantyki selekcji.

---

## 8. Allowlist IMPLEMENT (tylko po GO + FROZEN ≠ S0-verify-only)

### S0 VERIFY-ONLY

| | |
|--|--|
| Kod | **brak** |
| Docs | closeout / Guide opcjonalnie na polecenie |
| Test | istniejący / lokalny smoke ZIP (nie blokuje CLOSE) |

### S2 (gdy Owner GO)

| Plik | Rola |
|------|------|
| `src/lib/wm-print/generate-zip.ts` | force-include ACTIVE OST |
| `src/app/WmPrintView.tsx` | UX lock / hint |
| `src/lib/delivery-package-publications/publication.ts` | fingerprint parity |
| `src/app/GuideView.tsx` + changelog | copy |
| `scripts/test-…ost…mjs` | smoke deselect→still in ZIP |

### Poza allowlistą (S*)

`generate-pdf.ts` silnik · pdf-lib · Storage upload filled · cloud-sync merge · ZI Tauron · EM · Rysunki engines · Payroll.

---

## 9. OUT (FROZEN)

- Nowy generator OST  
- Cache / Storage / KV filled PDF  
- Zmiana `generatePdfFormFromTemplate` (poza ewentualnym przyszłym briefem)  
- Parser XFA / LiveCycle workarounds  
- S1 jako target  
- Implementacja przed Owner GO na wariant

---

## 10. NEXT STATE

```text
DESIGN FREEZE DRAFT
    ↓
OWNER GO: FROZEN = S0 | S2   (S1 nie)
    ↓
jeśli S0 VERIFY → CLOSE / docs (bez IMPLEMENT)  ALBO  smoke only
jeśli S2 → ARCHITECTURE REVIEW → OWNER GO IMPLEMENT → …
```

**IMPLEMENT: ZABRONIONY** do jawnego Owner GO.  
**COMMIT / PUSH: NIE** z tej fazy.

---

## 11. Decyzja Ownera

| Pole | Wartość |
|------|---------|
| **Wariant FROZEN** | **S2** |
| **Fail-loud empty OST** | N/A — ACTIVE wymaga files[] > 0 (brak pliku ≠ ACTIVE → brak force) |
| **Checkbox UX (S2)** | **locked** · etykieta „zawsze w ZIP” |
| **Data GO** | 2026-08-05 |
| **Podpis / notatka** | Owner GO IMPLEMENT — S2 Hard Ensure |

---

*DESIGN FREEZE · WM-DRUK-OST-AUTO-GENERATE-01 · 2026-08-05 · NO IMPLEMENT*
