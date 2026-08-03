# WM-RYSUNKI-01 — ARCHITECTURE REVIEW

> **ID:** WM-RYSUNKI-01-ARCHITECTURE-REVIEW  
> **EPIC:** WM-RYSUNKI-01 — Rysunki techniczne w Odbiorach WM  
> **FAZA:** **ARCHITECTURE REVIEW**  
> **STATUS:** **COMPLETE**  
> **WERDYKT:** **PASS WITH MINOR RECOMMENDATIONS**  
> **MODE:** DOCUMENTATION ONLY · **NO IMPLEMENT** · **NO CODE** · **NO MIGRATION** · **NO COMMIT** · **NO PUSH**  
> **Data:** 2026-08-03  
> **Wejście:** Owner **GO ARCHITECTURE REVIEW**  
> **Źródła:** [`WM-RYSUNKI-01-AUDIT.md`](./WM-RYSUNKI-01-AUDIT.md) (**ACCEPTED**) · [`WM-RYSUNKI-01-DESIGN-FREEZE.md`](./WM-RYSUNKI-01-DESIGN-FREEZE.md) (**FROZEN**)  
> **Wzorce kodu (read-only):** `electrical-schematics/*` · `wm-print/generate-zip.ts` · `delivery-package-publications/*` · flagi LS (`ai-cost-02-*-flag.ts`) · `cloud-sync.ts` DATA_KEYS  
> **Baseline:** UI **2.65.95** · tip MS P2 **`18830c1`** · Protected Core **GREEN**  
> **Język:** polski

```text
════════════════════════════════════════════════════════
WM-RYSUNKI-01 ARCHITECTURE REVIEW

WERDYKT: PASS WITH MINOR RECOMMENDATIONS

Blokery architektoniczne: BRAK
DF spójny z AUDIT · SSOT/REUSE/ZERO DUP/THIN OK
Cloud AUX KEY (jak Schematy) · Payroll OUT
Gotowy do Owner GO IMPLEMENT — thin slice P0

IMPLEMENT: NIE · COMMIT: NIE · PUSH: NIE
════════════════════════════════════════════════════════
```

---

## 0. Metoda

| Element | Wartość |
|---------|---------|
| Zakres | DF vs AUDIT + zasady WGDOM + wzorce prod (Schematy / ZIP / flagi / sync) |
| Kod IMPLEMENT | **brak** (review docs + read-only potwierdzenie wzorców) |
| Mutacje repo | **tylko** ten dokument AR |
| Kryterium **FAIL** | sprzeczność blokująca · naruszenie Payroll CORE · PDF-as-SSOT · brak izolacji domeny · brak thin slice |
| Kryterium **PASS** | brak blokerów; drobne doprecyzowania = recommendations |
| Kryterium **PASS WITH MINOR RECOMMENDATIONS** | brak blokerów + lista MR-* do uwzględnienia w IMPLEMENT / OV (bez amend DF obowiązkowego) |

---

## 1. Werdykt wykonawczy

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy architektura jest spójna? | **TAK** |
| Czy są blokery? | **NIE** |
| Czy DF zamyka AUDIT D1–D8? | **TAK** |
| Czy wolno iść w IMPLEMENT P0 po Owner GO? | **TAK** |
| Czy wymagany amend DF przed IMPLEMENT? | **NIE** (MR-* nie blokują; opcjonalny clarifier OK) |

**WERDYKT: PASS WITH MINOR RECOMMENDATIONS**

---

## 2. Zgodność DF ↔ AUDIT

| Wymaganie AUDIT | DF | Wynik |
|-----------------|-----|-------|
| Zakładka w Odbiory WM · kolejność po Odbiory | §2.1 D1=A | **PASS** |
| Osobna domena ≠ Schematy/EM | §2 · §4 | **PASS** |
| Wiele rysunków / job | §2 #3 | **PASS** |
| Edytowalny model · nie PDF-only | §2 #4 · §4.5 | **PASS** |
| Model → SVG · Canvas ≠ SSOT | §2 #5 · §6.1 | **PASS** |
| Punkty opcjonalne · nigdy gate save | §2 #7 · §4.5 · AC-P0-07 / P4 | **PASS** |
| PDF on-demand · `pdf-lib` | §9 | **PASS** |
| ZIP `Rysunki/` · final only | §10 · D4 | **PASS** |
| Zero nowej lib rysunkowej | D6 · §2 #10 | **PASS** |
| Thin slices P0–P4 | §13 | **PASS** |
| Owner extras (symbole, snap, undo, dup, autosave, preview, A4/A3, nazwy, szablony, druk, UX 2–3 min) | §0.1 · §5–§9 | **PASS** |

