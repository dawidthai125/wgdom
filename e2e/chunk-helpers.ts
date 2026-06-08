import type { APIRequestContext } from "@playwright/test";

/** Legacy prefiksy testów → aktualne nazwy chunków Vite (Performance 2.2C). */
const CHUNK_PREFIX_ALIASES: Record<string, string[]> = {
  "panel-inspector": ["InspectorPanel", "panel-inspector"],
};

/** Główny bundle z index.html + treść (lazy chunki są importowane stamtąd, nie z HTML). */
export async function loadEntryBundle(request: APIRequestContext, baseURL: string): Promise<string> {
  const html = await (await request.get(`${baseURL}/`)).text();
  const entryMatch = html.match(/\/assets\/index-[\w-]+\.js/);
  if (!entryMatch) throw new Error("brak /assets/index-*.js w index.html");
  const res = await request.get(`${baseURL}${entryMatch[0]}`);
  if (!res.ok()) throw new Error(`entry bundle HTTP ${res.status()}`);
  return res.text();
}

/** Rekurencyjny crawl grafu /assets/*.js (jak prod smoke). */
export async function collectAssetPaths(request: APIRequestContext, baseURL: string): Promise<Set<string>> {
  const html = await (await request.get(`${baseURL}/`)).text();
  const assets = new Set<string>([...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]));
  const queue = [...assets];
  while (queue.length) {
    const path = queue.pop()!;
    const res = await request.get(`${baseURL}${path}`);
    if (!res.ok()) continue;
    const js = await res.text();
    for (const m of js.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)) {
      const next = "/" + m[0];
      if (!assets.has(next)) {
        assets.add(next);
        queue.push(next);
      }
    }
  }
  return assets;
}

export async function fetchLazyChunk(
  request: APIRequestContext,
  baseURL: string,
  chunkPrefix: string,
): Promise<{ name: string; bytes: number }> {
  const prefixes = CHUNK_PREFIX_ALIASES[chunkPrefix] ?? [chunkPrefix];
  const paths = await collectAssetPaths(request, baseURL);
  let allJs = "";
  for (const p of paths) {
    const res = await request.get(`${baseURL}${p}`);
    if (!res.ok()) continue;
    allJs += await res.text();
  }

  for (const prefix of prefixes) {
    const match = allJs.match(new RegExp(`${prefix}-[\\w-]+\\.js`));
    if (!match) continue;
    const res = await request.get(`${baseURL}/assets/${match[0]}`);
    if (!res.ok()) throw new Error(`${match[0]} HTTP ${res.status()}`);
    const body = await res.body();
    return { name: match[0], bytes: body.byteLength };
  }

  throw new Error(`brak referencji ${prefixes.join("|")}-*.js w asset graph (${paths.size} plików)`);
}
