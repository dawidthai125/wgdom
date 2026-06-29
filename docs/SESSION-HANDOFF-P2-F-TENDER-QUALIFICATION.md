# SESSION HANDOFF — P2-F Tender Qualification Pipeline (CLOSED)

> **★ SSOT serii P2-F** — warunki udziału, profil wykonawcy, doświadczenie, referencje, wykaz robót.  
> **Status:** **COMPLETE** (P2-F.0 → P2-F.5) · **Data closeout:** 2026-06-12  
> **Hasło sesji:** „kontynuuj WGDOM”

**Czytaj TEN plik przy pracy nad:** Karta ofertowa przetargu, SWZ analiza, profil wykonawcy, wykaz robót, ATH quick access.

---

## 1. Cel biznesowy (zamknięty)

Pipeline **SWZ → profil firmy → twarde dopasowanie → dokumenty ofertowe**:

```text
Analizuj SWZ
  → wymagania formalne (personel, uprawnienia, członkostwo)
  → warunki udziału (MATCH/MISSING/UNKNOWN)
  → doświadczenie + referencje vs experienceProjects[]
  → odkryte realizacje z Robót (auto-build)
  → upload referencji / protokołów
  → rekomendowane realizacje + wykaz PDF/DOCX
  → ATH: Otwórz przedmiar / Pobierz PDF (bez ZIP)
```

**Użytkownik nie przepisuje ręcznie** realizacji do załączników przetargowych.

---

## 2. Production baseline (P2-F)

| Wersja | Sprint | Commit | Skrót |
|--------|--------|--------|-------|
| **2.51.19** | P2-F.0 | `a2d0f8a` | Formal Requirements Extraction |
| **2.51.20** | P2-F.1 | `28c5602` | Warunki udziału vs profil wykonawcy |
| **2.51.21** | P2-F.2 | `73683f8` | Experience & References Qualification |
| **2.51.22** | P2-F.3 | `7dd7563` | Company Experience Auto-Build |
| **2.51.23** | P2-F.4 | `77b352a` | References upload + ATH Quick Access |
| **2.51.24** | P2-F.5 | `e015453` | Works Register Generator (PDF/DOCX) |

**Verify prod:**

```bash
curl -s https://www.wgdom.fun/version.json
# oczekiwane: { "version": "2.51.24" }
```

**Fundament (P2-E, przed P2-F):** `tender-data-ssot.ts`, `tender-document-resolver.ts`, kosztorys ATH — **nie zmieniaj bez audytu**.

---

## 3. Mapa modułów (SSOT plików)

### 3.1 Parsowanie SWZ

| Moduł | Rola |
|-------|------|
| `src/lib/tender-formal-requirements.ts` | **P2-F.0** — `FormalRequirement`, detektory personel/uprawnienia/członkostwo, filtr śmieci PDF |
| `src/lib/tender-participation-requirements.ts` | **P2-F.1** — ekstrakcja wymagań udziału z tekstu SWZ |
| `src/lib/tender-experience-requirements.ts` | **P2-F.2** — `ExperienceRequirement` (minProjects, minValuePln, referenceRequired, …) |
| `src/lib/tenders-bzp-swz.ts` | `parseSwzPlainText` → `formalRequirements[]`, `participationRequirements[]`, `experienceRequirements[]` |
| `src/lib/tender-document-resolver.ts` | Merge analizy z załączników BZP |

### 3.2 Profil wykonawcy (chmura)

| Moduł | Rola |
|-------|------|
| `src/lib/company-qualification-profile.ts` | **SSOT modelu** · klucz `kw-company-profile` · schema **v4** |
| `src/lib/tenders-sync.ts` | `mergeCompanyQualificationProfileForCloud` |
| `src/app/CompanyQualificationProfilePanel.tsx` | UI: personel, uprawnienia, realizacje, upload referencji, odkryte realizacje |

**Model `CompanyQualificationProfile`:**

```typescript
experienceProjects[]: {
  title, category, valuePln, year,
  referenceStatus: "unknown" | "available" | "missing",
  referenceAvailable: boolean,  // legacy sync z referenceStatus
  referenceFiles[], protocolFiles[],  // P2-F.4 — storage PDF/DOCX
  sourceJobId?, discoveredFrom?,      // P2-F.3 dedupe
}
```

