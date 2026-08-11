/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: fixtures/zygmunt-invoices-seed-2026.json (Zygmunt Włodarczyk invoices).
 * Semantics: HISTORICAL PURCHASE LAST price per materialKey · origin wgdom.
 * Regenerator: scripts/generate-zygmunt-invoice-purchase-seed.mjs
 */

export const ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT = "2026-08-11T12:12:07.506Z" as const;

export const ZYGMUNT_INVOICE_PURCHASE_SEED_META = {
  supplier: "Zygmunt Włodarczyk",
  sourceFiles: [
    "FS_10077_1164_2026_M.pdf",
    "FS_10077_2044_2026_M.pdf",
    "FS_10077_2923_2026_M.pdf",
  ],
  fixtureLineCount: 1072,
  uniqueMaterialCount: 372,
  rejectedParseCount: 394,
  integrityFailCount: 77,
} as const;

export type ZygmuntInvoicePurchaseSeedRow = {
  materialKey: string;
  catalogWorkId: string;
  namePl: string;
  unit: "m2" | "mb" | "szt" | "rbh" | "m3" | "kpl" | "kg" | "l";
  netUnitPricePln: number;
  observedAt: string;
  productIdentityKey: string;
  productCode: string | null;
};

export const ZYGMUNT_INVOICE_PURCHASE_SEED: readonly ZygmuntInvoicePurchaseSeedRow[] = [
  {
    "materialKey": "mat.glue_etics",
    "catalogWorkId": "cw.etics.substrate",
    "namePl": "25KG MAPEI-MAPETHERM DO SIATKI",
    "unit": "kg",
    "netUnitPricePln": 27.99,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klej",
    "productCode": "KLEJ"
  },
  {
    "materialKey": "mat.inv.0_6mm39003",
    "catalogWorkId": "cw.inv.0_6mm39003",
    "namePl": "OSTRZA ŁAMANE SAMURAJ 0,6 18MM",
    "unit": "szt",
    "netUnitPricePln": 15.88,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0,6mm39003",
    "productCode": "0,6MM39003"
  },
  {
    "materialKey": "mat.inv.007984_8",
    "catalogWorkId": "cw.inv.007984_8",
    "namePl": "TARCZA LISTKOWA 40-120 ŚR.125",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:007984/8",
    "productCode": "007984/8"
  },
  {
    "materialKey": "mat.inv.0319_a",
    "catalogWorkId": "cw.inv.0319_a",
    "namePl": "TAŚMA PAKOWA 48/60K MUROOLL325",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0319,-a",
    "productCode": "0319,-A"
  },
  {
    "materialKey": "mat.inv.0439_cor",
    "catalogWorkId": "cw.inv.0439_cor",
    "namePl": "TAŚMA Z WŁÓKNA SZKL. 50MMX25MB",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0439-cor",
    "productCode": "0439-COR"
  },
  {
    "materialKey": "mat.inv.0439_e",
    "catalogWorkId": "cw.inv.0439_e",
    "namePl": "TAŚMA Z WŁÓKNA SZKL.150MMX25MB",
    "unit": "szt",
    "netUnitPricePln": 17.44,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0439-e",
    "productCode": "0439-E"
  },
  {
    "materialKey": "mat.inv.0439_f",
    "catalogWorkId": "cw.inv.0439_f",
    "namePl": "TAŚMA Z WŁÓKNA SZKL. 50MMX25MB",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0439-f",
    "productCode": "0439-F"
  },
  {
    "materialKey": "mat.inv.0579",
    "catalogWorkId": "cw.inv.0579",
    "namePl": "11/28 SIATECZKA ŚCIERNA 40-240",
    "unit": "szt",
    "netUnitPricePln": 1.13,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0579",
    "productCode": "0579"
  },
  {
    "materialKey": "mat.inv.06002schul",
    "catalogWorkId": "cw.inv.06002schul",
    "namePl": "TAŚMA MASKUJĄCA UV NIEB.48X50M",
    "unit": "szt",
    "netUnitPricePln": 17.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06002schul",
    "productCode": "06002SCHUL"
  },
  {
    "materialKey": "mat.inv.06003schul",
    "catalogWorkId": "cw.inv.06003schul",
    "namePl": "TAŚMA MASKUJĄCA UV NIEB.38X50M",
    "unit": "szt",
    "netUnitPricePln": 14.33,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06003schul",
    "productCode": "06003SCHUL"
  },
  {
    "materialKey": "mat.inv.06004schul",
    "catalogWorkId": "cw.inv.06004schul",
    "namePl": "TAŚMA MASKUJĄCA UV NIEB.30X50M",
    "unit": "szt",
    "netUnitPricePln": 11.09,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06004schul",
    "productCode": "06004SCHUL"
  },
  {
    "materialKey": "mat.inv.06005schul",
    "catalogWorkId": "cw.inv.06005schul",
    "namePl": "TAŚMA MASKUJĄCA UV NIEB.25X50M",
    "unit": "szt",
    "netUnitPricePln": 9.34,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06005schul",
    "productCode": "06005SCHUL"
  },
  {
    "materialKey": "mat.inv.06006schul",
    "catalogWorkId": "cw.inv.06006schul",
    "namePl": "TAŚMA MASKUJĄCA UV NIEB.19X50M",
    "unit": "szt",
    "netUnitPricePln": 7.16,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06006schul",
    "productCode": "06006SCHUL"
  },
  {
    "materialKey": "mat.inv.0628_k",
    "catalogWorkId": "cw.inv.0628_k",
    "namePl": "FOLIA MALARSKA 4*5M MOCNA",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:0628-k",
    "productCode": "0628-K"
  },
  {
    "materialKey": "mat.inv.06370",
    "catalogWorkId": "cw.inv.06370",
    "namePl": "DRZWICZKI BIAŁE PCV 25X50CM",
    "unit": "szt",
    "netUnitPricePln": 43.03,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:06370",
    "productCode": "06370"
  },
  {
    "materialKey": "mat.inv.1_5kg",
    "catalogWorkId": "cw.inv.1_5kg",
    "namePl": "SEMIN-FIBRELASTIC MASA REPERAC",
    "unit": "szt",
    "netUnitPricePln": 40.41,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:1,5kg",
    "productCode": "1,5KG"
  },
  {
    "materialKey": "mat.inv.1_9simewoo",
    "catalogWorkId": "cw.inv.1_9simewoo",
    "namePl": "DREW-DACH IMPR.DO DR.KONSTR1KG",
    "unit": "szt",
    "netUnitPricePln": 19.66,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:1:9simewoo",
    "productCode": "1:9SIMEWOO"
  },
  {
    "materialKey": "mat.inv.1000ml",
    "catalogWorkId": "cw.inv.1000ml",
    "namePl": "F200 PREP.DO CZYSZCZENIA WC",
    "unit": "szt",
    "netUnitPricePln": 32.35,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:1000ml",
    "productCode": "1000ML"
  },
  {
    "materialKey": "mat.inv.10szt",
    "catalogWorkId": "cw.inv.10szt",
    "namePl": "WORKI NA GRUZ 90-100 LITRÓW",
    "unit": "szt",
    "netUnitPricePln": 12.85,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:10szt.",
    "productCode": "10SZT."
  },
  {
    "materialKey": "mat.inv.110g_m2",
    "catalogWorkId": "cw.inv.110g_m2",
    "namePl": "AL FOLIA PAROIZOL.ALUMINIOWA 110",
    "unit": "m2",
    "netUnitPricePln": 3.4,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:110g/m2",
    "productCode": "110G/M2"
  },
  {
    "materialKey": "mat.inv.112952",
    "catalogWorkId": "cw.inv.112952",
    "namePl": "SOUDAL-PIANA MONTAŻ.66% 750ML",
    "unit": "szt",
    "netUnitPricePln": 26.47,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:112952",
    "productCode": "112952"
  },
  {
    "materialKey": "mat.inv.114142maxi",
    "catalogWorkId": "cw.inv.114142maxi",
    "namePl": "SOUDAL-PIANA PISTOLETOWA 750ML",
    "unit": "szt",
    "netUnitPricePln": 30.23,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:114142maxi",
    "productCode": "114142MAXI"
  },
  {
    "materialKey": "mat.inv.120szt_pal",
    "catalogWorkId": "cw.inv.120szt_pal",
    "namePl": "SUPOREX 10*24*59600 DOKŁADNY",
    "unit": "szt",
    "netUnitPricePln": 6.88,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:120szt/pal",
    "productCode": "120SZT/PAL"
  },
  {
    "materialKey": "mat.inv.121101750",
    "catalogWorkId": "cw.inv.121101750",
    "namePl": "SOUDAL-PIANA Z APL.SOUDA BOND EASY",
    "unit": "szt",
    "netUnitPricePln": 27.84,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:121101750",
    "productCode": "121101750"
  },
  {
    "materialKey": "mat.inv.121105750",
    "catalogWorkId": "cw.inv.121105750",
    "namePl": "SOUDAL-PIANA PISTOL.YELLOWLATO",
    "unit": "szt",
    "netUnitPricePln": 26.47,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:121105750",
    "productCode": "121105750"
  },
  {
    "materialKey": "mat.inv.130457",
    "catalogWorkId": "cw.inv.130457",
    "namePl": "SOUDAL-PIANA PIST.PROFIL 750ML",
    "unit": "szt",
    "netUnitPricePln": 19.46,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:130457",
    "productCode": "130457"
  },
  {
    "materialKey": "mat.inv.130602soud",
    "catalogWorkId": "cw.inv.130602soud",
    "namePl": "PIANA WĘŻYKOWA OKNA,DRZWI750ML",
    "unit": "szt",
    "netUnitPricePln": 16.64,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:130602soud",
    "productCode": "130602SOUD"
  },
  {
    "materialKey": "mat.inv.131565soud",
    "catalogWorkId": "cw.inv.131565soud",
    "namePl": "PIANA WĘŻYKOWA OKNA,DRZWI750ML",
    "unit": "szt",
    "netUnitPricePln": 16.64,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:131565soud",
    "productCode": "131565SOUD"
  },
  {
    "materialKey": "mat.inv.135301",
    "catalogWorkId": "cw.inv.135301",
    "namePl": "SOUDAL-PIANA DOORS PL DV 750ML",
    "unit": "szt",
    "netUnitPricePln": 28.15,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:135301",
    "productCode": "135301"
  },
  {
    "materialKey": "mat.inv.137657",
    "catalogWorkId": "cw.inv.137657",
    "namePl": "AKRYL ŚCIANY,SUFITY BIAŁY280ML",
    "unit": "szt",
    "netUnitPricePln": 9.83,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:137657",
    "productCode": "137657"
  },
  {
    "materialKey": "mat.inv.137687",
    "catalogWorkId": "cw.inv.137687",
    "namePl": "AKRYL SZPACHLOWY LEKKI 280ML",
    "unit": "szt",
    "netUnitPricePln": 13.61,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:137687",
    "productCode": "137687"
  },
  {
    "materialKey": "mat.inv.137688",
    "catalogWorkId": "cw.inv.137688",
    "namePl": "AKRYL BŁYSKAWICZNY TURBO 280ML",
    "unit": "szt",
    "netUnitPricePln": 11.35,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:137688",
    "productCode": "137688"
  },
  {
    "materialKey": "mat.inv.144szt_pal",
    "catalogWorkId": "cw.inv.144szt_pal",
    "namePl": "SUPOREX 8*24*59600 DOKŁADNY",
    "unit": "szt",
    "netUnitPricePln": 5.67,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:144szt/pal",
    "productCode": "144SZT/PAL"
  },
  {
    "materialKey": "mat.inv.1500_c",
    "catalogWorkId": "cw.inv.1500_c",
    "namePl": "SOUDAL-USZCZELNIACZ DO PIECÓW",
    "unit": "szt",
    "netUnitPricePln": 24.2,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:1500'c",
    "productCode": "1500'C"
  },
  {
    "materialKey": "mat.inv.16_120",
    "catalogWorkId": "cw.inv.16_120",
    "namePl": "TARCZA FIBRA DO KAMIENIA 125MM",
    "unit": "szt",
    "netUnitPricePln": 12.02,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:16-120",
    "productCode": "16-120"
  },
  {
    "materialKey": "mat.inv.18799stahl",
    "catalogWorkId": "cw.inv.18799stahl",
    "namePl": "UCHWYT Z OGRANICZ.GŁĘBOKOŚCI",
    "unit": "szt",
    "netUnitPricePln": 28.21,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:18799stahl",
    "productCode": "18799STAHL"
  },
  {
    "materialKey": "mat.inv.1mb",
    "catalogWorkId": "cw.inv.1mb",
    "namePl": "KL.4.8 PRĘT GWINTOWANY OCYNKOW. 10MM",
    "unit": "szt",
    "netUnitPricePln": 5.75,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:1mb",
    "productCode": "1MB"
  },
  {
    "materialKey": "mat.inv.20_20mm",
    "catalogWorkId": "cw.inv.20_20mm",
    "namePl": "NAROŻNIK ALUM.PERFOR.1/2 2.5M",
    "unit": "szt",
    "netUnitPricePln": 4.16,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:20*20mm",
    "productCode": "20*20MM"
  },
  {
    "materialKey": "mat.inv.200szt_op",
    "catalogWorkId": "cw.inv.200szt_op",
    "namePl": "SEMIN-BLACHOWKR.TEXY 3,5X9,5MM",
    "unit": "szt",
    "netUnitPricePln": 11.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:200szt/op.",
    "productCode": "200SZT/OP."
  },
  {
    "materialKey": "mat.inv.20510",
    "catalogWorkId": "cw.inv.20510",
    "namePl": "ZAPAS MICROLINE PRO 10CM R17MM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:20510",
    "productCode": "20510"
  },
  {
    "materialKey": "mat.inv.20kg",
    "catalogWorkId": "cw.inv.20kg",
    "namePl": "GX-01 EURO-MIX GŁADŹ GIPS. ŚN.BIAŁA",
    "unit": "szt",
    "netUnitPricePln": 35.03,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:20kg",
    "productCode": "20KG"
  },
  {
    "materialKey": "mat.inv.23kg",
    "catalogWorkId": "cw.inv.23kg",
    "namePl": "MAPEI MAPEI-ULTRAPLAN ECO 20 1-10MM 26.64.10-00.1 1",
    "unit": "szt",
    "netUnitPricePln": 53.71,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:23kg",
    "productCode": "23KG"
  },
  {
    "materialKey": "mat.inv.24061_8_72",
    "catalogWorkId": "cw.inv.24061_8_72",
    "namePl": "BRZESZCZOT DO WYRZYNARKI BOSCH",
    "unit": "szt",
    "netUnitPricePln": 7.71,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:24061,8,72",
    "productCode": "24061,8,72"
  },
  {
    "materialKey": "mat.inv.25kg",
    "catalogWorkId": "cw.inv.25kg",
    "namePl": "M-5 CEMIX-ZAPRAWA MUR.,POSADZ,TYNK",
    "unit": "szt",
    "netUnitPricePln": 11.46,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:25kg",
    "productCode": "25KG"
  },
  {
    "materialKey": "mat.inv.26251",
    "catalogWorkId": "cw.inv.26251",
    "namePl": "ZAPAS MICROLINE PRO 25CM R17MM",
    "unit": "szt",
    "netUnitPricePln": 24.55,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:26251",
    "productCode": "26251"
  },
  {
    "materialKey": "mat.inv.290ml",
    "catalogWorkId": "cw.inv.290ml",
    "namePl": "SOUDAL-T-REX GOLD KLEJ HYBRYD. 128617",
    "unit": "szt",
    "netUnitPricePln": 21.93,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:290ml",
    "productCode": "290ML"
  },
  {
    "materialKey": "mat.inv.29256_62ma",
    "catalogWorkId": "cw.inv.29256_62ma",
    "namePl": "WIERTŁO DO BET.SDS-110-160X6MM",
    "unit": "szt",
    "netUnitPricePln": 15.7,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:29256-62ma",
    "productCode": "29256-62MA"
  },
  {
    "materialKey": "mat.inv.2x0_2_4mm2",
    "catalogWorkId": "cw.inv.2x0_2_4mm2",
    "namePl": "ZŁĄCZKA WAGO Z DŹWIGNIAMI2/10",
    "unit": "szt",
    "netUnitPricePln": 18.38,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:2x0,2-4mm2",
    "productCode": "2X0,2-4MM2"
  },
  {
    "materialKey": "mat.inv.2x5m",
    "catalogWorkId": "cw.inv.2x5m",
    "namePl": "FOLIA TYNK.OKIENNA PRZEŹROCZ",
    "unit": "szt",
    "netUnitPricePln": 12.47,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:2x5m",
    "productCode": "2X5M"
  },
  {
    "materialKey": "mat.inv.30450schul",
    "catalogWorkId": "cw.inv.30450schul",
    "namePl": "NÓŻ FORMOSA 18MM",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:30450schul",
    "productCode": "30450SCHUL"
  },
  {
    "materialKey": "mat.inv.30552schul",
    "catalogWorkId": "cw.inv.30552schul",
    "namePl": "OSTRZA ŁAMANE FORMOSA 0,5 18MM",
    "unit": "szt",
    "netUnitPricePln": 7.56,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:30552schul",
    "productCode": "30552SCHUL"
  },
  {
    "materialKey": "mat.inv.30x30mm",
    "catalogWorkId": "cw.inv.30x30mm",
    "namePl": "NAROŻNIK AL.PERFOROWANY 2,5-3M",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:30x30mm",
    "productCode": "30X30MM"
  },
  {
    "materialKey": "mat.inv.31362_382",
    "catalogWorkId": "cw.inv.31362_382",
    "namePl": "SZPACHELKA ODGIĘTA 40-60MM",
    "unit": "szt",
    "netUnitPricePln": 14.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:31362,382",
    "productCode": "31362,382"
  },
  {
    "materialKey": "mat.inv.31402f",
    "catalogWorkId": "cw.inv.31402f",
    "namePl": "SZPACHELKA ODGIĘTA 100 MM",
    "unit": "szt",
    "netUnitPricePln": 18.14,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:31402f",
    "productCode": "31402F"
  },
  {
    "materialKey": "mat.inv.36szt_1kg",
    "catalogWorkId": "cw.inv.36szt_1kg",
    "namePl": "KLEJ W LASKACH TERM.11MM*300MM",
    "unit": "szt",
    "netUnitPricePln": 1.52,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:36szt./1kg",
    "productCode": "36SZT./1KG"
  },
  {
    "materialKey": "mat.inv.36z19103ex",
    "catalogWorkId": "cw.inv.36z19103ex",
    "namePl": "TARCZA WIDIOWA DO DREWNA 125MM",
    "unit": "szt",
    "netUnitPricePln": 22.67,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:36z19103ex",
    "productCode": "36Z19103EX"
  },
  {
    "materialKey": "mat.inv.38mm",
    "catalogWorkId": "cw.inv.38mm",
    "namePl": "X 50M TAŚMA OCHRONNA ODP.NA PROM.UV MTPEBL_08008",
    "unit": "szt",
    "netUnitPricePln": 17.77,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:38mm",
    "productCode": "38MM"
  },
  {
    "materialKey": "mat.inv.400ml",
    "catalogWorkId": "cw.inv.400ml",
    "namePl": "SOUDAL-PIANA DWUSKŁADNIKOWA 2K",
    "unit": "szt",
    "netUnitPricePln": 36.98,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:400ml",
    "productCode": "400ML"
  },
  {
    "materialKey": "mat.inv.45014festa",
    "catalogWorkId": "cw.inv.45014festa",
    "namePl": "NOŻYCE INOX DO BLACHY POMARAŃ.",
    "unit": "szt",
    "netUnitPricePln": 18.14,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:45014festa",
    "productCode": "45014FESTA"
  },
  {
    "materialKey": "mat.inv.45227schul",
    "catalogWorkId": "cw.inv.45227schul",
    "namePl": "TAŚMA MALARSKA 38MM/50MB",
    "unit": "szt",
    "netUnitPricePln": 12.99,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:45227schul",
    "productCode": "45227SCHUL"
  },
  {
    "materialKey": "mat.inv.45610bawel",
    "catalogWorkId": "cw.inv.45610bawel",
    "namePl": "TAŚMA DWUSTR.DUO TAPE 50MM/10M",
    "unit": "szt",
    "netUnitPricePln": 18.32,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:45610bawel",
    "productCode": "45610BAWEŁ"
  },
  {
    "materialKey": "mat.inv.45761schul",
    "catalogWorkId": "cw.inv.45761schul",
    "namePl": "TAŚMA POMARAŃCZ.TYNK.48MMX50MB",
    "unit": "szt",
    "netUnitPricePln": 19.45,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:45761schul",
    "productCode": "45761SCHUL"
  },
  {
    "materialKey": "mat.inv.45886schul",
    "catalogWorkId": "cw.inv.45886schul",
    "namePl": "TAŚMA Z FOLIĄ BLUE MASK270/17M",
    "unit": "szt",
    "netUnitPricePln": 25.41,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:45886schul",
    "productCode": "45886SCHUL"
  },
  {
    "materialKey": "mat.inv.46925",
    "catalogWorkId": "cw.inv.46925",
    "namePl": "KUBALA-SMART LEVEL KLIPSY 3MM",
    "unit": "szt",
    "netUnitPricePln": 21.9,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:46925",
    "productCode": "46925"
  },
  {
    "materialKey": "mat.inv.48mm",
    "catalogWorkId": "cw.inv.48mm",
    "namePl": "X 50M TAŚMA OCHRONNA ODP.NA PROM.UV. MTPEBL 08022",
    "unit": "szt",
    "netUnitPricePln": 21.93,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:48mm",
    "productCode": "48MM"
  },
  {
    "materialKey": "mat.inv.4all064560",
    "catalogWorkId": "cw.inv.4all064560",
    "namePl": "KOŁEK UNIWERS.4ALL FI06 4,5X60",
    "unit": "szt",
    "netUnitPricePln": 0.6,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:4all064560",
    "productCode": "4ALL064560"
  },
  {
    "materialKey": "mat.inv.4all085060",
    "catalogWorkId": "cw.inv.4all085060",
    "namePl": "KOŁEK UNIWERS.4ALL FI08 5,0X60",
    "unit": "szt",
    "netUnitPricePln": 0.5,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:4all085060",
    "productCode": "4ALL085060"
  },
  {
    "materialKey": "mat.inv.4x5m",
    "catalogWorkId": "cw.inv.4x5m",
    "namePl": "00036 FOLIA TYNK.OKIENNA PRZEŹROCZ.",
    "unit": "szt",
    "netUnitPricePln": 17.87,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:4x5m",
    "productCode": "4X5M"
  },
  {
    "materialKey": "mat.inv.5_4_6_4",
    "catalogWorkId": "cw.inv.5_4_6_4",
    "namePl": "OBEJMA RURY PCV 40-50MM Z GUMĄ",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:5/4',6/4'",
    "productCode": "5/4',6/4'"
  },
  {
    "materialKey": "mat.inv.50",
    "catalogWorkId": "cw.inv.50",
    "namePl": "SZT. RĘKAWICE EXPERT GRIP",
    "unit": "szt",
    "netUnitPricePln": 31.43,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:50",
    "productCode": "50"
  },
  {
    "materialKey": "mat.inv.50086schul",
    "catalogWorkId": "cw.inv.50086schul",
    "namePl": "SZPACHELKA WIELOF.5IN ONE 75MM",
    "unit": "szt",
    "netUnitPricePln": 14.68,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:50086schul",
    "productCode": "50086SCHUL"
  },
  {
    "materialKey": "mat.inv.500ml",
    "catalogWorkId": "cw.inv.500ml",
    "namePl": "PŁYN CZYSZCZĄCY DO PIST.I PIAN",
    "unit": "szt",
    "netUnitPricePln": 18.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:500ml",
    "productCode": "500ML"
  },
  {
    "materialKey": "mat.inv.50150schul",
    "catalogWorkId": "cw.inv.50150schul",
    "namePl": "SZPACHELKA NIERDZ.KAI 2K 150MM",
    "unit": "szt",
    "netUnitPricePln": 20.41,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:50150schul",
    "productCode": "50150SCHUL"
  },
  {
    "materialKey": "mat.inv.50164schul",
    "catalogWorkId": "cw.inv.50164schul",
    "namePl": "SZPACHLA PLANO ALU 2K 500MM",
    "unit": "szt",
    "netUnitPricePln": 39.73,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:50164schul",
    "productCode": "50164SCHUL"
  },
  {
    "materialKey": "mat.inv.50165schul",
    "catalogWorkId": "cw.inv.50165schul",
    "namePl": "SZPACHLA PLANO ALU 2K 600MM",
    "unit": "szt",
    "netUnitPricePln": 44.07,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:50165schul",
    "productCode": "50165SCHUL"
  },
  {
    "materialKey": "mat.inv.5kg",
    "catalogWorkId": "cw.inv.5kg",
    "namePl": "MAPEI MAPEI-LAMPOCEM ZAPR.SZYBKOWIĄ.",
    "unit": "szt",
    "netUnitPricePln": 23.15,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:5kg",
    "productCode": "5KG"
  },
  {
    "materialKey": "mat.inv.750ml",
    "catalogWorkId": "cw.inv.750ml",
    "namePl": "EASY SOUDAL-PIANA PISTOL.SOUDABOND 124786 GUN",
    "unit": "szt",
    "netUnitPricePln": 26.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:750ml",
    "productCode": "750ML"
  },
  {
    "materialKey": "mat.inv.750mlsouda",
    "catalogWorkId": "cw.inv.750mlsouda",
    "namePl": "PIANA WĘŻYKOWA ZIMOWA -10' 131565",
    "unit": "szt",
    "netUnitPricePln": 17.39,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:750mlsouda",
    "productCode": "750MLSOUDA"
  },
  {
    "materialKey": "mat.inv.791001exto",
    "catalogWorkId": "cw.inv.791001exto",
    "namePl": "UCHWYT MAGNET.DO GROTÓW 60MM",
    "unit": "szt",
    "netUnitPricePln": 9.08,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:791001exto",
    "productCode": "791001EXTO"
  },
  {
    "materialKey": "mat.inv.80049extol",
    "catalogWorkId": "cw.inv.80049extol",
    "namePl": "NÓŻ METALOWY 18MM",
    "unit": "szt",
    "netUnitPricePln": 11.35,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:80049extol",
    "productCode": "80049EXTOL"
  },
  {
    "materialKey": "mat.inv.83406total",
    "catalogWorkId": "cw.inv.83406total",
    "namePl": "SZPACHELKA PROSTA NRDZ. 40MM",
    "unit": "szt",
    "netUnitPricePln": 12.02,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:83406total",
    "productCode": "83406TOTAL"
  },
  {
    "materialKey": "mat.inv.8703041ext",
    "catalogWorkId": "cw.inv.8703041ext",
    "namePl": "TARCZA DIAM.THIN CUT 115/1,2MM",
    "unit": "szt",
    "netUnitPricePln": 43.41,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:8703041ext",
    "productCode": "8703041EXT"
  },
  {
    "materialKey": "mat.inv.8806203dre",
    "catalogWorkId": "cw.inv.8806203dre",
    "namePl": "BRZESZCZOTY DO LISICY/3/ 150MM",
    "unit": "szt",
    "netUnitPricePln": 30.09,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:8806203dre",
    "productCode": "8806203DRE"
  },
  {
    "materialKey": "mat.inv.8816113ext",
    "catalogWorkId": "cw.inv.8816113ext",
    "namePl": "KLUCZ PŁ.-OCZK.Z GRZECHOT.13MM",
    "unit": "szt",
    "netUnitPricePln": 23.08,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:8816113ext",
    "productCode": "8816113EXT"
  },
  {
    "materialKey": "mat.inv.8816304ext",
    "catalogWorkId": "cw.inv.8816304ext",
    "namePl": "KLUCZ SZWEDZKI 200MM",
    "unit": "szt",
    "netUnitPricePln": 37.76,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:8816304ext",
    "productCode": "8816304EXT"
  },
  {
    "materialKey": "mat.inv.8831120ext",
    "catalogWorkId": "cw.inv.8831120ext",
    "namePl": "SZCZYPCE DO IZOLACJI 0,6-2,6MM",
    "unit": "szt",
    "netUnitPricePln": 18.16,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:8831120ext",
    "productCode": "8831120EXT"
  },
  {
    "materialKey": "mat.inv.96_paleta",
    "catalogWorkId": "cw.inv.96_paleta",
    "namePl": "SUPOREX 12*24*59600 DOKŁADNY",
    "unit": "szt",
    "netUnitPricePln": 7.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:96/paleta",
    "productCode": "96/PALETA"
  },
  {
    "materialKey": "mat.inv.a12759",
    "catalogWorkId": "cw.inv.a12759",
    "namePl": "SEMIN-WAŁEK DO GŁADZI 220MM",
    "unit": "szt",
    "netUnitPricePln": 68.67,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:a12759",
    "productCode": "A12759"
  },
  {
    "materialKey": "mat.inv.aceton",
    "catalogWorkId": "cw.inv.aceton",
    "namePl": "0.5L",
    "unit": "szt",
    "netUnitPricePln": 9.63,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:aceton....",
    "productCode": "ACETON...."
  },
  {
    "materialKey": "mat.inv.air000012",
    "catalogWorkId": "cw.inv.air000012",
    "namePl": "SEMIN-SOFT GŁADŹ POLIMER.20 KG",
    "unit": "szt",
    "netUnitPricePln": 50.88,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:air000012",
    "productCode": "AIR000012"
  },
  {
    "materialKey": "mat.inv.altax_impregnat",
    "catalogWorkId": "cw.inv.altax_impregnat",
    "namePl": "DO DREWNA0,75L",
    "unit": "szt",
    "netUnitPricePln": 24.49,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:altax-impregnat",
    "productCode": "ALTAX-IMPREGNAT"
  },
  {
    "materialKey": "mat.inv.arkadia",
    "catalogWorkId": "cw.inv.arkadia",
    "namePl": "RĘKAWICE EXPERT SPANDER",
    "unit": "szt",
    "netUnitPricePln": 7.56,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:arkadia",
    "productCode": "ARKADIA"
  },
  {
    "materialKey": "mat.inv.aspen",
    "catalogWorkId": "cw.inv.aspen",
    "namePl": "SZPACHLÓWKA UNIWERSALNA 250G",
    "unit": "szt",
    "netUnitPricePln": 14.37,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:aspen",
    "productCode": "ASPEN"
  },
  {
    "materialKey": "mat.inv.b_wfs_4213",
    "catalogWorkId": "cw.inv.b_wfs_4213",
    "namePl": "BLACHOWKR.SAMOWIER.4,2/13-25MM",
    "unit": "szt",
    "netUnitPricePln": 7.76,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:b-wfs-4213",
    "productCode": "B-WFS-4213"
  },
  {
    "materialKey": "mat.inv.b_ws3525",
    "catalogWorkId": "cw.inv.b_ws3525",
    "namePl": "BLACHOWKR.SAMOWIER.25MM/200SZT",
    "unit": "szt",
    "netUnitPricePln": 14.37,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:b-ws3525",
    "productCode": "B-WS3525"
  },
  {
    "materialKey": "mat.inv.b_ws3535",
    "catalogWorkId": "cw.inv.b_ws3535",
    "namePl": "BLACHOWKR.SAMOWIER.35MM/160SZT",
    "unit": "szt",
    "netUnitPricePln": 15.98,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:b-ws3535",
    "productCode": "B-WS3535"
  },
  {
    "materialKey": "mat.inv.bata03",
    "catalogWorkId": "cw.inv.bata03",
    "namePl": "BATERIA ALKALICZNA 1,5V AAA",
    "unit": "szt",
    "netUnitPricePln": 1.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:bata03",
    "productCode": "BATA03"
  },
  {
    "materialKey": "mat.inv.bitudarowy",
    "catalogWorkId": "cw.inv.bitudarowy",
    "namePl": "KOŃCÓWKA KRZYŻOWA PHPZ1-2 25MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:bitudarowy",
    "productCode": "BITUDAROWY"
  },
  {
    "materialKey": "mat.inv.bpi_m_m",
    "catalogWorkId": "cw.inv.bpi_m_m",
    "namePl": "BRZESZCZOT DREWNO/METAL",
    "unit": "szt",
    "netUnitPricePln": 1.13,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:bpi-m-m",
    "productCode": "BPI-M-M"
  },
  {
    "materialKey": "mat.inv.cd_60",
    "catalogWorkId": "cw.inv.cd_60",
    "namePl": "0,5 PROFIL GŁÓWNY CD-60*27 3,0MB",
    "unit": "szt",
    "netUnitPricePln": 9.09,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:cd-60",
    "productCode": "CD-60"
  },
  {
    "materialKey": "mat.inv.cs",
    "catalogWorkId": "cw.inv.cs",
    "namePl": "06120 WKRĘT HARTOW.MOSIĘŻNY6,0X120MM",
    "unit": "szt",
    "netUnitPricePln": 0.53,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:cs",
    "productCode": "CS"
  },
  {
    "materialKey": "mat.inv.ct",
    "catalogWorkId": "cw.inv.ct",
    "namePl": "05080 WKRĘT HARTOW.MOSIĘŻNY 5,0X80MM",
    "unit": "szt",
    "netUnitPricePln": 0.24,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ct",
    "productCode": "CT"
  },
  {
    "materialKey": "mat.inv.cz_gr_ziel",
    "catalogWorkId": "cw.inv.cz_gr_ziel",
    "namePl": "OŁÓWEK STOL.-MURARSKI 240MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:cz.gr.ziel",
    "productCode": "CZ.GR.ZIEL"
  },
  {
    "materialKey": "mat.inv.czarne",
    "catalogWorkId": "cw.inv.czarne",
    "namePl": "WIADRO BUDOWL.PLASTIKOWE 5L.",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:czarne",
    "productCode": "CZARNE"
  },
  {
    "materialKey": "mat.inv.db_1674",
    "catalogWorkId": "cw.inv.db_1674",
    "namePl": "MAMUT GLUE BIAŁY 290ML",
    "unit": "szt",
    "netUnitPricePln": 28.73,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:db-1674",
    "productCode": "DB-1674"
  },
  {
    "materialKey": "mat.inv.do",
    "catalogWorkId": "cw.inv.do",
    "namePl": "PASKÓW PĘDZEL ANGIELSKI 15,20,25",
    "unit": "szt",
    "netUnitPricePln": 3.48,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:do",
    "productCode": "DO"
  },
  {
    "materialKey": "mat.inv.dra_01plus",
    "catalogWorkId": "cw.inv.dra_01plus",
    "namePl": "WKRĘT ALFA-PLASTIKOWY DRIVA 01",
    "unit": "szt",
    "netUnitPricePln": 0.28,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:dra-01plus",
    "productCode": "DRA-01PLUS"
  },
  {
    "materialKey": "mat.inv.dra_02plus",
    "catalogWorkId": "cw.inv.dra_02plus",
    "namePl": "WKRĘT ALFA-ALUMINIOWY DRIVA 02",
    "unit": "szt",
    "netUnitPricePln": 0.73,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:dra-02plus",
    "productCode": "DRA-02PLUS"
  },
  {
    "materialKey": "mat.inv.drelcondor",
    "catalogWorkId": "cw.inv.drelcondor",
    "namePl": "WIERTŁO DO BETONU SDS-260X10MN",
    "unit": "szt",
    "netUnitPricePln": 12.02,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:drelcondor",
    "productCode": "DRELCONDOR"
  },
  {
    "materialKey": "mat.inv.dt_stfm190",
    "catalogWorkId": "cw.inv.dt_stfm190",
    "namePl": "TAŚMA SREBRNA DUCT TAPE 48/25Y",
    "unit": "szt",
    "netUnitPricePln": 6.82,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:dt-stfm190",
    "productCode": "DT-STFM190"
  },
  {
    "materialKey": "mat.inv.es",
    "catalogWorkId": "cw.inv.es",
    "namePl": "60/ 75 ELEMENT DO MOC.PROF.ES60/ 75",
    "unit": "szt",
    "netUnitPricePln": 0.41,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:es",
    "productCode": "ES"
  },
  {
    "materialKey": "mat.inv.gdbu_80",
    "catalogWorkId": "cw.inv.gdbu_80",
    "namePl": "GWOŹDZIE BUDOWL.CZARNE 80X3,",
    "unit": "kg",
    "netUnitPricePln": 8.32,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:gdbu-80",
    "productCode": "GDBU-80"
  },
  {
    "materialKey": "mat.inv.gopr0_75aq",
    "catalogWorkId": "cw.inv.gopr0_75aq",
    "namePl": "OPRYSKIWACZ RĘCZNY AQUA 0,75L",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:gopr0,75aq",
    "productCode": "GOPR0,75AQ"
  },
  {
    "materialKey": "mat.inv.grad60_220",
    "catalogWorkId": "cw.inv.grad60_220",
    "namePl": "GĄBKA SZLIF.PROSTOK.,TRAPEZOWA",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:grad60-220",
    "productCode": "GRAD60-220"
  },
  {
    "materialKey": "mat.inv.h_ko_40sza",
    "catalogWorkId": "cw.inv.h_ko_40sza",
    "namePl": "KOLANO PCV 40/15,30,45,67,87\"",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ko-40sza",
    "productCode": "H-KO-40SZA"
  },
  {
    "materialKey": "mat.inv.h_ko110",
    "catalogWorkId": "cw.inv.h_ko110",
    "namePl": "KOLANO PCV 110/15,30,45,67,90\"",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ko110/",
    "productCode": "H-KO110/"
  },
  {
    "materialKey": "mat.inv.h_kor_c_n",
    "catalogWorkId": "cw.inv.h_kor_c_n",
    "namePl": "KOREK DO BATERII CZERW./NIEB.",
    "unit": "szt",
    "netUnitPricePln": 1.89,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-kor-c-n",
    "productCode": "H-KOR-C-N"
  },
  {
    "materialKey": "mat.inv.h_kor40",
    "catalogWorkId": "cw.inv.h_kor40",
    "namePl": "KOREK PCV 40MM",
    "unit": "szt",
    "netUnitPricePln": 2.27,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-kor40",
    "productCode": "H-KOR40"
  },
  {
    "materialKey": "mat.inv.h_kor50",
    "catalogWorkId": "cw.inv.h_kor50",
    "namePl": "KOREK PCV 50MM",
    "unit": "szt",
    "netUnitPricePln": 2.27,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-kor50",
    "productCode": "H-KOR50"
  },
  {
    "materialKey": "mat.inv.h_korp110",
    "catalogWorkId": "cw.inv.h_korp110",
    "namePl": "KOREK PCV 110MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-korp110",
    "productCode": "H-KORP110"
  },
  {
    "materialKey": "mat.inv.h_korp160",
    "catalogWorkId": "cw.inv.h_korp160",
    "namePl": "KOREK PCV 160MM",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-korp160",
    "productCode": "H-KORP160"
  },
  {
    "materialKey": "mat.inv.h_nas50",
    "catalogWorkId": "cw.inv.h_nas50",
    "namePl": "ZŁĄCZKA PCV 50",
    "unit": "szt",
    "netUnitPricePln": 3.4,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-nas50",
    "productCode": "H-NAS50"
  },
  {
    "materialKey": "mat.inv.h_nasp160",
    "catalogWorkId": "cw.inv.h_nasp160",
    "namePl": "ZŁĄCZKA PCV 160",
    "unit": "szt",
    "netUnitPricePln": 14.66,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-nasp160",
    "productCode": "H-NASP160"
  },
  {
    "materialKey": "mat.inv.h_rbp50_32",
    "catalogWorkId": "cw.inv.h_rbp50_32",
    "namePl": "ZWĘŻKA KANALIZ.PCV 50/32NISKA",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-rbp50/32",
    "productCode": "H-RBP50/32"
  },
  {
    "materialKey": "mat.inv.h_rbp50_40",
    "catalogWorkId": "cw.inv.h_rbp50_40",
    "namePl": "ZWĘŻKA KANALIZ.PCV 50/40NISKA",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-rbp50/40",
    "productCode": "H-RBP50/40"
  },
  {
    "materialKey": "mat.inv.h_rs75_50",
    "catalogWorkId": "cw.inv.h_rs75_50",
    "namePl": "ZWĘŻKA KANALIZ.PCV 75/50",
    "unit": "szt",
    "netUnitPricePln": 4.91,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-rs75/50",
    "productCode": "H-RS75/50"
  },
  {
    "materialKey": "mat.inv.h_rsn110_5",
    "catalogWorkId": "cw.inv.h_rsn110_5",
    "namePl": "ZWĘŻKA KANALIZ.PCV 110/50",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-rsn110/5",
    "productCode": "H-RSN110/5"
  },
  {
    "materialKey": "mat.inv.h_ru40_0_3",
    "catalogWorkId": "cw.inv.h_ru40_0_3",
    "namePl": "RURA PCV 40 X 315MM",
    "unit": "szt",
    "netUnitPricePln": 4.16,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru40/0,3",
    "productCode": "H-RU40/0,3"
  },
  {
    "materialKey": "mat.inv.h_ru40_0_5",
    "catalogWorkId": "cw.inv.h_ru40_0_5",
    "namePl": "RURA PCV 40 X 500MM",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru40/0,5",
    "productCode": "H-RU40/0,5"
  },
  {
    "materialKey": "mat.inv.h_ru40_1_0",
    "catalogWorkId": "cw.inv.h_ru40_1_0",
    "namePl": "RURA PCV 40 X 1000MM",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru40/1,0",
    "productCode": "H-RU40/1,0"
  },
  {
    "materialKey": "mat.inv.h_ru50_0_3",
    "catalogWorkId": "cw.inv.h_ru50_0_3",
    "namePl": "RURA PCV 50* 315+USZCZELKA",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru50/0,3",
    "productCode": "H-RU50/0,3"
  },
  {
    "materialKey": "mat.inv.h_ru50_0_5",
    "catalogWorkId": "cw.inv.h_ru50_0_5",
    "namePl": "RURA PCV 50* 500+USZCZELKA",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru50/0,5",
    "productCode": "H-RU50/0,5"
  },
  {
    "materialKey": "mat.inv.h_ru50_1_0",
    "catalogWorkId": "cw.inv.h_ru50_1_0",
    "namePl": "RURA PCV 50*1000+USZCZELKA",
    "unit": "szt",
    "netUnitPricePln": 8.74,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-ru50/1,0",
    "productCode": "H-RU50/1,0"
  },
  {
    "materialKey": "mat.inv.h_rup160_1",
    "catalogWorkId": "cw.inv.h_rup160_1",
    "namePl": "RURA PCV 160*1000*3.2 SN2 ZEW.",
    "unit": "szt",
    "netUnitPricePln": 32.22,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-rup160/1",
    "productCode": "H-RUP160/1"
  },
  {
    "materialKey": "mat.inv.h_tr_40",
    "catalogWorkId": "cw.inv.h_tr_40",
    "namePl": "TRÓJNIK PCV 40/45,67,87'",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-tr-40/..",
    "productCode": "H-TR-40/.."
  },
  {
    "materialKey": "mat.inv.h_tra110",
    "catalogWorkId": "cw.inv.h_tra110",
    "namePl": "TRAPER PP PCV-ŻELIWO 110/124MM",
    "unit": "szt",
    "netUnitPricePln": 13.61,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-tra110",
    "productCode": "H-TRA110"
  },
  {
    "materialKey": "mat.inv.h_zawc1238",
    "catalogWorkId": "cw.inv.h_zawc1238",
    "namePl": "ZAWÓR KĄTOWY 1/2\"X3/8\"FILTR R.",
    "unit": "szt",
    "netUnitPricePln": 31.97,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:h-zawc1238",
    "productCode": "H-ZAWC1238"
  },
  {
    "materialKey": "mat.inv.h000005i123",
    "catalogWorkId": "cw.inv.h000005i123",
    "namePl": "PĘDZEL ANGIELSKI 90",
    "unit": "szt",
    "netUnitPricePln": 7.77,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel angielski 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h000009a5zm",
    "catalogWorkId": "cw.inv.h000009a5zm",
    "namePl": "TDP,TDS TARCZA DIAMENT.115MM",
    "unit": "szt",
    "netUnitPricePln": 20.41,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:tdp tds tarcza diament 115mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h000039fysn",
    "catalogWorkId": "cw.inv.h000039fysn",
    "namePl": "K ZPC ZMYWAKI KUCHENNE PROFIL /2SZT.",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:k zpc zmywaki kuchenne profil 2szt|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00003as7e0",
    "catalogWorkId": "cw.inv.h00003as7e0",
    "namePl": "CZYŚCIWO 2-WARSTWOWE 80MB",
    "unit": "szt",
    "netUnitPricePln": 16.95,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:czysciwo 2 warstwowe 80mb|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00005e4mev",
    "catalogWorkId": "cw.inv.h00005e4mev",
    "namePl": "KNAUF HA13 PŁYTA G-K WODOODPORNA 1,2*2,0M",
    "unit": "szt",
    "netUnitPricePln": 34.96,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:knauf ha13 plyta g k wodoodporna 1 2 2 0m|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00006u06x9",
    "catalogWorkId": "cw.inv.h00006u06x9",
    "namePl": "TRÓJNIK PCV 75*75/45/90",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:trojnik pcv 75 75 45 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h000077l1s8",
    "catalogWorkId": "cw.inv.h000077l1s8",
    "namePl": "ŁAWKOWCZYK OBITY BLACHĄ 140",
    "unit": "szt",
    "netUnitPricePln": 24.55,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lawkowczyk obity blacha 140|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h000087dp27",
    "catalogWorkId": "cw.inv.h000087dp27",
    "namePl": "PĘDZEL KĄTOWY 63",
    "unit": "szt",
    "netUnitPricePln": 5.12,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel katowy 63|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00008dnuo3",
    "catalogWorkId": "cw.inv.h00008dnuo3",
    "namePl": "NIDA GIPS BUDOWLANY 2KG",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:nida gips budowlany 2kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00009c9vvb",
    "catalogWorkId": "cw.inv.h00009c9vvb",
    "namePl": "MAPEI MAPEI-MAPEGRUNT PLUS 1L",
    "unit": "szt",
    "netUnitPricePln": 14.81,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:mapei mapei mapegrunt plus 1l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00009l45rd",
    "catalogWorkId": "cw.inv.h00009l45rd",
    "namePl": "PĘDZEL PIERŚCIENIOWY 40",
    "unit": "szt",
    "netUnitPricePln": 7.16,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel pierscieniowy 40|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00009s1nyi",
    "catalogWorkId": "cw.inv.h00009s1nyi",
    "namePl": "PPG SIATECZKA ŚCIERNA 225MM ŻYRAFA",
    "unit": "szt",
    "netUnitPricePln": 9.83,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:ppg siateczka scierna 225mm zyrafa|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000b5fynu",
    "catalogWorkId": "cw.inv.h0000b5fynu",
    "namePl": "DREL WIERTŁO DO BETONU SDS-210X 6M.",
    "unit": "szt",
    "netUnitPricePln": 8.93,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:drel wiertlo do betonu sds 210x 6m|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000cm0b47",
    "catalogWorkId": "cw.inv.h0000cm0b47",
    "namePl": "ŁAWKOWCZYK OBITY BLACHĄ 110",
    "unit": "szt",
    "netUnitPricePln": 13.3,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lawkowczyk obity blacha 110|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000cxxgwc",
    "catalogWorkId": "cw.inv.h0000cxxgwc",
    "namePl": "ŚNIEŻKA ŚNIEŻKA-UREKOR S 0,8L",
    "unit": "szt",
    "netUnitPricePln": 29.39,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezka sniezka urekor s 0 8l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000d11vz4",
    "catalogWorkId": "cw.inv.h0000d11vz4",
    "namePl": "ŁĄCZNIK KRZYŻOWY PŁASKI 60/60",
    "unit": "szt",
    "netUnitPricePln": 0.75,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lacznik krzyzowy plaski 60 60|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000dxphdl",
    "catalogWorkId": "cw.inv.h0000dxphdl",
    "namePl": "GLAZURNIK/ MAPEI-SILIKON MAPESIL AC 310ML",
    "unit": "szt",
    "netUnitPricePln": 39.2,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:glazurnik mapei silikon mapesil ac 310ml|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000e29bk1",
    "catalogWorkId": "cw.inv.h0000e29bk1",
    "namePl": "PĘDZEL KĄTOWY 36",
    "unit": "szt",
    "netUnitPricePln": 3.68,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel katowy 36|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000e82b00",
    "catalogWorkId": "cw.inv.h0000e82b00",
    "namePl": "ŚNIEŻKALUX ŚNIEŻKA-EKO EMULSJA WEWN. 1L",
    "unit": "szt",
    "netUnitPricePln": 11.09,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezkalux sniezka eko emulsja wewn 1l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000fab3sf",
    "catalogWorkId": "cw.inv.h0000fab3sf",
    "namePl": "ZWĘŻKA KANALIZ.PCV 110/50",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:zwezka kanaliz pcv 110 50|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000fvv4ht",
    "catalogWorkId": "cw.inv.h0000fvv4ht",
    "namePl": "TRÓJNIK PCV 50*50/30/45/67/90",
    "unit": "szt",
    "netUnitPricePln": 4.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:trojnik pcv 50 50 30 45 67 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000g20k0g",
    "catalogWorkId": "cw.inv.h0000g20k0g",
    "namePl": "ŁAWKOWCZYK OBITY BLACHĄ 70",
    "unit": "szt",
    "netUnitPricePln": 10.23,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lawkowczyk obity blacha 70|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000gwqklb",
    "catalogWorkId": "cw.inv.h0000gwqklb",
    "namePl": "PĘDZEL ANGIELSKI 76",
    "unit": "szt",
    "netUnitPricePln": 7.37,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel angielski 76|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000h9gy0z",
    "catalogWorkId": "cw.inv.h0000h9gy0z",
    "namePl": "KNAUF GIPS SZPACHLOWY UNIFLOTT 5KG",
    "unit": "szt",
    "netUnitPricePln": 28.42,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:knauf gips szpachlowy uniflott 5kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000iv6jxe",
    "catalogWorkId": "cw.inv.h0000iv6jxe",
    "namePl": "ŁĄCZNIK WZDŁUŻNY",
    "unit": "szt",
    "netUnitPricePln": 0.75,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lacznik wzdluzny|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000m3bf3g",
    "catalogWorkId": "cw.inv.h0000m3bf3g",
    "namePl": "F 31454 SZPACHELKI JAPOŃSKIE PLASTYK.",
    "unit": "kpl",
    "netUnitPricePln": 8.31,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:f 31454 szpachelki japonskie plastyk|unit:kpl",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000npqeg9",
    "catalogWorkId": "cw.inv.h0000npqeg9",
    "namePl": "MAPEI MAPEI-FUGA ULTRACOLOR PLUS 2KG",
    "unit": "szt",
    "netUnitPricePln": 28.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:mapei mapei fuga ultracolor plus 2kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000r1xo85",
    "catalogWorkId": "cw.inv.h0000r1xo85",
    "namePl": "PĘDZEL KĄTOWY 50",
    "unit": "szt",
    "netUnitPricePln": 4.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel katowy 50|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000s2ky1p",
    "catalogWorkId": "cw.inv.h0000s2ky1p",
    "namePl": "ŚNIEŻKA ŚNIEŻKA-EKO EMULSJA WEWN. 10L",
    "unit": "szt",
    "netUnitPricePln": 72.02,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezka sniezka eko emulsja wewn 10l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000u2leo8",
    "catalogWorkId": "cw.inv.h0000u2leo8",
    "namePl": "EXTOL TARCZA LISTKOWA 36 ŚR.125",
    "unit": "szt",
    "netUnitPricePln": 8.31,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:extol tarcza listkowa 36 sr 125|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000uaby5b",
    "catalogWorkId": "cw.inv.h0000uaby5b",
    "namePl": "PĘDZEL ANGIELSKI 50",
    "unit": "szt",
    "netUnitPricePln": 4.71,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel angielski 50|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000urcpbi",
    "catalogWorkId": "cw.inv.h0000urcpbi",
    "namePl": "KNAUFLEKKI GIPS TYNK.MASZ.MP 75 L 30KG",
    "unit": "szt",
    "netUnitPricePln": 27.97,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:knauflekki gips tynk masz mp 75 l 30kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000uxds2a",
    "catalogWorkId": "cw.inv.h0000uxds2a",
    "namePl": "ŁAWKOWCZYK OBITY BLACHĄ 90",
    "unit": "szt",
    "netUnitPricePln": 11.25,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lawkowczyk obity blacha 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000xgwlnp",
    "catalogWorkId": "cw.inv.h0000xgwlnp",
    "namePl": "PĘDZEL PIERŚCIENIOWY 35",
    "unit": "szt",
    "netUnitPricePln": 6.75,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel pierscieniowy 35|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000xluou1",
    "catalogWorkId": "cw.inv.h0000xluou1",
    "namePl": "KNAUF A 13 PŁYTA G-K ZWYKŁA 12,5MM",
    "unit": "szt",
    "netUnitPricePln": 30.24,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:knauf a 13 plyta g k zwykla 12 5mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0000ygrlto",
    "catalogWorkId": "cw.inv.h0000ygrlto",
    "namePl": "CZ.NIĆ,INN ZAPAS SZNURK.OLIWKA-TĘCZA 25CM",
    "unit": "szt",
    "netUnitPricePln": 14.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:cz nic inn zapas sznurk oliwka tecza 25cm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001057kn5",
    "catalogWorkId": "cw.inv.h0001057kn5",
    "namePl": "PĘDZEL ANGIELSKI 63",
    "unit": "szt",
    "netUnitPricePln": 4.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel angielski 63|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00013cv7vr",
    "catalogWorkId": "cw.inv.h00013cv7vr",
    "namePl": "ŚNIEŻKA ŚNIEŻKA-SUPERMAL SZARA J. 0.8L",
    "unit": "szt",
    "netUnitPricePln": 24.93,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezka sniezka supermal szara j 0 8l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00013thfha",
    "catalogWorkId": "cw.inv.h00013thfha",
    "namePl": "ŁĄCZNIK KRZYŻOWY 60/60",
    "unit": "szt",
    "netUnitPricePln": 0.8,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lacznik krzyzowy 60 60|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00014vd2t7",
    "catalogWorkId": "cw.inv.h00014vd2t7",
    "namePl": "Z GUMĄ OBEJMA RURY PCV 1/2\",3/4\",3/8\"",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:z guma obejma rury pcv 1 2 3 4 3 8|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00014zebfb",
    "catalogWorkId": "cw.inv.h00014zebfb",
    "namePl": "KOŃCÓWKA TORX MAGN.T20-40X50MM",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:koncowka torx magn t20 40x50mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00016ckvsn",
    "catalogWorkId": "cw.inv.h00016ckvsn",
    "namePl": "RĄCZKA DO WAŁKA- ŚREDNICA 8MM",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:raczka do walka srednica 8mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00017ilpfl",
    "catalogWorkId": "cw.inv.h00017ilpfl",
    "namePl": "NIDA GIPS KLEJ GIPSOWY T 25KG",
    "unit": "szt",
    "netUnitPricePln": 22.97,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:nida gips klej gipsowy t 25kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00018bw4mo",
    "catalogWorkId": "cw.inv.h00018bw4mo",
    "namePl": "CZYŚCIWO 2-WARSTWOWE800LISTKÓW",
    "unit": "szt",
    "netUnitPricePln": 41.29,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:czysciwo 2 warstwowe800listkow|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h00018zd55d",
    "catalogWorkId": "cw.inv.h00018zd55d",
    "namePl": "RĘKAWICE GOSPODARCZE/GUMOWE",
    "unit": "szt",
    "netUnitPricePln": 3.02,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:rekawice gospodarcze gumowe|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h000195pmkv",
    "catalogWorkId": "cw.inv.h000195pmkv",
    "namePl": "TDP,TDS TARCZA DIAMENT.125MM",
    "unit": "szt",
    "netUnitPricePln": 21.17,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:tdp tds tarcza diament 125mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001defflg",
    "catalogWorkId": "cw.inv.h0001defflg",
    "namePl": "NAROŻNIK DO ŁUKÓW AL.-PCV 2,5M",
    "unit": "szt",
    "netUnitPricePln": 4.44,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:naroznik do lukow al pcv 2 5m|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001dhogxy",
    "catalogWorkId": "cw.inv.h0001dhogxy",
    "namePl": "CZWÓRNIK 110/110/67',90'",
    "unit": "szt",
    "netUnitPricePln": 29.82,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:czwornik 110 110 67 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001dpt19t",
    "catalogWorkId": "cw.inv.h0001dpt19t",
    "namePl": "RĄCZKA DO WAŁKA- ŚREDNICA 6MM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:raczka do walka srednica 6mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001ee4gde",
    "catalogWorkId": "cw.inv.h0001ee4gde",
    "namePl": "DOWYGŁ.FUG SOUDAL-JOINT FINISH 500ML",
    "unit": "szt",
    "netUnitPricePln": 14.37,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:dowygl fug soudal joint finish 500ml|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001f0vsi7",
    "catalogWorkId": "cw.inv.h0001f0vsi7",
    "namePl": "ZWĘŻKA KANALIZ.PCV 40/32",
    "unit": "szt",
    "netUnitPricePln": 3.4,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:zwezka kanaliz pcv 40 32|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001gddjnc",
    "catalogWorkId": "cw.inv.h0001gddjnc",
    "namePl": "NIDA GIPS GIPS BUDOWLANY 15KG",
    "unit": "szt",
    "netUnitPricePln": 17.93,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:nida gips gips budowlany 15kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001gf5i3y",
    "catalogWorkId": "cw.inv.h0001gf5i3y",
    "namePl": "ZŁĄCZKA PCV 110",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:zlaczka pcv 110|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001gli89o",
    "catalogWorkId": "cw.inv.h0001gli89o",
    "namePl": "PĘDZEL PIERŚCIENIOWY 30",
    "unit": "szt",
    "netUnitPricePln": 4.5,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel pierscieniowy 30|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001ilx1vb",
    "catalogWorkId": "cw.inv.h0001ilx1vb",
    "namePl": "TRÓJNIK PCV KAN.160*160/45-90",
    "unit": "szt",
    "netUnitPricePln": 39.55,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:trojnik pcv kan 160 160 45 90|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001jj12on",
    "catalogWorkId": "cw.inv.h0001jj12on",
    "namePl": "ARHEM RĘKAWICE OCHRONNE FANCY,WHITE",
    "unit": "szt",
    "netUnitPricePln": 3.02,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:arhem rekawice ochronne fancy white|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001mshf21",
    "catalogWorkId": "cw.inv.h0001mshf21",
    "namePl": "KRZYŻYKI 2,5MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:krzyzyki 2 5mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001qbs3f4",
    "catalogWorkId": "cw.inv.h0001qbs3f4",
    "namePl": "CZYŚCIWO 3-WARSTWOWE",
    "unit": "szt",
    "netUnitPricePln": 72.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:czysciwo 3 warstwowe|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001qpat65",
    "catalogWorkId": "cw.inv.h0001qpat65",
    "namePl": "KNAUF KLEJ GIPSOWY PERFLIX T 25KG",
    "unit": "szt",
    "netUnitPricePln": 21.76,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:knauf klej gipsowy perflix t 25kg|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001qz4032",
    "catalogWorkId": "cw.inv.h0001qz4032",
    "namePl": "ŚNIEŻKA ŚNIEŻKA-SUPERMAL 0.2L",
    "unit": "szt",
    "netUnitPricePln": 10.21,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezka sniezka supermal 0 2l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001rkyx27",
    "catalogWorkId": "cw.inv.h0001rkyx27",
    "namePl": "PĘDZEL PIERŚCIENIOWY 20",
    "unit": "szt",
    "netUnitPricePln": 3.68,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel pierscieniowy 20|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001u40vq3",
    "catalogWorkId": "cw.inv.h0001u40vq3",
    "namePl": "PĘDZEL ANGIELSKI 36",
    "unit": "szt",
    "netUnitPricePln": 3.68,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pedzel angielski 36|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001upvk2r",
    "catalogWorkId": "cw.inv.h0001upvk2r",
    "namePl": "ŚNIEŻKA ŚNIEŻKA-SUPERMAL ZIEL.MIĘT0.8L",
    "unit": "szt",
    "netUnitPricePln": 24.93,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:sniezka sniezka supermal ziel miet0 8l|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001urmruq",
    "catalogWorkId": "cw.inv.h0001urmruq",
    "namePl": "ŻYRAFA ORG PAPIER NA RZEP 225MM PERFOROW.",
    "unit": "szt",
    "netUnitPricePln": 12.1,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:zyrafa org papier na rzep 225mm perforow|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001xiz2dn",
    "catalogWorkId": "cw.inv.h0001xiz2dn",
    "namePl": "ŁAWKOWCZYK OBITY BLACHĄ 150",
    "unit": "szt",
    "netUnitPricePln": 26.6,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:lawkowczyk obity blacha 150|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001xogo83",
    "catalogWorkId": "cw.inv.h0001xogo83",
    "namePl": "KOŃCÓWKA KRZYŻOWA PHPZ1-2 25MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:koncowka krzyzowa phpz1 2 25mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001xst28l",
    "catalogWorkId": "cw.inv.h0001xst28l",
    "namePl": "KRĄŻEK PAPIER NA RZEP 125MM 16-220",
    "unit": "szt",
    "netUnitPricePln": 1.89,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:krazek papier na rzep 125mm 16 220|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.h0001y3kxmu",
    "catalogWorkId": "cw.inv.h0001y3kxmu",
    "namePl": "PRĘT MOCUJĄCY 500 MM",
    "unit": "szt",
    "netUnitPricePln": 0.82,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|name:pret mocujacy 500 mm|unit:szt",
    "productCode": null
  },
  {
    "materialKey": "mat.inv.hkop160_87",
    "catalogWorkId": "cw.inv.hkop160_87",
    "namePl": "KOLANO PCV 160/87'",
    "unit": "szt",
    "netUnitPricePln": 20.48,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:hkop160/87",
    "productCode": "HKOP160/87"
  },
  {
    "materialKey": "mat.inv.i_934_06zn",
    "catalogWorkId": "cw.inv.i_934_06zn",
    "namePl": "NAKRĘTKA M 6 OCYNKOWANA",
    "unit": "szt",
    "netUnitPricePln": 0.04,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:i-934-06zn",
    "productCode": "I-934-06ZN"
  },
  {
    "materialKey": "mat.inv.izomur",
    "catalogWorkId": "cw.inv.izomur",
    "namePl": ".1L",
    "unit": "szt",
    "netUnitPricePln": 43.52,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:izomur....",
    "productCode": "IZOMUR...."
  },
  {
    "materialKey": "mat.inv.j2120150",
    "catalogWorkId": "cw.inv.j2120150",
    "namePl": "GĄBKA SZLIF.TRAPEZ DŁUGA 210MM",
    "unit": "szt",
    "netUnitPricePln": 9.08,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:j2120150",
    "productCode": "J2120150"
  },
  {
    "materialKey": "mat.inv.k_sbb",
    "catalogWorkId": "cw.inv.k_sbb",
    "namePl": "ŚCIERKA DO PODŁOGI BAW.60X80CM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:k-sbb",
    "productCode": "K-SBB"
  },
  {
    "materialKey": "mat.inv.k2",
    "catalogWorkId": "cw.inv.k2",
    "namePl": "KOŃCÓWKA TORX MAGN.T10-40X25MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:k2",
    "productCode": "K2"
  },
  {
    "materialKey": "mat.inv.k2_jufisto",
    "catalogWorkId": "cw.inv.k2_jufisto",
    "namePl": "WIERTŁO DO SZKŁA 6MM",
    "unit": "szt",
    "netUnitPricePln": 14.4,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:k2,jufisto",
    "productCode": "K2,JUFISTO"
  },
  {
    "materialKey": "mat.inv.klepoxip16",
    "catalogWorkId": "cw.inv.klepoxip16",
    "namePl": "POXIPOL KLEJ PRZEŹR./SZARY 16G",
    "unit": "szt",
    "netUnitPricePln": 15.51,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klepoxip16",
    "productCode": "KLEPOXIP16"
  },
  {
    "materialKey": "mat.inv.klin_dr",
    "catalogWorkId": "cw.inv.klin_dr",
    "namePl": "16 KLINY DREWNIANE 4X16CM 4SZT.",
    "unit": "szt",
    "netUnitPricePln": 11.66,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klin-dr",
    "productCode": "KLIN-DR"
  },
  {
    "materialKey": "mat.inv.klingspor",
    "catalogWorkId": "cw.inv.klingspor",
    "namePl": "PAPIER ŚCIERNY-PŁÓTNO 40-320",
    "unit": "szt",
    "netUnitPricePln": 2.65,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klingspor",
    "productCode": "KLINGSPOR"
  },
  {
    "materialKey": "mat.inv.kliny",
    "catalogWorkId": "cw.inv.kliny",
    "namePl": "DO GLAZURY MAŁE",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kliny",
    "productCode": "KLINY"
  },
  {
    "materialKey": "mat.inv.klu_imk_ky",
    "catalogWorkId": "cw.inv.klu_imk_ky",
    "namePl": "KLUCZE IMBUSOWE YATO KRÓT.9SZT",
    "unit": "kpl",
    "netUnitPricePln": 24.55,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klu-imk-ky",
    "productCode": "KLU-IMK-KY"
  },
  {
    "materialKey": "mat.inv.klu_tx_d_y",
    "catalogWorkId": "cw.inv.klu_tx_d_y",
    "namePl": "KLUCZE TORX 9SZT.",
    "unit": "kpl",
    "netUnitPricePln": 29.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klu-tx-d-y",
    "productCode": "KLU-TX-D-Y"
  },
  {
    "materialKey": "mat.inv.klugrzepo1",
    "catalogWorkId": "cw.inv.klugrzepo1",
    "namePl": "KLUCZ PŁ.-OCZK.Z GRZECHOT.10MM",
    "unit": "szt",
    "netUnitPricePln": 20.26,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:klugrzepo1",
    "productCode": "KLUGRZEPO1"
  },
  {
    "materialKey": "mat.inv.kmgd_35045",
    "catalogWorkId": "cw.inv.kmgd_35045",
    "namePl": "WKRĘTY DO DREWNA 45MM/100SZT.",
    "unit": "szt",
    "netUnitPricePln": 8.31,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kmgd-35045",
    "productCode": "KMGD-35045"
  },
  {
    "materialKey": "mat.inv.kmgd_35055",
    "catalogWorkId": "cw.inv.kmgd_35055",
    "namePl": "WKRĘTY DO DREWNA 55MM/100SZT.",
    "unit": "szt",
    "netUnitPricePln": 10.58,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kmgd-35055",
    "productCode": "KMGD-35055"
  },
  {
    "materialKey": "mat.inv.kmwht50070",
    "catalogWorkId": "cw.inv.kmwht50070",
    "namePl": "WKRĘT HARTOW.MOSIĘŻNY 5,0X70MM",
    "unit": "szt",
    "netUnitPricePln": 0.22,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kmwht50070",
    "productCode": "KMWHT50070"
  },
  {
    "materialKey": "mat.inv.kolano",
    "catalogWorkId": "cw.inv.kolano",
    "namePl": "PCV 50/30,45,67,90\"",
    "unit": "szt",
    "netUnitPricePln": 3.02,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kolano",
    "productCode": "KOLANO"
  },
  {
    "materialKey": "mat.inv.kolory",
    "catalogWorkId": "cw.inv.kolory",
    "namePl": "SPRAY EMALIA 400ML",
    "unit": "szt",
    "netUnitPricePln": 19.86,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kolory",
    "productCode": "KOLORY"
  },
  {
    "materialKey": "mat.inv.komb_xl",
    "catalogWorkId": "cw.inv.komb_xl",
    "namePl": "KOMBINEZON MALARSKI XL,XXL",
    "unit": "szt",
    "netUnitPricePln": 9.83,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:komb-xl",
    "productCode": "KOMB-XL"
  },
  {
    "materialKey": "mat.inv.koncentrat",
    "catalogWorkId": "cw.inv.koncentrat",
    "namePl": "MAPEI-PRIMER G GRUNT 1:3 5KG",
    "unit": "szt",
    "netUnitPricePln": 77.06,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:koncentrat",
    "productCode": "KONCENTRAT"
  },
  {
    "materialKey": "mat.inv.kpr_fast_k",
    "catalogWorkId": "cw.inv.kpr_fast_k",
    "namePl": "KOŁEK RAMOWY Z KOŁN.10 X 120MM",
    "unit": "szt",
    "netUnitPricePln": 1.48,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kpr-fast-k",
    "productCode": "KPR-FAST-K"
  },
  {
    "materialKey": "mat.inv.kpx_12080",
    "catalogWorkId": "cw.inv.kpx_12080",
    "namePl": "KOSZULKA KOŁKA ROZPOR. FI 12MM",
    "unit": "szt",
    "netUnitPricePln": 0.37,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kpx-12080",
    "productCode": "KPX-12080"
  },
  {
    "materialKey": "mat.inv.kr",
    "catalogWorkId": "cw.inv.kr",
    "namePl": "00800PB KRATKA WENT.14X14 Z SIATKĄ/125",
    "unit": "szt",
    "netUnitPricePln": 17.23,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr",
    "productCode": "KR"
  },
  {
    "materialKey": "mat.inv.kr_00600pb",
    "catalogWorkId": "cw.inv.kr_00600pb",
    "namePl": "KRATKA WENT.14X14 Z SIATKĄ/SKO",
    "unit": "szt",
    "netUnitPricePln": 17.33,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr-00600pb",
    "productCode": "KR-00600PB"
  },
  {
    "materialKey": "mat.inv.kr_00700pb",
    "catalogWorkId": "cw.inv.kr_00700pb",
    "namePl": "KRATKA WENT.14X14 Z SIATKĄ/100",
    "unit": "szt",
    "netUnitPricePln": 20.12,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr-00700pb",
    "productCode": "KR-00700PB"
  },
  {
    "materialKey": "mat.inv.kr_03700pb",
    "catalogWorkId": "cw.inv.kr_03700pb",
    "namePl": "KRATKA WENTYL.OKRĄGŁA 150MM 25.23.15-50.9 1",
    "unit": "szt",
    "netUnitPricePln": 12.4,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr-03700pb",
    "productCode": "KR-03700PB"
  },
  {
    "materialKey": "mat.inv.kr_06300pl",
    "catalogWorkId": "cw.inv.kr_06300pl",
    "namePl": "DRZWICZKI BIAŁE PCV 20X30CM",
    "unit": "szt",
    "netUnitPricePln": 28.93,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr-06300pl",
    "productCode": "KR-06300PL"
  },
  {
    "materialKey": "mat.inv.kr_06400pb",
    "catalogWorkId": "cw.inv.kr_06400pb",
    "namePl": "DRZWICZKI BIAŁE PCV 30X30CM",
    "unit": "szt",
    "netUnitPricePln": 32.31,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr-06400pb",
    "productCode": "KR-06400PB"
  },
  {
    "materialKey": "mat.inv.kr01900_pb",
    "catalogWorkId": "cw.inv.kr01900_pb",
    "namePl": "KRATKA WENT.14X21 Z SIATKĄ/S 25.23.15-50.9 1",
    "unit": "szt",
    "netUnitPricePln": 24.45,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr01900-pb",
    "productCode": "KR01900-PB"
  },
  {
    "materialKey": "mat.inv.kr02500_pb",
    "catalogWorkId": "cw.inv.kr02500_pb",
    "namePl": "KRATKA WENT.20X20 Z SIATKĄ/S 25.23.15-50.9 1",
    "unit": "szt",
    "netUnitPricePln": 25.92,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kr02500-pb",
    "productCode": "KR02500-PB"
  },
  {
    "materialKey": "mat.inv.krzygl_2_3",
    "catalogWorkId": "cw.inv.krzygl_2_3",
    "namePl": "KRZYŻYKI 2-3MM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:krzygl-2,3",
    "productCode": "KRZYGL-2,3"
  },
  {
    "materialKey": "mat.inv.ksgd_35045",
    "catalogWorkId": "cw.inv.ksgd_35045",
    "namePl": "WKRĘTY DO DREWNA 45MM/ 500/OP",
    "unit": "szt",
    "netUnitPricePln": 0.07,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ksgd-35045",
    "productCode": "KSGD-35045"
  },
  {
    "materialKey": "mat.inv.ksmf430x30",
    "catalogWorkId": "cw.inv.ksmf430x30",
    "namePl": "ŚCIERKI FROTTE Z MIKR.FIB.4SZT",
    "unit": "szt",
    "netUnitPricePln": 11.35,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ksmf430x30",
    "productCode": "KSMF430X30"
  },
  {
    "materialKey": "mat.inv.ku0325",
    "catalogWorkId": "cw.inv.ku0325",
    "namePl": "KUBALA-PACA DO SPOINOWANIA",
    "unit": "szt",
    "netUnitPricePln": 22.57,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku0325",
    "productCode": "KU0325"
  },
  {
    "materialKey": "mat.inv.ku0387",
    "catalogWorkId": "cw.inv.ku0387",
    "namePl": "KUBALA-PACA Z G.NACINANĄ 13X27",
    "unit": "szt",
    "netUnitPricePln": 23.02,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku0387",
    "productCode": "KU0387"
  },
  {
    "materialKey": "mat.inv.ku0399",
    "catalogWorkId": "cw.inv.ku0399",
    "namePl": "KUBALA-PACA Z DURENEM140X280MM",
    "unit": "szt",
    "netUnitPricePln": 38.2,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku0399",
    "productCode": "KU0399"
  },
  {
    "materialKey": "mat.inv.ku0512",
    "catalogWorkId": "cw.inv.ku0512",
    "namePl": "KUBALA-SZPACHLA NRDZ 350X90MM",
    "unit": "szt",
    "netUnitPricePln": 25.68,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku0512",
    "productCode": "KU0512"
  },
  {
    "materialKey": "mat.inv.ku0528",
    "catalogWorkId": "cw.inv.ku0528",
    "namePl": "KUBALA-SZPACHLA NRDZ 150MM",
    "unit": "szt",
    "netUnitPricePln": 37.11,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku0528",
    "productCode": "KU0528"
  },
  {
    "materialKey": "mat.inv.ku1689",
    "catalogWorkId": "cw.inv.ku1689",
    "namePl": "KUBALA-GĄBKA GLAZ.POROW.TWARDA",
    "unit": "szt",
    "netUnitPricePln": 15.67,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku1689",
    "productCode": "KU1689"
  },
  {
    "materialKey": "mat.inv.ku1893",
    "catalogWorkId": "cw.inv.ku1893",
    "namePl": "KUBALA-SMART LEVEL KLIPSY 2MM",
    "unit": "szt",
    "netUnitPricePln": 21.9,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku1893",
    "productCode": "KU1893"
  },
  {
    "materialKey": "mat.inv.ku1895",
    "catalogWorkId": "cw.inv.ku1895",
    "namePl": "KUBALA-SMART LEVEL KLINY 50SZT",
    "unit": "szt",
    "netUnitPricePln": 28.04,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku1895",
    "productCode": "KU1895"
  },
  {
    "materialKey": "mat.inv.ku5906",
    "catalogWorkId": "cw.inv.ku5906",
    "namePl": "KUBALA-KIEL.SZTUK.NRDZ.5,5X16",
    "unit": "szt",
    "netUnitPricePln": 17.26,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ku5906",
    "productCode": "KU5906"
  },
  {
    "materialKey": "mat.inv.kuw_1529_c",
    "catalogWorkId": "cw.inv.kuw_1529_c",
    "namePl": "KUWETA MALARSKA MAŁA 15X29CM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kuw-1529-c",
    "productCode": "KUW-1529-C"
  },
  {
    "materialKey": "mat.inv.kuw_2532_c",
    "catalogWorkId": "cw.inv.kuw_2532_c",
    "namePl": "KUWETA MALARSKA DUŻA 250-320",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kuw-2532-c",
    "productCode": "KUW-2532-C"
  },
  {
    "materialKey": "mat.inv.kuw_3235_c",
    "catalogWorkId": "cw.inv.kuw_3235_c",
    "namePl": "KUWETA MALARSKA BIG-1 32X35CM",
    "unit": "szt",
    "netUnitPricePln": 7.56,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:kuw-3235-c",
    "productCode": "KUW-3235-C"
  },
  {
    "materialKey": "mat.inv.makita",
    "catalogWorkId": "cw.inv.makita",
    "namePl": "WIERTŁO DO BETONU SDS-260X 6MM",
    "unit": "szt",
    "netUnitPricePln": 28.31,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:makita",
    "productCode": "MAKITA"
  },
  {
    "materialKey": "mat.inv.mapei_dursicolor",
    "catalogWorkId": "cw.inv.mapei_dursicolor",
    "namePl": "PRIMER 5L",
    "unit": "szt",
    "netUnitPricePln": 37.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mapei-dursicolor",
    "productCode": "MAPEI-DURSICOLOR"
  },
  {
    "materialKey": "mat.inv.mapei_mapegrunt",
    "catalogWorkId": "cw.inv.mapei_mapegrunt",
    "namePl": "PLUS 10L",
    "unit": "szt",
    "netUnitPricePln": 72.93,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mapei-mapegrunt",
    "productCode": "MAPEI-MAPEGRUNT"
  },
  {
    "materialKey": "mat.inv.marker",
    "catalogWorkId": "cw.inv.marker",
    "namePl": "OLEJOWY",
    "unit": "szt",
    "netUnitPricePln": 8.44,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:marker",
    "productCode": "MARKER"
  },
  {
    "materialKey": "mat.inv.maska_zaw2",
    "catalogWorkId": "cw.inv.maska_zaw2",
    "namePl": "MASKA P-PYŁ.Z ZAWOREM KN95/FPP",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:maska+zaw2",
    "productCode": "MASKA+ZAW2"
  },
  {
    "materialKey": "mat.inv.master",
    "catalogWorkId": "cw.inv.master",
    "namePl": "MAS GŁADŹ SZPACHL.1,5KG",
    "unit": "szt",
    "netUnitPricePln": 13.61,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:master",
    "productCode": "MASTER"
  },
  {
    "materialKey": "mat.inv.midi",
    "catalogWorkId": "cw.inv.midi",
    "namePl": "30MM ZAPAS FUTRZAK 15CM /PERLON",
    "unit": "szt",
    "netUnitPricePln": 7.56,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:midi",
    "productCode": "MIDI"
  },
  {
    "materialKey": "mat.inv.mini",
    "catalogWorkId": "cw.inv.mini",
    "namePl": "ZAPAS FUTRZAK 11CM /PERLON",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mini",
    "productCode": "MINI"
  },
  {
    "materialKey": "mat.inv.mio_szuf",
    "catalogWorkId": "cw.inv.mio_szuf",
    "namePl": "ŚMIETNICZKA OCYNKOWANA",
    "unit": "szt",
    "netUnitPricePln": 12.1,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mio-szuf",
    "productCode": "MIO-SZUF"
  },
  {
    "materialKey": "mat.inv.mio340",
    "catalogWorkId": "cw.inv.mio340",
    "namePl": "MIOTEŁKA (ZMIOTKA)",
    "unit": "szt",
    "netUnitPricePln": 7.89,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mio340",
    "productCode": "MIO340"
  },
  {
    "materialKey": "mat.inv.mn",
    "catalogWorkId": "cw.inv.mn",
    "namePl": "79-081 MIESZADŁO ŚLIMAKOWE M 14 100MM",
    "unit": "szt",
    "netUnitPricePln": 59.97,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mn",
    "productCode": "MN"
  },
  {
    "materialKey": "mat.inv.mn_63_451",
    "catalogWorkId": "cw.inv.mn_63_451",
    "namePl": "PRZECINAK Z RĘKOJEŚCIĄ-300*19",
    "unit": "szt",
    "netUnitPricePln": 22.59,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:mn-63-451",
    "productCode": "MN-63-451"
  },
  {
    "materialKey": "mat.inv.n_grph402i",
    "catalogWorkId": "cw.inv.n_grph402i",
    "namePl": "KOŃCÓWKA KRZYŻOWA PH2 50MM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-grph402i",
    "productCode": "N-GRPH402I"
  },
  {
    "materialKey": "mat.inv.n_grz24",
    "catalogWorkId": "cw.inv.n_grz24",
    "namePl": "ZESTAW BITÓW I NASADEK 24ELEM.",
    "unit": "szt",
    "netUnitPricePln": 34.15,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-grz24",
    "productCode": "N-GRZ24"
  },
  {
    "materialKey": "mat.inv.n_oku02",
    "catalogWorkId": "cw.inv.n_oku02",
    "namePl": "OKULARY OCHR.STANDARD PLUS UV",
    "unit": "szt",
    "netUnitPricePln": 12.1,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-oku02",
    "productCode": "N-OKU02"
  },
  {
    "materialKey": "mat.inv.n_r19_4",
    "catalogWorkId": "cw.inv.n_r19_4",
    "namePl": "RĘKAWICE ZEFIR K2",
    "unit": "szt",
    "netUnitPricePln": 8.31,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-r19-4",
    "productCode": "N-R19-4"
  },
  {
    "materialKey": "mat.inv.n_szk_j",
    "catalogWorkId": "cw.inv.n_szk_j",
    "namePl": "NÓŻ DO SZKŁA",
    "unit": "szt",
    "netUnitPricePln": 9.08,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-szk-j",
    "productCode": "N-SZK-J"
  },
  {
    "materialKey": "mat.inv.n_szp01_04",
    "catalogWorkId": "cw.inv.n_szp01_04",
    "namePl": "SZPACHELKA PROSTA K2 40-100MM",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-szp01-04",
    "productCode": "N-SZP01-04"
  },
  {
    "materialKey": "mat.inv.n_w01",
    "catalogWorkId": "cw.inv.n_w01",
    "namePl": "WYCISKACZ DO SILIK.K2 STANDARD",
    "unit": "szt",
    "netUnitPricePln": 28.55,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-w01",
    "productCode": "N-W01"
  },
  {
    "materialKey": "mat.inv.n_wp55100",
    "catalogWorkId": "cw.inv.n_wp55100",
    "namePl": "WKRĘTAK PŁASKI K2 5,5X100MM",
    "unit": "szt",
    "netUnitPricePln": 11.35,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-wp55100",
    "productCode": "N-WP55100"
  },
  {
    "materialKey": "mat.inv.n_ws08",
    "catalogWorkId": "cw.inv.n_ws08",
    "namePl": "K2 WIERTŁO DO SZKŁA 8MM",
    "unit": "szt",
    "netUnitPricePln": 16.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:n-ws08",
    "productCode": "N-WS08"
  },
  {
    "materialKey": "mat.inv.na",
    "catalogWorkId": "cw.inv.na",
    "namePl": "M10 D NAKRĘTKA M 10 OCYNKOWANA",
    "unit": "szt",
    "netUnitPricePln": 0.15,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:na",
    "productCode": "NA"
  },
  {
    "materialKey": "mat.inv.naluk_30",
    "catalogWorkId": "cw.inv.naluk_30",
    "namePl": "NAROŻNIK DO ŁUKÓW AL.-PCV 3,0M",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:naluk-30",
    "productCode": "NALUK-30"
  },
  {
    "materialKey": "mat.inv.nam16",
    "catalogWorkId": "cw.inv.nam16",
    "namePl": "NAKRĘTKA M 16 OCYNKOWANA",
    "unit": "szt",
    "netUnitPricePln": 0.37,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:nam16",
    "productCode": "NAM16"
  },
  {
    "materialKey": "mat.inv.obg_kpl1",
    "catalogWorkId": "cw.inv.obg_kpl1",
    "namePl": "OBEJMA RURY PCV 1\" Z GUMĄ",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:obg-kpl1",
    "productCode": "OBG-KPL1"
  },
  {
    "materialKey": "mat.inv.opak200szt",
    "catalogWorkId": "cw.inv.opak200szt",
    "namePl": "SEMIN-BLACHOWKRĘTY 3,5X25MM 25.94.11.0 A0 37",
    "unit": "szt",
    "netUnitPricePln": 12.07,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:opak200szt",
    "productCode": "OPAK200SZT"
  },
  {
    "materialKey": "mat.inv.opzm_e27",
    "catalogWorkId": "cw.inv.opzm_e27",
    "namePl": "OPRAWKA METALOWA E-27 B.KOŁN.",
    "unit": "szt",
    "netUnitPricePln": 9.36,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:opzm-e27",
    "productCode": "OPZM-E27"
  },
  {
    "materialKey": "mat.inv.opzt_e27p",
    "catalogWorkId": "cw.inv.opzt_e27p",
    "namePl": "OPRAWKA TERMOPLAST.E-27 ZPRZEW",
    "unit": "szt",
    "netUnitPricePln": 7.97,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:opzt-e27p",
    "productCode": "OPZT-E27P"
  },
  {
    "materialKey": "mat.inv.paca",
    "catalogWorkId": "cw.inv.paca",
    "namePl": "ZĘBATA #10130*280MM",
    "unit": "szt",
    "netUnitPricePln": 12.85,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:paca",
    "productCode": "PACA"
  },
  {
    "materialKey": "mat.inv.pacgn270",
    "catalogWorkId": "cw.inv.pacgn270",
    "namePl": "PACA S-SYSTEM GŁADKA 130*280",
    "unit": "szt",
    "netUnitPricePln": 10.58,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pacgn270",
    "productCode": "PACGN270"
  },
  {
    "materialKey": "mat.inv.pacgn600",
    "catalogWorkId": "cw.inv.pacgn600",
    "namePl": "PACA S-SYSTEM GŁADKA 130*580",
    "unit": "szt",
    "netUnitPricePln": 32.07,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pacgn600",
    "productCode": "PACGN600"
  },
  {
    "materialKey": "mat.inv.pacplhgm",
    "catalogWorkId": "cw.inv.pacplhgm",
    "namePl": "PACA PLAST.Z GĄBKĄ ORANGE13X27",
    "unit": "szt",
    "netUnitPricePln": 20.41,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pacplhgm",
    "productCode": "PACPLHGM"
  },
  {
    "materialKey": "mat.inv.pacs_320",
    "catalogWorkId": "cw.inv.pacs_320",
    "namePl": "PACA STYROPIANOWA 16X32CM",
    "unit": "szt",
    "netUnitPricePln": 9.83,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pacs-320",
    "productCode": "PACS-320"
  },
  {
    "materialKey": "mat.inv.paczn270_1",
    "catalogWorkId": "cw.inv.paczn270_1",
    "namePl": "PACA ZĘBATA #12130*280MM",
    "unit": "szt",
    "netUnitPricePln": 12.85,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:paczn270/1",
    "productCode": "PACZN270/1"
  },
  {
    "materialKey": "mat.inv.pakuz10",
    "catalogWorkId": "cw.inv.pakuz10",
    "namePl": "PAKUŁY LNIANE+PASTA /ZESTAW",
    "unit": "szt",
    "netUnitPricePln": 20.41,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pakuz10",
    "productCode": "PAKUZ10"
  },
  {
    "materialKey": "mat.inv.pelaw190",
    "catalogWorkId": "cw.inv.pelaw190",
    "namePl": "ŁAWKOWIEC KLEJ.JEDNOL.195",
    "unit": "szt",
    "netUnitPricePln": 37.8,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pelaw190",
    "productCode": "PELAW190"
  },
  {
    "materialKey": "mat.inv.pigment",
    "catalogWorkId": "cw.inv.pigment",
    "namePl": "MIX 80 ML",
    "unit": "szt",
    "netUnitPricePln": 6.81,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pigment",
    "productCode": "PIGMENT"
  },
  {
    "materialKey": "mat.inv.podp10",
    "catalogWorkId": "cw.inv.podp10",
    "namePl": "PODKŁADKA M 10 OKRĄGŁA OC.DUŻA",
    "unit": "szt",
    "netUnitPricePln": 0.39,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:podp10",
    "productCode": "PODP10"
  },
  {
    "materialKey": "mat.inv.podpj16d",
    "catalogWorkId": "cw.inv.podpj16d",
    "namePl": "PODKŁADKA M 16 OKRĄGŁA OC.DUŻA",
    "unit": "szt",
    "netUnitPricePln": 0.55,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:podpj16d",
    "productCode": "PODPJ16D"
  },
  {
    "materialKey": "mat.inv.primacol",
    "catalogWorkId": "cw.inv.primacol",
    "namePl": "PRIMACOL-KABINA PRYSZNIC 500ML",
    "unit": "szt",
    "netUnitPricePln": 21.36,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:primacol",
    "productCode": "PRIMACOL"
  },
  {
    "materialKey": "mat.inv.prnap14_19",
    "catalogWorkId": "cw.inv.prnap14_19",
    "namePl": "PRÓBNIK NEONOWY 140-190MM",
    "unit": "szt",
    "netUnitPricePln": 5.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:prnap14,19",
    "productCode": "PRNAP14,19"
  },
  {
    "materialKey": "mat.inv.pro_bt013",
    "catalogWorkId": "cw.inv.pro_bt013",
    "namePl": "PISTOLET DO PIANKI PRO BT-13",
    "unit": "szt",
    "netUnitPricePln": 51,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-bt013",
    "productCode": "PRO-BT013"
  },
  {
    "materialKey": "mat.inv.pro_bt015",
    "catalogWorkId": "cw.inv.pro_bt015",
    "namePl": "PISTOLET DO PIANKI PRO BT-15",
    "unit": "szt",
    "netUnitPricePln": 37.09,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-bt015",
    "productCode": "PRO-BT015"
  },
  {
    "materialKey": "mat.inv.pro_ms023",
    "catalogWorkId": "cw.inv.pro_ms023",
    "namePl": "MIARA DREWNIANA B4 2M",
    "unit": "szt",
    "netUnitPricePln": 14.72,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-ms023",
    "productCode": "PRO-MS023"
  },
  {
    "materialKey": "mat.inv.pro_mz105",
    "catalogWorkId": "cw.inv.pro_mz105",
    "namePl": "MIARA ZWIJANA PRO PR-40-01 5MB",
    "unit": "szt",
    "netUnitPricePln": 13.61,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-mz105",
    "productCode": "PRO-MZ105"
  },
  {
    "materialKey": "mat.inv.pro_mz216",
    "catalogWorkId": "cw.inv.pro_mz216",
    "namePl": "MIARA ZWIJANA PRO PR-50-11 5MB",
    "unit": "szt",
    "netUnitPricePln": 14.56,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-mz216",
    "productCode": "PRO-MZ216"
  },
  {
    "materialKey": "mat.inv.pro_nu027",
    "catalogWorkId": "cw.inv.pro_nu027",
    "namePl": "NÓŻ PRO ENDURANCE SK2 18MM",
    "unit": "szt",
    "netUnitPricePln": 23.26,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu027",
    "productCode": "PRO-NU027"
  },
  {
    "materialKey": "mat.inv.pro_nu029",
    "catalogWorkId": "cw.inv.pro_nu029",
    "namePl": "NÓŻ ELASTYCZNY DO WYKOŃCZEŃ",
    "unit": "szt",
    "netUnitPricePln": 7.55,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu029",
    "productCode": "PRO-NU029"
  },
  {
    "materialKey": "mat.inv.pro_nu030",
    "catalogWorkId": "cw.inv.pro_nu030",
    "namePl": "OSTRZA ELASTYCZNE DO WYKOŃCZEŃ",
    "unit": "szt",
    "netUnitPricePln": 11.85,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu030",
    "productCode": "PRO-NU030"
  },
  {
    "materialKey": "mat.inv.pro_nu032",
    "catalogWorkId": "cw.inv.pro_nu032",
    "namePl": "OSTRZA WYMIENNE PRO 0,7MM 18MM",
    "unit": "szt",
    "netUnitPricePln": 18.54,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu032",
    "productCode": "PRO-NU032"
  },
  {
    "materialKey": "mat.inv.pro_nu120",
    "catalogWorkId": "cw.inv.pro_nu120",
    "namePl": "NÓŻ METALOWY PRO 81-10 18MM",
    "unit": "szt",
    "netUnitPricePln": 7.56,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu120",
    "productCode": "PRO-NU120"
  },
  {
    "materialKey": "mat.inv.pro_nu130",
    "catalogWorkId": "cw.inv.pro_nu130",
    "namePl": "NÓŻ UNIWERSALNY PRO SK2 18MM",
    "unit": "szt",
    "netUnitPricePln": 14.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-nu130",
    "productCode": "PRO-NU130"
  },
  {
    "materialKey": "mat.inv.pro_wa293",
    "catalogWorkId": "cw.inv.pro_wa293",
    "namePl": "OTWORNICA DIAM.M-14 PRO 6MM",
    "unit": "szt",
    "netUnitPricePln": 40.06,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-wa293",
    "productCode": "PRO-WA293"
  },
  {
    "materialKey": "mat.inv.pro_ws515",
    "catalogWorkId": "cw.inv.pro_ws515",
    "namePl": "WIERTŁO SDS+ 4 PRO MAX210/10MM",
    "unit": "szt",
    "netUnitPricePln": 23.7,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-ws515",
    "productCode": "PRO-WS515"
  },
  {
    "materialKey": "mat.inv.pro_wt260",
    "catalogWorkId": "cw.inv.pro_wt260",
    "namePl": "TARCZA DIAM.SZLIF.TURBO 125MM",
    "unit": "szt",
    "netUnitPricePln": 49.42,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pro-wt260",
    "productCode": "PRO-WT260"
  },
  {
    "materialKey": "mat.inv.pu_p",
    "catalogWorkId": "cw.inv.pu_p",
    "namePl": "12MM PIERŚCIEŃ DYSTANS.12MM",
    "unit": "szt",
    "netUnitPricePln": 1.42,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pu-p",
    "productCode": "PU-P"
  },
  {
    "materialKey": "mat.inv.pu_p2",
    "catalogWorkId": "cw.inv.pu_p2",
    "namePl": "PIERŚCIEŃ DYSTANS.24MM WYSOKI",
    "unit": "szt",
    "netUnitPricePln": 1.78,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pu-p2",
    "productCode": "PU-P2"
  },
  {
    "materialKey": "mat.inv.pu60",
    "catalogWorkId": "cw.inv.pu60",
    "namePl": "PUSZKA PODT.ZWYKŁA PŁYTKA 60",
    "unit": "szt",
    "netUnitPricePln": 0.92,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pu60",
    "productCode": "PU60"
  },
  {
    "materialKey": "mat.inv.pu60g",
    "catalogWorkId": "cw.inv.pu60g",
    "namePl": "PUSZKA PODT.ZWYKŁA GŁĘBOKA 60",
    "unit": "szt",
    "netUnitPricePln": 1.3,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pu60g",
    "productCode": "PU60G"
  },
  {
    "materialKey": "mat.inv.pude",
    "catalogWorkId": "cw.inv.pude",
    "namePl": "60-80 DEKIEL DO PUSZKI ŚREDN.60-80MM",
    "unit": "szt",
    "netUnitPricePln": 1.29,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pude",
    "productCode": "PUDE"
  },
  {
    "materialKey": "mat.inv.pug60",
    "catalogWorkId": "cw.inv.pug60",
    "namePl": "PUSZKA PODT.DO G-K 60 PŁYTKA",
    "unit": "szt",
    "netUnitPricePln": 4.42,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pug60",
    "productCode": "PUG60"
  },
  {
    "materialKey": "mat.inv.pug60gl1",
    "catalogWorkId": "cw.inv.pug60gl1",
    "namePl": "PUSZKA PODT.DO G-K 60ŁĄCZ./GŁ.",
    "unit": "szt",
    "netUnitPricePln": 4.33,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pug60gl1",
    "productCode": "PUG60GŁ1"
  },
  {
    "materialKey": "mat.inv.pug60x2",
    "catalogWorkId": "cw.inv.pug60x2",
    "namePl": "G PUSZKA PODT.DO G-K 60 PODWÓJNA",
    "unit": "szt",
    "netUnitPricePln": 9.98,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pug60x2",
    "productCode": "PUG60X2"
  },
  {
    "materialKey": "mat.inv.pul60g_pom",
    "catalogWorkId": "cw.inv.pul60g_pom",
    "namePl": "PUSZKA PODT.POM.-ŁĄCZ.GŁĘBOKA",
    "unit": "szt",
    "netUnitPricePln": 1.88,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:pul60g-pom",
    "productCode": "PUŁ60G-POM"
  },
  {
    "materialKey": "mat.inv.r502",
    "catalogWorkId": "cw.inv.r502",
    "namePl": "RURA PCV 50*1000+USZCZELKA",
    "unit": "szt",
    "netUnitPricePln": 8.74,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:r502",
    "productCode": "R502"
  },
  {
    "materialKey": "mat.inv.ral",
    "catalogWorkId": "cw.inv.ral",
    "namePl": "8016 ŚNIEŻKA-SUPERMAL BRĄZ MAT 0,8L",
    "unit": "szt",
    "netUnitPricePln": 25.28,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ral",
    "productCode": "RAL"
  },
  {
    "materialKey": "mat.inv.rc_02_172",
    "catalogWorkId": "cw.inv.rc_02_172",
    "namePl": "SKROBAK CYKLINA 60MM",
    "unit": "szt",
    "netUnitPricePln": 22.74,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:rc-02-172",
    "productCode": "RC-02-172"
  },
  {
    "materialKey": "mat.inv.rexxer_323",
    "catalogWorkId": "cw.inv.rexxer_323",
    "namePl": "DŁUTO SDS+ 250X75MM",
    "unit": "szt",
    "netUnitPricePln": 39.12,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:rexxer-323",
    "productCode": "REXXER-323"
  },
  {
    "materialKey": "mat.inv.rual",
    "catalogWorkId": "cw.inv.rual",
    "namePl": "100 RURA ELASTYCZNA 100MM ALUMIN.",
    "unit": "szt",
    "netUnitPricePln": 27.03,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:rual",
    "productCode": "RUAL"
  },
  {
    "materialKey": "mat.inv.rura",
    "catalogWorkId": "cw.inv.rura",
    "namePl": "PCV 110* 315+USZCZELKA",
    "unit": "szt",
    "netUnitPricePln": 10.88,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:rura",
    "productCode": "RURA"
  },
  {
    "materialKey": "mat.inv.rxpt_12100",
    "catalogWorkId": "cw.inv.rxpt_12100",
    "namePl": "KOTWA SLR M12 X 100MM",
    "unit": "szt",
    "netUnitPricePln": 2.56,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:rxpt-12100",
    "productCode": "RXPT-12100"
  },
  {
    "materialKey": "mat.inv.semin_papier",
    "catalogWorkId": "cw.inv.semin_papier",
    "namePl": "DO ŻYRAFY 225MM",
    "unit": "szt",
    "netUnitPricePln": 6.05,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:semin-papier",
    "productCode": "SEMIN-PAPIER"
  },
  {
    "materialKey": "mat.inv.sm_25",
    "catalogWorkId": "cw.inv.sm_25",
    "namePl": "PASTA POŚLIZGOWA 250G",
    "unit": "szt",
    "netUnitPricePln": 12.1,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:sm-25",
    "productCode": "SM-25"
  },
  {
    "materialKey": "mat.inv.super",
    "catalogWorkId": "cw.inv.super",
    "namePl": "PLUS ROZCIEŃCZALNIK UNIWERSALNY 5L",
    "unit": "szt",
    "netUnitPricePln": 44.33,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:super",
    "productCode": "SUPER"
  },
  {
    "materialKey": "mat.inv.szpjap_m",
    "catalogWorkId": "cw.inv.szpjap_m",
    "namePl": "SZPACHELKI JAPOŃSKIE METALOWE",
    "unit": "kpl",
    "netUnitPricePln": 10.77,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:szpjap-m",
    "productCode": "SZPJAP-M"
  },
  {
    "materialKey": "mat.inv.tarcza",
    "catalogWorkId": "cw.inv.tarcza",
    "namePl": "DO STALI 115*1,0*22",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:tarcza",
    "productCode": "TARCZA"
  },
  {
    "materialKey": "mat.inv.tele3",
    "catalogWorkId": "cw.inv.tele3",
    "namePl": "TELESKOP METALOWY 3.0M",
    "unit": "szt",
    "netUnitPricePln": 22.03,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:tele3",
    "productCode": "TELE3"
  },
  {
    "materialKey": "mat.inv.total",
    "catalogWorkId": "cw.inv.total",
    "namePl": "SZPACHELKA PROSTA NRDZ.60-80MM",
    "unit": "szt",
    "netUnitPricePln": 13.23,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:total",
    "productCode": "TOTAL"
  },
  {
    "materialKey": "mat.inv.tytan",
    "catalogWorkId": "cw.inv.tytan",
    "namePl": "PRZYRZĄD DO FUG SILIKON. 4SZT.",
    "unit": "kpl",
    "netUnitPricePln": 14.42,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:tytan",
    "productCode": "TYTAN"
  },
  {
    "materialKey": "mat.inv.uk_hold315",
    "catalogWorkId": "cw.inv.uk_hold315",
    "namePl": "UCHWYT KABLOWY HOLDER 100SZT.",
    "unit": "szt",
    "netUnitPricePln": 6.19,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:uk-hold315",
    "productCode": "UK-HOLD315"
  },
  {
    "materialKey": "mat.inv.ukhuk325_2",
    "catalogWorkId": "cw.inv.ukhuk325_2",
    "namePl": "UCHWYT KABLOWY PODWÓJNY HAKOWY",
    "unit": "szt",
    "netUnitPricePln": 10.25,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ukhuk325-2",
    "productCode": "UKHUK325-2"
  },
  {
    "materialKey": "mat.inv.ultra_flex",
    "catalogWorkId": "cw.inv.ultra_flex",
    "namePl": "MAPEI-FUGA ULTRACOLOR PLUS 5KG",
    "unit": "szt",
    "netUnitPricePln": 60.49,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:ultra/flex",
    "productCode": "ULTRA/FLEX"
  },
  {
    "materialKey": "mat.inv.w23h512",
    "catalogWorkId": "cw.inv.w23h512",
    "namePl": "TARCZA WĘGLIKOWA DREWNO125MM/1",
    "unit": "szt",
    "netUnitPricePln": 54.2,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:w23h512",
    "productCode": "W23H512"
  },
  {
    "materialKey": "mat.inv.walnar",
    "catalogWorkId": "cw.inv.walnar",
    "namePl": "WAŁEK DO NAROŻNIKÓW",
    "unit": "szt",
    "netUnitPricePln": 15.11,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:walnar",
    "productCode": "WALNAR"
  },
  {
    "materialKey": "mat.inv.whbd_45020",
    "catalogWorkId": "cw.inv.whbd_45020",
    "namePl": "WKRĘT HARTOW.4,5X20MM 200SZT.",
    "unit": "szt",
    "netUnitPricePln": 0.07,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:whbd-45020",
    "productCode": "WHBD-45020"
  },
  {
    "materialKey": "mat.inv.wi",
    "catalogWorkId": "cw.inv.wi",
    "namePl": "HSS 8.0 WIERTŁO DO STALI - 8.0MM",
    "unit": "szt",
    "netUnitPricePln": 9.25,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wi",
    "productCode": "WI"
  },
  {
    "materialKey": "mat.inv.wiadpl_20l",
    "catalogWorkId": "cw.inv.wiadpl_20l",
    "namePl": "WIADRO BUDOWL.PLASTIKOWE 20L.",
    "unit": "szt",
    "netUnitPricePln": 10.58,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wiadpl-20l",
    "productCode": "WIADPL-20L"
  },
  {
    "materialKey": "mat.inv.wiadro",
    "catalogWorkId": "cw.inv.wiadro",
    "namePl": "PLASTIKOWE BIAŁE 2,0L",
    "unit": "szt",
    "netUnitPricePln": 8.63,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wiadro",
    "productCode": "WIADRO"
  },
  {
    "materialKey": "mat.inv.wienerberg",
    "catalogWorkId": "cw.inv.wienerberg",
    "namePl": "POROTHERM NADPROŻE 11,5 L-1,25",
    "unit": "szt",
    "netUnitPricePln": 24.95,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wienerberg",
    "productCode": "WIENERBERG"
  },
  {
    "materialKey": "mat.inv.wisd120600",
    "catalogWorkId": "cw.inv.wisd120600",
    "namePl": "WIERTŁO DO BETONU SDS-600X12MM",
    "unit": "szt",
    "netUnitPricePln": 24.19,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wisd120600",
    "productCode": "WISD120600"
  },
  {
    "materialKey": "mat.inv.wk_ger3030",
    "catalogWorkId": "cw.inv.wk_ger3030",
    "namePl": "WKŁADKA GERDA 30/30 MOSIĄDZ A2",
    "unit": "szt",
    "netUnitPricePln": 33.39,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wk-ger3030",
    "productCode": "WK-GER3030"
  },
  {
    "materialKey": "mat.inv.wkcp_08140",
    "catalogWorkId": "cw.inv.wkcp_08140",
    "namePl": "WKRĘT CIES.TALERZYKOWY 8X140MM",
    "unit": "szt",
    "netUnitPricePln": 0.85,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkcp-08140",
    "productCode": "WKCP-08140"
  },
  {
    "materialKey": "mat.inv.wkmgd35035",
    "catalogWorkId": "cw.inv.wkmgd35035",
    "namePl": "WKRĘTY DO DREWNA 35MM/200SZT.",
    "unit": "szt",
    "netUnitPricePln": 12.85,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkmgd35035",
    "productCode": "WKMGD35035"
  },
  {
    "materialKey": "mat.inv.wkmgd35045",
    "catalogWorkId": "cw.inv.wkmgd35045",
    "namePl": "WKRĘTY DO DREWNA 45MM/100SZT.",
    "unit": "szt",
    "netUnitPricePln": 8.6,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkmgd35045",
    "productCode": "WKMGD35045"
  },
  {
    "materialKey": "mat.inv.wkmgd35055",
    "catalogWorkId": "cw.inv.wkmgd35055",
    "namePl": "WKRĘTY DO DREWNA 55MM/100SZT.",
    "unit": "szt",
    "netUnitPricePln": 10.58,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkmgd35055",
    "productCode": "WKMGD35055"
  },
  {
    "materialKey": "mat.inv.wkmgd42070",
    "catalogWorkId": "cw.inv.wkmgd42070",
    "namePl": "WKRĘTY DO DREWNA 70MM/ 50SZT.",
    "unit": "szt",
    "netUnitPricePln": 8.44,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkmgd42070",
    "productCode": "WKMGD42070"
  },
  {
    "materialKey": "mat.inv.wkmgm35035",
    "catalogWorkId": "cw.inv.wkmgm35035",
    "namePl": "BLACHOWKRĘTY 35 MM /200SZT.",
    "unit": "szt",
    "netUnitPricePln": 13.33,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkmgm35035",
    "productCode": "WKMGM35035"
  },
  {
    "materialKey": "mat.inv.wkr_pl6125",
    "catalogWorkId": "cw.inv.wkr_pl6125",
    "namePl": "WKRĘTAK PŁASKI DREL 6,0*125MM",
    "unit": "szt",
    "netUnitPricePln": 7.77,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkr-pl6125",
    "productCode": "WKR-PL6125"
  },
  {
    "materialKey": "mat.inv.wkrph1075",
    "catalogWorkId": "cw.inv.wkrph1075",
    "namePl": "WKRĘTAK KRZYŻOWY PH1 75-100MM",
    "unit": "szt",
    "netUnitPricePln": 9.63,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkrph1075-",
    "productCode": "WKRPH1075-"
  },
  {
    "materialKey": "mat.inv.wkrph2100j",
    "catalogWorkId": "cw.inv.wkrph2100j",
    "namePl": "WKRĘTAK KRZYŻOWY PH2 100MM",
    "unit": "szt",
    "netUnitPricePln": 11.92,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkrph2100j",
    "productCode": "WKRPH2100J"
  },
  {
    "materialKey": "mat.inv.wkrpl4100j",
    "catalogWorkId": "cw.inv.wkrpl4100j",
    "namePl": "WKRĘTAK PŁASKI SL4,0X100MM",
    "unit": "szt",
    "netUnitPricePln": 7.64,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wkrpl4100j",
    "productCode": "WKRPL4100J"
  },
  {
    "materialKey": "mat.inv.worek",
    "catalogWorkId": "cw.inv.worek",
    "namePl": "POLIPROPYLENOWY 65*105",
    "unit": "szt",
    "netUnitPricePln": 2.44,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:worek",
    "productCode": "WOREK"
  },
  {
    "materialKey": "mat.inv.worki",
    "catalogWorkId": "cw.inv.worki",
    "namePl": "NA ŚMIECI 240L/10SZT.",
    "unit": "szt",
    "netUnitPricePln": 17.11,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:worki",
    "productCode": "WORKI"
  },
  {
    "materialKey": "mat.inv.wrjm06",
    "catalogWorkId": "cw.inv.wrjm06",
    "namePl": "WIERTŁO DO STALI - 6.0MM",
    "unit": "szt",
    "netUnitPricePln": 4.14,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wrjm06",
    "productCode": "WRJM06"
  },
  {
    "materialKey": "mat.inv.wt_wt16",
    "catalogWorkId": "cw.inv.wt_wt16",
    "namePl": "WTYCZKA KĄTOWA WT-16 Z UZIEMN.",
    "unit": "szt",
    "netUnitPricePln": 5.91,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wt-wt16",
    "productCode": "WT-WT16"
  },
  {
    "materialKey": "mat.inv.wt_wt16h",
    "catalogWorkId": "cw.inv.wt_wt16h",
    "namePl": "WTYCZKA GUM.1F16A HERMETYCZNA",
    "unit": "szt",
    "netUnitPricePln": 10.84,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:wt-wt16h",
    "productCode": "WT-WT16H"
  },
  {
    "materialKey": "mat.inv.zapas",
    "catalogWorkId": "cw.inv.zapas",
    "namePl": "VELUR 5,7,10,15CM",
    "unit": "szt",
    "netUnitPricePln": 3.79,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapas",
    "productCode": "ZAPAS"
  },
  {
    "materialKey": "mat.inv.zapg_55",
    "catalogWorkId": "cw.inv.zapg_55",
    "namePl": "ZAPAS GĄBKA 35* 55MM",
    "unit": "szt",
    "netUnitPricePln": 1.52,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapg-55",
    "productCode": "ZAPG-55"
  },
  {
    "materialKey": "mat.inv.zapg_70",
    "catalogWorkId": "cw.inv.zapg_70",
    "namePl": "ZAPAS GĄBKA 35* 70MM",
    "unit": "szt",
    "netUnitPricePln": 1.7,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapg-70",
    "productCode": "ZAPG-70"
  },
  {
    "materialKey": "mat.inv.zapg105",
    "catalogWorkId": "cw.inv.zapg105",
    "namePl": "ZAPAS GĄBKA 35*105MM",
    "unit": "szt",
    "netUnitPricePln": 1.89,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapg105",
    "productCode": "ZAPG105"
  },
  {
    "materialKey": "mat.inv.zapm_50_70",
    "catalogWorkId": "cw.inv.zapm_50_70",
    "namePl": "ZAPAS FLOCK IMPORT 5-7CM",
    "unit": "szt",
    "netUnitPricePln": 3.02,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapm-50,70",
    "productCode": "ZAPM-50,70"
  },
  {
    "materialKey": "mat.inv.zapm160",
    "catalogWorkId": "cw.inv.zapm160",
    "namePl": "ZAPAS FLOCK IMPORT 15CM",
    "unit": "szt",
    "netUnitPricePln": 4.54,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zapm160",
    "productCode": "ZAPM160"
  },
  {
    "materialKey": "mat.inv.zazpe27100",
    "catalogWorkId": "cw.inv.zazpe27100",
    "namePl": "ŻARÓWKA 100W E-27 PRZEŹROCZ.",
    "unit": "szt",
    "netUnitPricePln": 3.4,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zazpe27100",
    "productCode": "ZAZPE27100"
  },
  {
    "materialKey": "mat.inv.zazpe27150",
    "catalogWorkId": "cw.inv.zazpe27150",
    "namePl": "ŻARÓWKA 150W E-27 PRZEŹROCZ.",
    "unit": "szt",
    "netUnitPricePln": 6.84,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zazpe27150",
    "productCode": "ZAZPE27150"
  },
  {
    "materialKey": "mat.inv.zazpe27200",
    "catalogWorkId": "cw.inv.zazpe27200",
    "namePl": "ŻARÓWKA 200W E-27 PRZEŹROCZ.",
    "unit": "szt",
    "netUnitPricePln": 7.18,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zazpe27200",
    "productCode": "ZAZPE27200"
  },
  {
    "materialKey": "mat.inv.zlede2720z",
    "catalogWorkId": "cw.inv.zlede2720z",
    "namePl": "ŻARÓWKA LED E27 20W ZIMNA 6KEC",
    "unit": "szt",
    "netUnitPricePln": 9.78,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zlede2720z",
    "productCode": "ZLEDE2720Z"
  },
  {
    "materialKey": "mat.inv.zz_12025",
    "catalogWorkId": "cw.inv.zz_12025",
    "namePl": "ZŁĄCZKA ZACISK.12* 2,5MMPOMAR.",
    "unit": "szt",
    "netUnitPricePln": 2.19,
    "observedAt": "2026-05-30T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zz-12025",
    "productCode": "ZZ-12025"
  },
  {
    "materialKey": "mat.inv.zz_12040",
    "catalogWorkId": "cw.inv.zz_12040",
    "namePl": "ZŁĄCZKA ZACISK.12* 4MM POMAR.",
    "unit": "szt",
    "netUnitPricePln": 2.78,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zz-12040",
    "productCode": "ZZ-12040"
  },
  {
    "materialKey": "mat.inv.zz_12060",
    "catalogWorkId": "cw.inv.zz_12060",
    "namePl": "ZŁĄCZKA ZACISK.12* 6MM POMAR.",
    "unit": "szt",
    "netUnitPricePln": 3.75,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zz-12060",
    "productCode": "ZZ-12060"
  },
  {
    "materialKey": "mat.inv.zz_12100",
    "catalogWorkId": "cw.inv.zz_12100",
    "namePl": "ZŁĄCZKA ZACISK.12*10MM POMAR.",
    "unit": "szt",
    "netUnitPricePln": 4.79,
    "observedAt": "2026-07-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zz-12100",
    "productCode": "ZZ-12100"
  },
  {
    "materialKey": "mat.inv.zzwa_2_5",
    "catalogWorkId": "cw.inv.zzwa_2_5",
    "namePl": "ZŁĄCZKA WAGO . 2,3,4,5X2,5",
    "unit": "szt",
    "netUnitPricePln": 1.25,
    "observedAt": "2026-03-31T12:00:00.000Z",
    "productIdentityKey": "sup:zygmunt wlodarczyk|code:zzwa-2-5",
    "productCode": "ZZWA-2-5"
  }
] as const;
