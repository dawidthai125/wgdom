# IE-LABOR — Tablica OUR RATE · OWNER DECISION

> **STATUS:** **OWNER DECISION CLOSEOUT** · **ZERO IMPLEMENT** · **ZERO ACCEPT** · **ZERO OUR RATE WRITE**  
> **DATA:** 2026-08-14  
> **workId:** `p2b-tablica-rozdzielcza-mieszkaniowa-szt`  
> **mappingId:** `lim-w1-tablica-rozdzielcza-cr`  
> **Bazuje na:** [`IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md`](./IE-LABOR-EVIDENCE-TO-OUR-RATE-CONTRACT-AUDIT.md) · [`WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md`](./WORK-CATALOG-REBUILD-01-OWNER-DECISION-P0-CORRECTION.md) · Tablica Evidence Write Review

---

## 0. Werdykt (skrót)

```text
Evidence Tablicy = VALID (312–780 · rev 3 · r3-a8226101)
Evidence ≠ Candidate ≠ OUR RATE ≠ companyPrice

DERIVED midpoint = 546  →  tylko marketBase / proposed (margin 0)
companyPrice     = 420  →  LEGACY · NIE OUR RATE
CURRENT OUR RATE = null
Accept           = NOT DONE

Repo NIE daje reguły biznesowej „zawsze midpoint”
ani „zawsze companyPrice”.

RECOMMENDATION FROM ANALYSIS = OWNER VALUE REQUIRED (pre-choice)
FINAL OWNER DECISION         = A — OUR RATE = 546 PLN/szt
Accept execution             = osobny GO (IE-LABOR-EVIDENCE-TABLICA-OUR-RATE-ACCEPT)
```

**Ten dokument decyzyjny nie był Accept GO.** Accept = osobny GO po wyborze A.

---

## 1. Evidence source range

| Pole | Wartość |
|------|---------|
| source | `cennikremontow_pl` |
| URL / kontekst | instalacje elektryczne (CR) |
| operation | Montaż skrzynki rozdzielczej |
| unit | `szt` |
| **SOURCE RANGE** | **312–780 PLN/szt** |
| priceKind | `range` |
| pricePoint | **null** (midpoint nie jest zapisany w Evidence) |
| laborOnly | true |
| qualityStatus | **VALID** |
| evidenceId | `7bd0bcf8-07cf-427f-896a-f532cfdfaa0e` |
| Evidence bag | **67** observations · revision **3** · etag **`r3-a8226101`** |

**LOCK:** nie zmieniać Evidence, range, provenance, mappingu.

---

## 2. Midpoint (DERIVED only)

| Warstwa | Wartość | Rola |
|---------|---------|------|
| SOURCE RANGE | 312–780 | Evidence |
| **DERIVED MIDPOINT** | **546** | `(312+780)/2` |
| marketBase | ≈ 546 | DERIVED (KB-BRUZDY / `work-rate-market-base`) |
| marginPct | **0** | catalog Tablica |
| proposed / suggestedRatePln | ≈ **546** | marketBase × (1 + 0/100) |
| OUR RATE | **null** | **nie** wynika automatycznie z midpointu |

```text
range → midpoint → marketBase (DERIVED) → × margin → proposed
→ Owner Accept → ourWorkRate

Midpoint = propozycja rynkowa (DERIVED), NIE decyzja handlowa.
```

---

## 3. companyPrice distinction

| Pole | Wartość Tablica | Znaczenie |
|------|-----------------|-----------|
| `companyPricePln` | **420** | TECHNICAL LEGACY w Bibliotece Robót |
| `ourWorkRate` | **null** | jedyny SSOT „naszej stawki” |
| Relacja 420 vs 312–780 | 420 ∈ range, poniżej midpointu | **nie** uzasadnia auto-OUR RATE |

**SSOT (WORK-CATALOG-REBUILD P0 correction):**

```text
companyPricePln ≠ źródło OUR RATE
companyPricePln ≠ fallback OUR RATE
AUTO-MIGRACJA companyPricePln → OUR RATE = FORBIDDEN
```