### 3.3 Silniki dopasowania

| Moduł | Rola |
|-------|------|
| `src/lib/tender-participation-check.ts` | **P2-F.1** — `checkTenderParticipation()` → MATCH/MISSING/UNKNOWN per kategoria |
| `src/lib/tender-experience-check.ts` | **P2-F.2/4** — doświadczenie + referencje; `getMatchingExperienceProjects()` |
| `src/lib/company-experience-discovery.ts` | **P2-F.3** — `discoverCompanyExperience()`, `approveDiscoveredProject()` |
| `src/lib/experience-reference-upload.ts` | **P2-F.4** — upload do `jobs/kw-company-experience/` |
| `src/lib/tender-works-register.ts` | **P2-F.5** — `selectProjectsForTender()`, `buildWorksRegister()` |
| `src/lib/tender-works-register-pdf.ts` | PDF wykazu (pdfmake, A4) |
| `src/lib/tender-works-register-docx.ts` | DOCX wykazu (edycja przed ofertą) |
| `src/lib/tender-ath-quick-access.ts` | **P2-F.4** — ATH viewer + PDF bez ZIP |

### 3.4 UI (Karta ofertowa)

| Komponent | Rola |
|-----------|------|
| `src/app/TenderBidPrepPanel.tsx` | Karta ofertowa — checklist + panele poniżej |
| `src/app/TenderParticipationPanel.tsx` | Warunki udziału + **Rekomendowane realizacje** (skrót) |
| `src/app/TenderWorksRegisterPanel.tsx` | **P2-F.5** — wykaz robót, Generuj PDF/DOCX |
| `src/app/TenderDetailPanel.tsx` | Szczegóły przetargu, `JobFilePreviewModal` dla ATH |
| `src/app/TenderDossierPanel.tsx` | Karta przetargu, pełny podgląd kosztorysu |
| `src/app/tenders/tabs/TendersProfileTab.tsx` | Profil wykonawcy w Ustawieniach przetargów |

**Flow UI użytkownika:**

```text
Przetargi → Lista → rozwiń przetarg → Karta ofertowa
  ├── Analizuj SWZ
  ├── Checklist (termin, wartość, wadium, kosztorys/ATH, …)
  ├── Warunki udziału w postępowaniu  ← TenderParticipationPanel
  ├── Wykaz robót budowlanych         ← TenderWorksRegisterPanel
  └── …

Przetargi → Ustawienia → Profil wykonawcy  ← CompanyQualificationProfilePanel
  ├── Doświadczenie i referencje (ręcznie)
  ├── Odkryte realizacje (P2-F.3)
  └── Upload referencji / protokołu (P2-F.4)
```

---

## 4. Sprinty — szczegóły

### P2-F.0 — Formal Requirements (`2.51.19`)

- Model `FormalRequirement` (type: personnel | license | membership | experience | other)
- Filtr śmieci PDF (numeracja, „Zamawiającego”, …)
- UI: bullet „Wymagane:” w `TenderDossierPanel`, `TenderFitPanel`
- Trace: `[FORMAL TRACE]`

### P2-F.1 — Warunki udziału (`2.51.20`)

- Klucz chmury: **`kw-company-profile`**
- Checkboxy: personel, uprawnienia, OC, finanse, referencje (agregaty)
- `TenderParticipationPanel` — sekcja „Warunki udziału w postępowaniu”
- `checkTenderParticipation(requirements, profile, experienceReqs?)`

### P2-F.2 — Doświadczenie i referencje (`2.51.21`)

- `experienceProjects[]` w profilu — lista realizacji z wartością, rokiem, referencją
- `checkExperienceQualification()`, `checkReferenceRequirement()`
- Trace: `[EXPERIENCE TRACE]`

### P2-F.3 — Auto-build doświadczenia (`2.51.22`)

- Źródła: Roboty (`kw-jobs`), faktury, kosztorys ATH, wycena roboczogodzin
- Priorytet wartości: kosztorys → faktury → umowa → wycena
- UI: **Odkryte realizacje** — zatwierdzenie jednym kliknięciem (bez auto-zapisu)
- Dedupe: nazwa + wartość ±5% + okres
- Trace: `[EXPERIENCE DISCOVERY TRACE]`

