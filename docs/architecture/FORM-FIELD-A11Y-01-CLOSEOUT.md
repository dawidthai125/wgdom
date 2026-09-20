# FORM-FIELD-A11Y-01 — CLOSEOUT

> **STATUS:** **COMPLETE · PRODUCTION VERIFIED · GREEN**  
> **Data closeout:** 2026-09-20 (dokumentacja only)  
> **Final commit:** `110aec71` (`110aec7157efe21e5202bb8389de5144e240a8e1`)  
> **Message:** `fix(a11y): close form field id contract`  
> **UI:** **2.66.231** — bez bumpu changelogu  
> **Live:** `https://www.wgdom.fun/version.json` · **version `2.66.231`** · **commit `110aec7`**  
> **Branch push:** `cleanup/przetargi-wave1a` @ `110aec71` → `origin/main` via `git push origin HEAD:main`  
> **Zmiana w tym closeoucie:** wyłącznie dokumentacja · **żadna** zmiana kodu / produkcji / Design Freeze

Ten plik jest **jedynym** closeoutem FORM-FIELD-A11Y-01. Inne SSOT **linkują tutaj**. Nie powielać pełnej treści.

---

## 1. Cel

Zamknięcie Chrome Issue: **"A form field element should have an id or name attribute"** w zamrożonym zakresie Przetargi (lista · Firma/profil · OfferBoq · Work Catalog · Admin Topbar import).

**Zakaz w epicu:** Payroll · IK · Storage Tier1 · cloud catalog guard · WRITE_AUDIT · V4 / Workflow Hub · globalna migracja `WgField` · semantic `name` · Qualification panel (OUT OF SCOPE w OV).

---

## 2. Przebieg (skrót)

| Etap | Wynik |
|------|--------|
| Design Freeze (sesyjny) + ARCH REVIEW | PASS → Owner GO IMPLEMENT |
| IMPLEMENT (baseline) | 8 plików + `scripts/test-form-field-a11y-01.mjs` |
| Automated gates | A11Y → 64/0 · Workspace UX 105/0 · Preview SSOT 30/0 · Dead UX 21/0 · build PASS |
| Owner Verification #1 | **FAIL** — S2=99 · S3=1 · S4=1 · S1/S5=0 |
| RCA / PLAN | Residual: `RefEditor` + inne native Profile · OfferBoq search · Work Catalog search |
| Design Freeze **Delta** + ARCH REVIEW | PASS → Owner GO DELTA |
| DELTA IMPLEMENT | Profile full open panel · `#offer-boq-search` · `#work-catalog-search` |
| Owner Verification Delta | **PASS** · SCOPED_A11Y_ISSUES = **0** (S1–S5) |
| Commit | `110aec71` |
| Push | `git push origin HEAD:main` · `origin/main` = `110aec71` |
| Production Verify | **GREEN** · live commit **`110aec7`** · S1–S5 = **0** |

---

## 3. Owner Verification #1 FAIL → RCA

| Scenariusz | Count | Residual |
|------------|-------|----------|
| S1 Lista | 0 | — |
| S2 Firma Profil | **99** | `RefEditor` (5/wiersz) + `LinesInput` + NIP/REGON/owner/notes + `classificationDict` (page-wide w otwartym panelu) |
| S3 OfferBoq | **1** | `data-offer-boq-search` bez `id` (EditableComponentFields już **PASS**) |
| S4 Work Catalog | **1** | kanoniczny search `WgField` bez `id` (bulk już **PASS**) |
| S5 Topbar | 0 | — |

**Uwaga nazewnictwa:** komponent = lokalny **`RefEditor`** w `TenderCompanyProfilePanel.tsx` (nie „ExperienceListEditor”).

---

## 4. Design Freeze Delta (zamrożony kontrakt)

| Obszar | ID |
|--------|-----|
| RefEditor | `company-ref-${listKey}-${index}-{client\|year\|valuePln\|source\|scope}` · `listKey` = `references` \| `tender-wins` \| `tender-participations` · `name` = NONE · `valuePln` → `autoComplete="off"` |
| LinesInput | `company-profile-lines-${fieldKey}` · keys: licenses · strengths · regions · preferredCpvPrefixes · `htmlFor` |
| Advanced | `company-profile-nip` · `company-profile-regon` · `company-profile-owner-name` · `company-profile-notes` |
| classificationDict | `company-class-${entry.id}-phrase` · `company-class-${entry.id}-category` |
| OfferBoq | `id="offer-boq-search"` · KEEP `data-offer-boq-search` + `aria-label` · **NIE** EditableComponentFields |
| Work Catalog | `id="work-catalog-search"` · bulk **NO CHANGE** |

**S2 OV scope:** drzewo **`TenderCompanyProfilePanel`** (accordion open). **`CompanyQualificationProfilePanel`** = CLOSED / OUT OF SCOPE.

---

## 5. Pliki w finalnym commitcie `110aec71`

- `src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx`
- `src/app/TenderCompanyProfilePanel.tsx`
- `src/app/CompanyQualificationProfilePanel.tsx`
- `src/app/TenderPriceBasePanel.tsx`
- `src/app/tenders/TenderIngestImportPanel.tsx`
- `src/app/TendersView.tsx`
- `src/app/work-catalog/WorkCatalogWorkRow.tsx`
- `src/app/work-catalog/WorkCatalogView.tsx`
- `src/app/admin/AdminTopbar.tsx`
- `scripts/test-form-field-a11y-01.mjs`

---

## 6. Produkcja

| Pole | Wartość |
|------|---------|
| URL | https://www.wgdom.fun |
| Application version | **2.66.231** (bez bumpu) |
| Live commit | **`110aec7`** |
| Final commit | **`110aec71`** |
| Smoke S1–S5 | **PASS / 0** scoped form-field Issues |
| pageerror | **0** |
| Functional regression | **NONE** |

### Console / CORS (nie regresja A11Y)

Podczas Production Verify zaobserwowano w konsoli m.in.:

- CORS / `ERR_FAILED` przy fetch zewnętrznych BIP / załączników (`bip.krakow.pl`, `bip.wcrs.wroclaw.pl`, `samorzad.gov.pl`, …)
- odpowiedzi **409** / **500** na istniejących ścieżkach sieciowych

**Werdykt:** sygnały **nie** wynikają z FORM-FIELD-A11Y-01, **nie** dotyczą Issue „form field id/name”, **nie** stanowią regresji A11Y ani blokady GREEN. Klasa: platform / zewnętrzne dokumenty — poza zakresem epicu. **Nie** otwierać RCA FORM-FIELD z ich powodu.

---

## 7. Testy

| Gate | Wynik |
|------|--------|
| `scripts/test-form-field-a11y-01.mjs` | **64 PASS / 0 FAIL** |
| `test-tender-workspace-ux.mjs` | **105 / 0** |
| `test-tender-preview-ssot-5c3b.mjs` | **30 / 0** |
| `test-tender-dead-ux-cleanup-5c3c.mjs` | **21 / 0** |
| `npm run build` | **PASS** |

---

## 8. DO NOT

- Reopen RCA / Design Freeze bez Owner GO  
- Global `WgField` migration · semantic `name`  
- Qualification panel jako scope S2 bez nowego GO  
- Payroll · IK · Storage Tier1 · cloud catalog guard · WRITE_AUDIT · V4 Hub  

---

## 9. Werdykt

**FORM-FIELD-A11Y-01 = CLOSED · PRODUCTION VERIFIED · GREEN**  
Następny krok docs: commit tej dokumentacji wyłącznie na polecenie właściciela.