**LOCK tej decyzji:** nie wolno ustawić OUR RATE = **420** bez **jawnej** decyzji Ownera (opcja B z uzasadnieniem).  
Sama obecność `companyPrice=420` **nie** jest wyborem A–D.

---

## 4. Existing Candidate → Accept flow (REUSE)

```text
Research Candidate
  → Owner Accept (acceptWorkRateResearchCandidate)
  → ourWorkRate (sourceType: ACCEPT)

Manual path (osobny):
  patchOurWorkRateInStore → sourceType: OWNER
```

| Fakt | Status |
|------|--------|
| Evidence → OUR RATE API | **FORBIDDEN / brak** |
| Accept bierze `suggestedRatePln` as-is | **TAK** (brak UI pick min/max w Accept) |
| Przy margin 0 Accept research → zapis ≈ **546** | **TAK** — *jeśli* Owner kliknie Accept |
| To GO wykonuje Accept | **NIE** |

---

## 5. Available Owner choices

| Opcja | OUR RATE | Uwagi |
|-------|----------|--------|
| **A** — ACCEPT MIDPOINT | **546** PLN/szt | Zgodne z proposed przy margin 0; **wymaga świadomego** Accept, nie auto |
| **B** — ACCEPT CUSTOM | Owner podaje PLN/szt | W range lub świadomie poza; **wymagane uzasadnienie** |
| **C** — ACCEPT MIN | **312** PLN/szt | Brak SSOT „pick-min”; tylko jawna decyzja |
| **D** — ACCEPT MAX | **780** PLN/szt | Brak SSOT „pick-max”; tylko jawna decyzja |
| **E** — HOLD | **null** | Evidence zostaje VALID; zero Accept |

**Zakazane autopicki (bez A–D):**

- 546 „bo midpoint”
- 420 „bo companyPrice”

---

## 6. Repository precedents

### 6.1 Live Catalog (READ-ONLY snap 2026-08-14)

| Metryka | Wartość |
|---------|---------|
| Catalog | **460** active / **34** legacy / **426** custom |
| Works z OUR RATE > 0 | **3** |
| `sourceType: ACCEPT` | **0** |
| `sourceType: OWNER` | **3** |

| workId | OUR RATE | companyPrice | margin | sourceType |
|--------|----------|--------------|--------|------------|
| `cc-w2-mocowanie-aparatow` | 45 | 45 | 0 | OWNER |
| `cc-w2-przebijanie-otworow` | 85 | 85 | 0 | OWNER |
| `cc-w2-przygotowanie-osprzet` | 38 | 38 | 0 | OWNER |

**Interpretacja precedensu:**

- Jedyny live wzorzec OUR RATE = **ręczny OWNER**, nie Accept research.
- W tych 3 przypadkach OUR = companyPrice **numerycznie** — to **nie** ustanawia reguły „OUR RATE := companyPrice” (P0 correction **FORBIDDEN** auto-migrate).
- **Brak** live precedensu Accept midpoint dla labor (0× `ACCEPT`).
- Tablica (`companyPrice=420`, OUR=null) jest bliższa przykładu z P0: *Biblioteka ma cenę → Nasz Katalog = BRAK STAWKI*, dopóki Owner nie zaakceptuje.

### 6.2 Dokumentacja / kontrakt

| Źródło | Co mówi o wartości |
|--------|-------------------|
| Evidence → OUR RATE Contract Audit | Midpoint = marketBase; **OUR RATE DERIVATION = OWNER DECISION REQUIRED** |
| WORK-CATALOG-REBUILD P0 | companyPrice ≠ OUR RATE |
| KB-BRUZDY / market-base | range → midpoint → proposed; Accept = Owner click |
| Wave-1 DF | Accept / OUR RATE / margin forbidden *w tamtym epicu* — nie dyktuje kwoty Tablicy |

### 6.3 Czego repo **nie** dowodzi

