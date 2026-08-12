# WORK-RATE-SELECTIVE-RESEARCH-02

> **STATUS:** **IMPLEMENTATION COMPLETE**  
> **DATA:** 2026-08-12  
> **Owner GO:** P2 Selective Work Rate Research  
> **Wymaga:** `WORK_RATE_LEGAL_GATE` = **PASS**

---

## Cel

Selective research stawki robocizny **ONE WORK AT A TIME** (workId + unit), analogicznie do Price Memory materiałów — **CACHE-FIRST**, bez FULL CATALOGUE.

## Flow

```text
workId + unit
  → lookup OUR RATE
  → CURRENT? REUSE (ZERO HTTP)
  → MISSING / STALE / force refresh
  → 4 źródła (KB.pl · CennikRemontow.pl · SCCOT · Extradom)
  → QUALIFY (labor-only · unit · region · reject package/promo/materiał+)
  → MEDIANA (prefer Wrocław → Dolny Śląsk → Polska)
  → CANDIDATE (nie auto OUR RATE)
  → OWNER ACCEPT
  → OUR RATE + historia (SOURCE + OUR)
  → REUSE
```

## Źródła

| Źródło | Rola | API |
|--------|------|-----|
| KB.pl | PRIMARY | BRAK — Edge HTML selective |
| CennikRemontow.pl | PRIMARY | BRAK |
| SCCOT | SECONDARY | BRAK |
| Extradom | SECONDARY | BRAK |

Dowody zgód: **OWNER HELD** · nie w repo.

## Edge

`POST /make-server-0afb8820/work-rate-selective-lookup`

- allowlista hostów: kb.pl · sccot.pl · extradom.pl · cennikremontow.pl  
- klient **nie** podaje arbitralnego URL (anti-SSRF)  
- 1 URL / źródło / robota · body cap 400 KB  

## Anti-storm

- dedupe identity `workId|unit`  
- single-flight  
- cooldown 60 s (Owner force może ominąć)  
- brak masowego researchu przy otwarciu katalogu  

## Zakazy (LOCKED)

- FULL CATALOGUE / category crawl / preload  
- auto OUR RATE bez Accept  
- `companyPricePln` jako seed/fallback  
- zapis do `marketQuoteHistory` / Price Memory  
- przełączenie Bid / Offer / BOQ (P7)  

## Kluczowe pliki

| Plik | Rola |
|------|------|
| `work-rate-research.ts` | orchestracja |
| `work-rate-qualify.ts` | qualification + mediana |
| `work-rate-selective-lookup-client.ts` | Edge / fixture / null |
| `work-rate-source-html-parse.ts` | parse (fixture markers + fail-soft) |
| `work-rate-accept.ts` | Owner Accept |
| `work-rate-research-cooldown.ts` | anti-storm |
| `OurWorkRateCatalogPanel.tsx` | CTA „Aktualizuj stawkę rynkową” + Accept |

## Test

`npx vite-node scripts/test-work-rate-selective-research-02.mjs`

Closeout: [`WORK-RATE-SELECTIVE-RESEARCH-02-CLOSEOUT.md`](./WORK-RATE-SELECTIVE-RESEARCH-02-CLOSEOUT.md)
