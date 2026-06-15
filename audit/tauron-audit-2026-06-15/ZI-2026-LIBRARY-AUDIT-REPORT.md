# ZI-2026 — audyt bibliotek (fill pól 99 / 102 / 111)

**Data:** 2026-06-15  
**Tryb:** READ ONLY · AUDIT ONLY  
**Szablon:** `tauron-zi-official.ashx` (blank Tauron 2026-04-27, 953 KB)  
**Pola docelowe (§4, str. 2):**

| WGDOM | Pole PDF | Przykład |
|-------|----------|----------|
| JOB_STREET | `Pole tekstowe 99` | Szkolna |
| JOB_BUILDING | `Pole tekstowe 102` | 55 |
| JOB_APARTMENT | `Pole tekstowe 111` | 5 |

**Szyfrowanie (qpdf):** R=6 · AESv3 · hasło użytkownika = puste · `modify forms: allowed`

---

## Werdykt skrócony

**TAK — automatyczne wypełnienie pól 99, 102 i 111 jest możliwe** na formularzu ZI 2026, pod warunkiem użycia biblioteki obsługującej **szyfrowane AcroForm R6/AESv3**. Obecny stack WGDOM (**pdf-lib w przeglądarce**) **nie wystarczy** bez warstwy preprocessingu.

---

## Wyniki PoC (wykonane lokalnie)

Artefakty: `audit/tauron-audit-2026-06-15/poc-*.pdf`, `zi-2026-library-poc-report.json`

| Biblioteka | Odczyt pól (encrypted) | Zapis `/V` 99/102/111 | pdf.js po zapisie | Zachowanie szyfrowania |
|------------|------------------------|------------------------|-------------------|-------------------------|
| **pikepdf** | PASS (59 pól) | **PASS** | **PASS** | domyślnie **usuwa**; z `Encryption(R=6)` **PASS** |
| **pypdf** | PASS | **PASS** | **PASS** | domyślnie **usuwa** |
| **pdf-lib** | FAIL (0 pól) | FAIL na encrypted | PASS po qpdf decrypt | N/A (output nieencrypted) |
| **qpdf** | N/A | **brak API fill** | — | decrypt/re-encrypt only |
| **PDFBox** | nie testowano* | wysoka szansa† | — | wymaga Javy |

\* Brak JRE w środowisku audytu.  
† PDFBox obsługuje StandardSecurityHandler R6 + `PDAcroForm.getField().setValue()` — zgodne z dokumentacją Apache i typem pliku.

### Wartości testowe (pdf.js, wszystkie PoC PASS)

```
Pole tekstowe 99  → Szkolna
Pole tekstowe 102 → 55
Pole tekstowe 111 → 5
```

Edge case (pikepdf): `Szarzyńskiego` / `155` / `83` — `/V` zapisane (w tym 3-cyfrowy numer budynku mimo comb=2 w FormMaker).

---

## Ranking bibliotek (szansa powodzenia)

### 1. pikepdf — **REKOMENDACJA #1**

- Otwiera encrypted PDF hasłem `""` (puste user password).
- Bezpośredni zapis `/V` + `NeedAppearances=true`.
- Po zapisie z `pikepdf.Encryption(owner="", user="", R=6)` plik pozostaje R6/AESv3.
- Mały wzrost rozmiaru (~910 KB vs 953 KB blank).
- Python — naturalny kandydat na **Edge Function subprocess** lub osobny worker (Vercel: ograniczenia serverless dla Pythona → rozważyć Supabase Edge + kontener / GitHub Action / worker Deno wywołujący zewnętrzny serwis).

### 2. pypdf — **REKOMENDACJA #2 (fallback Python)**

- `reader.decrypt("")` + `update_page_form_field_values(..., auto_regenerate=False)` — **PASS**.
- Domyślny zapis **usuwa szyfrowanie**; output ~1,19 MB.
- Możliwe ponowne szyfrowanie przez pikepdf/qpdf po fill.
- Prostsze API niż ręczna manipulacja pikepdf, ale gorszy profil pliku wyjściowego.

### 3. qpdf + pdf-lib — **REKOMENDACJA #3 (stay in Node/TS)**

- Pipeline: `qpdf --decrypt` → pdf-lib fill (59 pól, PASS) → opcjonalnie `qpdf --encrypt`.
- **Plus:** reuse pdf-lib już w repo (`generate-pdf.ts`).
- **Minus:** 3 kroki, binarka qpdf w deploy, brak jednego oficjalnego API fill, re-encrypt wymaga doprecyzowania parametrów R6/P.

### 4. PDFBox — **REKOMENDACJA #4 (Java stack)**

- Teoretycznie PASS dla tego typu pliku (AcroForm + empty password + R6).
- Wymaga JRE w runtime — cięższe operacyjnie niż pikepdf dla WGDOM.

### 5. pdf-lib (samodzielnie) — **NIE**

