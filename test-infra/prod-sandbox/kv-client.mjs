/**
 * TEST-HARNESS-01 — Edge KV client (read/write) for prod-sandbox scenarios.
 * Does NOT import cloud-sync (Protected Core). Uses public Edge batch-get/set only.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadDotEnv(root) {
  const path = join(root, ".env");
  if (!existsSync(path)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/**
 * @param {string} root
 */
export function createKvClient(root) {
  const fileEnv = loadDotEnv(root);
  const projectId =
    process.env.VITE_SUPABASE_PROJECT_ID ||
    fileEnv.VITE_SUPABASE_PROJECT_ID ||
    "bdpygdvfgbggermvqtys";
  const anon =
    process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY || "";
  const slug =
    process.env.VITE_SUPABASE_FUNCTION_SLUG ||
    fileEnv.VITE_SUPABASE_FUNCTION_SLUG ||
    "make-server-0afb8820";
  const base = `https://${projectId}.supabase.co/functions/v1/${slug}`;

  if (!anon) {
    throw new Error("PSB_PRECONDITION: missing VITE_SUPABASE_ANON_KEY (.env)");
  }

  /**
   * @param {string[]} keys
   */
  async function batchGet(keys) {
    const res = await fetch(`${base}/batch-get`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      throw new Error(`PSB_KV_BATCH_GET_FAILED: ${res.status} ${text.slice(0, 200)}`);
    }
    /** @type {Record<string, unknown>} */
    const map = {};
    const values = json?.values ?? json?.data ?? null;
    if (Array.isArray(values)) {
      keys.forEach((k, i) => {
        map[k] = values[i];
      });
    } else if (values && typeof values === "object") {
      Object.assign(map, values);
    } else if (json && typeof json === "object") {
      for (const k of keys) {
        if (k in json) map[k] = json[k];
      }
    }
    return map;
  }

  /**
   * @param {string[]} keys
   * @param {unknown[]} values
   */
  async function batchSet(keys, values) {
    const res = await fetch(`${base}/batch-set`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys, values }),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    if (!res.ok || json?.ok === false) {
      throw new Error(
        `PSB_KV_BATCH_SET_FAILED: ${res.status} ${text.slice(0, 240)}`,
      );
    }
    return json;
  }

  return { base, batchGet, batchSet, projectId };
}

export const PIPELINE_KEY = "kw-tenders-pipeline";
export const DELETED_IDS_KEY = "kw-tenders-deleted-ids";

/**
 * Normalize pipeline value from KV to array.
 * @param {unknown} raw
 */
export function asTenderList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(/** @type {any} */ (raw).items)) {
    return /** @type {any} */ (raw).items;
  }
  return [];
}

/**
 * Normalize deleted ids.
 * @param {unknown} raw
 */
export function asDeletedIds(raw) {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (raw && typeof raw === "object" && Array.isArray(/** @type {any} */ (raw).ids)) {
    return /** @type {any} */ (raw).ids.map(String);
  }
  return [];
}