**Werdykt sekcji: PASS**

---

## 3. Kontrole zasad (PASS/FAIL)

### 3.1 SSOT FIRST

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Jedno źródło prawdy geometrii | **PASS** | `objects[]` w `WmTechnicalDrawing` |
| PDF / Druk / ZIP = derivaty | **PASS** | §9 · §10 · zakaz cache bytes jako SSOT |
| Grid tylko edytor (nie PDF) | **PASS** | §14 |
| `renderedSvg` opcjonalny cache, wolno odrzucić | **PASS** | §4.3 |

**PASS**

---

### 3.2 REUSE FIRST

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Infra jak Schematy (tab/KV/LWW/panel) | **PASS** | AUDIT §4 · DF §11 · §15 |
| ZIP jak Pomiary (options + append + folder) | **PASS** | §10 |
| PDF stack WM (`pdf-lib` + Noto) | **PASS** | §9.1 |
| Audit `wm_druk` | **PASS** | §11.2 |
| Slug adresu EM | **PASS** | §8.2 · §15 |
| **Nie** reuse renderer IEC / bus | **PASS** | §15 „Nie bierzemy” |

**PASS**

---

### 3.3 ZERO DUPLICATE LOGIC

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Osobny folder domeny | **PASS** | `wm-technical-drawings/` |
| Brak merge do `SingleLineDiagram` | **PASS** | OUT §12 |
| Brak drugiego ZIP buildera | **PASS** | rozszerzenie `buildWmPrintDeliveryZipBytes` |
| Brak mapowania worker sketch / checklist | **PASS** | D7 · §11.4 |
| Brak dual-path jspdf | **PASS** | §9 · OUT |

**PASS** — ryzyko kolizji **nazwy** „Rysunki” vs checklist jest produktowe (copy), nie logiczne; mitygacja w DF (Guide hint) wystarcza.

---

### 3.4 THIN SLICE

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| P0→P4 rozdzielone | **PASS** | §13.1 |
| PDF dopiero P2 · ZIP P3 · points P4 | **PASS** | — |
| Jeden slice / GO | **PASS** | §13.1 |
| Hard OUT chroni przed CAD creep | **PASS** | §12 |

**PASS** z **MR-01** (P0 jest „gruby”, ale nadal thin względem pełnego CAD — patrz §6).

---

### 3.5 Payroll Safety Gate

| Gate | DF | Ocena |
|------|-----|--------|
| G1–G2, G5–G8 | NIE / NIE* | **PASS** |
| G3 Cloud | TAK* nowy AUX KEY · ZERO payroll merge | **PASS** (wzorzec Schematy) |
| G4 / G9 | NIE* wąski wire | **PASS** |
| Owner GO CORE | NIE przy trzymaniu LWW+pushKeys | **PASS** |

**PASS** — IMPLEMENT musi **nie** dotykać `finalizePayrollBundleMerge` / hours-wipe / carry (AC-ARCH-01).

---

### 3.6 Cloud Sync

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| `DATA_KEYS` + merge case | **PASS** | §11.1 · wzorzec `kw-electrical-schematics` |
| LWW per `id` (`updatedAt`) | **PASS** | §4.1 |
| Backup completeness | **PASS** | §11.1 |
| Auto Save → commit → pushKeys | **PASS** | §6.5 |
| Brak OT/CRDT (świadomie) | **PASS** | OUT · residual R-NEW |

**PASS** z **MR-02** (semantyka delete / tombstone nie opisana w DF — patrz §6).

---

### 3.7 PDF

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Jeden generator dla Podgląd / Pobierz / Drukuj | **PASS** | §9.2–9.4 |
| Pipeline B + escape hatch P2.1 | **PASS** | D3 |
| Watermark draft | **PASS** | §9.1 |
| A4/A3 mapowanie pt | **PASS** | §7.3 |
| Fonty WM | **PASS** | §9.1 |