- `ignoreEncryption: true` → **0 pól AcroForm** → brak `setText`.
- **Blokada prod** potwierdzona; to nie bug mapowania, tylko brak obsługi encrypted AcroForm.

---

## Minimalny PoC (do powtórzenia)

```python
# audit/tauron-audit-2026-06-15/_readonly-pikepdf-poc.py
import pikepdf
from pikepdf import Name

TARGET = {
    "Pole tekstowe 99": "Szkolna",
    "Pole tekstowe 102": "55",
    "Pole tekstowe 111": "5",
}

with pikepdf.open("tauron-zi-official.ashx", password="") as pdf:
    pdf.Root.AcroForm[Name("/NeedAppearances")] = True

    def set_field(field, name, value):
        if str(field.get("/T", "")) == name:
            field[Name("/V")] = value
            return True
        if "/Kids" in field:
            return any(set_field(k, name, value) for k in field.Kids)
        return False

    for n, v in TARGET.items():
        for f in pdf.Root.AcroForm.Fields:
            set_field(f, n, v)

    pdf.save(
        "poc-pikepdf-encrypted-out.pdf",
        encryption=pikepdf.Encryption(owner="", user="", R=6),
    )
```

Weryfikacja: pdf.js `getFieldObjects()` na output — wartości jak wyżej.

Alternatywa Node:

```bash
qpdf --decrypt --password= tauron-zi-official.ashx decrypted.pdf
# pdf-lib fill → poc-pdflib-decrypted.pdf  (PASS w PoC)
```

---

## Ryzyka

| Ryzyko | Poziom | Uwagi |
|--------|--------|-------|
| **Widoczność w Edge/Chrome/Adobe** | ŚREDNI | PoC potwierdza `/V`, nie render wizualny. Ustawiono `NeedAppearances=true`; ręczny ZI w Edge działa — wymaga **P0 smoke wizualny** przed prod. |
| **Pole 102 — comb, limit 2 znaki** | ŚREDNI | FormMaker: `comb=true`, `charLimit=2`. Programowy zapis `155` przechodzi w `/V`, ale viewer może obciąć/wyświetlić źle. Numery budynku >2 cyfry — edge case. |
| **Uppercase FormMaker** | NISKI | Skrypt `toUpperCase()` w FormMaker — przy otwarciu w Adobe może się wykonać; przy samym `/V` bez JS — bez zmian. |
| **Usage Rights / UR3** | NISKI | Oryginał ma UR; zapis biblioteką może je usunąć — nie blokuje fill, może wpływać na Adobe Reader. |
| **Podpisy cyfrowe (Pole podpisu 3/4)** | NISKI dla §4 | Fill pól tekstowych nie dotyka pól podpisu; invalidacja podpisu dotyczyłaby całego dokumentu po głębokiej modyfikacji. |
| **pdf-lib-only w browserze** | **WYSOKI blocker** | Bez zmiany stacku fill niemożliwy na encrypted blank. |
| **Deploy Python/pikepdf** | ŚREDNI | Vercel frontend nie uruchomi pikepdf; fill musi być **server-side** (Edge Function, worker, CI) lub pipeline qpdf+pdf-lib. |
| **Linearization warning qpdf** | NISKI | `--check` zgłasza warning linearized — nie blokuje fill. |

---

## Rekomendacja wdrożenia (bez implementacji)

1. **Zamknij** ścieżkę LiveCycle / stary szablon — już zaakceptowane.
2. **Wymień** szablon KV na blank `zi.ashx` (Tauron 2026).
3. **Nowy generator** `generatePdfZiTauron2026()` — osobna gałąź, mapping:
   - `JOB_STREET` → `Pole tekstowe 99`
   - `JOB_BUILDING` → `Pole tekstowe 102` (walidacja max 2 znaki w UI WGDOM)
   - `JOB_APARTMENT` → `Pole tekstowe 111`
4. **Silnik fill:** **pikepdf** (preferowany) — server-side Python z pustym hasłem + re-encrypt R6.
5. **Przed prod GO:** otwórz `poc-pikepdf-encrypted-out.pdf` w Edge + Adobe — potwierdź **widoczność** §4 (nie tylko pdf.js).
6. **Fallback operacyjny:** ręczne uzupełnienie §4 w Edge (już PASS u użytkownika) lub Adobe PDF Services API.

**Nie wracać do:** XFA, AP graft, ciphertext, flatten, `TextField2[*]`, hybrid LiveCycle path.

---

## Pliki audytu

| Plik | Opis |
|------|------|
| `ZI-2026-LIBRARY-AUDIT-REPORT.md` | Ten raport |
| `zi-2026-library-poc-report.json` | Surowe wyniki PoC |
| `_readonly-library-poc.mjs` | Orchestrator PoC |
| `_readonly-pikepdf-poc.py` / `_readonly-pypdf-poc.py` | Skrypty Python |
| `poc-pikepdf-encrypted-out.pdf` | Output z szyfrowaniem R6 |
| `poc-pdflib-decrypted.pdf` | Output pdf-lib po qpdf decrypt |
