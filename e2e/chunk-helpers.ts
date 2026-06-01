import type { APIRequestContext } from "@playwright/test";

/** Główny bundle z index.html + treść (lazy chunki są importowane stamtąd, nie z HTML). */
export async function loadEntryBundle(request: APIRequestContext, baseURL: string): Promise<string> {
  const html = await (await request.get(`${baseURL}/`)).text();
  const entryMatch = html.match(/\/assets\/index-[\w-]+\.js/);
  if (!entryMatch) throw new Error("brak /assets/index-*.js w index.html");
  const res = await request.get(`${baseURL}${entryMatch[0]}`);
  if (!res.ok()) throw new Error(`entry bundle HTTP ${res.status()}`);
  return res.text();
}

export async function fetchLazyChunk(
  request: APIRequestContext,
  baseURL: string,
  chunkPrefix: string,
): Promise<{ name: string; bytes: number }> {
  const entry = await loadEntryBundle(request, baseURL);
  const match = entry.match(new RegExp(`${chunkPrefix}-[\\w-]+\\.js`));
  if (!match) throw new Error(`brak referencji ${chunkPrefix}-*.js w entry bundle`);
  const res = await request.get(`${baseURL}/assets/${match[0]}`);
  if (!res.ok()) throw new Error(`${match[0]} HTTP ${res.status()}`);
  const body = await res.body();
  return { name: match[0], bytes: body.byteLength };
}