**PASS**

---

### 3.8 ZIP

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Folder `Rysunki/` additive | **PASS** | §10 |
| Tylko `final` | **PASS** | D4 |
| Manifest + fingerprint | **PASS** | §10.1–10.2 |
| Schematy nadal OUT | **PASS** | §10.1 · AC-P3-05 |
| Checkbox default | **PASS** | D5 · AC-P3-04 |

**PASS**

---

### 3.9 Feature Flags

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Flaga default OFF · tip parity | **PASS** | §4.1a |
| OFF = tab ukryty · dane nie kasować | **PASS** | §4.1a |
| Wzorzec nazwy `kw-*` jak inne flagi UI | **PASS** | zgodne z `kw-ai-cost-02-*` LS |

**PASS** z **MR-03**: DF §4.1 ma frazę „ON **lub** wg AR” — AR **zamyka**: flaga = **UI-only localStorage** (jak I3/02-B), **nie** w `DATA_KEYS`; OFF zawsze ukrywa tab do świadomego włączenia Ownera. Bez amend DF obowiązkowego — kontrakt IMPLEMENT.

---

### 3.10 KV Architecture

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Osobny klucz `kw-wm-technical-drawings` | **PASS** | D8 |
| Tablica dokumentów · nie blob PDF | **PASS** | §4 |
| `schemaVersion: 1` na encji | **PASS** | §4.1 |
| Osobna wersja biblioteki symboli | **PASS** | §5.1 #5 |
| Izolacja od payroll / jobs CORE | **PASS** | OUT |

**PASS** z **MR-02** (delete).

---

### 3.11 SVG renderer

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Model → SVG live | **PASS** | §6.1 |
| Zamknięta biblioteka symboli | **PASS** | §5 |
| Fallback `unknown` | **PASS** | §4.4 |
| Canvas ≠ SSOT | **PASS** | §2 #5 |
| Raster tylko na torze PDF | **PASS** | §9.1 B |

**PASS**

---

### 3.12 JSON SSOT

| Kryterium | Ocena | Dowód |
|-----------|--------|-------|
| Discriminated union obiektów | **PASS** | §4.2–4.4 |
| Normalize + validateForSave | **PASS** | §4.5 · test plan |
| Re-open = load JSON | **PASS** | AC-P0-02 |

**PASS**

---

## 4. Ocena dodatkowa (Owner)

### 4.1 Migracja `schemaVersion`

