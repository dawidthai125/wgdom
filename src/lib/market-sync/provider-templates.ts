/**
 * MARKET-SYNC-01 P2 — stub CSV templates (OBI / Bricoman / PSB).
 * Nie jest pełnym sync produkcyjnym · bez scrapera.
 */

export const MARKET_SYNC_P2_TEMPLATE_PROVIDERS = ["obi", "bricoman", "psb"] as const;

export type MarketSyncP2TemplateProvider =
  (typeof MARKET_SYNC_P2_TEMPLATE_PROVIDERS)[number];

const HEADER =
  "provider,providerSku,ean,productName,unit,grossPrice,currency,sourceUrl";

/** Minimalny stub CSV — Admin kopiuje / importuje ręcznie (P0 path). */
export function buildMarketSyncProviderTemplateCsv(
  provider: MarketSyncP2TemplateProvider,
): string {
  const sku = `${provider.toUpperCase()}-STUB-001`;
  const name = `Stub ${provider} — uzupełnij eksportem sklepu`;
  return [
    HEADER,
    `${provider},${sku},,,${name},szt,0.01,PLN,`,
  ].join("\n");
}
