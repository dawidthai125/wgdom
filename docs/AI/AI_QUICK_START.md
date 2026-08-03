# AI QUICK START — WGDOM (1 strona)

> **Dla:** nowego ChatGPT / Cursor Agent  
> **Data:** 2026-08-03 · **STATUS:** **ACTIVE**  
> **★★ Pełny SSOT:** [`MASTER-AI-HANDOFF.md`](MASTER-AI-HANDOFF.md)

---

### 1. Gdzie jesteśmy?

**Utrzymanie.** Stabilization Window **ACTIVE**. Protected Core **GREEN**.  
**WAITING FOR NEXT OWNER GO.** Tip produkcji = **MARKET-SYNC-01 P2 FULLY CLOSED** (flaga OFF).  
Docs HEAD = **`7325c773`**.

### 2. Co jest produkcją?

| | |
|--|--|
| **Version** | **2.65.95** |
| **Commit** | **`18830c1`** |
| **Docs HEAD** | **`7325c773`** |
| **PV** | **GREEN** (MS P2 tip) |
| Tip SSOT | [`09_PRODUCTION_BASELINE.md`](09_PRODUCTION_BASELINE.md) · live `version.json` |

### 3. Co właśnie domknięto (istotne)?

- **AI-COST-02 I3** — Competitiveness RO · flaga OFF · **FULLY CLOSED** · docs `99969f33`  
- **MARKET-SYNC-01 P3-A** — mock ingest spine · flaga OFF · Legal OPEN · **CLOSED** · `7325c773`  
- **MARKET-SYNC-01 P2** — PriceHistory · Δ% · Coverage · flaga OFF · **FULLY CLOSED** · tip `18830c1`  
- **SMART-PRICING-01 P0–P2** · **GLOBAL-UX-02** · **AI-DOC-DETECTION** — **CLOSED**

### 4. Co jest WIP / NEXT?

- **WAITING FOR NEXT OWNER GO** — NEXT EPIC = **NONE** started  
- **MS P3** EPIC: P3-A done · P3-B **tylko** po Owner GO → AUDIT → DF (+ Legal PASS dla live)  
- Backlog: SMART P3 · CM-04 P3 · Wave 2 · GAP-B / TP200B  
- Bid Time-Load Guard = WIP lokalny (nie tip)

### 5. Od czego zacząć?

```text
1. MASTER-AI-HANDOFF.md   ← stan świata
2. 09 + version.json
3. AI_ENTRY.md
4. PAYROLL_SAFETY_GATE.md (przed kodem)
```

**Nie** czytaj historii czatu. **Nie** hardcoduj wersji poza `09`. **Nie** startuj P3-B bez GO.