| Aspekt | Ocena |
|--------|--------|
| Istnieje `schemaVersion: 1` | **OK** |
| Ścieżka v2 = amend DF / nowy schema | **OK** (DF §5.1 #7) |
| Brak jawnego `migrateV1toV2` w DF | **Akceptowalne** na AR — brak danych prod |
| Normalize przy nieznanym version | **MR-04** — IMPLEMENT P0: nieznany `schemaVersion` → coerce do 1 **lub** reject z logiem (wybrać jedną politykę w kodzie + test); nie milcząco gubić `objects` |

**Gotowość migracji przyszłej: ADEQUATE** (nie blocker).

---

### 4.2 Skalowalność modelu danych

| Aspekt | Ocena |
|--------|--------|
| Flat `objects[]` | Skaluje do typowych szkiców (dziesiątki–niskie setki) |
| Brak warstw / grup CAD | Świadomy OUT — upraszcza sync |
| Wiele rysunków / job | Tablica dokumentów + filtr `jobId` — **OK** |
| KV cały array LWW | Jak Schematy — **OK** przy rozsądnej liczbie rysunków/firmę |

**MR-05:** w P1+ dodać soft warn UI przy `objects.length > 300` (lub podobny próg) — bez twardego blokowania save (zgodne z UX).

---

### 4.3 Wydajność przy dużej liczbie obiektów

| Aspekt | Ocena |
|--------|--------|
| SVG DOM / re-render | Ryzyko przy 1k+ obiektów — poza typowym szkicem 2–3 min |
| Auto Save debounce | Łagodzi push storm |
| PDF raster @2× A3 | Heavier — akceptowalne on-demand |
| Spatial index / virtualization | **OUT MVP** — OK |

**MR-06:** P0 nie optymalizować premature; przy OV jeśli lag — memoize render per object id / nie pełny rebuild stringa SVG przy każdym pointermove (szczegół IMPLEMENT, nie DF).

**PASS** dla założonego workloadu odbiorowego.

---

### 4.4 Gotowość do przyszłych rozszerzeń (bez IMPLEMENT)

| Rozszerzenie | Hak w DF | Ocena |
|--------------|----------|--------|
| Nowe symbole | `DRAWING_SYMBOL_LIBRARY_VERSION` + lista ID | **GOTOWY** |
| Nowe typy obiektów | union + schemaVersion | **GOTOWY** |
| Punkty pomiarowe | P4 + never-required | **GOTOWY** |
| PDF wektor | P2.1 | **GOTOWY** |
| ZIP już zaprojektowany | P3 | **GOTOWY** |
| DXF / CAD | Hard OUT — osobny epic | **OK** |
| Live multi-user | OUT OT | **OK** |
| Inspektor edit | OUT MVP | **OK** |

**PASS** — model nie blokuje ewolucji bez wymuszania CAD.

---

### 4.5 Kompletność Acceptance Criteria

| Slice | AC obecne | Luki (nie-blocker) |
|-------|-----------|---------------------|
| P0 | AC-P0-01…09 | Brak AC delete dokumentu · brak AC cloud merge roundtrip · Undo AC (≥1) vs DF (≥50) — rozjazd miękki |
| P1 | AC-P1-01…04 | Brak AC zmiany formatu A4↔A3 po create |
| P2 | AC-P2-01…06 | Brak jawnego AC `drawing_printed` (opcjonalny w DF) |
| P3 | AC-P3-01…05 | Kompletne względem ZIP |
| P4 | AC-P4-01…03 | Kompletne względem „never required” |
| UX/ARCH | AC-UX-01/02 · AC-ARCH-01 | **MR-07:** AC-UX-01 (drzwi+okna+PDF) sensownie **po P1+P2**; AC-P0-09 = wariant wąski — OK jeśli OV to rozróżnia |

**Ocena kompletności: GOOD** · **MR-07/MR-08** poniżej.

---

## 5. Macierz ryzyk vs architektura

| Ryzyko (AUDIT/DF) | Czy architektura mityguje? | Status AR |
|-------------------|----------------------------|-----------|
| R1 Effort edytora | P0 wąski · no lib | **Mitigated** |
| R4 Manifest ZIP | additive + testy | **Mitigated** |
| R5 Audit flood | zakaz edited | **Mitigated** |
| R6 Raster quality | P2.1 | **Mitigated** |
| R7 CAD creep | Hard OUT + UX 2–3 min | **Mitigated** |
| R8 Points required | validate + AC | **Mitigated** |
| Auto Save × LWW | accepted · no OT | **Accepted residual** |
| Nazwa „Rysunki” | copy Guide | **Accepted residual** |

Brak ryzyka = **architectural blocker**.

---

## 6. Minor Recommendations (nie blokują GO IMPLEMENT)

| ID | Rekomendacja | Gdzie stosować | Amend DF? |
|----|--------------|----------------|-----------|
| **MR-01** | Pilnować scope P0: nie wciągać door/PDF „bo prawie gotowe”; P0 już ma szablony+grid+undo+autosave | IMPLEMENT P0 · OV | Nie |
| **MR-02** | Ustalić delete: hard-remove z tablicy (jak typowe LWW list) **lub** tombstone key — jedna ścieżka + test „nie wraca po sync” | IMPLEMENT P0 | Opcjonalny clarifier |
| **MR-03** | Flaga `kw-wm-rysunki-01` = **LS UI-only** (wzorzec `flag.ts`), **nie** `DATA_KEYS`; OFF zawsze ukrywa tab | IMPLEMENT P0 | Nie (AR zamyka „lub wg AR”) |
| **MR-04** | Polityka normalize dla obcego `schemaVersion` + test | IMPLEMENT P0 | Nie |
| **MR-05** | Soft warn przy bardzo dużej liczbie obiektów (P1+) | P1+ | Nie |
| **MR-06** | Unikać full SVG string rebuild na każdym pointermove (perf) | IMPLEMENT editor | Nie |
| **MR-07** | AC-UX-01 mierzyć po P1 (narzędzia) + P2 (podgląd PDF); AC-P0-09 = smoke UX wąski | OV plan | Nie |
| **MR-08** | Dodać w OV checklist: delete rysunku · re-open po reload+sync · flaga OFF | OV P0 | Nie |
| **MR-09** | P0 Undo: celować w DF (≥50), AC-P0-05 (≥1) = minimum smoke | IMPLEMENT | Nie |

---

## 7. Allowlist koncepcyjna IMPLEMENT P0 (informacyjnie · nie stage)

> **Nie commitować teraz.** Po Owner GO IMPLEMENT — wyłącznie allowlist.

Oczekiwane obszary (orientacja AR):

```text
src/lib/wm-technical-drawings/**          (nowe)
src/lib/wm-print/wm-print-tabs.ts
src/app/WmPrintView.tsx
src/app/WmPrintDrawingsPanel.tsx          (nowe)
src/app/WmPrintDrawingEditor.tsx          (nowe)
src/lib/cloud-sync.ts                     (DATA_KEYS + merge case ONLY)
src/app/App.tsx / CloudLoader             (wire AUX — bez payroll)
src/lib/wm-druk-audit.ts                  (nowe akcje — gdy P0 create/delete)
flag module                               (kw-wm-rysunki-01)
tests/smoke P0
docs (ARCHITECTURE § nowa · CHANGELOG przy release)
```

**Zakaz w P0:** `generate-zip` / manifest (P3) · pełny PDF (P2) · door/window (P1) · payroll pliki · `git add -A`.

---

## 8. Checklista wejścia Owner GO IMPLEMENT

| # | Warunek | Stan |
|---|---------|------|
| 1 | AUDIT ACCEPTED | **TAK** |
| 2 | DF FROZEN | **TAK** |
| 3 | AR PASS / PASS WITH MINOR | **TAK** (ten dokument) |
| 4 | Brak blokerów | **TAK** |
| 5 | Owner GO IMPLEMENT (osobne) | **WAITING** |
| 6 | Slice = **P0 only** (domyślnie) | zalecane |
| 7 | Payroll Gate respektowany | obowiązek IMPLEMENT |
| 8 | Lokalny WIP — allowlist only | obowiązek |

---

## 9. Następny krok

```text
ARCHITECTURE REVIEW COMPLETE
  WERDYKT: PASS WITH MINOR RECOMMENDATIONS
        ↓
Czekaj na Owner GO IMPLEMENT (P0)
        ↓
IMPLEMENT P0 (+ uwzględnij MR-* bez obowiązkowego amend DF)
        ↓
OWNER VERIFICATION → COMMIT allowlist → PUSH → PV → CLOSE P0
```

**STOP.** Brak implementacji. Brak commit/push.

---

## 10. Podsumowanie kontroli

| Kontrola | Wynik |
|----------|--------|
| SSOT FIRST | **PASS** |
| REUSE FIRST | **PASS** |
| ZERO DUPLICATE LOGIC | **PASS** |
| THIN SLICE | **PASS** (+ MR-01) |
| Payroll Safety Gate | **PASS** |
| Cloud Sync | **PASS** (+ MR-02) |
| PDF | **PASS** |
| ZIP | **PASS** |
| Feature Flags | **PASS** (+ MR-03) |
| KV Architecture | **PASS** (+ MR-02) |
| SVG renderer | **PASS** |
| JSON SSOT | **PASS** |
| schemaVersion migration readiness | **ADEQUATE** (+ MR-04) |
| Model scalability | **PASS** (+ MR-05) |
| Perf large N | **PASS** dla workloadu (+ MR-06) |
| Future extensions | **PASS** |
| AC completeness | **GOOD** (+ MR-07/08/09) |

---

## 11. Formalny werdykt

```text
════════════════════════════════════════════════════════
EPIC:     WM-RYSUNKI-01
FAZA:     ARCHITECTURE REVIEW
WERDYKT:  PASS WITH MINOR RECOMMENDATIONS

Blokery:  NONE
Amend DF obowiązkowy: NIE
Owner GO IMPLEMENT: DOZWOLONY (oczekiwany)
Zalecany pierwszy slice: P0
════════════════════════════════════════════════════════
```

**STATUS:** **ARCHITECTURE REVIEW COMPLETE** · czekam na **Owner GO IMPLEMENT**.