- Że Tablica **musi** mieć OUR RATE = 546  
- Że Tablica **musi** mieć OUR RATE = 420  
- Że labor Accept historycznie zawsze brał midpoint (0 live ACCEPT)  
- Że min lub max range jest preferowaną stawką handlową  

```text
OWNER VALUE REQUIRED
(nie wymyślać reguły A/B/C/D z samego midpointu lub companyPrice)
```

---

## 7. Recommended option (z dowodu repo)

| Pytanie | Odpowiedź |
|---------|-----------|
| Czy istnieje dowód na **A** (546) jako regułę biznesową? | **NIE** — tylko formuła DERIVED + konsekwencja Accept research |
| Czy istnieje dowód na **B** z konkretną kwotą? | **NIE** — Owner musi podać |
| Czy istnieje dowód na **C** / **D**? | **NIE** — brak SSOT pick-min/max |
| Czy **E HOLD** jest bezpieczny i zgodny z Evidence VALID? | **TAK** |

**Rekomendacja analityczna:**

```text
OWNER VALUE REQUIRED

Do czasu jawnego wyboru A–D przez Ownera:
  recommended operational option = E — HOLD
  OUR RATE pozostaje null
  Evidence pozostaje VALID (bez mutacji)
```

Agent **nie** rekomenduje A wyłącznie dlatego, że proposed ≈ 546 przy margin 0.

---

## 8. FINAL OWNER DECISION

```text
STATUS:  CLOSED — Owner wybrał A

Owner choice:          A — ACCEPT MIDPOINT
OUR RATE (target):     546 PLN/szt
Uzasadnienie:          midpoint validated SOURCE RANGE 312–780
Data:                  2026-08-14

Accept execution:      osobny GO → IE-LABOR-EVIDENCE-TABLICA-OUR-RATE-ACCEPT.md
```

| Pole | Wartość |
|------|---------|
| Owner choice | **A** |
| OUR RATE (PLN/szt) | **546** |
| Uzasadnienie | Midpoint of validated source range 312–780 |
| Data | 2026-08-14 |

---

## 9. Explicit OUR RATE value albo HOLD

| Stan | Wartość |
|------|---------|
| **Owner Decision** | **A** · OUR RATE target = **546 PLN/szt** |
| Evidence (at decision time) | VALID · unchanged by decision doc |
| Accept (at decision time) | osobny GO — patrz `IE-LABOR-EVIDENCE-TABLICA-OUR-RATE-ACCEPT.md` |

---

## 10. Safety confirmation (READ-ONLY)

| Check | Expected | Observed |
|-------|----------|----------|
| Evidence bag | 67 / rev 3 / `r3-a8226101` | **PASS** |
| Tablica Evidence hit | present · range 312–780 · pricePoint null | **PASS** |
| Catalog | 460 / 34 / 426 | **PASS** |
| Control `cc-p0c-w1-zaprawianie-bruzd` companyPrice | **35** | **PASS** |
| Control OUR RATE | **null** | **PASS** |
| Tablica companyPrice | **420** (orthogonal) | **PASS** |
| Tablica OUR RATE | **null** | **PASS** |
| Accept | **NOT DONE** | **PASS** |
| margin (Tablica + control) | **0** | **PASS** |
| Writes (ten GO) | **0** | **PASS** |

---

## 11. Absolute stop

```text
ZERO IMPLEMENT
ZERO ACCEPT
ZERO OUR RATE WRITE
ZERO Catalog write
ZERO Evidence write
ZERO margin write
ZERO commit / push / deploy

Nawet przy przyszłym Owner choice = A (546)
— Accept dopiero w osobnym GO.
```

---

## 12. Co dalej

1. Owner odpowiada: **A | B | C | D | E** (+ uzasadnienie jeśli B).  
2. Update § 8 tego dokumentu (FINAL = wybrana opcja).  
3. **Dopiero potem** (jeśli nie E): osobny **OWNER GO: ACCEPT TABLICA → OUR RATE**.

**STOP.**