### P2-F.4 — Referencje + ATH Quick Access (`2.51.23`)

- `referenceFiles[]`, `protocolFiles[]` — upload PDF/DOCX
- Status UI: 🟢 dostępna · 🟡 niezweryfikowana · 🔴 brak
- Referencje vs SWZ: „Brakuje N referencji” gdy minProjects=2 a tylko 1 ref
- Kafelek **Kosztorys / przedmiar**: **[Otwórz przedmiar]** **[Pobierz PDF]**
- Reuse: `JobFilePreviewModal`, `downloadKosztorysPdf`, ZIP inner ATH (Logintrade)
- Trace: `[ATH QUICK ACCESS TRACE]`

### P2-F.5 — Wykaz robót (`2.51.24`)

- `selectProjectsForTender()` — top N realizacji spełniających SWZ (sort: wartość ↓)
- `WorksRegister` → PDF + DOCX „WYKAZ ROBÓT BUDOWLANYCH”
- Rekomendacje w Warunki udziału + pełny panel z przyciskami export
- Trace: `[WORKS REGISTER TRACE]`
- **Generowanie nie blokuje** przy braku referencji (tylko oznaczenie 🔴)

---

## 5. Trace (debug w konsoli)

| Tag | Moduł |
|-----|-------|
| `[FORMAL TRACE]` | `tender-formal-requirements.ts` |
| `[EXPERIENCE TRACE]` | `tender-experience-check.ts` |
| `[EXPERIENCE DISCOVERY TRACE]` | `company-experience-discovery.ts` |
| `[ATH QUICK ACCESS TRACE]` | `tender-ath-quick-access.ts` |
| `[WORKS REGISTER TRACE]` | `tender-works-register.ts` |
| `[COST STATUS TRACE]` / `[SSOT TRACE]` | `tender-data-ssot.ts` (P2-E) |

---

## 6. Testy (regresja P2-F)

**Jeden skrypt — 161 testów (2026-06-12):**

```bash
npx vite-node scripts/test-tender-dossier-pipeline.mjs
```

Zakres: P2-E (dossier, SSOT, ATH) + P2-F.0–F.5.  
Sekcje testów: `p2f0`, `p2f1`, `p2f2`, `p2f3`, `p2f4`, `p2f5`.

**Release workflow:** [`WORKFLOW-RELEASE-DEPLOY.md`](WORKFLOW-RELEASE-DEPLOY.md) — wariant **B** (functional UI).

---

## 7. NIE ZMIENIAJ bez polecenia

- Merge/sync `kw-company-profile` w `tenders-sync.ts` / `cloud-sync.ts`
- Semantyka `referenceStatus` (domyślnie `unknown` — nie zakładaj referencji auto)
- Priorytet wartości w `company-experience-discovery.ts` bez audytu biznesowego
- `filterMatchingProjects` / progi kategorii w `tender-experience-check.ts`
- Reuse ATH viewer — **nie** twórz nowego viewer'a ani generatora PDF kosztorysu
- Parser SWZ formal/participation/experience — filtry śmieci PDF (regresja TBS)

---

## 8. Backlog po P2-F (otwarty)

| ID | Temat | Uwagi |
|----|-------|-------|
| P2-F.6? | Inwestor w realizacji (pole `investorName` w UI profilu) | dziś parsowany z tytułu „Klient — adres” |
| P2-F.7? | Auto-dołączenie referencji PDF do pakietu ofertowego | wymaga AUDIT |
| P2 | Audit Center / Security Log | z backlogu P1 |
| P3 | Dalsze usprawnienia Przetargów | bez polecenia |

---

## 9. Wznowienie pracy

```text
1. docs/SESSION-HANDOFF-P2-F-TENDER-QUALIFICATION.md  ← TEN PLIK
2. docs/PROJECT-HANDOFF-CURRENT.md
3. CURRENT-TASK.md
4. docs/ARCHITECTURE.md § 12.1.5
5. curl -s https://www.wgdom.fun/version.json
6. npx vite-node scripts/test-tender-dossier-pipeline.mjs  (przed release)
```

**Werdykt:** P2-F **COMPLETE** · prod **2.51.24** · **READY** for P2 Audit Center lub kolejne P2-F.x na polecenie.
